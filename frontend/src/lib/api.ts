import type { Transaction, BIP329Label, CytoscapeGraph } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  return res.json();
}

// Transactions
export const fetchTransaction = (txid: string) =>
  request<Transaction>(`/api/transactions/${txid}`);

// Graph
export const fetchGraph = (txid: string, depth = 3) =>
  request<CytoscapeGraph>(`/api/graph/cytoscape/${txid}?depth=${depth}`);

// Labels
export const fetchLabels = () =>
  request<BIP329Label[]>(`/api/labels`);

export const fetchLabelsByRef = (ref: string) =>
  request<BIP329Label[]>(`/api/labels?ref=${encodeURIComponent(ref)}`);

export const createLabel = (label: Omit<BIP329Label, "id">) =>
  request<BIP329Label>(`/api/labels`, {
    method: "POST",
    body: JSON.stringify(label),
  });

export const updateLabel = (id: string, label: Partial<BIP329Label>) =>
  request<BIP329Label>(`/api/labels/${id}`, {
    method: "PUT",
    body: JSON.stringify(label),
  });

export const deleteLabel = (id: string) =>
  request<void>(`/api/labels/${id}`, { method: "DELETE" });

// Import / Export
export const importLabels = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/labels/import/bip329`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Import failed: ${res.statusText}`);
  return res.json();
};

export const exportLabelsUrl = () =>
  `${API_BASE}/api/labels/export/bip329`;
