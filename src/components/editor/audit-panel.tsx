/**
 * Local Lighthouse-lite UI panel.
 *
 * Runs the pure `auditPage` heuristic against the active page + live canvas
 * DOM. Pure presentational — no network, no mutation. Re-runs on demand or
 * automatically when the panel is opened.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Gauge,
  RefreshCw,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle2,
  ImageIcon,
  Type,
  Hash,
  MousePointerClick,
} from "lucide-react";
import {
  auditPage,
  CATEGORY_LABEL,
  type AuditReport,
  type AuditSeverity,
} from "@/lib/audit/page-audit";
import type { ProjectContent } from "@/lib/blocks";

export function AuditPanel({
  open,
  onClose,
  content,
  pageId,
  canvasSelector = ".editor-canvas-frame",
}: {
  open: boolean;
  onClose: () => void;
  content: ProjectContent | null;
  pageId?: string;
  canvasSelector?: string;
}) {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useMemo(
    () => () => {
      setLoading(true);
      // Defer to next frame so the sheet finishes opening before we walk DOM.
      requestAnimationFrame(() => {
        try {
          const el =
            (document.querySelector(canvasSelector) as HTMLElement | null) ||
            null;
          setReport(auditPage(content, { pageId, canvasEl: el }));
        } finally {
          setLoading(false);
        }
      });
    },
    [content, pageId, canvasSelector],
  );

  useEffect(() => {
    if (open) run();
  }, [open, run]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Gauge className="size-4" /> Page quality audit
          </SheetTitle>
          <SheetDescription>
            Local, offline scan of this page. No data leaves your browser.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted-foreground">
            {report ? `${report.page.name} • ${report.page.blockCount} blocks` : "—"}
          </div>
          <Button size="sm" variant="ghost" onClick={run} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Re-run
          </Button>
        </div>

        {report && (
          <>
            <ScoreRing score={report.overall} loading={loading} />

            <div className="grid grid-cols-2 gap-2 mt-4">
              {report.categories.map((c) => (
                <CatCard key={c.category} label={CATEGORY_LABEL[c.category]} score={c.score} />
              ))}
            </div>

            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                Page metrics
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric icon={ImageIcon} label="Images" value={`${report.metrics.images} (${report.metrics.imagesWithoutAlt} no-alt)`} />
                <Metric icon={Hash} label="Headings" value={`${report.metrics.headings} (H1: ${report.metrics.h1Count})`} />
                <Metric icon={MousePointerClick} label="Interactive" value={`${report.metrics.interactiveElements}`} />
                <Metric icon={Type} label="Fonts" value={`${report.metrics.fontFamilies}`} />
                <Metric icon={Gauge} label="Est. weight" value={`${report.metrics.estimatedKb} KB`} />
                <Metric icon={MousePointerClick} label="Small targets" value={`${report.metrics.smallTouchTargets}`} />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                Issues ({report.issues.length})
              </div>
              {report.issues.length === 0 ? (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs p-3 inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> No issues found — nice work.
                </div>
              ) : (
                <ul className="space-y-2">
                  {report.issues.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-md border border-border bg-card p-3 text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <SeverityIcon sev={i.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{i.title}</div>
                          <div className="text-muted-foreground mt-0.5">{i.detail}</div>
                          {i.fix && (
                            <div className="mt-1 text-[11px] text-foreground/80">
                              <span className="text-muted-foreground">Fix:</span> {i.fix}
                            </div>
                          )}
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {CATEGORY_LABEL[i.category]} • -{i.weight} pts
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ScoreRing({ score, loading }: { score: number; loading: boolean }) {
  const tone =
    score >= 85 ? "text-emerald-500" : score >= 65 ? "text-amber-500" : "text-rose-500";
  const stroke =
    score >= 85 ? "stroke-emerald-500" : score >= 65 ? "stroke-amber-500" : "stroke-rose-500";
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (clamp(score) / 100) * c;
  return (
    <div className="flex items-center gap-4 mt-4 rounded-lg border border-border bg-card p-4">
      <svg width="100" height="100" viewBox="0 0 100 100" aria-label={`Overall score ${score}`}>
        <circle cx="50" cy="50" r={r} className="stroke-muted" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className={`${stroke} transition-all duration-500`}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          className={`${tone} fill-current font-semibold`}
          fontSize="22"
        >
          {loading ? "…" : score}
        </text>
      </svg>
      <div className="flex-1">
        <div className="text-sm font-medium">Overall quality</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          A weighted blend of SEO, accessibility, performance, and best-practice signals.
        </div>
      </div>
    </div>
  );
}

function CatCard({ label, score }: { label: string; score: number }) {
  const tone =
    score >= 85 ? "text-emerald-600" : score >= 65 ? "text-amber-600" : "text-rose-600";
  const bg =
    score >= 85
      ? "bg-emerald-500/10 border-emerald-500/20"
      : score >= 65
        ? "bg-amber-500/10 border-amber-500/20"
        : "bg-rose-500/10 border-rose-500/20";
  return (
    <div className={`rounded-md border p-2.5 ${bg}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${tone}`}>{score}</div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-2 flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </div>
        <div className="text-xs font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function SeverityIcon({ sev }: { sev: AuditSeverity }) {
  if (sev === "error") return <XCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />;
  if (sev === "warn") return <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />;
  return <Info className="size-4 text-sky-500 shrink-0 mt-0.5" />;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}
