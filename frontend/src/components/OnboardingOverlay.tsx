import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { scaleIn, staggerContainer, springTransition } from "@/lib/motion";

export function OnboardingOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("kych_onboarded")) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("kych_onboarded", "true");
    setShow(false);
  };

  const steps = [
    { num: 1, title: "Search any Bitcoin transaction", desc: "Paste a 64-character TXID to explore its ancestry graph" },
    { num: 2, title: "Or explore with sample data", desc: "Toggle Demo Mode to instantly see the tool in action" },
    { num: 3, title: "Visualize transaction ancestry", desc: "Click nodes to inspect details, drag to pan, scroll to zoom" },
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: springTransition }}
            exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }}
            className="relative max-w-md w-full mx-4 space-y-6"
          >
            <h2 className="text-xl font-bold text-foreground text-center">Welcome to KYCH</h2>
            <p className="text-sm text-muted-foreground text-center">Bitcoin transaction ancestry explorer</p>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {steps.map((step) => (
                <motion.div
                  key={step.num}
                  variants={scaleIn}
                  className="flex gap-3 p-3 rounded-lg border border-border bg-card/80"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={dismiss} className="w-full">
                Got it, let's explore
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
