"""Electrum server client — speaks the Electrum JSON-RPC protocol over TCP/SSL.

Provides the same public interface as BitcoinRPC so that GraphService can
use either backend transparently.
"""

import asyncio
import json
import ssl
from typing import Any, Optional

from app.config import get_settings
from app.services.bitcoin_rpc import BitcoinRPCError

settings = get_settings()


class ElectrumClient:
    """Async Electrum protocol client (JSON-RPC over TCP/SSL)."""

    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        use_ssl: bool | None = None,
    ):
        self.host = host or settings.electrum_host
        self.port = port or settings.electrum_port
        self.use_ssl = use_ssl if use_ssl is not None else settings.electrum_ssl
        self._id_counter = 0
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None
        self._lock = asyncio.Lock()

    # ── connection management ───────────────────────────────────────────

    async def _ensure_connected(self) -> None:
        if self._writer is not None and not self._writer.is_closing():
            return
        ssl_ctx = ssl.create_default_context() if self.use_ssl else None
        self._reader, self._writer = await asyncio.wait_for(
            asyncio.open_connection(self.host, self.port, ssl=ssl_ctx),
            timeout=15,
        )

    async def _close(self) -> None:
        if self._writer and not self._writer.is_closing():
            self._writer.close()
            await self._writer.wait_closed()
        self._writer = None
        self._reader = None

    # ── low-level RPC ───────────────────────────────────────────────────

    async def _call(self, method: str, params: list | None = None) -> Any:
        async with self._lock:
            try:
                await self._ensure_connected()
            except (OSError, asyncio.TimeoutError) as exc:
                raise BitcoinRPCError(f"Electrum connect error: {exc}")

            self._id_counter += 1
            payload = {
                "jsonrpc": "2.0",
                "id": self._id_counter,
                "method": method,
                "params": params or [],
            }
            line = json.dumps(payload) + "\n"
            self._writer.write(line.encode())
            await self._writer.drain()

            try:
                raw = await asyncio.wait_for(self._reader.readline(), timeout=30)
            except asyncio.TimeoutError:
                await self._close()
                raise BitcoinRPCError("Electrum read timeout")

            if not raw:
                await self._close()
                raise BitcoinRPCError("Electrum connection closed")

            result = json.loads(raw)
            if "error" in result and result["error"]:
                raise BitcoinRPCError(f"Electrum error: {result['error']}")
            return result.get("result")

    # ── public API (mirrors BitcoinRPC interface) ───────────────────────

    async def get_raw_transaction(
        self, txid: str, verbose: bool = True, blockhash: str | None = None
    ) -> dict:
        """Fetch a transaction and return a dict matching Bitcoin Core's verbose format."""
        raw_hex = await self._call("blockchain.transaction.get", [txid, False])
        if not verbose:
            return raw_hex

        verbose_tx = await self._call("blockchain.transaction.get", [txid, True])
        # Electrum servers return a dict very close to Bitcoin Core's format
        # when verbose=True.  Normalise minor differences.
        return verbose_tx

    async def get_tx_out(
        self, txid: str, vout: int, include_mempool: bool = True
    ) -> Optional[dict]:
        """Check if a UTXO is unspent.

        Electrum doesn't have a direct ``gettxout`` equivalent.  We fetch the
        verbose transaction and look at the scriptPubKey address, then query
        the address's UTXO list.  If the outpoint is absent, it's spent.
        """
        try:
            tx = await self.get_raw_transaction(txid, verbose=True)
            output = tx["vout"][vout]
            spk = output.get("scriptPubKey", {})
            address = spk.get("address") or (spk.get("addresses") or [None])[0]
            if not address:
                return None

            utxos = await self._call("blockchain.scripthash.listunspent", [
                _address_to_scripthash(address)
            ])
            for u in utxos:
                if u.get("tx_hash") == txid and u.get("tx_pos") == vout:
                    return output  # still unspent
            return None  # spent
        except (BitcoinRPCError, KeyError, IndexError):
            return None

    async def get_block_count(self) -> int:
        header = await self._call("blockchain.headers.subscribe")
        return header["height"]

    async def get_blockchain_info(self) -> dict:
        header = await self._call("blockchain.headers.subscribe")
        return {"blocks": header["height"], "chain": "signet"}

    async def get_block_hash(self, height: int) -> str:
        header = await self._call("blockchain.block.header", [height])
        # Electrum returns the 80-byte header hex; the hash is the double-SHA256
        import hashlib
        raw = bytes.fromhex(header)
        return hashlib.sha256(hashlib.sha256(raw).digest()).digest()[::-1].hex()

    async def get_block(self, blockhash: str, verbosity: int = 1) -> dict:
        raise BitcoinRPCError("get_block not supported via Electrum — use Bitcoin Core")

    async def decode_raw_transaction(self, hex_string: str) -> dict:
        raise BitcoinRPCError("decode_raw_transaction not supported via Electrum")

    async def test_connection(self) -> bool:
        try:
            await self._call("server.version", ["kych-explorer", ["1.4", "1.4.2"]])
            return True
        except BitcoinRPCError:
            return False


# ── helpers ─────────────────────────────────────────────────────────────

def _address_to_scripthash(address: str) -> str:
    """Convert a Bitcoin address to an Electrum protocol script-hash.

    Electrum indexes by the SHA256 of the scriptPubKey (reversed byte order).
    We derive the scriptPubKey from the address using minimal local logic
    for the common address types.
    """
    import hashlib
    script = _address_to_script(address)
    h = hashlib.sha256(script).digest()
    return h[::-1].hex()


def _address_to_script(address: str) -> bytes:
    """Derive scriptPubKey bytes from a Bitcoin address."""
    if address.startswith(("bc1q", "tb1q", "bcrt1q", "sb1q")):
        # Bech32 → P2WPKH  (OP_0 <20-byte-hash>)
        _, data = _bech32_decode(address)
        return bytes([0x00, 0x14]) + bytes(data)
    elif address.startswith(("bc1p", "tb1p", "bcrt1p", "sb1p")):
        # Bech32m → P2TR  (OP_1 <32-byte-key>)
        _, data = _bech32_decode(address)
        return bytes([0x51, 0x20]) + bytes(data)
    elif address.startswith(("3", "2")):
        # Base58 P2SH  (OP_HASH160 <20-byte-hash> OP_EQUAL)
        h = _base58_decode_check(address)[1:]  # strip version byte
        return bytes([0xa9, 0x14]) + h + bytes([0x87])
    elif address.startswith(("1", "m", "n")):
        # Base58 P2PKH  (OP_DUP OP_HASH160 <20> OP_EQUALVERIFY OP_CHECKSIG)
        h = _base58_decode_check(address)[1:]
        return bytes([0x76, 0xa9, 0x14]) + h + bytes([0x88, 0xac])
    raise ValueError(f"Unsupported address format: {address}")


def _base58_decode_check(s: str) -> bytes:
    import hashlib
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    n = 0
    for c in s:
        n = n * 58 + alphabet.index(c)
    raw = n.to_bytes(25, "big")
    payload, checksum = raw[:-4], raw[-4:]
    if hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4] != checksum:
        raise ValueError("Bad base58 checksum")
    return payload


def _bech32_decode(addr: str) -> tuple[int, list[int]]:
    """Minimal bech32/bech32m decoder returning (witness_version, program_bytes)."""
    import re
    # Signet and testnet prefixes
    match = re.match(r"^(bc|tb|bcrt|sb)1([qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)$", addr.lower())
    if not match:
        raise ValueError(f"Not a valid bech32 address: {addr}")
    CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    data = [CHARSET.index(c) for c in match.group(2)]
    # data[0] = witness version, data[1:-6] = payload in 5-bit groups
    witness_version = data[0]
    payload_5bit = data[1:-6]
    # Convert 5-bit groups to 8-bit bytes
    acc = 0
    bits = 0
    result = []
    for v in payload_5bit:
        acc = (acc << 5) | v
        bits += 5
        if bits >= 8:
            bits -= 8
            result.append((acc >> bits) & 0xFF)
    return witness_version, result
