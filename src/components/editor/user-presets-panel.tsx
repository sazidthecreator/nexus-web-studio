// Sheet panel for the user's saved block presets.
// Insert clones into the canvas with fresh ids; delete removes from the DB.
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listUserPresets, deleteUserPreset, type UserPreset } from "@/lib/user-presets.functions";
import { uid, type Block } from "@/lib/blocks";

export function UserPresetsPanel({
  open, onOpenChange, onInsert,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Receives a fresh-id clone of the saved blocks to append to the page. */
  onInsert: (blocks: Block[]) => void;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listUserPresets);
  const delFn = useServerFn(deleteUserPreset);

  const { data, isLoading } = useQuery({
    queryKey: ["user_presets"],
    queryFn: () => listFn(),
    enabled: open,
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_presets"] });
      toast.success("Preset deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  function insert(p: UserPreset) {
    const cloned: Block[] = p.blocks.map((b) => ({
      ...b,
      id: uid(b.type),
      props: JSON.parse(JSON.stringify(b.props || {})),
    })) as Block[];
    onInsert(cloned);
    toast.success(`Inserted "${p.name}"`);
    onOpenChange(false);
  }

  const presets = data?.presets ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Bookmark className="size-4" /> My presets</SheetTitle>
          <SheetDescription>
            Your saved block groups. Right-click any block on the canvas and choose "Save as preset" to add one.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {isLoading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading…</div>
          )}
          {!isLoading && presets.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No saved presets yet.
            </div>
          )}
          {presets.map((p) => (
            <div key={p.id} className="rounded-md border border-border p-3 flex items-center gap-3">
              {p.thumbnail ? (
                <img src={p.thumbnail} alt="" className="size-12 rounded object-cover border border-border" />
              ) : (
                <div className="size-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                  {p.blocks.length}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.category || "Custom"} · {p.blocks.length} block{p.blocks.length === 1 ? "" : "s"}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => insert(p)} title="Insert" aria-label={`Insert preset ${p.name}`}>
                <Plus className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={del.isPending}
                onClick={() => {
                  if (window.confirm(`Delete preset "${p.name}"?`)) del.mutate(p.id);
                }}
                title="Delete"
                aria-label={`Delete preset ${p.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
