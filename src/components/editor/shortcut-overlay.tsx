import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const GROUPS: { title: string; items: { keys: string; label: string }[] }[] = [
  {
    title: "General",
    items: [
      { keys: "⌘ K", label: "Open command palette" },
      { keys: "⌘ S", label: "Save project" },
      { keys: "?", label: "Show this overlay" },
      { keys: "⌘ ⇧ D", label: "Toggle devtools" },
      { keys: "Esc", label: "Deselect" },
    ],
  },
  {
    title: "History",
    items: [
      { keys: "⌘ Z", label: "Undo" },
      { keys: "⌘ ⇧ Z / ⌘ Y", label: "Redo" },
    ],
  },
  {
    title: "Editing",
    items: [
      { keys: "⌘ D", label: "Duplicate selected" },
      { keys: "⌘ C / ⌘ V", label: "Copy / paste block" },
      { keys: "Delete / Backspace", label: "Remove block" },
      { keys: "↑ / ↓", label: "Move block up / down" },
      { keys: "Tab / ⇧ Tab", label: "Select next / previous block" },
    ],
  },
];

export function ShortcutOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Keyboard shortcuts</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g.title}</h3>
              <div className="space-y-1.5">
                {g.items.map((it) => (
                  <div key={it.label} className="flex items-center justify-between text-sm">
                    <span>{it.label}</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{it.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
