import { useRef, useCallback, useEffect, useState, useImperativeHandle, forwardRef, useMemo } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Bitcoin, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { GraphLegend } from "@/components/GraphLegend";
import { GraphMinimap } from "@/components/GraphMinimap";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { fadeInUp, scaleIn, springTransition } from "@/lib/motion";
import { clusterByAddress } from "@/lib/graph-clustering";
import { DEMO_TRANSACTIONS } from "@/lib/mock-data";
import type { CytoscapeGraph } from "@/types";

dagre(cytoscape);

const STYLESHEET: cytoscape.StylesheetStyle[] = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "text-valign": "bottom",
      "text-halign": "center",
      "font-size": "10px",
      "font-family": "monospace",
      color: "#94a3b8",
      "background-color": "#3b82f6",
      width: 32,
      height: 32,
      "border-width": 2,
      "border-color": "#1e293b",
      "overlay-padding": "6px",
    } as any,
  },
  {
    selector: "node[?has_label]",
    style: {
      "background-color": "#22c55e",
    } as any,
  },
  {
    selector: "node[?is_coinbase]",
    style: {
      "background-color": "#64748b",
    } as any,
  },
  {
    selector: "node:selected",
    style: {
      "background-color": "#f7931a",
      "border-color": "#f7931a",
      "border-width": 3,
    } as any,
  },
  {
    selector: "node:active",
    style: {
      "overlay-opacity": 0.1,
    },
  },
  // Compound / cluster parent nodes
  {
    selector: "$node > node",
    style: {
      "background-color": "#6366f1",
      "background-opacity": 0.06,
      "border-width": 1.5,
      "border-color": "#6366f1",
      "border-opacity": 0.5,
      "border-style": "dashed" as any,
      shape: "roundrectangle",
      "padding-top": "16px",
      "padding-left": "12px",
      "padding-bottom": "12px",
      "padding-right": "12px",
      label: "data(cluster_label)",
      "text-valign": "top",
      "text-halign": "center",
      "font-size": "9px",
      color: "#818cf8",
      "text-margin-y": 4,
    } as any,
  },
  {
    selector: "node[?is_cluster]",
    style: {
      "background-color": "#6366f1",
      "background-opacity": 0.06,
      "border-width": 1.5,
      "border-color": "#6366f1",
      "border-opacity": 0.5,
      "border-style": "dashed" as any,
      shape: "roundrectangle",
      label: "data(label)",
      "text-valign": "top",
      "text-halign": "center",
      "font-size": "9px",
      color: "#818cf8",
    } as any,
  },
  {
    selector: "edge",
    style: {
      width: 2,
      "line-color": "#334155",
      "target-arrow-color": "#334155",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      label: "data(label)",
      "font-size": "8px",
      "font-family": "monospace",
      color: "#f7931a",
      "text-rotation": "autorotate",
      "text-margin-y": -10,
      "text-background-color": "#1e293b",
      "text-background-opacity": 0.85,
      "text-background-padding": "3px",
      "text-background-shape": "roundrectangle",
    } as any,
  },
  {
    selector: "edge:selected",
    style: {
      width: 3,
      "line-color": "#475569",
      "target-arrow-color": "#475569",
    } as any,
  },
];

const LAYOUT = {
  name: "dagre",
  rankDir: "LR",
  spacingFactor: 1.4,
  nodeDimensionsIncludeLabels: true,
};

export interface TransactionGraphHandle {
  fitGraph: () => void;
  resetLayout: () => void;
}

interface TransactionGraphProps {
  graphData: CytoscapeGraph | undefined;
  isLoading: boolean;
  onNodeSelect: (txid: string) => void;
  onDemoActivate?: () => void;
}

// Particles for empty state
function Particles() {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${10 + Math.random() * 80}%`,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 3,
  }));

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: "10%",
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </>
  );
}

// Tooltip on hover
function NodeTooltip({ data, position }: { data: { txid: string; value?: number; label?: string } | null; position: { x: number; y: number } }) {
  return (
    <AnimatePresence>
      {data && (
        <motion.div
          variants={scaleIn}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute z-20 glass rounded-lg px-3 py-2 space-y-1 pointer-events-none"
          style={{ left: position.x + 12, top: position.y - 10 }}
        >
          <p className="font-mono text-[11px] text-foreground">{`${data.txid.slice(0, 8)}…${data.txid.slice(-8)}`}</p>
          {data.value !== undefined && (
            <p className="text-[10px] text-muted-foreground">
              {data.value.toFixed(8)} <span className="text-primary">BTC</span>
            </p>
          )}
          {data.label && <p className="text-[10px] text-accent">{data.label}</p>}
          <p className="text-[9px] text-muted-foreground/60">Click to inspect</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const TransactionGraph = forwardRef<TransactionGraphHandle, TransactionGraphProps>(
  function TransactionGraph({ graphData, isLoading, onNodeSelect, onDemoActivate }, ref) {
    const cyRef = useRef<cytoscape.Core | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoverData, setHoverData] = useState<{ txid: string; value?: number; label?: string } | null>(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const [clusteringEnabled, setClusteringEnabled] = useState(false);
    const [cyReady, setCyReady] = useState<cytoscape.Core | null>(null);

    useImperativeHandle(ref, () => ({
      fitGraph: () => cyRef.current?.fit(undefined, 40),
      resetLayout: () => {
        cyRef.current?.layout(LAYOUT as any).run();
        cyRef.current?.fit(undefined, 40);
      },
    }));

    // Compute elements with optional clustering
    const elements = useMemo(() => {
      if (!graphData) return [];
      const source = clusteringEnabled
        ? clusterByAddress(graphData, DEMO_TRANSACTIONS).clusteredGraph
        : graphData;

      const nodeIds = new Set(source.nodes.map((n) => n.data.id));

      return [
        ...source.nodes.map((n) => ({
          data: { ...n.data, ...(n.data.parent ? { parent: n.data.parent } : {}) },
          group: "nodes" as const,
        })),
        ...source.edges
          .filter((e) => nodeIds.has(e.data.source) && nodeIds.has(e.data.target))
          .map((e) => ({ data: { ...e.data, label: e.data.label ?? "" }, group: "edges" as const })),
      ];
    }, [graphData, clusteringEnabled]);

    const handleCyInit = useCallback(
      (cy: cytoscape.Core) => {
        cyRef.current = cy;
        setCyReady(cy);
        cy.on("tap", "node", (e) => {
          const node = e.target;
          if (node.data("is_cluster")) return; // don't select cluster parents
          const txid = node.data("txid");
          if (txid) {
            onNodeSelect(txid);
            node.animate({ style: { "border-width": 8, "border-color": "#f7931a" } as any }, { duration: 150, complete: () => {
              node.animate({ style: { "border-width": 3, "border-color": "#f7931a" } as any }, { duration: 200 });
            }});
          }
        });
        cy.on("mouseover", "node", (e) => {
          const node = e.target;
          if (node.data("is_cluster")) return;
          document.body.style.cursor = "pointer";
          const container = containerRef.current;
          if (container) {
            const renderedPos = node.renderedPosition();
            setHoverData({
              txid: node.data("txid"),
              value: node.data("value"),
              label: node.data("label"),
            });
            setHoverPos({ x: renderedPos.x, y: renderedPos.y });
          }
        });
        cy.on("mouseout", "node", () => {
          document.body.style.cursor = "";
          setHoverData(null);
        });
      },
      [onNodeSelect]
    );

    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      if (cyRef.current && graphData) {
        cyRef.current.layout(LAYOUT as any).run();
        cyRef.current.fit(undefined, 40);
      }
    }, [graphData, clusteringEnabled]);

    useEffect(() => {
      if (graphData && !isLoading) {
        requestAnimationFrame(() => setIsReady(true));
      } else {
        setIsReady(false);
      }
    }, [graphData, isLoading]);

    const nodeCount = graphData?.nodes.length ?? 0;
    const edgeCount = graphData?.edges.length ?? 0;
    const animNodeCount = useAnimatedNumber(nodeCount);
    const animEdgeCount = useAnimatedNumber(edgeCount);

    return (
      <TooltipProvider delayDuration={200}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex items-center justify-center bg-background dot-grid-bg"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse-glow" />
                  <Bitcoin className="h-10 w-10 text-primary animate-spin-slow" />
                </div>
                <p className="text-muted-foreground text-sm">Loading graph…</p>
              </div>
            </motion.div>
          ) : !graphData || graphData.nodes.length === 0 ? (
            <motion.div
              key="empty"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex items-center justify-center bg-background dot-grid-bg relative overflow-hidden"
            >
              <Particles />
              <div className="flex flex-col items-center gap-6 max-w-sm text-center z-10">
                <div className="relative">
                  <div className="absolute inset-0 w-32 h-32 rounded-full border border-dashed border-border -m-4" />
                  <div className="absolute inset-0 w-24 h-24 rounded-full border border-dashed border-border/60 m-0" />
                  <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center border border-border logo-glow">
                    <Bitcoin className="h-8 w-8 text-primary/60" />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-foreground">No Transaction Loaded</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Search for a transaction ID to visualize its ancestry graph, or try demo mode with sample data.
                  </p>
                </div>
                {onDemoActivate && (
                  <Button variant="outline" size="sm" onClick={onDemoActivate} className="text-xs">
                    <Bitcoin className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    Try Demo Mode
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <div key={`graph-${clusteringEnabled}`} ref={containerRef} className={`flex-1 relative bg-background dot-grid-bg transition-opacity duration-500 ${isReady ? "opacity-100" : "opacity-0"}`}>
              <CytoscapeComponent
                elements={elements}
                stylesheet={STYLESHEET}
                layout={LAYOUT as any}
                cy={handleCyInit}
                className="w-full h-full"
                style={{ width: "100%", height: "100%" }}
              />

              <NodeTooltip data={hoverData} position={hoverPos} />
              <GraphLegend clusteringEnabled={clusteringEnabled} />
              <GraphMinimap cy={cyReady} />

              {/* Node/Edge count */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { ...springTransition, delay: 0.3 } }}
                className="absolute bottom-3 left-3 glass rounded-md px-2.5 py-1 text-[11px] font-mono text-muted-foreground z-10"
              >
                {animNodeCount} nodes · {animEdgeCount} edges
              </motion.div>

              {/* Zoom controls */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0, transition: { ...springTransition, delay: 0.4 } }}
                className="absolute bottom-3 right-3 flex flex-col gap-1 z-10"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className={`h-8 w-8 glass ${clusteringEnabled ? "ring-1 ring-[#6366f1]/50 text-[#818cf8]" : ""}`}
                      onClick={() => setClusteringEnabled((v) => !v)}
                    >
                      <Network className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">{clusteringEnabled ? "Disable" : "Enable"} Address Clustering</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 glass" onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.3)}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Zoom In</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 glass" onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.3)}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Zoom Out</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 glass" onClick={() => cyRef.current?.fit(undefined, 40)}>
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Fit to View</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 glass" onClick={() => { cyRef.current?.layout(LAYOUT as any).run(); cyRef.current?.fit(undefined, 40); }}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Reset Layout</TooltipContent>
                </Tooltip>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </TooltipProvider>
    );
  }
);
