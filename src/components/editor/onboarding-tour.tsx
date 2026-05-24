/**
 * Lightweight, self-contained onboarding tour for the editor.
 *
 * - Shows a centered modal walkthrough on the user's first visit.
 * - Persisted via localStorage flag so it never re-prompts.
 * - Pure UI, no network, no side effects, no external deps.
 * - Can be reopened any time via the exported `openOnboardingTour()` helper
 *   (e.g. from the command palette / shortcuts overlay).
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Map as MapIcon,
  Activity,
  Wand2,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

const STORAGE_KEY = "editor.tour.v1.completed";
const REOPEN_EVENT = "editor:open-tour";

type Step = {
  icon: LucideIcon;
  title: string;
  body: string;
  hint?: string;
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to your editor",
    body:
      "A quick 30-second tour of the most useful features so you can ship great pages faster. You can reopen this tour anytime from the command palette.",
  },
  {
    icon: MapIcon,
    title: "Canvas Minimap",
    body:
      "A floating overview of every block on the page. Click any block to jump to it, use ↑/↓ + Enter to navigate from the keyboard, and toggle the panel anytime.",
    hint: "Shortcut: M",
  },
  {
    icon: Activity,
    title: "Site Health",
    body:
      "The colored badge in the toolbar continuously grades your SEO, accessibility, and link quality. Click it to see issues and one-click fixes.",
    hint: "Shortcut: click the score badge",
  },
  {
    icon: Wand2,
    title: "Bulk fixes with undo",
    body:
      "From the Health panel you can scope a fix to specific pages and issue types, then revert the entire run with a single click if anything looks off.",
  },
  {
    icon: Keyboard,
    title: "You're all set",
    body:
      "Press ? at any time to see all keyboard shortcuts. Have fun building — your changes auto-save.",
  },
];

/** Programmatically reopen the tour from anywhere in the app. */
export function openOnboardingTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
}

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // First-visit auto-open + listener for manual reopen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Defer slightly so the editor chrome paints first.
        const t = window.setTimeout(() => setOpen(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* localStorage may be unavailable; fail silent */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(REOPEN_EVENT, handler);
    return () => window.removeEventListener(REOPEN_EVENT, handler);
  }, []);

  function persistCompleted() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) persistCompleted();
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleClose(false);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div className="flex-1">
              <DialogTitle className="text-base">{s.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Step {step + 1} of {STEPS.length}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-foreground/90 leading-relaxed">{s.body}</p>
        {s.hint && (
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 w-fit">
            {s.hint}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 pt-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={back}
              disabled={step === 0}
              aria-label="Previous step"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button size="sm" onClick={next} aria-label={isLast ? "Finish tour" : "Next step"}>
              {isLast ? "Get started" : "Next"} <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
