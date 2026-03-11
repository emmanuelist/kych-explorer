import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { fetchLabels, exportLabelsUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const { data: labels } = useQuery({
    queryKey: ["labels"],
    queryFn: fetchLabels,
    enabled: open,
  });

  const breakdown = useMemo(() => {
    if (!labels) return {};
    return labels.reduce<Record<string, number>>((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {});
  }, [labels]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export BIP-329 Labels</DialogTitle>
          <DialogDescription>Download all labels as a BIP-329 .jsonl file.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total labels</span>
            <span className="text-foreground font-medium font-mono">{labels?.length ?? "…"}</span>
          </div>

          {Object.keys(breakdown).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(breakdown).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs font-mono">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button asChild className="w-full">
          <a href={exportLabelsUrl()} download="labels.jsonl">
            <Download className="h-4 w-4 mr-2" />
            Download Labels
          </a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
