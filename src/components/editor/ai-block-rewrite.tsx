// One-click AI rewrite for the text fields on a single selected block.
// Preserves layout, keeps non-text props untouched, returns same keys.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ai } from "@/lib/ai-gateway";
import type { Block } from "@/lib/blocks";
import { logAiGeneration } from "@/lib/ai-history";

const TEXT_KEYS = [
  "headline", "subheadline", "title", "subtitle",
  "body", "tagline", "eyebrow", "ctaLabel", "label", "description",
];

export function AiBlockRewriteButton({
  block,
  onApply,
  className,
}: {
  block: Block;
  onApply: (patch: Record<string, unknown>) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    const editable: Record<string, string> = {};
    for (const k of TEXT_KEYS) {
      const v = (block.props as any)?.[k];
      if (typeof v === "string" && v.trim()) editable[k] = v;
    }
    if (Object.keys(editable).length === 0) {
      toast.message("This block has no text fields to rewrite.");
      return;
    }
    setBusy(true);
    try {
      const instruction =
        `Rewrite the values of this JSON object with fresh, equally-punchy copy. ` +
        `Keep the same keys, same approximate length, same tone and language. ` +
        `Return ONLY a JSON object with the same keys.\n\n` +
        `Original:\n${JSON.stringify(editable, null, 2)}`;
      const res = await ai.copy(instruction);
      const text = (res as any)?.result?.text ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned no JSON");
      const rewritten = JSON.parse(match[0]) as Record<string, string>;
      const patch: Record<string, string> = {};
      for (const k of Object.keys(editable)) {
        if (typeof rewritten[k] === "string") patch[k] = rewritten[k];
      }
      if (Object.keys(patch).length === 0) throw new Error("No keys were rewritten");
      onApply(patch);
      // Log to AI history with revert payload (before + after)
      void logAiGeneration({
        kind: "rewrite_block",
        prompt: `Rewrite ${block.type} block`,
        output_text: JSON.stringify(patch),
        block_id: block.id,
        revert_payload: { before: editable, after: patch, blockId: block.id, blockType: block.type },
      });
      toast.success("Block copy rewritten");
    } catch (e: any) {
      toast.error(e?.message ?? "Rewrite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className={className}
      onClick={run}
      disabled={busy}
      title="Rewrite this block's text with AI"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      Rewrite
    </Button>
  );
}
