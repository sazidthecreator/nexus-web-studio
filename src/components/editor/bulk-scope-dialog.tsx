import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2 } from "lucide-react";
import type { SeoFixId } from "@/components/editor/health-panel";

export type BulkScope = {
  pageIds: string[];
  fixIds: SeoFixId[];
  includeProjectSeo: boolean;
};

export type ScopePage = { id: string; name: string };

const FIX_OPTIONS: { id: SeoFixId; label: string; hint: string }[] = [
  { id: "alt", label: "Image alt text", hint: "Fill missing alt on images & gallery items" },
  { id: "h1", label: "Heading hierarchy", hint: "Promote first heading to H1 when missing" },
  { id: "navbar", label: "Add navbar", hint: "Insert if page has none" },
  { id: "footer", label: "Add footer", hint: "Insert if page has none" },
  { id: "cta", label: "Add CTA section", hint: "Insert if page has none" },
];

export function BulkScopeDialog({
  open, onOpenChange, pages, defaultFixIds, includeProjectSeoDefault = true, busy, onRun,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pages: ScopePage[];
  defaultFixIds?: SeoFixId[];
  includeProjectSeoDefault?: boolean;
  busy?: boolean;
  onRun: (scope: BulkScope) => void;
}) {
  const allFixIds = useMemo(() => FIX_OPTIONS.map((f) => f.id), []);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [selectedFixes, setSelectedFixes] = useState<Set<SeoFixId>>(new Set());
  const [includeSeo, setIncludeSeo] = useState(includeProjectSeoDefault);

  // Reset selections each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setSelectedPages(new Set(pages.map((p) => p.id)));
    const preset = (defaultFixIds && defaultFixIds.length > 0)
      ? defaultFixIds.filter((id) => allFixIds.includes(id))
      : allFixIds;
    setSelectedFixes(new Set(preset.length > 0 ? preset : allFixIds));
    setIncludeSeo(includeProjectSeoDefault);
  }, [open, pages, defaultFixIds, includeProjectSeoDefault, allFixIds]);

  const togglePage = (id: string) => {
    const next = new Set(selectedPages);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedPages(next);
  };
  const toggleFix = (id: SeoFixId) => {
    const next = new Set(selectedFixes);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedFixes(next);
  };

  const allPagesSelected = selectedPages.size === pages.length;
  const allFixesSelected = selectedFixes.size === allFixIds.length;
  const canRun = selectedPages.size > 0 && (selectedFixes.size > 0 || includeSeo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4" /> Scoped bulk fix
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pages <Badge variant="outline" className="ml-1 text-[10px]">{selectedPages.size}/{pages.length}</Badge>
              </h4>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setSelectedPages(allPagesSelected ? new Set() : new Set(pages.map((p) => p.id)))}
              >
                {allPagesSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <ul className="max-h-44 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {pages.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={selectedPages.has(p.id)}
                      onCheckedChange={() => togglePage(p.id)}
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fix types <Badge variant="outline" className="ml-1 text-[10px]">{selectedFixes.size}/{allFixIds.length}</Badge>
              </h4>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setSelectedFixes(allFixesSelected ? new Set() : new Set(allFixIds))}
              >
                {allFixesSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <ul className="space-y-1.5">
              {FIX_OPTIONS.map((f) => (
                <li key={f.id}>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedFixes.has(f.id)}
                      onCheckedChange={() => toggleFix(f.id)}
                      className="mt-0.5"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block">{f.label}</span>
                      <span className="block text-xs text-muted-foreground">{f.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-2.5">
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={includeSeo} onCheckedChange={(v) => setIncludeSeo(v === true)} className="mt-0.5" />
              <span className="flex-1">
                <span className="block">Also patch project-level SEO</span>
                <span className="block text-xs text-muted-foreground">Title, description, og:image when missing</span>
              </span>
            </label>
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            disabled={!canRun || busy}
            onClick={() => onRun({
              pageIds: Array.from(selectedPages),
              fixIds: Array.from(selectedFixes),
              includeProjectSeo: includeSeo,
            })}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
            Run on {selectedPages.size} page{selectedPages.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
