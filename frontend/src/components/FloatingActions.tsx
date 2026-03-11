import { useState } from "react";
import { Plus, Upload, Download, Play, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { springTransition } from "@/lib/motion";

interface FloatingActionsProps {
  onImport: () => void;
  onExport: () => void;
  onToggleDemo: () => void;
  onFitGraph?: () => void;
  isDemoMode: boolean;
}

export function FloatingActions({ onImport, onExport, onToggleDemo, onFitGraph, isDemoMode }: FloatingActionsProps) {
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: Upload, label: "Import", onClick: onImport },
    { icon: Download, label: "Export", onClick: onExport },
    { icon: Play, label: isDemoMode ? "Exit Demo" : "Demo", onClick: onToggleDemo },
    ...(onFitGraph ? [{ icon: Maximize, label: "Fit", onClick: onFitGraph }] : []),
  ];

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-center gap-2">
      <AnimatePresence>
        {open &&
          actions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.3, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: { ...springTransition, delay: i * 0.04 },
              }}
              exit={{
                opacity: 0,
                scale: 0.3,
                y: 10,
                transition: { duration: 0.15, delay: (actions.length - 1 - i) * 0.03 },
              }}
            >
              <Button
                size="icon"
                variant="secondary"
                className="h-10 w-10 rounded-full shadow-lg glass"
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                title={action.label}
              >
                <action.icon className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
      </AnimatePresence>
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-xl"
        onClick={() => setOpen(!open)}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={springTransition}
        >
          <Plus className="h-5 w-5" />
        </motion.div>
      </Button>
    </div>
  );
}
