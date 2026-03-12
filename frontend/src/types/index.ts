export interface TransactionInput {
  txid: string;
  vout: number;
  address?: string;
  value?: number;
}

export interface TransactionOutput {
  n: number;
  address?: string;
  value: number;
  spent_by?: string;
}

export interface Transaction {
  txid: string;
  confirmations: number;
  total_value: number;
  timestamp: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  is_coinbase: boolean;
}

export type LabelType = "tx" | "addr" | "input" | "output";

export interface BIP329Label {
  id?: string;
  type: LabelType;
  ref: string;
  label: string;
  origin?: string;
  spendable?: boolean;
}

export interface HeuristicResult {
  id: string;
  label: string;
  description: string;
  severity: "info" | "warning";
  output_index?: number;
}

export interface CytoscapeNodeData {
  id: string;
  label: string;
  txid: string;
  value?: number;
  is_coinbase?: boolean;
  has_label?: boolean;
  heuristics?: string[];
  expandable?: boolean;
  parent?: string;
  is_cluster?: boolean;
  cluster_label?: string;
  child_count?: number;
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  value?: number;
  label?: string;
}

export interface CytoscapeNode {
  data: CytoscapeNodeData;
  position?: { x: number; y: number };
}

export interface CytoscapeEdge {
  data: CytoscapeEdgeData;
}

export interface CytoscapeGraph {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}
