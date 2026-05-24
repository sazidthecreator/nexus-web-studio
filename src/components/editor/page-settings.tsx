// Per-page settings popover: SEO overrides, custom slug, hide-from-nav.
// Opened from the gear icon in PagesBar.
import { useState, useEffect } from "react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings2 } from "lucide-react";
import type { ProjectPage, PageSEO } from "@/lib/blocks";

export function pageSlug(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "page";
}

export function PageSettingsButton({
  page,
  onChange,
}: {
  page: ProjectPage;
  onChange: (patch: Partial<ProjectPage>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(page.slug ?? "");
  const [seo, setSeo] = useState<PageSEO>(page.seo ?? {});
  const [hidden, setHidden] = useState(!!page.hiddenFromNav);

  useEffect(() => {
    if (!open) return;
    setSlug(page.slug ?? "");
    setSeo(page.seo ?? {});
    setHidden(!!page.hiddenFromNav);
  }, [open, page]);

  const derivedSlug = pageSlug(page.name);
  const effectiveSlug = (slug.trim() ? pageSlug(slug) : derivedSlug);

  function commit() {
    const patch: Partial<ProjectPage> = {
      hiddenFromNav: hidden || undefined,
      slug: slug.trim() ? pageSlug(slug) : undefined,
      seo:
        seo.title || seo.description || seo.ogImage || seo.noindex
          ? seo
          : undefined,
    };
    onChange(patch);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          aria-label={`Settings for ${page.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Settings2 className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-3" align="start">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Page settings</div>
          <p className="text-[11px] text-muted-foreground">
            URL: <code className="font-mono">/{effectiveSlug}</code>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">URL slug (optional)</Label>
          <Input
            value={slug}
            placeholder={derivedSlug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Leave blank to derive from page name.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">SEO title override</Label>
          <Input
            value={seo.title ?? ""}
            placeholder={`${page.name} — Site title`}
            onChange={(e) => setSeo({ ...seo, title: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">SEO description</Label>
          <Textarea
            rows={2}
            value={seo.description ?? ""}
            placeholder="Shown in search results and link previews."
            onChange={(e) => setSeo({ ...seo, description: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Social preview image URL</Label>
          <Input
            value={seo.ogImage ?? ""}
            placeholder="https://…"
            onChange={(e) => setSeo({ ...seo, ogImage: e.target.value || undefined })}
          />
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={!!seo.noindex}
            onChange={(e) => setSeo({ ...seo, noindex: e.target.checked || undefined })}
          />
          Hide from search engines (noindex)
        </label>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
          />
          Hide from auto-generated nav menus
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={commit}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}