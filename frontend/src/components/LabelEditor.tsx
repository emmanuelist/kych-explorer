import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Save, Tag, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchLabelsByRef, createLabel, updateLabel, deleteLabel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { fadeInUp, scaleIn, springTransition } from "@/lib/motion";
import type { LabelType, BIP329Label } from "@/types";

interface LabelEditorProps {
  selectedTxid: string | null;
}

export function LabelEditor({ selectedTxid }: LabelEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isDemoMode, getDemoLabels, createDemoLabel, updateDemoLabel, deleteDemoLabel } = useDemoMode();

  const [labelType, setLabelType] = useState<LabelType>("tx");
  const [ref, setRef] = useState("");
  const [labelText, setLabelText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [demoTick, setDemoTick] = useState(0);

  useEffect(() => {
    if (selectedTxid) {
      setRef(selectedTxid);
      setLabelType("tx");
      setLabelText("");
      setEditingId(null);
    }
  }, [selectedTxid]);

  const { data: apiLabels = [] } = useQuery({
    queryKey: ["labels", ref],
    queryFn: () => fetchLabelsByRef(ref),
    enabled: !!ref && !isDemoMode,
  });

  const labels = isDemoMode ? getDemoLabels(ref) : apiLabels;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["labels"] });
    queryClient.invalidateQueries({ queryKey: ["graph"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editingId
        ? updateLabel(editingId, { type: labelType, ref, label: labelText })
        : createLabel({ type: labelType, ref, label: labelText }),
    onSuccess: () => {
      toast({ title: "Label saved" });
      setLabelText("");
      setEditingId(null);
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => {
      toast({ title: "Label deleted" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (isDemoMode) {
      if (editingId) {
        updateDemoLabel(editingId, { type: labelType, ref, label: labelText });
      } else {
        createDemoLabel({ type: labelType, ref, label: labelText });
      }
      toast({ title: "Label saved" });
      setLabelText("");
      setEditingId(null);
      setDemoTick((t) => t + 1);
      return;
    }
    saveMutation.mutate();
  };

  const handleDelete = (id: string) => {
    if (isDemoMode) {
      deleteDemoLabel(id);
      toast({ title: "Label deleted" });
      setDemoTick((t) => t + 1);
      return;
    }
    deleteMutation.mutate(id);
  };

  const startEdit = (l: BIP329Label) => {
    setEditingId(l.id || null);
    setLabelType(l.type);
    setRef(l.ref);
    setLabelText(l.label);
  };

  if (!selectedTxid) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center h-full p-4 gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Tag className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Select a node to manage labels.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`${selectedTxid}-${demoTick}`}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="p-4 space-y-4 overflow-y-auto text-sm h-full"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground text-sm">
            Labels{labels.length > 0 && ` (${labels.length})`}
          </h3>
        </div>
      </div>

      {/* Form */}
      <motion.div
        animate={{
          borderColor: editingId ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))",
          backgroundColor: editingId ? "hsl(var(--primary) / 0.05)" : "transparent",
        }}
        transition={{ duration: 0.2 }}
        className="space-y-3 rounded-lg border p-3"
      >
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Type</label>
          <Select value={labelType} onValueChange={(v) => setLabelType(v as LabelType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tx">tx</SelectItem>
              <SelectItem value="addr">addr</SelectItem>
              <SelectItem value="input">input</SelectItem>
              <SelectItem value="output">output</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reference</label>
          <Input
            className="h-8 font-mono text-xs"
            placeholder="Transaction ID or address"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">The txid, address, or input/output ref</p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Label</label>
          <Input
            className="h-8 text-xs"
            placeholder="e.g. Exchange deposit, Mining reward"
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
          />
        </div>

        <Button
          size="sm"
          className="w-full"
          disabled={!labelText.trim() || (!isDemoMode && saveMutation.isPending)}
          onClick={handleSave}
        >
          {editingId ? <Save className="h-3 w-3 mr-1.5" /> : <Plus className="h-3 w-3 mr-1.5" />}
          {editingId ? "Update Label" : "Add Label"}
        </Button>
      </motion.div>

      {/* Existing labels */}
      {labels.length > 0 ? (
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Existing</span>
          <AnimatePresence mode="popLayout">
            {labels.map((l) => (
              <motion.div
                key={l.id || l.ref}
                layout
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
                className="group flex items-center justify-between gap-2 p-2.5 rounded-md border border-border bg-card hover:border-muted-foreground/30 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <Tag className="h-3 w-3 text-accent shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-accent font-mono">[{l.type}]</span>{" "}
                    <span className="text-xs text-foreground">{l.label}</span>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(l)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Label</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this label?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => l.id && handleDelete(l.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">No labels yet. Add one above.</p>
      )}
    </motion.div>
  );
}
