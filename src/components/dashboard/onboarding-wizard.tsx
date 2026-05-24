import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Briefcase, Camera, ShoppingBag, BookOpen, Heart, Rocket } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FONTS } from "@/lib/blocks";

export type OnboardingResult = {
  purpose: string;
  style: string;
  start: "ai" | "template" | "blank";
  paletteIdx: number;
  fontValue: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete: (r: OnboardingResult) => void;
};

const PURPOSES = [
  { id: "business", label: "Business / SaaS", icon: Briefcase, palette: 0, font: FONTS[0].value, vibe: "Modern" },
  { id: "portfolio", label: "Portfolio", icon: Camera, palette: 4, font: FONTS[1].value, vibe: "Editorial" },
  { id: "store", label: "Online store", icon: ShoppingBag, palette: 1, font: FONTS[3].value, vibe: "Friendly" },
  { id: "blog", label: "Blog / Content", icon: BookOpen, palette: 2, font: FONTS[1].value, vibe: "Editorial" },
  { id: "personal", label: "Personal / Event", icon: Heart, palette: 5, font: FONTS[3].value, vibe: "Soft" },
  { id: "startup", label: "Startup / Launch", icon: Rocket, palette: 5, font: FONTS[2].value, vibe: "Tech" },
];

const STYLES = [
  { id: "minimal", label: "Minimal", desc: "Clean, lots of whitespace", paletteIdx: 4 },
  { id: "vibrant", label: "Vibrant", desc: "Bold gradients & color", paletteIdx: 0 },
  { id: "editorial", label: "Editorial", desc: "Serif headlines, magazine feel", paletteIdx: 3 },
  { id: "playful", label: "Playful", desc: "Warm, rounded, friendly", paletteIdx: 1 },
];

const STARTS = [
  { id: "ai" as const, label: "Start with AI", desc: "Describe your site, let AI draft it", icon: Sparkles },
  { id: "template" as const, label: "Pick a template", desc: "Browse 20+ hand-crafted starts", icon: BookOpen },
  { id: "blank" as const, label: "Blank canvas", desc: "Build from scratch", icon: Rocket },
];

export function OnboardingWizard({ open, onOpenChange, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [start, setStart] = useState<"ai" | "template" | "blank" | null>(null);

  function reset() {
    setStep(1); setPurpose(null); setStyle(null); setStart(null);
  }

  function finish(s: "ai" | "template" | "blank") {
    const p = PURPOSES.find((x) => x.id === purpose);
    const st = STYLES.find((x) => x.id === style);
    const result: OnboardingResult = {
      purpose: purpose ?? "business",
      style: style ?? "minimal",
      start: s,
      paletteIdx: st?.paletteIdx ?? p?.palette ?? 0,
      fontValue: p?.font ?? FONTS[0].value,
    };
    try { localStorage.setItem("sitely:onboarded", JSON.stringify({ at: Date.now(), ...result })); } catch {}
    onComplete(result);
    onOpenChange(false);
    reset();
  }

  const canNext = step === 1 ? !!purpose : step === 2 ? !!style : !!start;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welcome to Sitely</DialogTitle>
          <DialogDescription>
            Step {step} of 3 — {["What are you building?", "Pick a style", "Where do you want to start?"][step - 1]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PURPOSES.map((p) => {
              const Icon = p.icon;
              const active = purpose === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPurpose(p.id)}
                  className={`text-left rounded-lg border p-3 transition-all ${active ? "border-primary ring-2 ring-primary/20 bg-accent/40" : "border-border hover:border-primary/40"}`}
                >
                  <div className="size-9 rounded-lg flex items-center justify-center mb-2" style={{ background: "var(--gradient-primary)" }}>
                    <Icon className="size-4 text-primary-foreground" />
                  </div>
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{p.vibe}</div>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => {
              const active = style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`text-left rounded-lg border p-4 transition-all ${active ? "border-primary ring-2 ring-primary/20 bg-accent/40" : "border-border hover:border-primary/40"}`}
                >
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STARTS.map((s) => {
              const Icon = s.icon;
              const active = start === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStart(s.id)}
                  className={`text-left rounded-lg border p-4 transition-all ${active ? "border-primary ring-2 ring-primary/20 bg-accent/40" : "border-border hover:border-primary/40"}`}
                >
                  <Icon className="size-5 text-primary mb-2" />
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : onOpenChange(false)}>
            <ArrowLeft className="size-4" /> {step > 1 ? "Back" : "Skip"}
          </Button>
          {step < 3 ? (
            <Button type="button" disabled={!canNext} onClick={() => setStep((step + 1) as 1 | 2 | 3)}>
              Next <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" disabled={!canNext} onClick={() => finish(start!)}>
              Get started <Check className="size-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
