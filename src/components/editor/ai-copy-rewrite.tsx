// Toolbar action: rewrite ONLY headlines & body copy via AI, keeping
// the layout, sections, block order and component types unchanged.
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ai } from "@/lib/ai-gateway";
import type { ProjectContent } from "@/lib/blocks";

const COPY_KEYS = ["headline", "subheadline", "title", "subtitle", "body", "tagline", "eyebrow", "ctaLabel"];

export function AiCopyRewriteButton({
  content, onApply,
}: { content: ProjectContent | null; onApply: (next: ProjectContent) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState<"headlines" | "body" | "both">("both");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!content || !prompt.trim()) return;
    setBusy(true);
    try {
      const allow = scope === "headlines"
        ? ["headline", "subheadline", "title", "subtitle", "tagline", "eyebrow"]
        : scope === "body"
        ? ["body", "ctaLabel"]
        : COPY_KEYS;

      const editable: Record<string, string> = {};
      for (const page of content.pages) {
        for (const block of page.blocks) {
          for (const k of allow) {
            const v = (block.props as any)[k];
            if (typeof v === "string" && v.trim()) editable[`${block.id}.${k}`] = v;
          }
        }
      }
      if (Object.keys(editable).length === 0) {
        toast.message("No matching copy fields to rewrite.");
        setBusy(false);
        return;
      }

      const instruction =
        `Rewrite the values of this JSON object to fit the following site description, ` +
        `keeping the same keys, the same approximate length per value, and the same tone. ` +
        `Do NOT add new keys. Do NOT change layout. Return ONLY a JSON object with the same keys.\n\n` +
        `Site description: """${prompt.trim()}"""\n\n` +
        `Original:\n${JSON.stringify(editable, null, 2)}`;

      const res = await ai.copy(instruction);
      const text = (res as any)?.result?.text ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned no JSON");
      const rewritten = JSON.parse(match[0]) as Record<string, string>;

      const next: ProjectContent = JSON.parse(JSON.stringify(content));
      for (const page of next.pages) {
        for (const block of page.blocks) {
          for (const k of allow) {
            const id = `${block.id}.${k}`;
            if (typeof rewritten[id] === "string") (block.props as any)[k] = rewritten[id];
          }
        }
      }
      onApply(next);
      toast.success("Copy rewritten — layout unchanged");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Rewrite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Rewrite copy with AI (layout preserved)">
          <Sparkles className="size-4" /> Rewrite copy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rewrite copy with AI</DialogTitle>
          <DialogDescription>Layout, sections and block types stay exactly the same.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Site description</Label>
            <Textarea rows={3} placeholder="One sentence describing what this site is about." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>What to rewrite</Label>
            <div className="flex gap-2">
              {(["headlines", "body", "both"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`px-3 py-1.5 rounded-md text-xs border ${scope === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
                >
                  {s === "both" ? "Headlines + body" : s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={run} disabled={busy || !prompt.trim()}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> Rewriting…</> : <>Rewrite</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
