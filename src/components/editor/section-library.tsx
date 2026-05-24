import { useMemo, useState } from "react";
import { Plus, Search, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  PRESETS,
  PRESET_CATEGORIES,
  type Preset,
  type PresetCategory,
} from "@/lib/presets";
import { BlockRenderer } from "@/components/block-renderer";
import { DEFAULT_BRANDING, type Branding } from "@/lib/blocks";

// Section-type tags inferred from preset id/label so users can filter by
// the kind of section ("hero", "pricing", "FAQ", "testimonials", "contact"…)
// without us having to re-tag every preset by hand.
const SECTION_TAG_RULES: { tag: string; match: RegExp }[] = [
  { tag: "Hero", match: /hero|launch|landing|portfolio|product/i },
  { tag: "Features", match: /feature|grid|bento/i },
  { tag: "Pricing", match: /pricing|plan|tier/i },
  { tag: "FAQ", match: /faq|question/i },
  { tag: "Testimonials", match: /testimonial|social proof|quote/i },
  { tag: "Contact", match: /contact|lead|form/i },
  { tag: "Newsletter", match: /newsletter|subscribe|email/i },
  { tag: "Footer", match: /footer/i },
  { tag: "CTA", match: /cta|call to action|conversion|signup/i },
  { tag: "Gallery", match: /gallery|portfolio/i },
  { tag: "Article", match: /article|blog|long-form|editorial/i },
  { tag: "Agency", match: /agency|pitch/i },
];

function tagsFor(p: Preset): string[] {
  const haystack = `${p.id} ${p.label} ${p.description}`;
  const tags = SECTION_TAG_RULES.filter((r) => r.match.test(haystack)).map((r) => r.tag);
  return Array.from(new Set(tags));
}

type FilterValue = { kind: "all" } | { kind: "category"; value: PresetCategory } | { kind: "tag"; value: string };

const ALL_TAGS = Array.from(
  new Set(PRESETS.flatMap((p) => tagsFor(p))),
).sort();

export function SectionLibraryDialog({
  open,
  onOpenChange,
  branding,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branding?: Branding;
  onInsert: (presetId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>({ kind: "all" });
  const activeBranding = branding ?? DEFAULT_BRANDING;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRESETS.filter((p) => {
      if (filter.kind === "category" && p.category !== filter.value) return false;
      if (filter.kind === "tag" && !tagsFor(p).includes(filter.value)) return false;
      if (!q) return true;
      const hay = `${p.label} ${p.description} ${p.category} ${tagsFor(p).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, filter]);

  const counts = useMemo(() => {
    const cats = new Map<PresetCategory, number>();
    const tags = new Map<string, number>();
    for (const p of PRESETS) {
      cats.set(p.category, (cats.get(p.category) ?? 0) + 1);
      for (const t of tagsFor(p)) tags.set(t, (tags.get(t) ?? 0) + 1);
    }
    return { cats, tags };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Section template library
          </DialogTitle>
          <DialogDescription>
            Insert complete page sections in one click — hero, pricing, FAQ, testimonials, contact and more.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-3 pb-2 border-b space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="pl-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={filter.kind === "all"}
              onClick={() => setFilter({ kind: "all" })}
              label="All"
              count={PRESETS.length}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 self-center px-1">
              Category
            </span>
            {PRESET_CATEGORIES.filter((c) => (counts.cats.get(c) ?? 0) > 0).map((cat) => (
              <FilterChip
                key={cat}
                active={filter.kind === "category" && filter.value === cat}
                onClick={() => setFilter({ kind: "category", value: cat })}
                label={cat}
                count={counts.cats.get(cat) ?? 0}
                premium={cat === "Premium"}
              />
            ))}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 self-center px-1 ml-2">
              Section
            </span>
            {ALL_TAGS.map((tag) => (
              <FilterChip
                key={tag}
                active={filter.kind === "tag" && filter.value === tag}
                onClick={() => setFilter({ kind: "tag", value: tag })}
                label={tag}
                count={counts.tags.get(tag) ?? 0}
              />
            ))}
          </div>
        </div>

        <ScrollArea className="h-[60vh]">
          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-16">
                No templates match — try a different filter or search term.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => (
                  <PresetThumb
                    key={p.id}
                    preset={p}
                    branding={activeBranding}
                    onInsert={() => {
                      onInsert(p.id);
                      onOpenChange(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  premium,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  premium?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      {premium && <Sparkles className="size-3" />}
      <span>{label}</span>
      <span className={cn("text-[10px] tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {count}
      </span>
    </button>
  );
}

function PresetThumb({
  preset,
  branding,
  onInsert,
}: {
  preset: Preset;
  branding: Branding;
  onInsert: () => void;
}) {
  const blocks = useMemo(() => preset.build(), [preset]);
  const tags = useMemo(() => tagsFor(preset), [preset]);

  return (
    <div className="group rounded-xl border border-border bg-background overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-md transition-all">
      <div className="relative h-48 overflow-hidden bg-muted/40 border-b border-border">
        <div className="absolute inset-0 origin-top-left scale-[0.28] w-[357%] h-[357%] pointer-events-none select-none">
          {blocks.map((blk) => (
            <BlockRenderer key={blk.id} block={blk} branding={branding} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {preset.category === "Premium" && <Sparkles className="size-3 text-primary shrink-0" />}
              <h4 className="font-medium text-sm truncate">{preset.label}</h4>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{preset.description}</p>
          </div>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}
        <Button size="sm" className="mt-auto w-full" onClick={onInsert}>
          <Plus className="size-3.5" /> Insert section
        </Button>
      </div>
    </div>
  );
}
