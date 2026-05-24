import type { Block } from "@/lib/blocks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DevtoolsPanel({
  open,
  onClose,
  selected,
  blockCount,
  historySize,
}: {
  open: boolean;
  onClose: () => void;
  selected: Block | null;
  blockCount: number;
  historySize: { past: number; future: number };
}) {
  if (!open) return null;
  return (
    <div className="editor-panel-right absolute bottom-0 right-0 z-30 w-96 h-80 border-t border-l border-border bg-card shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border bg-muted/40">
        <span className="text-xs font-semibold uppercase tracking-wide">Devtools</span>
        <Button size="icon" variant="ghost" className="size-6" onClick={onClose} aria-label="Close devtools">
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border flex gap-4">
        <span>Blocks: <strong className="text-foreground">{blockCount}</strong></span>
        <span>Past: <strong className="text-foreground">{historySize.past}</strong></span>
        <span>Future: <strong className="text-foreground">{historySize.future}</strong></span>
      </div>
      <ScrollArea className="flex-1">
        {selected ? (
          <pre className="p-3 text-[11px] leading-snug font-mono whitespace-pre-wrap break-all">
{JSON.stringify(selected, null, 2)}
          </pre>
        ) : (
          <p className="p-3 text-xs text-muted-foreground">Select a block to inspect its JSON.</p>
        )}
      </ScrollArea>
    </div>
  );
}
