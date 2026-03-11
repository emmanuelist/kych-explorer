import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { fetchGraph, ApiError } from "@/lib/api";
import { Header } from "@/components/Header";
import { TransactionGraph, TransactionGraphHandle } from "@/components/TransactionGraph";
import { TransactionDetails } from "@/components/TransactionDetails";
import { LabelEditor } from "@/components/LabelEditor";
import { ImportModal } from "@/components/ImportModal";
import { ExportModal } from "@/components/ExportModal";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { GraphBreadcrumb } from "@/components/GraphBreadcrumb";
import { FloatingActions } from "@/components/FloatingActions";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { DemoModeProvider, useDemoMode } from "@/hooks/use-demo-mode";

function IndexContent() {
  const { toast } = useToast();
  const { isDemoMode, toggleDemoMode, demoGraphData, defaultDemoTxid } = useDemoMode();
  const [searchTxid, setSearchTxid] = useState<string | null>(
    () => localStorage.getItem("kych_last_txid") || null
  );
  const [selectedTxid, setSelectedTxid] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const graphRef = useRef<TransactionGraphHandle>(null);

  const {
    data: graphData,
    isLoading: graphLoading,
    error: graphError,
  } = useQuery({
    queryKey: ["graph", searchTxid],
    queryFn: () => fetchGraph(searchTxid!, 3),
    enabled: !!searchTxid && !isDemoMode,
    retry: 1,
  });

  useEffect(() => {
    if (!graphError) return;
    if (graphError instanceof ApiError && graphError.status === 404) {
      toast({
        variant: "destructive",
        title: "Transaction Not Found",
        description: "No transaction exists with that ID. Please check and try again.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch transaction. Please try again later.",
      });
    }
  }, [graphError, toast]);

  useEffect(() => {
    if (isDemoMode) {
      setSearchTxid(defaultDemoTxid);
      setSelectedTxid(defaultDemoTxid);
      setBreadcrumbTrail([defaultDemoTxid]);
    }
  }, [isDemoMode, defaultDemoTxid]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "Escape") {
        setSelectedTxid(null);
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = useCallback(
    (txid: string) => {
      setSearchTxid(txid);
      setSelectedTxid(txid);
      setBreadcrumbTrail((prev) => {
        if (prev[prev.length - 1] === txid) return prev;
        return [...prev, txid];
      });
    },
    []
  );

  const handleNodeSelect = useCallback((txid: string) => {
    setSelectedTxid(txid);
    setBreadcrumbTrail((prev) => {
      if (prev[prev.length - 1] === txid) return prev;
      return [...prev, txid];
    });
  }, []);

  const handleBreadcrumbSelect = useCallback((txid: string) => {
    setSelectedTxid(txid);
    setBreadcrumbTrail((prev) => {
      const idx = prev.indexOf(txid);
      return idx >= 0 ? prev.slice(0, idx + 1) : prev;
    });
  }, []);

  const handleDemoActivate = useCallback(() => {
    if (!isDemoMode) toggleDemoMode();
  }, [isDemoMode, toggleDemoMode]);

  const activeGraphData = isDemoMode ? demoGraphData : graphData;
  const activeLoading = isDemoMode ? false : graphLoading;

  return (
    <div className="flex flex-col h-screen bg-background">
      <OnboardingOverlay />
      {!isDemoMode && <ConnectionBanner onDemoActivate={handleDemoActivate} />}
      <Header
        onSearch={handleSearch}
        onImportClick={() => setImportOpen(true)}
        onExportClick={() => setExportOpen(true)}
        isSearching={activeLoading}
        isDemoMode={isDemoMode}
        onDemoToggle={toggleDemoMode}
        searchInputRef={searchInputRef}
        onCommandPalette={() => setCommandOpen(true)}
      />
      <GraphBreadcrumb trail={breadcrumbTrail} onSelect={handleBreadcrumbSelect} />

      {isMobile ? (
        <div className="flex-1 overflow-y-auto">
          <div className="h-[50vh] min-h-[250px] flex">
            <TransactionGraph
              ref={graphRef}
              graphData={activeGraphData}
              isLoading={activeLoading}
              onNodeSelect={handleNodeSelect}
              onDemoActivate={!isDemoMode ? handleDemoActivate : undefined}
            />
          </div>

          <div className="flex flex-col border-t border-border">
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-foreground border-b border-border hover:bg-muted/50 transition-colors">
                Transaction Details
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <TransactionDetails selectedTxid={selectedTxid} />
              </CollapsibleContent>
            </Collapsible>
            <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-foreground border-b border-border hover:bg-muted/50 transition-colors">
                Label Editor
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${labelsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <LabelEditor selectedTxid={selectedTxid} />
              </CollapsibleContent>
            </Collapsible>
          </div>

          <FloatingActions
            onImport={() => setImportOpen(true)}
            onExport={() => setExportOpen(true)}
            onToggleDemo={toggleDemoMode}
            onFitGraph={() => graphRef.current?.fitGraph()}
            isDemoMode={isDemoMode}
          />
        </div>
      ) : (
        <ResizablePanelGroup
          direction="vertical"
          className="flex-1 min-h-0"
          onLayout={(sizes) => localStorage.setItem("kych_panel_v", JSON.stringify(sizes))}
        >
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full flex">
              <TransactionGraph
                ref={graphRef}
                graphData={activeGraphData}
                isLoading={activeLoading}
                onNodeSelect={handleNodeSelect}
                onDemoActivate={!isDemoMode ? handleDemoActivate : undefined}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={40} minSize={20}>
            <ResizablePanelGroup
              direction="horizontal"
              onLayout={(sizes) => localStorage.setItem("kych_panel_h", JSON.stringify(sizes))}
            >
              <ResizablePanel defaultSize={50} minSize={25}>
                <div className="h-full overflow-hidden">
                  <TransactionDetails selectedTxid={selectedTxid} />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={50} minSize={25}>
                <div className="h-full overflow-hidden">
                  <LabelEditor selectedTxid={selectedTxid} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <StatusBar
        selectedTxid={selectedTxid}
        graphData={activeGraphData}
        isDemoMode={isDemoMode}
      />

      <ImportModal open={importOpen} onOpenChange={setImportOpen} />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onSearch={handleSearch}
        onToggleDemo={toggleDemoMode}
        onImport={() => setImportOpen(true)}
        onExport={() => setExportOpen(true)}
        onFitGraph={() => graphRef.current?.fitGraph()}
        onResetLayout={() => graphRef.current?.resetLayout()}
        onShowShortcuts={() => setShortcutsOpen(true)}
        isDemoMode={isDemoMode}
      />
      <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

const Index = () => (
  <DemoModeProvider>
    <IndexContent />
  </DemoModeProvider>
);

export default Index;
