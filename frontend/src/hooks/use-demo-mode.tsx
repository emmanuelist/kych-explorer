import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  DEMO_TXIDS,
  DEMO_TRANSACTIONS,
  DEMO_GRAPH,
  DEMO_LABELS,
} from "@/lib/mock-data";
import type { Transaction, BIP329Label, CytoscapeGraph, LabelType } from "@/types";

interface DemoModeContextValue {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  demoGraphData: CytoscapeGraph;
  defaultDemoTxid: string;
  getDemoTransaction: (txid: string) => Transaction | undefined;
  getDemoLabels: (ref: string) => BIP329Label[];
  createDemoLabel: (label: Omit<BIP329Label, "id">) => BIP329Label;
  updateDemoLabel: (id: string, updates: Partial<BIP329Label>) => BIP329Label;
  deleteDemoLabel: (id: string) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(
    () => localStorage.getItem("kych_demo_mode") === "true"
  );
  const [labels, setLabels] = useState<BIP329Label[]>(() => [...DEMO_LABELS]);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev;
      localStorage.setItem("kych_demo_mode", String(next));
      if (next) setLabels([...DEMO_LABELS]); // reset labels on re-enable
      return next;
    });
  }, []);

  const getDemoTransaction = useCallback(
    (txid: string) => DEMO_TRANSACTIONS[txid],
    []
  );

  const getDemoLabels = useCallback(
    (ref: string) => labels.filter((l) => l.ref === ref),
    [labels]
  );

  const createDemoLabel = useCallback(
    (label: Omit<BIP329Label, "id">) => {
      const newLabel: BIP329Label = { ...label, id: `demo-${Date.now()}` };
      setLabels((prev) => [...prev, newLabel]);
      return newLabel;
    },
    []
  );

  const updateDemoLabel = useCallback(
    (id: string, updates: Partial<BIP329Label>) => {
      let updated: BIP329Label | undefined;
      setLabels((prev) =>
        prev.map((l) => {
          if (l.id === id) {
            updated = { ...l, ...updates };
            return updated;
          }
          return l;
        })
      );
      return updated!;
    },
    []
  );

  const deleteDemoLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode,
        demoGraphData: DEMO_GRAPH,
        defaultDemoTxid: DEMO_TXIDS.coinbase,
        getDemoTransaction,
        getDemoLabels,
        createDemoLabel,
        updateDemoLabel,
        deleteDemoLabel,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used within DemoModeProvider");
  return ctx;
}
