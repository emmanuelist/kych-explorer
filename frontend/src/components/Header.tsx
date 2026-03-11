import { useState } from "react";
import { Search, Upload, Download, Bitcoin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { scaleIn } from "@/lib/motion";

interface HeaderProps {
  onSearch: (txid: string) => void;
  onImportClick: () => void;
  onExportClick: () => void;
  isSearching?: boolean;
  isDemoMode?: boolean;
  onDemoToggle?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  onCommandPalette?: () => void;
}

const TXID_REGEX = /^[a-fA-F0-9]{64}$/;

export function Header({ onSearch, onImportClick, onExportClick, isSearching, isDemoMode, onDemoToggle, searchInputRef, onCommandPalette }: HeaderProps) {
  const [txidInput, setTxidInput] = useState(() =>
    localStorage.getItem("kych_last_txid") || ""
  );
  const { toast } = useToast();

  const handleSearch = () => {
    const trimmed = txidInput.trim();
    if (!TXID_REGEX.test(trimmed)) {
      toast({
        title: "Invalid Transaction ID",
        description: "Please enter a valid 64-character hex transaction ID.",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem("kych_last_txid", trimmed);
    onSearch(trimmed);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <header className="flex flex-wrap items-center gap-3 gradient-border-bottom bg-card px-4 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 logo-glow">
            <Bitcoin className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground hidden sm:inline">
            KYCH
          </span>
          <AnimatePresence>
            {isDemoMode && (
              <motion.div
                layoutId="demo-badge"
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary text-[10px] px-1.5 py-0 h-5">
                  DEMO
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onImportClick} className="h-8 px-2.5">
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline ml-1.5">Import</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import BIP-329 labels</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onExportClick} className="h-8 px-2.5">
                <Download className="h-4 w-4" />
                <span className="hidden md:inline ml-1.5">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export labels as .jsonl</TooltipContent>
          </Tooltip>

          {onDemoToggle && (
            <>
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={isDemoMode} onCheckedChange={onDemoToggle} className="scale-90" />
                    <span className="text-xs text-muted-foreground hidden sm:inline">Demo</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Toggle sample data for exploring without a backend</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 order-last sm:order-none mt-2 sm:mt-0 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              className={`font-mono text-sm pl-8 pr-16 h-9 transition-shadow duration-300 ${isSearching ? "ring-2 ring-primary/40" : ""}`}
              placeholder="Enter transaction ID (64-char hex)"
              value={txidInput}
              onChange={(e) => setTxidInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              onClick={onCommandPalette}
              maxLength={64}
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={onCommandPalette}
            >
              ⌘K
            </kbd>
          </div>
          <Button onClick={handleSearch} disabled={isSearching} size="sm" className="h-9">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="hidden sm:inline ml-1.5">{isSearching ? "Searching" : "Search"}</span>
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}
