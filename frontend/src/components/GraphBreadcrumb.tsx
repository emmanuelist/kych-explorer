import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { scaleIn, springTransition } from "@/lib/motion";

interface GraphBreadcrumbProps {
  trail: string[];
  onSelect: (txid: string) => void;
}

export function GraphBreadcrumb({ trail, onSelect }: GraphBreadcrumbProps) {
  const truncate = (s: string) => `${s.slice(0, 6)}…${s.slice(-6)}`;

  return (
    <AnimatePresence>
      {trail.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto", transition: springTransition }}
          exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
          className="flex items-center gap-1 px-4 py-1.5 bg-card/50 border-b border-border overflow-x-auto no-scrollbar"
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium shrink-0 mr-1">Trail</span>
          <AnimatePresence mode="sync">
            {trail.map((txid, i) => (
              <motion.div
                key={`${txid}-${i}`}
                layout
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex items-center gap-1 shrink-0"
              >
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                <motion.button
                  layoutId={`breadcrumb-${txid}`}
                  onClick={() => onSelect(txid)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
                    i === trail.length - 1
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
                  }`}
                >
                  {truncate(txid)}
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
