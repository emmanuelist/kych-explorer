import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, ChevronDown, ChevronRight, FileText, Check, Shield, Hash, Coins, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchTransaction } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";

interface TransactionDetailsProps {
  selectedTxid: string | null;
}

function CopyPill({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          variants={scaleIn}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground,0_0%_100%))] text-[10px] font-medium whitespace-nowrap"
        >
          Copied!
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function TransactionDetails({ selectedTxid }: TransactionDetailsProps) {
  const { toast } = useToast();
  const { isDemoMode, getDemoTransaction } = useDemoMode();
  const [inputsOpen, setInputsOpen] = useState(true);
  const [outputsOpen, setOutputsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCopyPill, setShowCopyPill] = useState(false);

  const { data: apiTx, isLoading } = useQuery({
    queryKey: ["transaction", selectedTxid],
    queryFn: () => fetchTransaction(selectedTxid!),
    enabled: !!selectedTxid && !isDemoMode,
  });

  const tx = isDemoMode ? (selectedTxid ? getDemoTransaction(selectedTxid) : undefined) : apiTx;

  const animConfirmations = useAnimatedNumber(tx?.confirmations ?? 0);

  const copyTxid = () => {
    if (selectedTxid) {
      navigator.clipboard.writeText(selectedTxid);
      setCopied(true);
      setShowCopyPill(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShowCopyPill(false), 1500);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast({ title: "Copied", description: "Address copied." });
  };

  const truncate = (s: string) => `${s.slice(0, 8)}…${s.slice(-8)}`;

  if (!selectedTxid) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center h-full p-4 gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Select a node to view details.</p>
      </motion.div>
    );
  }

  if (!isDemoMode && isLoading) {
    return (
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded shimmer-bg" />
          <Skeleton className="h-5 w-32 shimmer-bg" />
        </div>
        <Skeleton className="h-8 w-full shimmer-bg rounded-md" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 shimmer-bg rounded-lg" />
          <Skeleton className="h-16 shimmer-bg rounded-lg" />
          <Skeleton className="h-16 shimmer-bg rounded-lg" />
          <Skeleton className="h-16 shimmer-bg rounded-lg" />
        </div>
        <Skeleton className="h-20 w-full shimmer-bg rounded-md" />
      </div>
    );
  }

  if (!tx) return null;

  const confirmBg = tx.confirmations >= 6
    ? "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20"
    : tx.confirmations > 0
    ? "bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20"
    : "bg-destructive/10 border-destructive/20";

  const confirmColor = tx.confirmations >= 6
    ? "text-[hsl(var(--success))]"
    : tx.confirmations > 0
    ? "text-[hsl(var(--warning))]"
    : "text-destructive";

  const confirmLabel = tx.confirmations >= 6 ? "Confirmed" : tx.confirmations > 0 ? "Recent" : "Unconfirmed";

  const metricCards = [
    { key: "status", content: (
      <div className={`rounded-lg border p-2.5 ${confirmBg}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <Shield className={`h-3 w-3 ${confirmColor}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</span>
        </div>
        <span className={`text-xs font-semibold ${confirmColor}`}>{confirmLabel}</span>
      </div>
    )},
    { key: "confirmations", content: (
      <div className="rounded-lg border border-border bg-card/50 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Hash className="h-3 w-3 text-accent" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirmations</span>
        </div>
        <span className="text-xs font-semibold font-mono text-foreground">{animConfirmations.toLocaleString()}</span>
      </div>
    )},
    { key: "value", content: (
      <div className="rounded-lg border border-border bg-card/50 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Coins className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Value</span>
        </div>
        <span className="font-mono text-xs font-semibold text-foreground">
          {tx.total_value.toFixed(8)} <span className="text-primary text-[10px]">BTC</span>
        </span>
      </div>
    )},
    { key: "time", content: (
      <div className="rounded-lg border border-border bg-card/50 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</span>
        </div>
        <span className="text-[11px] text-foreground">{new Date(tx.timestamp * 1000).toLocaleString()}</span>
      </div>
    )},
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedTxid}
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 space-y-4 overflow-y-auto text-sm h-full"
      >
        {/* Section header */}
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground text-sm">Transaction Details</h3>
        </div>

        {/* TXID */}
        <div className="relative flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2 border border-border">
          <code className="font-mono text-xs text-foreground flex-1 truncate">{truncate(tx.txid)}</code>
          <div className="relative">
            <CopyPill show={showCopyPill} />
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copyTxid}>
              {copied ? <Check className="h-3 w-3 text-[hsl(var(--success))]" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Metric cards - 2x2 grid with stagger */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-2"
        >
          {metricCards.map((card) => (
            <motion.div key={card.key} variants={scaleIn}>
              {card.content}
            </motion.div>
          ))}
        </motion.div>

        {/* Inputs */}
        <Collapsible open={inputsOpen} onOpenChange={setInputsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs font-medium">
            {inputsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Inputs ({tx.inputs.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="rounded-md border border-border overflow-hidden">
              {tx.inputs.map((inp, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-1.5 text-xs ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                  <button
                    onClick={() => inp.address && copyAddress(inp.address)}
                    className="font-mono text-muted-foreground hover:text-foreground transition-colors truncate text-left"
                  >
                    {inp.address ? truncate(inp.address) : "coinbase"}
                  </button>
                  {inp.value !== undefined && (
                    <span className="font-mono text-foreground shrink-0 ml-3">
                      {inp.value.toFixed(8)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Outputs */}
        <Collapsible open={outputsOpen} onOpenChange={setOutputsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs font-medium">
            {outputsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Outputs ({tx.outputs.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="rounded-md border border-border overflow-hidden">
              {tx.outputs.map((out, i) => (
                <div key={out.n} className={`flex items-center justify-between px-3 py-1.5 text-xs ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                  <button
                    onClick={() => out.address && copyAddress(out.address)}
                    className="font-mono text-muted-foreground hover:text-foreground transition-colors truncate text-left"
                  >
                    {out.address ? truncate(out.address) : "OP_RETURN"}
                  </button>
                  <span className="font-mono text-foreground shrink-0 ml-3">
                    {out.value.toFixed(8)}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* View on Mempool */}
        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
          <a href={`https://mempool.space/tx/${tx.txid}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            View on Mempool
          </a>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
