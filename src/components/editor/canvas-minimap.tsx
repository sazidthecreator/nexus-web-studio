import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Block } from "@/lib/blocks";
import {
  Layout, Image as ImageIcon, Type, Star, MessageSquare, CreditCard, Users,
  Mail, ListChecks, FileText, Box, Eye, EyeOff, AlertTriangle, MapIcon,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BlockMetric = { id: string; top: number; height: number };

type ScrollMode = "instant" | "smooth";
type MinimapSettings = { mode: ScrollMode; duration: number };

const SETTINGS_KEY = "editor.minimap.scroll";
const DEFAULT_SETTINGS: MinimapSettings = { mode: "smooth", duration: 300 };
const DURATION_MIN = 0;
const DURATION_MAX = 1200;

function loadSettings(): MinimapSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw);
    const mode: ScrollMode = p?.mode === "instant" ? "instant" : "smooth";
    const duration = Math.max(
      DURATION_MIN,
      Math.min(DURATION_MAX, Number(p?.duration) || DEFAULT_SETTINGS.duration),
    );
    return { mode, duration };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// easeInOutQuad — feels snappy at short durations, smooth at long ones.
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateScrollTo(
  el: HTMLElement,
  targetTop: number,
  duration: number,
  signal?: { cancelled: boolean },
): Promise<void> {
  return new Promise((resolve) => {
    const startTop = el.scrollTop;
    const delta = targetTop - startTop;
    if (Math.abs(delta) < 1 || duration <= 0) {
      el.scrollTop = targetTop;
      resolve();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      if (signal?.cancelled) return resolve();
      const t = Math.min(1, (now - start) / duration);
      el.scrollTop = startTop + delta * easeInOutQuad(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

const TYPE_ICON: Record<string, typeof Box> = {
  navbar: Layout, hero: Star, heading: Type, text: FileText, image: ImageIcon,
  gallery: ImageIcon, features: ListChecks, testimonial: MessageSquare,
  testimonials: MessageSquare, pricing: CreditCard, team: Users,
  cta: Star, contact: Mail, footer: Layout, form: Mail, faq: MessageSquare,
};

function blockHasIssue(b: Block): boolean {
  const p = b.props || {};
  if (p.__hidden) return false;
  const text = p.headline || p.title || p.heading || p.label || "";
  const requiresText = ["hero", "heading", "cta", "feature"].some((k) => b.type.includes(k));
  return requiresText && !String(text).trim();
}

function blockLabel(b: Block): string {
  const p = b.props || {};
  const t = p.headline || p.title || p.heading || p.label || p.body || p.tagline || "";
  return String(t).trim().slice(0, 60) || b.type;
}

export function CanvasMinimap({
  blocks,
  selectedIds,
  onSelect,
  scrollEl,
  open,
  onClose,
}: {
  blocks: Block[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  scrollEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}) {
  // Stable signature of the block list — drives re-measure only when ids/order change.
  const blockSig = useMemo(() => blocks.map((b) => b.id).join("|"), [blocks]);

  // Per-block metric cache (ref keeps it alive across renders without invalidating effects).
  const metricCache = useRef<Map<string, BlockMetric>>(new Map());
  const [metrics, setMetrics] = useState<BlockMetric[]>([]);
  const [scroll, setScroll] = useState({ top: 0, height: 0, contentHeight: 1 });
  const rafRef = useRef<number | null>(null);

  // Active row for keyboard navigation. Mirrors selection when one selection exists.
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const flushFromCache = useCallback(() => {
    const next: BlockMetric[] = [];
    for (const b of blocks) {
      const m = metricCache.current.get(b.id);
      if (m) next.push(m);
    }
    setMetrics(next);
  }, [blocks]);

  const measure = useCallback(
    (full = false) => {
      if (!scrollEl) return;
      let changed = false;
      const seen = new Set<string>();
      for (const b of blocks) {
        seen.add(b.id);
        const el = scrollEl.querySelector<HTMLElement>(`[data-block-id="${b.id}"]`);
        if (!el) continue;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        const prev = metricCache.current.get(b.id);
        if (!prev || prev.top !== top || prev.height !== height) {
          metricCache.current.set(b.id, { id: b.id, top, height });
          changed = true;
        }
      }
      // Drop stale cache entries.
      for (const id of metricCache.current.keys()) {
        if (!seen.has(id)) {
          metricCache.current.delete(id);
          changed = true;
        }
      }
      if (changed || full) flushFromCache();
      setScroll({
        top: scrollEl.scrollTop,
        height: scrollEl.clientHeight,
        contentHeight: Math.max(scrollEl.scrollHeight, 1),
      });
    },
    [blocks, scrollEl, flushFromCache],
  );

  const schedule = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      measure();
    });
  }, [measure]);

  // Set up observers when minimap opens or block id-set changes.
  useLayoutEffect(() => {
    if (!open || !scrollEl) return;
    measure(true);
    const onScroll = () => {
      // Scroll changes don't affect cached offsets — only viewport overlay.
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setScroll({
          top: scrollEl.scrollTop,
          height: scrollEl.clientHeight,
          contentHeight: Math.max(scrollEl.scrollHeight, 1),
        });
      });
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => schedule());
    ro.observe(scrollEl);
    const frame = scrollEl.querySelector(".editor-canvas-frame");
    if (frame) ro.observe(frame as Element);
    // Observe each block element so size-change of one block doesn't force a full pass.
    for (const b of blocks) {
      const el = scrollEl.querySelector<HTMLElement>(`[data-block-id="${b.id}"]`);
      if (el) ro.observe(el);
    }

    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // Intentionally key on stable signature instead of `blocks` reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scrollEl, blockSig]);

  const PANEL_HEIGHT = 360;
  const scale = useMemo(() => {
    const total = metrics.reduce((a, b) => a + b.height, 0) || 1;
    return PANEL_HEIGHT / total;
  }, [metrics]);

  const viewportTop = scroll.top * scale;
  const viewportHeight = Math.max(8, scroll.height * scale);
  const showViewport = scroll.contentHeight > scroll.height + 4;
  const viewportPct = Math.min(
    100,
    Math.round((scroll.top / Math.max(scroll.contentHeight - scroll.height, 1)) * 100) || 0,
  );

  // Persisted scroll behaviour for jump-to-block.
  const [settings, setSettings] = useState<MinimapSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [settings]);

  // Cancel any in-flight scroll animation when a new jump is requested or on unmount.
  const animTokenRef = useRef<{ cancelled: boolean } | null>(null);

  const handleJump = useCallback(
    (id: string) => {
      onSelect(id);
      const target = scrollEl?.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
      if (!scrollEl || !target) return;
      // Cancel previous animation.
      if (animTokenRef.current) animTokenRef.current.cancelled = true;
      const token = { cancelled: false };
      animTokenRef.current = token;

      const { mode, duration } = settingsRef.current;
      // Center target in viewport.
      const targetTop =
        target.offsetTop - scrollEl.clientHeight / 2 + target.offsetHeight / 2;
      const clamped = Math.max(
        0,
        Math.min(scrollEl.scrollHeight - scrollEl.clientHeight, targetTop),
      );

      if (mode === "instant" || duration <= 0) {
        scrollEl.scrollTop = clamped;
        return;
      }
      requestAnimationFrame(() => animateScrollTo(scrollEl, clamped, duration, token));
    },
    [onSelect, scrollEl],
  );

  useEffect(() => {
    return () => {
      if (animTokenRef.current) animTokenRef.current.cancelled = true;
    };
  }, []);


  // Sync active index to single-selection when minimap opens / selection changes externally.
  useEffect(() => {
    if (!open || metrics.length === 0) return;
    if (selectedIds.size === 1) {
      const only = Array.from(selectedIds)[0];
      const idx = metrics.findIndex((m) => m.id === only);
      if (idx >= 0) setActiveIndex(idx);
    } else {
      setActiveIndex((i) => Math.min(i, metrics.length - 1));
    }
  }, [open, metrics, selectedIds]);

  // Focus list on open so keyboard works without an extra click.
  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (metrics.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(metrics.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(metrics.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const m = metrics[activeIndex];
      if (m) handleJump(m.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  const activeId = metrics[activeIndex]?.id;

  return (
    <div
      role="region"
      aria-label="Canvas minimap"
      className="absolute right-4 top-4 z-30 w-[180px] rounded-xl border border-border bg-background/85 backdrop-blur-md shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <MapIcon className="size-3.5 text-muted-foreground" aria-hidden />
          Minimap
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className={cn(
              "rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted",
              settingsOpen && "bg-muted text-foreground",
            )}
            title="Scroll settings"
            aria-label="Scroll settings"
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
          >
            <Settings2 className="size-3.5" aria-hidden />
          </button>
          <button
            onClick={onClose}
            className="text-[10px] text-muted-foreground hover:text-foreground rounded px-1.5 py-0.5 hover:bg-muted"
            title="Hide minimap (M)"
            aria-label="Hide minimap"
          >
            Hide
          </button>
        </div>

        {settingsOpen && (
          <div
            role="dialog"
            aria-label="Minimap scroll settings"
            className="absolute right-2 top-full mt-1 z-10 w-[200px] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-3 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Jump behavior
              </div>
              <div role="radiogroup" aria-label="Scroll mode" className="grid grid-cols-2 gap-1">
                {(["instant", "smooth"] as const).map((m) => (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={settings.mode === m}
                    onClick={() => setSettings((s) => ({ ...s, mode: m }))}
                    className={cn(
                      "text-[11px] capitalize rounded-md border px-2 py-1.5 transition-colors",
                      settings.mode === m
                        ? "border-primary bg-primary/15 text-foreground font-medium"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn(settings.mode === "instant" && "opacity-50")}>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="minimap-duration"
                  className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Duration
                </label>
                <span className="text-[10px] tabular-nums text-foreground">
                  {settings.duration}ms
                </span>
              </div>
              <input
                id="minimap-duration"
                type="range"
                min={DURATION_MIN}
                max={DURATION_MAX}
                step={50}
                value={settings.duration}
                disabled={settings.mode === "instant"}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, duration: Number(e.target.value) }))
                }
                className="w-full accent-primary cursor-pointer disabled:cursor-not-allowed"
                aria-label="Scroll duration in milliseconds"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>

            <button
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              className="w-full text-[10px] text-muted-foreground hover:text-foreground rounded px-2 py-1 hover:bg-muted"
            >
              Reset to default
            </button>
          </div>
        )}
      </div>


      <div className="relative px-2 py-2" style={{ height: PANEL_HEIGHT + 16 }}>
        {metrics.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground text-center px-3">
            No blocks yet — add one to see the map.
          </div>
        ) : (
          <div className="relative" style={{ height: PANEL_HEIGHT }}>
            <div
              ref={listRef}
              role="listbox"
              tabIndex={0}
              aria-label="Blocks on canvas. Use arrow keys to navigate, Enter to jump."
              aria-activedescendant={activeId ? `minimap-row-${activeId}` : undefined}
              onKeyDown={onListKeyDown}
              className="flex flex-col gap-[2px] h-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            >
              {metrics.map((m, idx) => {
                const b = blocks.find((x) => x.id === m.id);
                if (!b) return null;
                const Icon = TYPE_ICON[b.type] || Box;
                const isSelected = selectedIds.has(b.id);
                const isActive = idx === activeIndex;
                const hidden = !!b.props?.__hidden;
                const issue = blockHasIssue(b);
                const h = Math.max(14, Math.min(72, m.height * scale));
                const label = blockLabel(b);
                const ariaLabel =
                  `${b.type} block, position ${idx + 1} of ${metrics.length}` +
                  (label && label !== b.type ? `, “${label}”` : "") +
                  (isSelected ? ", selected" : "") +
                  (hidden ? ", hidden" : "") +
                  (issue ? ", missing copy" : "");
                return (
                  <div
                    key={b.id}
                    id={`minimap-row-${b.id}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-label={ariaLabel}
                    onClick={() => {
                      setActiveIndex(idx);
                      handleJump(b.id);
                    }}
                    className={cn(
                      "group relative w-full text-left rounded-md border overflow-hidden flex items-center gap-1.5 px-2 cursor-pointer",
                      "transition-all duration-150 ease-out",
                      isSelected
                        ? "border-primary bg-primary/15 shadow-[0_0_0_1px_var(--primary)]"
                        : "border-border/60 bg-muted/40 hover:bg-muted hover:border-border",
                      isActive && !isSelected && "ring-1 ring-ring/60",
                      hidden && "opacity-50",
                    )}
                    style={{ height: h }}
                  >
                    <Icon
                      aria-hidden
                      className={cn(
                        "size-3 shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "truncate text-[10px] leading-none",
                        isSelected ? "text-foreground font-medium" : "text-muted-foreground",
                      )}
                    >
                      {b.type}
                    </span>
                    <span className="ml-auto flex items-center gap-1" aria-hidden>
                      {issue && <AlertTriangle className="size-2.5 text-amber-500" />}
                      {hidden ? (
                        <EyeOff className="size-2.5 text-muted-foreground" />
                      ) : isSelected ? (
                        <Eye className="size-2.5 text-primary" />
                      ) : null}
                    </span>

                    <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-popover text-popover-foreground border border-border shadow-md px-2 py-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity max-w-[260px] truncate">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {showViewport && (
              <div
                role="img"
                aria-label={`Viewport indicator, scrolled ${viewportPct}% through canvas`}
                className="pointer-events-none absolute left-0 right-0 rounded-md border-2 border-primary/70 bg-primary/5"
                style={{
                  top: viewportTop,
                  height: viewportHeight,
                  transition: "top 80ms linear, height 80ms linear",
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span>
          {blocks.length} block{blocks.length === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          <kbd className="font-mono bg-muted rounded px-1 py-0.5">↑↓</kbd>
          <kbd className="font-mono bg-muted rounded px-1 py-0.5">↵</kbd>
        </span>
      </div>
    </div>
  );
}
