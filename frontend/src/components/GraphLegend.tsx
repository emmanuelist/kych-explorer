import { motion } from "framer-motion";
import { slideInLeft } from "@/lib/motion";

interface GraphLegendProps {
  clusteringEnabled?: boolean;
}

export function GraphLegend({ clusteringEnabled }: GraphLegendProps) {
  const items = [
    { color: "bg-accent", label: "Regular" },
    { color: "bg-[hsl(142,71%,45%)]", label: "Labeled" },
    { color: "bg-muted-foreground", label: "Coinbase" },
    { color: "bg-primary", label: "Selected" },
    { color: "bg-accent", border: true, borderColor: "border-[hsl(239,84%,67%)]", label: "Expandable" },
    ...(clusteringEnabled
      ? [{ color: "bg-[hsl(239,84%,67%)]", border: true, borderColor: "border-[hsl(239,84%,67%)]/50", label: "Cluster" }]
      : []),
  ];

  return (
    <motion.div
      variants={slideInLeft}
      initial="initial"
      animate="animate"
      className="absolute top-3 left-3 glass rounded-lg px-3 py-2 space-y-1.5 z-10"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Legend</span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${item.color} ${"border" in item && item.border ? `border border-dashed ${(item as any).borderColor || ""}` : ""}`}
          />
          <span className="text-[11px] text-foreground">{item.label}</span>
        </div>
      ))}
    </motion.div>
  );
}
