// AI generation history side-sheet. Shows every AI action for this project,
// with prompts, outputs, and a Revert button that undoes the change in-place.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Image as ImageIcon, Languages, Pencil, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listAiGenerations, markReverted, onAiHistoryChange, type AiGeneration } from "@/lib/ai-history";
import type { ProjectContent } from "@/lib/blocks";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  content: ProjectContent | null;
  onApply: (next: ProjectContent) => void;
};

const KIND_META: Record<string, { icon: any; label: string }> = {
  rewrite_block: { icon: Pencil, label: "Block rewrite" },
  rewrite_site: { icon: Sparkles, label: "Site rewrite" },
  generate_image: { icon: ImageIcon, label: "Image" },
  translate_locale: { icon: Languages, label: "Translation" },
  translate_field: { icon: Languages, label: "Translated field" },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AiHistoryPanel({ open, onOpenChange, projectId, content, onApply }: Props) {
  const qc = useQueryClient();
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["ai_generations", projectId],
    enabled: open,
    queryFn: () => listAiGenerations(projectId),
  });

  useEffect(() => {
    const unsub = onAiHistoryChange(() => {
      qc.invalidateQueries({ queryKey: ["ai_generations", projectId] });
    });
    return () => { unsub(); };
  }, [qc, projectId]);

  async function revert(item: AiGeneration) {
    if (!content) return;
    const payload = item.revert_payload;
    if (!payload) return toast.error("No revert data available");
    setRevertingId(item.id);
    try {
      const next: ProjectContent = JSON.parse(JSON.stringify(content));
      if (item.kind === "rewrite_block" && payload.blockId && payload.before) {
        let applied = false;
        for (const page of next.pages) {
          for (const block of page.blocks) {
            if (block.id === payload.blockId) {
              for (const [k, v] of Object.entries(payload.before as Record<string, string>)) {
                (block.props as any)[k] = v;
              }
              applied = true;
              break;
            }
          }
          if (applied) break;
        }
        if (!applied) throw new Error("Block no longer exists");
      } else if (item.kind === "generate_image" && payload.blockId) {
        let applied = false;
        for (const page of next.pages) {
          for (const block of page.blocks) {
            if (block.id === payload.blockId) {
              (block.props as any).src = payload.prevSrc ?? "";
              applied = true;
              break;
            }
          }
          if (applied) break;
        }
        if (!applied) throw new Error("Block no longer exists");
      } else if (item.kind === "rewrite_site" && payload.before) {
        const before = payload.before as Record<string, string>;
        for (const page of next.pages) {
          for (const block of page.blocks) {
            for (const k of Object.keys(block.props || {})) {
              const id = `${block.id}.${k}`;
              if (typeof before[id] === "string") (block.props as any)[k] = before[id];
            }
          }
        }
      } else {
        return toast.error("This entry cannot be reverted from here");
      }
      onApply(next);
      await markReverted(item.id);
      qc.invalidateQueries({ queryKey: ["ai_generations", projectId] });
      toast.success("Reverted");
    } catch (e: any) {
      toast.error(e?.message ?? "Revert failed");
    } finally {
      setRevertingId(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[460px] sm:max-w-[460px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Sparkles className="size-4" /> AI history</SheetTitle>
          <SheetDescription>Every AI action on this site. Revert any change in place.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {isLoading && <div className="text-xs text-muted-foreground py-6 text-center">Loading…</div>}
          {!isLoading && items.length === 0 && (
            <div className="text-xs text-muted-foreground py-10 text-center border border-dashed border-border rounded-md">
              No AI actions yet. Rewrite a block or generate an image to get started.
            </div>
          )}
          {items.map((item) => {
            const meta = KIND_META[item.kind] ?? { icon: Sparkles, label: item.kind };
            const Icon = meta.icon;
            const canRevert = !!item.revert_payload && !item.reverted_at && (
              item.kind === "rewrite_block" || item.kind === "generate_image" || item.kind === "rewrite_site"
            );
            return (
              <div key={item.id} className="rounded-md border border-border p-3 space-y-2 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{meta.label}</div>
                      <div className="text-[10px] text-muted-foreground">{timeAgo(item.created_at)}{item.locale ? ` · ${item.locale}` : ""}</div>
                    </div>
                  </div>
                  {item.reverted_at ? (
                    <Badge variant="secondary" className="text-[10px]">Reverted</Badge>
                  ) : canRevert ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revert(item)}
                      disabled={revertingId === item.id}
                      title="Revert this change"
                    >
                      {revertingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
                      Revert
                    </Button>
                  ) : null}
                </div>
                {item.prompt && (
                  <div className="text-xs text-foreground/80 line-clamp-2 italic">"{item.prompt}"</div>
                )}
                {item.output_url && (
                  <a href={item.output_url} target="_blank" rel="noreferrer" className="block">
                    <img src={item.output_url} alt="" className="w-full h-24 object-cover rounded border border-border" loading="lazy" />
                  </a>
                )}
                {!item.output_url && item.output_text && (
                  <div className="text-[11px] text-muted-foreground line-clamp-3 font-mono bg-muted/40 rounded p-2">
                    {item.output_text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
