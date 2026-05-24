// Version history: list snapshots, restore, save manual snapshot.
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, RotateCcw, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { ProjectContent } from "@/lib/blocks";

export function VersionHistory({
  open, onOpenChange, projectId, currentContent, onRestore,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  currentContent: ProjectContent | null;
  onRestore: (content: ProjectContent) => void;
}) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["snapshots", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_snapshots")
        .select("id, label, created_at, content")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!currentContent) throw new Error("Nothing to snapshot");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("project_snapshots").insert({
        project_id: projectId,
        user_id: u.user.id,
        content: currentContent as any,
        label: label.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      qc.invalidateQueries({ queryKey: ["snapshots", projectId] });
      toast.success("Snapshot saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_snapshots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshots", projectId] }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><History className="size-4" /> Version history</SheetTitle>
          <SheetDescription>Last 20 snapshots are kept automatically.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Optional label" />
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Save
          </Button>
        </div>

        <div className="mt-6 space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading…</div>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet.</p>
          ) : (
            snapshots.map((s: any) => (
              <div key={s.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {s.label || formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title="Restore" aria-label="Restore snapshot"
                    onClick={() => {
                      onRestore(s.content as ProjectContent);
                      toast.success("Restored");
                      onOpenChange(false);
                    }}>
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Delete" aria-label="Delete snapshot"
                    onClick={() => remove.mutate(s.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
