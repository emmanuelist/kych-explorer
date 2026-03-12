"""Transaction API endpoints."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import Transaction
from app.services.graph_service import get_graph_service
from app.services.bitcoin_rpc import get_rpc_client, BitcoinRPCError
from app.services.heuristics import analyze_transaction

router = APIRouter()


@router.get("/{txid}", response_model=Transaction)
async def get_transaction(txid: str):
    """Get a transaction by ID with parsed inputs and outputs."""
    graph_service = get_graph_service()
    tx = await graph_service.get_transaction(txid)
    
    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction {txid} not found")
    
    return tx


@router.get("/{txid}/heuristics")
async def get_transaction_heuristics(txid: str):
    """Run wallet fingerprinting heuristics on a transaction."""
    graph_service = get_graph_service()
    tx = await graph_service.get_transaction(txid)
    
    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction {txid} not found")
    
    return {"txid": txid, "heuristics": analyze_transaction(tx)}


@router.get("/{txid}/raw")
async def get_raw_transaction(txid: str):
    """Get raw transaction data from Bitcoin Core."""
    rpc = get_rpc_client()
    
    try:
        raw_tx = await rpc.get_raw_transaction(txid, verbose=True)
        return raw_tx
    except BitcoinRPCError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/")
async def get_blockchain_status():
    """Get current blockchain status."""
    rpc = get_rpc_client()
    
    try:
        info = await rpc.get_blockchain_info()
        return {
            "chain": info.get("chain"),
            "blocks": info.get("blocks"),
            "headers": info.get("headers"),
            "bestblockhash": info.get("bestblockhash"),
            "difficulty": info.get("difficulty"),
            "verification_progress": info.get("verificationprogress"),
        }
    except BitcoinRPCError as e:
        raise HTTPException(status_code=503, detail=f"Bitcoin Core not available: {e}")
