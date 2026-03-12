"""Transaction graph traversal and building service."""

from typing import Optional
import asyncio
import networkx as nx

from app.models.schemas import (
    Transaction, TxInput, TxOutput, 
    GraphNode, GraphEdge, TransactionGraph
)
from app.services.bitcoin_rpc import get_rpc_client, BitcoinRPCError
from app.services.label_store import get_label_store
from app.config import get_settings

settings = get_settings()


class GraphService:
    """Service for building and traversing transaction graphs."""
    
    def __init__(self):
        self.rpc = get_rpc_client()
        self.labels = get_label_store()
        self._cache: dict[str, Transaction] = {}
    
    async def get_transaction(self, txid: str) -> Optional[Transaction]:
        """Fetch and parse a transaction."""
        if txid in self._cache:
            return self._cache[txid]
        
        try:
            raw_tx = await self.rpc.get_raw_transaction(txid, verbose=True)
        except BitcoinRPCError:
            return None
        
        # ── Inputs: fetch all prev-txs in parallel ──────────────────────
        raw_vins = raw_tx.get("vin", [])

        async def _resolve_input(vin: dict) -> TxInput:
            if "coinbase" in vin:
                return TxInput(txid="coinbase", vout=0, sequence=vin.get("sequence"))
            inp = TxInput(
                txid=vin["txid"],
                vout=vin["vout"],
                sequence=vin.get("sequence"),
            )
            try:
                prev_tx = await self.rpc.get_raw_transaction(vin["txid"], verbose=True)
                prev_out = prev_tx["vout"][vin["vout"]]
                inp.value = int(prev_out["value"] * 100_000_000)
                spk = prev_out.get("scriptPubKey", {})
                if "addresses" in spk:
                    inp.address = spk["addresses"][0]
                elif "address" in spk:
                    inp.address = spk["address"]
            except (BitcoinRPCError, KeyError, IndexError):
                pass
            inp.label = self.labels.get_label("input", f"{txid}:{vin['vout']}")
            return inp

        inputs: list[TxInput] = list(
            await asyncio.gather(*[_resolve_input(vin) for vin in raw_vins])
        )

        # ── Outputs: check spent status in parallel ──────────────────────
        raw_vouts = raw_tx.get("vout", [])

        async def _resolve_output(vout: dict) -> TxOutput:
            address = None
            spk = vout.get("scriptPubKey", {})
            if "addresses" in spk:
                address = spk["addresses"][0]
            elif "address" in spk:
                address = spk["address"]
            utxo = await self.rpc.get_tx_out(txid, vout["n"])
            return TxOutput(
                n=vout["n"],
                address=address,
                value=int(vout["value"] * 100_000_000),
                spent=utxo is None,
                label=self.labels.get_label("output", f"{txid}:{vout['n']}"),
            )

        outputs: list[TxOutput] = list(
            await asyncio.gather(*[_resolve_output(v) for v in raw_vouts])
        )
        
        # Calculate fee
        fee = None
        total_in = sum(i.value for i in inputs if i.value)
        total_out = sum(o.value for o in outputs)
        if total_in > 0:
            fee = total_in - total_out
        
        is_coinbase = len(inputs) > 0 and inputs[0].txid == "coinbase"
        
        tx = Transaction(
            txid=txid,
            blockhash=raw_tx.get("blockhash"),
            confirmations=raw_tx.get("confirmations", 0),
            time=raw_tx.get("time"),
            timestamp=raw_tx.get("time"),
            fee=fee,
            total_value=total_out,
            is_coinbase=is_coinbase,
            locktime=raw_tx.get("locktime"),
            inputs=inputs,
            outputs=outputs,
            label=self.labels.get_label("tx", txid),
        )
        
        self._cache[txid] = tx
        return tx
    
    async def build_graph(
        self, 
        txid: str, 
        depth: int = 3, 
        direction: str = "backward"
    ) -> TransactionGraph:
        """Build transaction graph starting from txid."""
        depth = min(depth, settings.max_traversal_depth)
        
        nodes: dict[str, GraphNode] = {}
        edges: list[GraphEdge] = []
        visited: set[str] = set()
        
        async def traverse_backward(current_txid: str, current_depth: int):
            """Traverse backwards through inputs."""
            if current_depth > depth or current_txid in visited:
                return
            if current_txid == "coinbase":
                return
            
            visited.add(current_txid)
            tx = await self.get_transaction(current_txid)
            if not tx:
                return
            
            # Add tx node
            is_coinbase = len(tx.inputs) > 0 and tx.inputs[0].txid == "coinbase"
            nodes[current_txid] = GraphNode(
                id=current_txid,
                type="tx",
                label=tx.label,
                value=sum(o.value for o in tx.outputs),
                metadata={
                    "confirmations": tx.confirmations,
                    "time": tx.time,
                    "fee": tx.fee,
                    "is_coinbase": is_coinbase,
                }
            )
            
            # Process inputs
            for inp in tx.inputs[:settings.max_inputs_per_tx]:
                if inp.txid != "coinbase":
                    # Add edge from input tx to this tx
                    edges.append(GraphEdge(
                        source=inp.txid,
                        target=current_txid,
                        value=inp.value,
                        label=inp.label,
                    ))
                    
                    # Recurse
                    await traverse_backward(inp.txid, current_depth + 1)
        
        async def traverse_forward(current_txid: str, current_depth: int):
            """Traverse forward through spent outputs."""
            if current_depth > depth or current_txid in visited:
                return
            
            visited.add(current_txid)
            tx = await self.get_transaction(current_txid)
            if not tx:
                return
            
            # Add tx node
            nodes[current_txid] = GraphNode(
                id=current_txid,
                type="tx",
                label=tx.label,
                value=sum(o.value for o in tx.outputs),
                metadata={
                    "confirmations": tx.confirmations,
                    "time": tx.time,
                }
            )
            
            # TODO: Forward traversal requires tracking spending txs
            # This would need an address index or additional queries
        
        # Start traversal
        if direction in ("backward", "both"):
            await traverse_backward(txid, 0)
        if direction in ("forward", "both"):
            await traverse_forward(txid, 0)
        
        # Filter edges to only include those with existing source and target nodes
        valid_edges = [e for e in edges if e.source in nodes and e.target in nodes]
        
        return TransactionGraph(
            nodes=list(nodes.values()),
            edges=valid_edges,
            root_txid=txid,
            depth=depth,
        )
    
    def to_networkx(self, graph: TransactionGraph) -> nx.DiGraph:
        """Convert to NetworkX graph for analysis."""
        G = nx.DiGraph()
        
        for node in graph.nodes:
            G.add_node(node.id, **node.model_dump())
        
        for edge in graph.edges:
            G.add_edge(edge.source, edge.target, **edge.model_dump())
        
        return G
    
    def clear_cache(self):
        """Clear transaction cache."""
        self._cache.clear()


# Singleton
_graph_service: Optional[GraphService] = None


def get_graph_service() -> GraphService:
    """Get or create graph service singleton."""
    global _graph_service
    if _graph_service is None:
        _graph_service = GraphService()
    return _graph_service
