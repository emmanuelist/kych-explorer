"""Wallet fingerprinting heuristics for transaction analysis."""

from app.models.schemas import Transaction


def analyze_transaction(tx: Transaction) -> list[dict]:
    """Run all heuristics on a transaction and return detected flags."""
    results = []

    if _is_round_payment(tx):
        results.append({
            "id": "round_payment",
            "label": "Round Payment",
            "description": "Transaction has a round-value output, suggesting a payment.",
            "severity": "info",
        })

    if _has_address_reuse(tx):
        results.append({
            "id": "address_reuse",
            "label": "Address Reuse",
            "description": "An input address also appears in the outputs (address reuse).",
            "severity": "warning",
        })

    change_idx = _detect_change_output(tx)
    if change_idx is not None:
        results.append({
            "id": "change_output",
            "label": "Likely Change",
            "description": f"Output #{change_idx} is likely a change output.",
            "severity": "info",
            "output_index": change_idx,
        })

    if _is_consolidation(tx):
        results.append({
            "id": "consolidation",
            "label": "Consolidation",
            "description": "Multiple inputs merged into a single output, typical of UTXO consolidation.",
            "severity": "info",
        })

    if _has_script_type_mismatch(tx):
        results.append({
            "id": "script_mismatch",
            "label": "Script Mismatch",
            "description": "Input and output address types differ, reducing privacy.",
            "severity": "warning",
        })

    if _is_rbf(tx):
        results.append({
            "id": "rbf_signaling",
            "label": "RBF Signaling",
            "description": "At least one input signals Replace-By-Fee (sequence < 0xFFFFFFFE).",
            "severity": "info",
        })

    if _has_locktime(tx):
        results.append({
            "id": "locktime_set",
            "label": "Locktime Set",
            "description": f"Transaction has nLockTime={tx.locktime}, used for anti-fee-sniping or timelocks.",
            "severity": "info",
        })

    if _has_unnecessary_input(tx):
        results.append({
            "id": "unnecessary_input",
            "label": "Unnecessary Input",
            "description": "A single input could cover all outputs; extra inputs likely belong to the same wallet.",
            "severity": "warning",
        })

    return results


def _is_round_payment(tx: Transaction) -> bool:
    """Check if any output is a round BTC amount (e.g. 0.1, 0.01, 1.0)."""
    if tx.is_coinbase:
        return False
    for out in tx.outputs:
        btc = out.value / 1e8
        # Round amounts: multiples of 0.001 BTC but not the total output
        if btc > 0 and (btc * 1000) == int(btc * 1000) and btc != tx.total_value / 1e8:
            return True
    return False


def _has_address_reuse(tx: Transaction) -> bool:
    """Check if any input address appears in the outputs."""
    input_addrs = {inp.address for inp in tx.inputs if inp.address}
    output_addrs = {out.address for out in tx.outputs if out.address}
    return bool(input_addrs & output_addrs)


def _detect_change_output(tx: Transaction) -> int | None:
    """
    Heuristic: if a 2-output tx has one round amount and one non-round,
    the non-round output is likely change.
    """
    if tx.is_coinbase or len(tx.outputs) != 2:
        return None

    o0_btc = tx.outputs[0].value / 1e8
    o1_btc = tx.outputs[1].value / 1e8

    o0_round = (o0_btc * 1000) == int(o0_btc * 1000) and o0_btc > 0
    o1_round = (o1_btc * 1000) == int(o1_btc * 1000) and o1_btc > 0

    if o0_round and not o1_round:
        return tx.outputs[1].n
    if o1_round and not o0_round:
        return tx.outputs[0].n
    return None


def _is_consolidation(tx: Transaction) -> bool:
    """Multiple inputs, single output = consolidation."""
    return len(tx.inputs) >= 2 and len(tx.outputs) == 1 and not tx.is_coinbase


def _addr_type(address: str | None) -> str | None:
    """Infer address type from prefix."""
    if not address:
        return None
    if address.startswith(("bc1q", "tb1q")):
        return "p2wpkh"
    if address.startswith(("bc1p", "tb1p")):
        return "p2tr"
    if address.startswith(("3", "2")):
        return "p2sh"
    if address.startswith(("1", "m", "n")):
        return "p2pkh"
    return None


def _has_script_type_mismatch(tx: Transaction) -> bool:
    """Check if input address types differ from output address types."""
    if tx.is_coinbase:
        return False
    in_types = {_addr_type(inp.address) for inp in tx.inputs if inp.address}
    out_types = {_addr_type(out.address) for out in tx.outputs if out.address}
    in_types.discard(None)
    out_types.discard(None)
    if not in_types or not out_types:
        return False
    return in_types != out_types


def _is_rbf(tx: Transaction) -> bool:
    """Check if any input signals Replace-By-Fee (sequence < 0xFFFFFFFE)."""
    if tx.is_coinbase:
        return False
    for inp in tx.inputs:
        if inp.sequence is not None and inp.sequence < 0xFFFFFFFE:
            return True
    return False


def _has_locktime(tx: Transaction) -> bool:
    """Check if nLockTime is set (> 0), indicating anti-fee-sniping or timelock."""
    if tx.is_coinbase:
        return False
    return tx.locktime is not None and tx.locktime > 0


def _has_unnecessary_input(tx: Transaction) -> bool:
    """
    Unnecessary Input Heuristic (UIOH): if a multi-input transaction has at
    least one input whose value alone covers the total output, the extra inputs
    are likely from the same wallet.
    """
    if tx.is_coinbase or len(tx.inputs) < 2:
        return False
    total_out = sum(o.value for o in tx.outputs)
    for inp in tx.inputs:
        if inp.value is not None and inp.value >= total_out:
            return True
    return False
