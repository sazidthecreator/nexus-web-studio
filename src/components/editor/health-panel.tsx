import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Activity, Link2, Eye, Search, Loader2, Wand2, ExternalLink, RefreshCw, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import type { ProjectContent } from "@/lib/blocks";
import { gradeSeo, type SeoReport } from "@/lib/health/seo-grader";
import { scanLinks, crawlExternalLinksFull, type LinkIssue } from "@/lib/health/link-scanner";
import { scanA11y, type A11yIssue } from "@/lib/health/a11y-scanner";
import {
  loadLinkCache, loadLinkCacheMeta, saveLinkCache, clearLinkCache, diffLinkCache,
  type LinkCache, type LinkCacheMeta, type LinkDiff,
} from "@/lib/health/link-cache";
import {
  loadLinkSchedule, saveLinkSchedule, isDue, nextDueIn, formatDuration,
  type LinkScheduleSettings, type LinkScheduleIntervalHours,
} from "@/lib/health/link-schedule";
import {
  loadFixQueue, enqueueSuggestion, dismissSuggestion, clearFixQueue, buildSuggestion,
  type FixSuggestion,
} from "@/lib/health/fix-queue";
import { BulkScopeDialog } from "@/components/editor/bulk-scope-dialog";

export type HealthSummary = {
  score: number;
  seo: number;
  a11y: number;
  links: number;
};

export function useHealth(content: ProjectContent | null, seo: any, canvasSelector = ".editor-canvas-frame") {
  const [summary, setSummary] = useState<HealthSummary>({ score: 0, seo: 0, a11y: 100, links: 100 });
  const [seoReport, setSeoReport] = useState<SeoReport | null>(null);
  const [linkIssues, setLinkIssues] = useState<LinkIssue[]>([]);
  const [a11yIssues, setA11yIssues] = useState<A11yIssue[]>([]);

  useEffect(() => {
    if (!content) return;
    const t = window.setTimeout(async () => {
      const sr = gradeSeo(content, seo || {});
      const li = scanLinks(content);
      const linkScore = Math.max(0, 100 - li.length * 10);
      let a11yScore = 100;
      let a11y: A11yIssue[] = [];
      try {
        const root = document.querySelector(canvasSelector) as HTMLElement | null;
        if (root) {
          a11y = await scanA11y(root);
          const weights = { critical: 25, serious: 15, moderate: 8, minor: 3 };
          a11yScore = Math.max(0, 100 - a11y.reduce((s, i) => s + weights[i.impact], 0));
        }
      } catch { /* axe may fail on hydration; ignore */ }
      setSeoReport(sr);
      setLinkIssues(li);
      setA11yIssues(a11y);
      const score = Math.round(sr.score * 0.4 + a11yScore * 0.35 + linkScore * 0.25);
      setSummary({ score, seo: sr.score, a11y: a11yScore, links: linkScore });
    }, 700);
    return () => window.clearTimeout(t);
  }, [content, seo, canvasSelector]);

  return { summary, seoReport, linkIssues, a11yIssues };
}

export function HealthBadge({ score, onClick }: { score: number; onClick: () => void }) {
  const tone = score >= 85 ? "emerald" : score >= 65 ? "amber" : "rose";
  const Icon = score >= 85 ? CheckCircle2 : score >= 65 ? AlertTriangle : XCircle;
  return (
    <button
      onClick={onClick}
      title="Site health"
      className={`inline-flex items-center gap-1.5 px-2 h-8 rounded-md text-xs font-semibold border transition-colors
        ${tone === "emerald" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}
        ${tone === "amber" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : ""}
        ${tone === "rose" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : ""}`}
    >
      <Icon className="size-3.5" /> {score}
    </button>
  );
}

export type SeoFixId =
  | "title" | "desc" | "h1" | "alt" | "links" | "og" | "content" | "footer" | "cta" | "navbar";

export type BulkPageStatus = "pending" | "fixing" | "done" | "error";
export type BulkProgress = {
  total: number;
  done: number;
  pages: { id: string; name: string; status: BulkPageStatus; appliedCount?: number; skippedCount?: number; error?: string }[];
  phase: "pages" | "seo" | "complete";
};

export type BulkScope = {
  pageIds: string[];
  fixIds: SeoFixId[];
  includeProjectSeo: boolean;
};

export function HealthPanel({
  open, onOpenChange, summary, seoReport, linkIssues, a11yIssues, content, projectId, onFixSeo, onFixAllSeo, onBulkFixAllPages, onJumpBlock,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  summary: HealthSummary;
  seoReport: SeoReport | null;
  linkIssues: LinkIssue[];
  a11yIssues: A11yIssue[];
  content?: ProjectContent | null;
  projectId?: string;
  onFixSeo?: (id: SeoFixId) => void;
  onFixAllSeo?: (ids: SeoFixId[]) => Promise<void> | void;
  onBulkFixAllPages?: (onProgress: (p: BulkProgress) => void, scope?: BulkScope) => Promise<void> | void;
  onJumpBlock?: (blockId: string) => void;
}) {
  const [fixingAll, setFixingAll] = useState(false);
  const [bulkFixing, setBulkFixing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState({ done: 0, total: 0 });
  const [deadLinks, setDeadLinks] = useState<LinkIssue[]>([]);
  const [linkCache, setLinkCache] = useState<LinkCache>({});
  const [linkMeta, setLinkMeta] = useState<LinkCacheMeta | null>(null);
  const [linkDiff, setLinkDiff] = useState<LinkDiff | null>(null);
  const [schedule, setSchedule] = useState<LinkScheduleSettings>({ enabled: false, intervalHours: 0, lastRunAt: 0 });
  const [fixQueue, setFixQueue] = useState<FixSuggestion[]>([]);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopePresetFixIds, setScopePresetFixIds] = useState<SeoFixId[] | undefined>(undefined);
  const [scopePendingSuggestionId, setScopePendingSuggestionId] = useState<string | null>(null);
  const [, setNowTick] = useState(0);

  // Latest seoReport for the background scheduler suggestion logic.
  const seoReportRef = useRef(seoReport);
  useEffect(() => { seoReportRef.current = seoReport; }, [seoReport]);

  // Latest values for the background scheduler — avoids stale closures.
  const contentRef = useRef(content);
  const cacheRef = useRef(linkCache);
  const crawlingRef = useRef(crawling);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { cacheRef.current = linkCache; }, [linkCache]);
  useEffect(() => { crawlingRef.current = crawling; }, [crawling]);

  // Hydrate cached results + schedule when project changes.
  useEffect(() => {
    if (!projectId) return;
    const cache = loadLinkCache(projectId);
    setLinkCache(cache);
    setLinkMeta(loadLinkCacheMeta(projectId));
    const cached: LinkIssue[] = Object.entries(cache)
      .filter(([, v]) => !v.ok)
      .map(([url, v]) => ({ blockId: "", blockType: "cached", url, kind: "dead-external", hint: v.reason }));
    setDeadLinks(cached);
    setLinkDiff(null);
    setSchedule(loadLinkSchedule(projectId));
    setFixQueue(loadFixQueue(projectId));
  }, [projectId]);

  async function performCrawl(silent = false): Promise<void> {
    const c = contentRef.current;
    if (!c || crawlingRef.current) return;
    setCrawling(true);
    setCrawlProgress({ done: 0, total: 0 });
    try {
      const results = await crawlExternalLinksFull(c, {
        concurrency: 4,
        timeoutMs: 6000,
        onProgress: (done: number, total: number) => setCrawlProgress({ done, total }),
      });
      const nextCache: LinkCache = {};
      for (const r of results) {
        nextCache[r.url] = { ok: r.ok, checkedAt: Date.now(), reason: r.reason };
      }
      const diff = diffLinkCache(cacheRef.current, nextCache);
      const meta: LinkCacheMeta = {
        lastCrawlAt: Date.now(),
        total: results.length,
        dead: results.filter((r) => !r.ok).length,
      };
      if (projectId) {
        saveLinkCache(projectId, nextCache, meta);
        const next = { ...loadLinkSchedule(projectId), lastRunAt: meta.lastCrawlAt };
        saveLinkSchedule(projectId, next);
        setSchedule(next);
      }
      setLinkCache(nextCache);
      setLinkMeta(meta);
      setLinkDiff(diff);
      setDeadLinks(
        results
          .filter((r) => !r.ok)
          .map((r) => ({ blockId: r.blockId, blockType: r.blockType, url: r.url, kind: "dead-external", hint: r.reason })),
      );
      if (silent && diff.newlyBroken.length > 0) {
        toast.error(`${diff.newlyBroken.length} new broken link${diff.newlyBroken.length === 1 ? "" : "s"} detected`, {
          description: diff.newlyBroken.slice(0, 3).join(", ") + (diff.newlyBroken.length > 3 ? "…" : ""),
        });
      } else if (silent && diff.recovered.length > 0) {
        toast.success(`${diff.recovered.length} link${diff.recovered.length === 1 ? "" : "s"} recovered`);
      }

      // Auto-suggest a relevant bulk SEO fix when a regression is detected.
      if (projectId && onBulkFixAllPages) {
        const partial = buildSuggestion(diff, seoReportRef.current);
        if (partial && diff.newlyBroken.length > 0) {
          const next = enqueueSuggestion(projectId, partial);
          setFixQueue(next);
          if (silent) {
            toast("Suggested bulk fix queued", {
              description: partial.reason,
              action: {
                label: "Open Health",
                onClick: () => onOpenChange(true),
              },
            });
          }
        }
      }
    } finally {
      setCrawling(false);
    }
  }

  // Background scheduler: tick every 30s; if a run is due, fire crawl quietly.
  useEffect(() => {
    if (!projectId || !schedule.enabled || schedule.intervalHours === 0) return;
    const tick = () => {
      setNowTick((n) => n + 1); // refresh "next in" label
      const fresh = loadLinkSchedule(projectId);
      if (isDue(fresh) && !crawlingRef.current && contentRef.current) {
        void performCrawl(true);
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, schedule.enabled, schedule.intervalHours]);

  function updateSchedule(intervalHours: LinkScheduleIntervalHours) {
    if (!projectId) return;
    const next: LinkScheduleSettings = {
      ...schedule,
      enabled: intervalHours !== 0,
      intervalHours,
    };
    saveLinkSchedule(projectId, next);
    setSchedule(next);
  }

  async function runCrawl() {
    await performCrawl(false);
  }

  function handleClearCache() {
    if (!projectId) return;
    clearLinkCache(projectId);
    setLinkCache({});
    setLinkMeta(null);
    setLinkDiff(null);
    setDeadLinks([]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="size-4" /> Site Health
            <Badge variant="outline" className="ml-auto text-base">{summary.score}/100</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          <Dimension label="SEO" value={summary.seo} icon={<Search className="size-3.5" />} />
          <Dimension label="Accessibility" value={summary.a11y} icon={<Eye className="size-3.5" />} />
          <Dimension label="Links" value={summary.links} icon={<Link2 className="size-3.5" />} />
        </div>

        {projectId && fixQueue.length > 0 && onBulkFixAllPages && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <Wand2 className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Auto-suggested bulk fix</div>
                <div className="text-xs text-muted-foreground truncate">{fixQueue[0].reason}</div>
                {fixQueue[0].fixIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {fixQueue[0].fixIds.slice(0, 6).map((id) => (
                      <Badge key={id} variant="outline" className="text-[10px] h-4 px-1">{id}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  if (!projectId) return;
                  const next = dismissSuggestion(projectId, fixQueue[0].id);
                  setFixQueue(next);
                }}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={bulkFixing || fixingAll}
                onClick={() => {
                  setScopePresetFixIds(fixQueue[0].fixIds);
                  setScopePendingSuggestionId(fixQueue[0].id);
                  setScopeOpen(true);
                }}
              >
                <Wand2 className="size-3" />
                Review &amp; run
              </Button>
            </div>
            {fixQueue.length > 1 && (
              <div className="text-[10px] text-muted-foreground text-right">
                +{fixQueue.length - 1} earlier suggestion{fixQueue.length - 1 === 1 ? "" : "s"} in queue
              </div>
            )}
          </div>
        )}
        <Section title={`SEO checks (${seoReport?.score ?? 0}/100)`}>
          {(onFixAllSeo || onBulkFixAllPages) && seoReport && (
            <div className="flex justify-end gap-2 mb-2">
              {onBulkFixAllPages && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={bulkFixing || fixingAll}
                  onClick={() => {
                    setScopePresetFixIds(undefined);
                    setScopePendingSuggestionId(null);
                    setScopeOpen(true);
                  }}
                  title="Choose pages and fix types before applying"
                >
                  {bulkFixing ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
                  Fix pages…
                </Button>
              )}
              {onFixAllSeo && seoReport.checks.some((c) => !c.pass) && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  disabled={fixingAll || bulkFixing}
                  onClick={async () => {
                    if (!seoReport) return;
                    setFixingAll(true);
                    try {
                      await onFixAllSeo(seoReport.checks.filter((c) => !c.pass).map((c) => c.id as SeoFixId));
                    } finally {
                      setFixingAll(false);
                    }
                  }}
                >
                  {fixingAll ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
                  Fix all ({seoReport.checks.filter((c) => !c.pass).length})
                </Button>
              )}
            </div>
          )}

          {bulkProgress && (
            <div className="mb-3 rounded-md border border-border bg-muted/30 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {bulkProgress.phase === "complete"
                    ? "Done"
                    : bulkProgress.phase === "seo"
                      ? "Updating project SEO…"
                      : `Fixing pages ${bulkProgress.done}/${bulkProgress.total}`}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(((bulkProgress.done + (bulkProgress.phase === "complete" ? 0 : 0)) / Math.max(1, bulkProgress.total)) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(100, (bulkProgress.done / Math.max(1, bulkProgress.total)) * 100)}%`,
                    transition: "width 200ms ease-out",
                  }}
                />
              </div>
              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                {bulkProgress.pages.map((p) => (
                  <li key={p.id} className="flex items-center gap-1.5 text-xs">
                    {p.status === "done" ? (
                      <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                    ) : p.status === "fixing" ? (
                      <Loader2 className="size-3 animate-spin text-primary shrink-0" />
                    ) : p.status === "error" ? (
                      <XCircle className="size-3 text-rose-500 shrink-0" />
                    ) : (
                      <span className="size-3 rounded-full border border-border shrink-0" />
                    )}
                    <span className="truncate flex-1">{p.name}</span>
                    {typeof p.appliedCount === "number" && p.status === "done" && (
                      <span className="text-muted-foreground tabular-nums">
                        {p.appliedCount > 0 ? `+${p.appliedCount}` : "—"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="space-y-1.5">
            {seoReport?.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                {c.pass ? <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                       : <XCircle className="size-4 text-rose-500 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div>{c.label}</div>
                  {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
                </div>
                {!c.pass && onFixSeo && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => onFixSeo(c.id as SeoFixId)}
                  >
                    <Wand2 className="size-3" /> Fix
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={`Link issues (${linkIssues.length + deadLinks.length})`}>
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="text-xs text-muted-foreground flex-1 min-w-0">
              {crawling
                ? `Crawling ${crawlProgress.done}/${crawlProgress.total}…`
                : linkMeta
                  ? `Last crawl ${formatAgo(linkMeta.lastCrawlAt)} · ${linkMeta.dead}/${linkMeta.total} dead`
                  : "Static checks shown below. Run crawler to test external URLs."}
            </p>
            <div className="flex items-center gap-1">
              {linkMeta && !crawling && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-1.5 text-xs"
                  onClick={handleClearCache}
                  title="Clear cached crawl results"
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={runCrawl} disabled={crawling || !content}>
                {crawling ? <Loader2 className="size-3 animate-spin" /> : linkMeta ? <RefreshCw className="size-3" /> : <ExternalLink className="size-3" />}
                {linkMeta ? "Re-crawl" : "Crawl external"}
              </Button>
            </div>
          </div>

          {projectId && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/20 p-2 text-xs">
              <Clock className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Auto re-crawl</span>
              <select
                value={schedule.intervalHours}
                onChange={(e) => updateSchedule(Number(e.target.value) as LinkScheduleIntervalHours)}
                className="ml-auto h-6 rounded border border-border bg-background px-1.5 text-xs"
                aria-label="Auto re-crawl interval"
              >
                <option value={0}>Off</option>
                <option value={1}>Every 1h</option>
                <option value={6}>Every 6h</option>
                <option value={24}>Every 24h</option>
              </select>
              {schedule.enabled && schedule.intervalHours !== 0 && (
                <span className="text-muted-foreground tabular-nums">
                  next in {formatDuration(nextDueIn(schedule))}
                </span>
              )}
            </div>
          )}

          {linkDiff && (linkDiff.newlyBroken.length || linkDiff.recovered.length || linkDiff.firstSeen.length) ? (
            <div className="mb-2 rounded-md border border-border bg-muted/30 p-2 text-xs space-y-0.5">
              <div className="font-medium">Changes since last crawl</div>
              {linkDiff.newlyBroken.length > 0 && (
                <div className="text-rose-600 dark:text-rose-400">
                  ↓ {linkDiff.newlyBroken.length} newly broken
                </div>
              )}
              {linkDiff.recovered.length > 0 && (
                <div className="text-emerald-600 dark:text-emerald-400">
                  ↑ {linkDiff.recovered.length} recovered
                </div>
              )}
              {linkDiff.firstSeen.length > 0 && (
                <div className="text-muted-foreground">
                  + {linkDiff.firstSeen.length} new URL{linkDiff.firstSeen.length === 1 ? "" : "s"} probed
                </div>
              )}
            </div>
          ) : null}

          {linkIssues.length === 0 && deadLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">All links look good.</p>
          ) : (
            <ul className="space-y-1.5">
              {[...linkIssues, ...deadLinks].map((l, i) => {
                const isNewlyBroken = !!linkDiff?.newlyBroken.includes(l.url);
                return (
                  <li
                    key={i}
                    className={`text-sm border rounded-md p-2 ${
                      isNewlyBroken
                        ? "border-rose-500/40 bg-rose-500/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">{l.kind}</Badge>
                        {isNewlyBroken && (
                          <Badge className="text-[10px] h-4 px-1 bg-rose-500 hover:bg-rose-500">new</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{l.blockType}</span>
                        {onJumpBlock && l.blockId && (
                          <button
                            onClick={() => onJumpBlock(l.blockId)}
                            className="text-xs text-primary hover:underline"
                          >
                            Jump
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-xs mt-1 truncate">{l.url || "(empty)"}</div>
                    {l.hint && <div className="text-xs text-muted-foreground mt-0.5">{l.hint}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title={`Accessibility issues (${a11yIssues.length})`}>
          {a11yIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WCAG AA violations detected.</p>
          ) : (
            <ul className="space-y-1.5">
              {a11yIssues.map((a) => (
                <li key={a.id} className="text-sm border border-border rounded-md p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{a.help}</span>
                    <Badge variant="outline" className="text-xs">{a.impact}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.nodes.length} element(s)</div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </SheetContent>
      <BulkScopeDialog
        open={scopeOpen}
        onOpenChange={setScopeOpen}
        pages={(content?.pages ?? []).map((p) => ({ id: p.id, name: p.name }))}
        defaultFixIds={scopePresetFixIds}
        busy={bulkFixing}
        onRun={async (scope) => {
          if (!onBulkFixAllPages) return;
          setScopeOpen(false);
          setBulkFixing(true);
          setBulkProgress(null);
          try {
            await onBulkFixAllPages((p) => setBulkProgress(p), scope);
            if (scopePendingSuggestionId && projectId) {
              const next = dismissSuggestion(projectId, scopePendingSuggestionId);
              setFixQueue(next);
              setScopePendingSuggestionId(null);
            }
          } finally {
            setBulkFixing(false);
            setTimeout(() => setBulkProgress(null), 1200);
          }
        }}
      />
    </Sheet>
  );
}

function formatAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function Dimension({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const tone = value >= 85 ? "bg-emerald-500" : value >= 65 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
        <span className="tabular-nums font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${value}%`, transition: "width var(--duration-base) var(--ease-smooth)" }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}
