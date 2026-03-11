import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { slideDown } from "@/lib/motion";

interface ConnectionBannerProps {
  onDemoActivate?: () => void;
}

export function ConnectionBanner({ onDemoActivate }: ConnectionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const { isError } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error();
      return true;
    },
    retry: false,
    refetchInterval: 15000,
  });

  return (
    <AnimatePresence>
      {isError && !dismissed && (
        <motion.div
          variants={slideDown}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive px-4 py-2 text-sm relative"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Backend API unreachable.{" "}
            {onDemoActivate && (
              <button onClick={onDemoActivate} className="underline font-medium hover:text-destructive/80 transition-colors">
                Try Demo Mode
              </button>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 absolute right-2 text-destructive hover:text-destructive/80"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
