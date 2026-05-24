import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Undo2, Loader2 } from "lucide-react";

export type BulkFixSummary = {
  pagesProcessed: number;
  pagesChanged: number;
  perPage: { pageId: string; pageName: string; applied: string[]; skipped: string[] }[];
  seoApplied: string[];
  seoSkipped: string[];
  errors: string[];
};

export function BulkFixSummaryDialog({
  open, onOpenChange, summary, onUndo, canUndo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  summary: BulkFixSummary | null;
  onUndo?: () => Promise<void> | void;
  canUndo?: boolean;
}) {
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);
  useEffect(() => { if (open) setUndone(false); }, [open, summary]);
  if (!summary) return null;

  // Aggregate fix counts across pages. Block fixes look like "alt text (3)",
  // "H1", "navbar", "footer", "cta" — strip parentheses and add the count.
  const parseLabel = (s: string): { type: string; count: number } => {
    const m = s.match(/^(.*?)\s*\((\d+)\)\s*$/);
    if (m) return { type: m[1].trim(), count: Number(m[2]) };
    return { type: s.trim(), count: 1 };
  };
  const appliedByType = new Map<string, number>();
  const skippedByType = new Map<string, number>();
  for (const p of summary.perPage) {
    for (const a of p.applied) {
      const { type, count } = parseLabel(a);
      appliedByType.set(type, (appliedByType.get(type) || 0) + count);
    }
    for (const s of p.skipped) {
      const { type } = parseLabel(s);
      skippedByType.set(type, (skippedByType.get(type) || 0) + 1);
    }
  }
  for (const a of summary.seoApplied) appliedByType.set(a, (appliedByType.get(a) || 0) + 1);
  for (const s of summary.seoSkipped) skippedByType.set(s, (skippedByType.get(s) || 0) + 1);

  const totalApplied = [...appliedByType.values()].reduce((a, b) => a + b, 0);
  const totalSkipped = [...skippedByType.values()].reduce((a, b) => a + b, 0);
  const sortedApplied = [...appliedByType.entries()].sort((a, b) => b[1] - a[1]);
  const sortedSkipped = [...skippedByType.entries()].sort((a, b) => b[1] - a[1]);
  const maxBar = Math.max(1, ...sortedApplied.map(([, n]) => n));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500" />
            Bulk SEO fix complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Pages" value={`${summary.pagesChanged}/${summary.pagesProcessed}`} hint="changed" />
            <Stat label="Applied" value={String(totalApplied)} hint="fixes" tone="ok" />
            <Stat label="Skipped" value={String(totalSkipped)} hint="items" tone="skip" />
          </div>

          {(sortedApplied.length > 0 || sortedSkipped.length > 0) && (
            <Section title="Breakdown by fix type">
              {sortedApplied.length > 0 ? (
                <ul className="space-y-1.5">
                  {sortedApplied.map(([type, count]) => (
                    <li key={`bk-${type}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-emerald-500" />
                          <span className="capitalize">{type}</span>
                        </span>
                        <span className="tabular-nums font-medium">{count}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(count / maxBar) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No automatic fixes were applied.</p>
              )}
              {sortedSkipped.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1.5">Skipped</div>
                  <div className="flex flex-wrap gap-1">
                    {sortedSkipped.map(([type, count]) => (
                      <Badge key={`sk-${type}`} variant="outline" className="text-xs text-muted-foreground">
                        {type} <span className="ml-1 tabular-nums">×{count}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {summary.seoApplied.length + summary.seoSkipped.length > 0 && (
            <Section title="Project SEO">
              {summary.seoApplied.map((a) => (
                <Row key={`sa-${a}`} kind="ok" label={a} />
              ))}
              {summary.seoSkipped.map((a) => (
                <Row key={`ss-${a}`} kind="skip" label={a} />
              ))}
            </Section>
          )}

          {summary.perPage.length > 0 && (
            <Section title="Per page">
              <ul className="space-y-2">
                {summary.perPage.map((p) => (
                  <li key={p.pageId} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{p.pageName}</span>
                      {p.applied.length === 0 && p.skipped.length === 0 ? (
                        <Badge variant="outline" className="text-xs">no changes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{p.applied.length} fixed</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.applied.map((a) => (
                        <Badge key={`a-${a}`} className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15">
                          {a}
                        </Badge>
                      ))}
                      {p.skipped.map((s) => (
                        <Badge key={`s-${s}`} variant="outline" className="text-xs text-muted-foreground">
                          {s} skipped
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {summary.errors.length > 0 && (
            <Section title="Errors">
              <ul className="space-y-1">
                {summary.errors.map((e, i) => (
                  <li key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                    <AlertCircle className="size-3.5 mt-0.5 shrink-0" /> {e}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <DialogFooter className="gap-2">
          {onUndo && canUndo && !undone && (
            <Button
              variant="outline"
              disabled={undoing}
              onClick={async () => {
                setUndoing(true);
                try { await onUndo(); setUndone(true); }
                finally { setUndoing(false); }
              }}
            >
              {undoing ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
              Undo this run
            </Button>
          )}
          {undone && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 self-center mr-auto">
              Reverted to previous state
            </span>
          )}
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "ok" | "skip" }) {
  const valueClass = tone === "ok"
    ? "text-emerald-600 dark:text-emerald-400"
    : tone === "skip"
      ? "text-amber-600 dark:text-amber-400"
      : "";
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{hint}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{title}</h4>
      {children}
    </div>
  );
}

function Row({ kind, label }: { kind: "ok" | "skip"; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {kind === "ok"
        ? <CheckCircle2 className="size-3.5 text-emerald-500" />
        : <AlertCircle className="size-3.5 text-amber-500" />}
      <span className={kind === "skip" ? "text-muted-foreground" : ""}>{label}</span>
    </div>
  );
}
