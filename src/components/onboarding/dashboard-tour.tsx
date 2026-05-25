// Dashboard spotlight tour — runs once after the OnboardingWizard finishes, or via
// the "Take the quick tour" button. Targets elements by `data-tour-target="<id>"`.
// Pure CSS + SVG mask, no animation library; respects prefers-reduced-motion.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type TourStep = {
  targetId: string;
  title: string;
  body: string;
  placement: "bottom" | "right" | "left" | "top";
  action?: string;
};

const STEPS: TourStep[] = [
  {
    targetId: "dashboard-header",
    title: "Welcome to Sitely 👋",
    body: "This is your dashboard — every site you build lives here. Let's build your first one.",
    placement: "bottom",
  },
  {
    targetId: "quickstart-grid",
    title: "Three ways to start",
    body: "Draft with AI, pick a template, or open a blank canvas. You can change everything later.",
    placement: "bottom",
  },
  {
    targetId: "create-project-btn",
    title: "Start here",
    body: "Click to create your first site. Takes about two minutes.",
    placement: "bottom",
    action: "Create my first site",
  },
];

const PAD = 8; // spotlight padding around the target

type Rect = { top: number; left: number; width: number; height: number };

function measure(el: Element | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function tooltipPosition(rect: Rect | null, placement: TourStep["placement"]) {
  if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  const cx = rect.left + rect.width / 2;
  switch (placement) {
    case "bottom":
      return { top: `${rect.top + rect.height + 16}px`, left: `${cx}px`, transform: "translateX(-50%)" };
    case "top":
      return { top: `${rect.top - 16}px`, left: `${cx}px`, transform: "translate(-50%, -100%)" };
    case "right":
      return { top: `${rect.top + rect.height / 2}px`, left: `${rect.left + rect.width + 16}px`, transform: "translateY(-50%)" };
    case "left":
      return { top: `${rect.top + rect.height / 2}px`, left: `${rect.left - 16}px`, transform: "translate(-100%, -50%)" };
  }
}

export function DashboardTour({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const current = STEPS[step];
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Measure target on step change + on resize/scroll.
  useLayoutEffect(() => {
    const update = () => {
      const el = document.querySelector(`[data-tour-target="${current.targetId}"]`);
      setRect(measure(el));
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [current.targetId]);

  // Esc dismisses, Enter advances.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
      if (e.key === "Enter") (step < STEPS.length - 1 ? setStep((s) => s + 1) : onDismiss());
    };
    window.addEventListener("keydown", onKey);
    tooltipRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onDismiss]);

  const pos = tooltipPosition(rect, current.placement);
  const holeX = rect ? rect.left - PAD : 0;
  const holeY = rect ? rect.top - PAD : 0;
  const holeW = rect ? rect.width + PAD * 2 : 0;
  const holeH = rect ? rect.height + PAD * 2 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-50"
    >
      {/* SVG mask: darken everything except the cutout around the target */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" aria-hidden>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={holeX}
                y={holeY}
                width={holeW}
                height={holeH}
                rx={12}
                fill="black"
                style={{ transition: "all 250ms var(--ease-smooth)" }}
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="oklch(0 0 0 / 0.55)" mask="url(#tour-mask)" />
        {rect && (
          <rect
            x={holeX}
            y={holeY}
            width={holeW}
            height={holeH}
            rx={12}
            fill="none"
            stroke="oklch(from var(--primary) l c h / 0.9)"
            strokeWidth={2}
            style={{ transition: "all 250ms var(--ease-smooth)" }}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        tabIndex={-1}
        className="absolute z-10 w-72 rounded-xl border border-border bg-popover text-popover-foreground p-4 shadow-[var(--shadow-elegant)] focus:outline-none"
        style={pos}
      >
        <h4 id="tour-title" className="font-semibold text-sm">{current.title}</h4>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{current.body}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {step + 1} / {STEPS.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Skip
            </button>
            <Button
              size="sm"
              onClick={() => (step < STEPS.length - 1 ? setStep((s) => s + 1) : onDismiss())}
            >
              {current.action ?? "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TOUR_KEY = "sitely:dashboard_tour_seen";
export function shouldShowTour(): boolean {
  try {
    return !localStorage.getItem(TOUR_KEY);
  } catch {
    return false;
  }
}
export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* ignore */
  }
}
