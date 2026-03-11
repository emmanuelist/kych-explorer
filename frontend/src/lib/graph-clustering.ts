import type { CytoscapeGraph, CytoscapeNode, Transaction } from "@/types";

interface ClusterResult {
  clusteredGraph: CytoscapeGraph;
}

/**
 * Analyze transactions and group nodes by shared addresses into Cytoscape compound nodes.
 * An address must appear in 2+ distinct transactions to form a cluster.
 * Each node belongs to the cluster of its most-connected address.
 */
export function clusterByAddress(
  graph: CytoscapeGraph,
  transactions: Record<string, Transaction>
): ClusterResult {
  // Build address → set of txids mapping
  const addressToTxids = new Map<string, Set<string>>();

  for (const node of graph.nodes) {
    const tx = transactions[node.data.txid];
    if (!tx) continue;

    const addresses = new Set<string>();
    for (const inp of tx.inputs) {
      if (inp.address) addresses.add(inp.address);
    }
    for (const out of tx.outputs) {
      if (out.address) addresses.add(out.address);
    }

    for (const addr of addresses) {
      if (!addressToTxids.has(addr)) addressToTxids.set(addr, new Set());
      addressToTxids.get(addr)!.add(node.data.txid);
    }
  }

  // Filter to addresses appearing in 2+ transactions
  const clusters = new Map<string, Set<string>>();
  for (const [addr, txids] of addressToTxids) {
    if (txids.size >= 2) {
      clusters.set(addr, txids);
    }
  }

  // Assign each node to its most-connected cluster (most txids sharing that address)
  const nodeToCluster = new Map<string, string>();
  for (const node of graph.nodes) {
    let bestAddr = "";
    let bestCount = 0;
    for (const [addr, txids] of clusters) {
      if (txids.has(node.data.txid) && txids.size > bestCount) {
        bestCount = txids.size;
        bestAddr = addr;
      }
    }
    if (bestAddr) {
      nodeToCluster.set(node.data.id, bestAddr);
    }
  }

  // Build cluster parent nodes
  const clusterNodes: CytoscapeNode[] = [];
  const usedClusters = new Set(nodeToCluster.values());

  for (const addr of usedClusters) {
    const childCount = [...nodeToCluster.values()].filter((a) => a === addr).length;
    // Extract short label from address
    const shortLabel = extractAddressLabel(addr);
    clusterNodes.push({
      data: {
        id: `cluster-${addr}`,
        label: `${shortLabel} (${childCount})`,
        txid: "",
        is_cluster: true,
        cluster_label: shortLabel,
        child_count: childCount,
      },
    });
  }

  // Clone nodes with parent assignment
  const childNodes: CytoscapeNode[] = graph.nodes.map((node) => {
    const clusterAddr = nodeToCluster.get(node.data.id);
    return {
      ...node,
      data: {
        ...node.data,
        ...(clusterAddr ? { parent: `cluster-${clusterAddr}` } : {}),
      },
    };
  });

  return {
    clusteredGraph: {
      nodes: [...clusterNodes, ...childNodes],
      edges: [...graph.edges],
    },
  };
}

function extractAddressLabel(address: string): string {
  // For demo addresses like bc1qalicexxx..., extract the name portion
  const match = address.match(/^bc1q([a-z]+?)x+$/);
  if (match) {
    const name = match[1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  // Fallback: truncate
  return `${address.slice(0, 8)}…`;
}
