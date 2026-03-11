import { useState, useEffect, useCallback } from "react";
import { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty, CommandSeparator } from "@/components/ui/command";
import { Search, Play, Upload, Download, Maximize, RotateCcw, Keyboard } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (txid: string) => void;
  onToggleDemo: () => void;
  onImport: () => void;
  onExport: () => void;
  onFitGraph?: () => void;
  onResetLayout?: () => void;
  onShowShortcuts: () => void;
  isDemoMode: boolean;
}

export function CommandPalette({
  open,
  onOpenChange,
  onSearch,
  onToggleDemo,
  onImport,
  onExport,
  onFitGraph,
  onResetLayout,
  onShowShortcuts,
  isDemoMode,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const recentTxids: string[] = (() => {
    try {
      const stored = localStorage.getItem("kych_recent_txids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  const isValidTxid = /^[a-fA-F0-9]{64}$/.test(query.trim());

  const handleSearchSubmit = () => {
    if (isValidTxid) {
      // Save to recent
      const trimmed = query.trim();
      const updated = [trimmed, ...recentTxids.filter((t) => t !== trimmed)].slice(0, 5);
      localStorage.setItem("kych_recent_txids", JSON.stringify(updated));
      localStorage.setItem("kych_last_txid", trimmed);
      onSearch(trimmed);
      onOpenChange(false);
    }
  };

  const truncate = (s: string) => `${s.slice(0, 10)}…${s.slice(-10)}`;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search transaction ID or type a command…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {isValidTxid && (
          <CommandGroup heading="Search">
            <CommandItem onSelect={handleSearchSubmit}>
              <Search className="mr-2 h-4 w-4" />
              <span className="font-mono text-xs">{truncate(query.trim())}</span>
            </CommandItem>
          </CommandGroup>
        )}

        {recentTxids.length > 0 && (
          <CommandGroup heading="Recent Transactions">
            {recentTxids.map((txid) => (
              <CommandItem
                key={txid}
                onSelect={() => {
                  onSearch(txid);
                  onOpenChange(false);
                }}
              >
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">{truncate(txid)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => { onToggleDemo(); onOpenChange(false); }}>
            <Play className="mr-2 h-4 w-4" />
            {isDemoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
          </CommandItem>
          <CommandItem onSelect={() => { onImport(); onOpenChange(false); }}>
            <Upload className="mr-2 h-4 w-4" />
            Import Labels
          </CommandItem>
          <CommandItem onSelect={() => { onExport(); onOpenChange(false); }}>
            <Download className="mr-2 h-4 w-4" />
            Export Labels
          </CommandItem>
          {onFitGraph && (
            <CommandItem onSelect={() => { onFitGraph(); onOpenChange(false); }}>
              <Maximize className="mr-2 h-4 w-4" />
              Fit Graph to View
            </CommandItem>
          )}
          {onResetLayout && (
            <CommandItem onSelect={() => { onResetLayout(); onOpenChange(false); }}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Graph Layout
            </CommandItem>
          )}
          <CommandItem onSelect={() => { onShowShortcuts(); onOpenChange(false); }}>
            <Keyboard className="mr-2 h-4 w-4" />
            Keyboard Shortcuts
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
