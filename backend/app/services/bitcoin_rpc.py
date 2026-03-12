"""Bitcoin Core RPC client service."""

import httpx
from typing import Any, Optional
import json

from app.config import get_settings

settings = get_settings()


class BitcoinRPCError(Exception):
    """Bitcoin RPC call failed."""
    pass


class BitcoinRPC:
    """Async Bitcoin Core RPC client."""
    
    def __init__(
        self,
        host: str = None,
        port: int = None,
        user: str = None,
        password: str = None,
    ):
        self.host = host or settings.bitcoin_rpc_host
        self.port = port or settings.bitcoin_rpc_port
        self.user = user or settings.bitcoin_rpc_user
        self.password = password or settings.bitcoin_rpc_password
        self.url = f"http://{self.host}:{self.port}"
        self._id_counter = 0
    
    async def _call(self, method: str, params: list = None) -> Any:
        """Make RPC call to Bitcoin Core."""
        self._id_counter += 1
        payload = {
            "jsonrpc": "2.0",
            "id": self._id_counter,
            "method": method,
            "params": params or [],
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.url,
                    json=payload,
                    auth=(self.user, self.password),
                    timeout=30.0,
                )
                response.raise_for_status()
                result = response.json()
                
                if "error" in result and result["error"]:
                    raise BitcoinRPCError(f"RPC Error: {result['error']}")
                
                return result.get("result")
                
            except httpx.HTTPError as e:
                raise BitcoinRPCError(f"HTTP Error: {e}")
    
    async def get_raw_transaction(self, txid: str, verbose: bool = True, blockhash: str = None) -> dict:
        """Get transaction by txid. Requires blockhash if txindex is not enabled."""
        params = [txid, verbose]
        if blockhash:
            params.append(blockhash)
        return await self._call("getrawtransaction", params)
    
    async def get_block_hash(self, height: int) -> str:
        """Get block hash by height."""
        return await self._call("getblockhash", [height])
    
    async def decode_raw_transaction(self, hex_string: str) -> dict:
        """Decode raw transaction hex."""
        return await self._call("decoderawtransaction", [hex_string])
    
    async def get_block(self, blockhash: str, verbosity: int = 1) -> dict:
        """Get block by hash."""
        return await self._call("getblock", [blockhash, verbosity])
    
    async def get_block_count(self) -> int:
        """Get current block height."""
        return await self._call("getblockcount")
    
    async def get_blockchain_info(self) -> dict:
        """Get blockchain info."""
        return await self._call("getblockchaininfo")
    
    async def get_tx_out(self, txid: str, vout: int, include_mempool: bool = True) -> Optional[dict]:
        """Get UTXO info (None if spent)."""
        return await self._call("gettxout", [txid, vout, include_mempool])
    
    async def test_connection(self) -> bool:
        """Test RPC connection."""
        try:
            await self.get_blockchain_info()
            return True
        except BitcoinRPCError:
            return False


# Singleton instance
_rpc_client: Optional[BitcoinRPC] = None


def get_rpc_client():
    """Get or create RPC client singleton.
    
    Returns a BitcoinRPC or ElectrumClient depending on the
    ``backend_type`` setting.
    """
    global _rpc_client
    if _rpc_client is None:
        if settings.backend_type == "electrum":
            from app.services.electrum_client import ElectrumClient
            _rpc_client = ElectrumClient()
        else:
            _rpc_client = BitcoinRPC()
    return _rpc_client
