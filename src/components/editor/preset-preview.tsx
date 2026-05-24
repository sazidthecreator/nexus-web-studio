import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Eye, Plus, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRESETS, PRESET_CATEGORIES, type Preset, type PresetCategory } from "@/lib/presets";
import { BlockRenderer } from "@/components/block-renderer";
import { DEFAULT_BRANDING, FONTS, type Branding } from "@/lib/blocks";

export function PresetPreviewDialog({
  preset,
  branding,
  open,
  onOpenChange,
  onInsert,
}: {
  preset: Preset | null;
  branding?: Branding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (id: string) => void;
}) {
  const projectBranding = branding ?? DEFAULT_BRANDING;
  const [useProjectBrand, setUseProjectBrand] = useState(true);
  const [override, setOverride] = useState<Branding>(projectBranding);

  // Reset overrides whenever a new preset opens or project branding changes.
  useEffect(() => {
    if (open) {
      setUseProjectBrand(true);
      setOverride(projectBranding);
    }
  }, [open, projectBranding.primaryColor, projectBranding.fontFamily, projectBranding.siteName]);

  const activeBranding = useProjectBrand ? projectBranding : override;
  const blocks = useMemo(() => (preset ? preset.build() : []), [preset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{preset?.label ?? "Preview"}</DialogTitle>
          <DialogDescription>{preset?.description}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-y bg-muted/20 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="use-project-brand" checked={useProjectBrand} onCheckedChange={setUseProjectBrand} />
            <Label htmlFor="use-project-brand" className="text-xs cursor-pointer">Use project branding</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Primary</Label>
            <input
              type="color"
              value={activeBranding.primaryColor}
              disabled={useProjectBrand}
              onChange={(e) => setOverride((b) => ({ ...b, primaryColor: e.target.value }))}
              className="size-7 rounded border border-border cursor-pointer disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Font</Label>
            <Select
              value={activeBranding.fontFamily}
              disabled={useProjectBrand}
              onValueChange={(v) => setOverride((b) => ({ ...b, fontFamily: v }))}
            >
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Site name</Label>
            <Input
              value={activeBranding.siteName}
              disabled={useProjectBrand}
              onChange={(e) => setOverride((b) => ({ ...b, siteName: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="bg-muted/30 max-h-[55vh] overflow-y-auto">
          <div className="origin-top scale-[0.65] sm:scale-75 w-[154%] sm:w-[133%]">
            {blocks.map((blk) => (
              <BlockRenderer key={blk.id} block={blk} branding={activeBranding} />
            ))}
          </div>
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (preset) onInsert(preset.id);
              onOpenChange(false);
            }}
          >
            <Plus className="size-4 mr-1.5" /> Insert preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PresetCard({
  preset,
  onPreview,
  onInsert,
}: {
  preset: Preset;
  onPreview: () => void;
  onInsert: () => void;
}) {
  return (
    <div
      style={{ transition: "all var(--duration-fast) var(--ease-smooth)" }}
      className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2.5 hover:border-primary/60 hover:bg-primary/10"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{preset.label}</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-6" onClick={onPreview} title="Preview" aria-label={`Preview ${preset.label}`}>
            <Eye className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6" onClick={onInsert} title="Insert" aria-label={`Insert ${preset.label}`}>
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
    </div>
  );
}

export function PresetList({
  branding,
  onInsert,
}: {
  branding?: Branding;
  onInsert: (id: string) => void;
}) {
  const [previewing, setPreviewing] = useState<Preset | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const grouped = useMemo(() => {
    const g = new Map<PresetCategory, Preset[]>();
    for (const cat of PRESET_CATEGORIES) g.set(cat, []);
    for (const p of PRESETS) {
      if (!g.has(p.category)) g.set(p.category, []);
      g.get(p.category)!.push(p);
    }
    return Array.from(g.entries()).filter(([, list]) => list.length > 0);
  }, []);
  return (
    <>
      <div className="space-y-3">
        {grouped.map(([cat, list]) => {
          const isOpen = !collapsed[cat];
          return (
            <div key={cat} className="space-y-1.5">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))}
                className="flex w-full items-center justify-between gap-2 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-1.5">
                  {cat === "Premium" && <Sparkles className="size-3 text-primary" />}
                  {cat}
                  <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">· {list.length}</span>
                </span>
                <ChevronDown
                  className="size-3.5 transition-transform"
                  style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                />
              </button>
              {isOpen && (
                <div className="space-y-1.5 animate-fade-in">
                  {list.map((p) => (
                    <PresetCard
                      key={p.id}
                      preset={p}
                      onPreview={() => setPreviewing(p)}
                      onInsert={() => onInsert(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <PresetPreviewDialog
        preset={previewing}
        branding={branding}
        open={!!previewing}
        onOpenChange={(o) => { if (!o) setPreviewing(null); }}
        onInsert={onInsert}
      />
    </>
  );
}
