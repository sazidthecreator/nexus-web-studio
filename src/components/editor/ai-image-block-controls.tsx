// Inline AI image generation controls for the `image_generation` block.
// Generate / Regenerate / Replace flows live here. The block's `src` is
// updated on success; before/after URLs are logged to ai-history for revert.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { generateAndUploadImage } from "@/lib/image-tools/generate";
import { logAiGeneration } from "@/lib/ai-history";
import { AssetPicker } from "@/components/asset-picker";
import type { Block } from "@/lib/blocks";

type Props = {
  block: Block;
  set: (k: string, v: any) => void;
};

export function AiImageBlockControls({ block, set }: Props) {
  const p = block.props as any;
  const [busy, setBusy] = useState(false);

  async function generate(reason: "generate" | "regenerate") {
    const prompt = (p.prompt || "").trim();
    if (!prompt) {
      toast.error("Add a prompt first");
      return;
    }
    setBusy(true);
    const prevSrc = p.src as string | undefined;
    try {
      const out = await generateAndUploadImage(prompt, {
        width: p.width ?? 1024,
        height: p.height ?? 768,
      });
      set("src", out.url);
      if (!p.alt) set("alt", prompt.slice(0, 120));
      void logAiGeneration({
        kind: "generate_image",
        prompt,
        output_url: out.url,
        block_id: block.id,
        revert_payload: { prevSrc, nextSrc: out.url, blockId: block.id, blockType: "image_generation" },
      });
      toast.success(reason === "regenerate" ? "Image regenerated" : "Image generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Image generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Prompt</Label>
        <Textarea
          rows={3}
          value={p.prompt ?? ""}
          onChange={(e) => set("prompt", e.target.value)}
          placeholder="Describe the image you want."
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Width</Label>
          <Input type="number" min={256} max={1920} step={64}
            value={p.width ?? 1024}
            onChange={(e) => set("width", Number(e.target.value) || 1024)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Height</Label>
          <Input type="number" min={256} max={1920} step={64}
            value={p.height ?? 768}
            onChange={(e) => set("height", Number(e.target.value) || 768)} />
        </div>
      </div>
      <div className="flex gap-2">
        {!p.src ? (
          <Button size="sm" className="flex-1" onClick={() => generate("generate")} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Generate
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => generate("regenerate")} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Regenerate
          </Button>
        )}
      </div>
      {p.src && (
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Upload className="size-3" /> Replace with another image</Label>
          <AssetPicker value={p.src} onChange={(v) => {
            const prev = p.src;
            set("src", v);
            void logAiGeneration({
              kind: "generate_image",
              prompt: `Manual replace on ${block.type}`,
              output_url: v,
              block_id: block.id,
              revert_payload: { prevSrc: prev, nextSrc: v, blockId: block.id, blockType: "image_generation" },
            });
          }} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Alt text</Label>
          <Input value={p.alt ?? ""} onChange={(e) => set("alt", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Caption</Label>
          <Input value={p.caption ?? ""} onChange={(e) => set("caption", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
