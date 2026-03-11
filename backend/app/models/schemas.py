"""Data models for transactions and graph structures."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class LabelType(str, Enum):
    """BIP-329 label types."""
    TX = "tx"
    ADDR = "addr"
    PUBKEY = "pubkey"
    INPUT = "input"
    OUTPUT = "output"
    XPUB = "xpub"


class Label(BaseModel):
    """BIP-329 compliant label."""
    id: Optional[str] = None
    type: LabelType
    ref: str
    label: Optional[str] = None
    origin: Optional[str] = None
    spendable: Optional[bool] = None


class TxInput(BaseModel):
    """Transaction input."""
    txid: str
    vout: int
    address: Optional[str] = None
    value: Optional[int] = None  # satoshis
    label: Optional[str] = None


class TxOutput(BaseModel):
    """Transaction output."""
    n: int
    address: Optional[str] = None
    value: int  # satoshis
    spent: bool = False
    spent_by: Optional[str] = None
    label: Optional[str] = None


class Transaction(BaseModel):
    """Transaction with inputs, outputs, and metadata."""
    txid: str
    blockhash: Optional[str] = None
    blockheight: Optional[int] = None
    confirmations: int = 0
    time: Optional[int] = None
    timestamp: Optional[int] = None
    fee: Optional[int] = None
    total_value: int = 0
    is_coinbase: bool = False
    inputs: list[TxInput] = []
    outputs: list[TxOutput] = []
    label: Optional[str] = None


class GraphNode(BaseModel):
    """Node in transaction graph."""
    id: str  # txid or address
    type: str  # "tx" or "address"
    label: Optional[str] = None
    value: Optional[int] = None  # satoshis
    metadata: dict = {}


class GraphEdge(BaseModel):
    """Edge connecting nodes in graph."""
    source: str
    target: str
    value: Optional[int] = None  # satoshis
    label: Optional[str] = None


class TransactionGraph(BaseModel):
    """Full transaction graph for visualization."""
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    root_txid: str
    depth: int = 0


class TraversalRequest(BaseModel):
    """Request to traverse transaction history."""
    txid: str = Field(..., description="Starting transaction ID")
    depth: int = Field(default=3, ge=1, le=10, description="Max traversal depth")
    direction: str = Field(default="backward", pattern="^(backward|forward|both)$")


class LabelExport(BaseModel):
    """BIP-329 label export container."""
    labels: list[Label]
    format_version: str = "bip329"
