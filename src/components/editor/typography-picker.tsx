import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TYPO_PRESETS, type TypoPreset } from "@/lib/typography";

type SortKey = "default" | "name-asc" | "name-desc" | "scale-asc" | "scale-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Curated order" },
  { value: "name-asc", label: "Name · A → Z" },
  { value: "name-desc", label: "Name · Z → A" },
  { value: "scale-asc", label: "Display size · small → large" },
  { value: "scale-desc", label: "Display size · large → small" },
];

// Pull the upper bound out of clamp() for a rough comparable size in rem.
function displayMaxRem(tp: TypoPreset): number {
  const v = tp.vars["--wb-fs-display"] || "";
  const m = v.match(/clamp\([^,]+,[^,]+,\s*([\d.]+)rem\)/);
  if (m) return parseFloat(m[1]);
  const r = v.match(/([\d.]+)rem/);
  return r ? parseFloat(r[1]) : 0;
}

export function TypographyPicker({
  activeId,
  onChange,
  onClear,
}: {
  activeId: string | undefined;
  onChange: (id: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("default");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = TYPO_PRESETS.slice();
    if (q) {
      list = list.filter((tp) =>
        `${tp.label} ${tp.description} ${tp.id} ${tp.googleFonts.join(" ")}`
          .toLowerCase()
          .includes(q),
      );
    }
    switch (sort) {
      case "name-asc":
        list.sort((a, b) => a.label.localeCompare(b.label));
        break;
      case "name-desc":
        list.sort((a, b) => b.label.localeCompare(a.label));
        break;
      case "scale-asc":
        list.sort((a, b) => displayMaxRem(a) - displayMaxRem(b));
        break;
      case "scale-desc":
        list.sort((a, b) => displayMaxRem(b) - displayMaxRem(a));
        break;
      default:
        break;
    }
    return list;
  }, [query, sort]);

  const effectiveActive = activeId ?? "modern-clean";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Typography preset</Label>
        {activeId && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search presets…"
            className="h-8 pl-7 pr-7 text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-8 text-xs">
            <span className="flex items-center gap-1.5">
              {sort === "name-desc" || sort === "scale-desc" ? (
                <ArrowUpAZ className="size-3.5 text-muted-foreground" />
              ) : (
                <ArrowDownAZ className="size-3.5 text-muted-foreground" />
              )}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-[10px] text-muted-foreground tabular-nums px-0.5">
        {filtered.length} of {TYPO_PRESETS.length}
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No presets match “{query}”.
          </div>
        ) : (
          filtered.map((tp) => {
            const active = effectiveActive === tp.id;
            return (
              <button
                key={tp.id}
                type="button"
                onClick={() => onChange(tp.id)}
                style={{
                  fontFamily: tp.vars["--wb-font-heading"],
                  transition: "all var(--duration-fast) var(--ease-smooth)",
                }}
                className={`text-left rounded-lg border p-2.5 hover:border-primary/50 ${
                  active ? "border-primary bg-primary/5" : "border-border bg-background"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {highlight(tp.label, query)}
                  </span>
                  {active && (
                    <span className="text-[10px] uppercase text-primary">Active</span>
                  )}
                </div>
                <p
                  className="text-[11px] text-muted-foreground mt-0.5"
                  style={{ fontFamily: tp.vars["--wb-font-body"] }}
                >
                  {highlight(tp.description, query)}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function highlight(text: string, q: string) {
  const query = q.trim();
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}
