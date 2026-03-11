"""Transaction graph API endpoints."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import TransactionGraph, TraversalRequest
from app.services.graph_service import get_graph_service

router = APIRouter()


@router.post("/traverse", response_model=TransactionGraph)
async def traverse_transaction_history(request: TraversalRequest):
    """
    Build a transaction graph by traversing history.
    
    - **txid**: Starting transaction ID
    - **depth**: How many levels to traverse (1-10, default 3)
    - **direction**: "backward" (inputs), "forward" (spends), or "both"
    """
    graph_service = get_graph_service()
    
    graph = await graph_service.build_graph(
        txid=request.txid,
        depth=request.depth,
        direction=request.direction,
    )
    
    if not graph.nodes:
        raise HTTPException(
            status_code=404, 
            detail=f"Could not build graph for transaction {request.txid}"
        )
    
    return graph


@router.get("/traverse/{txid}", response_model=TransactionGraph)
async def traverse_transaction_simple(txid: str, depth: int = 3, direction: str = "backward"):
    """Simple GET endpoint for graph traversal."""
    graph_service = get_graph_service()
    
    graph = await graph_service.build_graph(
        txid=txid,
        depth=min(depth, 10),
        direction=direction,
    )
    
    if not graph.nodes:
        raise HTTPException(
            status_code=404,
            detail=f"Could not build graph for transaction {txid}"
        )
    
    return graph


@router.get("/cytoscape/{txid}")
async def get_cytoscape_format(txid: str, depth: int = 3):
    """
    Get graph in Cytoscape.js format for direct frontend use.
    
    Returns: { nodes: [...], edges: [...] } in Cytoscape format.
    """
    graph_service = get_graph_service()
    
    graph = await graph_service.build_graph(
        txid=txid,
        depth=min(depth, 10),
        direction="backward",
    )
    
    if not graph.nodes:
        raise HTTPException(
            status_code=404,
            detail=f"Could not build graph for transaction {txid}"
        )
    
    # Convert to Cytoscape.js format
    cyto_nodes = []
    for node in graph.nodes:
        is_coinbase = node.metadata.get("is_coinbase", False)
        has_label = node.label is not None and node.label != ""
        cyto_nodes.append({
            "data": {
                "id": node.id,
                "label": node.label or node.id[:8] + "...",
                "txid": node.id,
                "type": node.type,
                "value": node.value,
                "is_coinbase": is_coinbase,
                "has_label": has_label,
                **{k: v for k, v in node.metadata.items() if k != "is_coinbase"},
            }
        })
    
    cyto_edges = []
    for i, edge in enumerate(graph.edges):
        cyto_edges.append({
            "data": {
                "id": f"e{i}",
                "source": edge.source,
                "target": edge.target,
                "value": edge.value,
                "label": edge.label,
            }
        })
    
    return {
        "nodes": cyto_nodes,
        "edges": cyto_edges,
        "rootTxid": graph.root_txid,
        "depth": graph.depth,
    }


@router.delete("/cache")
async def clear_cache():
    """Clear the transaction cache."""
    graph_service = get_graph_service()
    graph_service.clear_cache()
    return {"cleared": True}
