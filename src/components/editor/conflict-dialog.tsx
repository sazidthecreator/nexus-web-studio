import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, GitMerge, Cloud, Laptop } from "lucide-react";
import { diffStats } from "@/lib/sync/conflict";
import type { ProjectContent } from "@/lib/blocks";

export type ConflictChoice = "local" | "remote" | "merge";

export function ConflictDialog({
  open,
  onOpenChange,
  local,
  remote,
  remoteUpdatedAt,
  onResolve,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  local: ProjectContent | null;
  remote: ProjectContent | null;
  remoteUpdatedAt: number | null;
  onResolve: (choice: ConflictChoice) => void;
}) {
  const stats = local && remote ? diffStats(local, remote) : null;
  const remoteWhen = remoteUpdatedAt ? new Date(remoteUpdatedAt).toLocaleString() : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" /> Sync conflict
          </DialogTitle>
          <DialogDescription>
            Someone else (or another tab) saved this project after you started editing. Pick how to resolve it — your local edits are preserved either way.
          </DialogDescription>
        </DialogHeader>

        {stats && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat icon={Laptop} label="Your version" value={`${stats.localBlocks} block(s)`} sub={`${stats.localOnly} only here`} />
            <Stat icon={Cloud} label="Server version" value={`${stats.remoteBlocks} block(s)`} sub={`${stats.remoteOnly} only there · saved ${remoteWhen}`} />
          </div>
        )}

        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => onResolve("remote")}>
            <Cloud className="size-4" /> Use server's
          </Button>
          <Button variant="outline" onClick={() => onResolve("local")}>
            <Laptop className="size-4" /> Keep mine
          </Button>
          <Button onClick={() => onResolve("merge")}>
            <GitMerge className="size-4" /> Merge both
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
