// First-publish celebration — confetti burst + share-your-site card.
// Triggered ONCE per user; tracked via localStorage `sitely:first_published`.
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Copy, ExternalLink, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FIRST_KEY = "sitely:first_published";

export function hasCelebratedFirstPublish(): boolean {
  try {
    return !!localStorage.getItem(FIRST_KEY);
  } catch {
    return false;
  }
}
export function markFirstPublishCelebrated(): void {
  try {
    localStorage.setItem(FIRST_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* ignore */
  }
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function PublishCelebration({
  open,
  onOpenChange,
  publishedUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  publishedUrl: string;
}) {
  useEffect(() => {
    if (!open || reducedMotion()) return;
    const left = () => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } });
    const right = () => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } });
    const t1 = setTimeout(left, 100);
    const t2 = setTimeout(right, 200);
    const t3 = setTimeout(left, 450);
    const t4 = setTimeout(right, 550);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <div className="mx-auto size-14 rounded-2xl flex items-center justify-center shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
          <PartyPopper className="size-7 text-primary-foreground" />
        </div>
        <DialogTitle className="text-xl mt-3">Your site is live!</DialogTitle>
        <DialogDescription>
          Share it with the world — it's yours forever.
        </DialogDescription>

        <div className="flex items-center gap-2 mt-2 bg-muted/50 rounded-lg p-2 text-left">
          <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{publishedUrl}</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Copy URL"
            onClick={() => {
              navigator.clipboard.writeText(publishedUrl);
              toast.success("URL copied");
            }}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Back to editor
          </Button>
          <Button
            variant="premium"
            className="flex-1"
            onClick={() => {
              window.open(publishedUrl, "_blank", "noopener,noreferrer");
              onOpenChange(false);
            }}
          >
            <ExternalLink className="size-4" /> View live
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
