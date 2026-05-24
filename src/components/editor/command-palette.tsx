import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { BLOCK_LIBRARY, type Block, type BlockType } from "@/lib/blocks";
import {
  Plus,
  Undo2,
  Redo2,
  Save,
  Copy,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Layers,
  Code2,
  Keyboard,
  Crosshair,
  MousePointer as MousePointerSquare,
  Compass,
  Gauge,
  LibraryBig,
} from "lucide-react";

export type PaletteAction =
  | { kind: "addBlock"; type: BlockType }
  | { kind: "selectBlock"; id: string }
  | { kind: "jumpToSelected" }
  | { kind: "undo" }
  | { kind: "redo" }
  | { kind: "save" }
  | { kind: "duplicate" }
  | { kind: "delete" }
  | { kind: "viewport"; v: "desktop" | "tablet" | "mobile" }
  | { kind: "openAi" }
  | { kind: "openLayers" }
  | { kind: "openDevtools" }
  | { kind: "openShortcuts" }
  | { kind: "openTour" }
  | { kind: "openAudit" }
  | { kind: "openSectionLibrary" };

export function CommandPalette({
  open,
  onOpenChange,
  onAction,
  pageBlocks = [],
  hasSelection = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAction: (a: PaletteAction) => void;
  pageBlocks?: Block[];
  hasSelection?: boolean;
}) {
  const [q, setQ] = useState("");
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const run = (a: PaletteAction) => { onAction(a); onOpenChange(false); };

  const blockLabel = (b: Block) => {
    const p = b.props || {};
    const text = p.headline || p.title || p.label || p.body || p.tagline || "";
    const trimmed = String(text).slice(0, 40);
    return trimmed ? `${b.type} — ${trimmed}` : b.type;
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Type a command, search blocks, or jump to a section…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run({ kind: "save" })}><Save className="size-4" />Save project</CommandItem>
          <CommandItem onSelect={() => run({ kind: "undo" })}><Undo2 className="size-4" />Undo</CommandItem>
          <CommandItem onSelect={() => run({ kind: "redo" })}><Redo2 className="size-4" />Redo</CommandItem>
          <CommandItem onSelect={() => run({ kind: "duplicate" })}><Copy className="size-4" />Duplicate selected</CommandItem>
          <CommandItem onSelect={() => run({ kind: "delete" })}><Trash2 className="size-4" />Delete selected</CommandItem>
          {hasSelection && (
            <CommandItem onSelect={() => run({ kind: "jumpToSelected" })}>
              <Crosshair className="size-4" />Jump to selected block
            </CommandItem>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="View">
          <CommandItem onSelect={() => run({ kind: "viewport", v: "desktop" })}><Monitor className="size-4" />Desktop preview</CommandItem>
          <CommandItem onSelect={() => run({ kind: "viewport", v: "tablet" })}><Tablet className="size-4" />Tablet preview</CommandItem>
          <CommandItem onSelect={() => run({ kind: "viewport", v: "mobile" })}><Smartphone className="size-4" />Mobile preview</CommandItem>
          <CommandItem onSelect={() => run({ kind: "openLayers" })}><Layers className="size-4" />Toggle layers panel</CommandItem>
          <CommandItem onSelect={() => run({ kind: "openDevtools" })}><Code2 className="size-4" />Toggle devtools</CommandItem>
          <CommandItem onSelect={() => run({ kind: "openShortcuts" })}><Keyboard className="size-4" />Keyboard shortcuts</CommandItem>
          <CommandItem onSelect={() => run({ kind: "openAi" })}><Sparkles className="size-4" />AI generate page</CommandItem>
          <CommandItem onSelect={() => run({ kind: "openSectionLibrary" })}><LibraryBig className="size-4" />Browse section library</CommandItem>
          <CommandItem onSelect={() => run({ kind: "openAudit" })}><Gauge className="size-4" />Run page quality audit</CommandItem>
          <CommandItem onSelect={() => run({ kind: "openTour" })}><Compass className="size-4" />Replay editor tour</CommandItem>
        </CommandGroup>
        {pageBlocks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Go to block">
              {pageBlocks.map((b) => (
                <CommandItem
                  key={b.id}
                  value={`goto ${blockLabel(b)} ${b.id}`}
                  onSelect={() => run({ kind: "selectBlock", id: b.id })}
                >
                  <MousePointerSquare className="size-4" />
                  <span className="truncate">{blockLabel(b)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Insert block">
          {BLOCK_LIBRARY.map((b) => (
            <CommandItem
              key={b.type}
              value={`insert ${b.type} ${b.label} ${b.description} ${b.category}`}
              onSelect={() => run({ kind: "addBlock", type: b.type })}
            >
              <Plus className="size-4" />
              {b.label}
              <span className="ml-auto text-xs text-muted-foreground">{b.category}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
