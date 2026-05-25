import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { Block, ProjectPage } from "@/lib/blocks";
import { AssetPicker } from "./asset-picker";
import { AiImageBlockControls } from "@/components/editor/ai-image-block-controls";
import { pageSlug } from "@/components/editor/page-settings";

type Props = {
  block: Block;
  onChange: (patch: Record<string, any>) => void;
  /** When provided, href fields show a "link to page" picker. */
  pages?: Pick<ProjectPage, "id" | "name" | "slug">[];
};

function Field({ label, value, onChange, multiline }: { label: string; value: any; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={2} />
      ) : (
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function PropertyEditor({ block, onChange, pages }: Props) {
  const p = block.props;
  const set = (k: string, v: any) => onChange({ [k]: v });
  const inner = renderTypeFields(block, p, set, pages);
  return (
    <div className="space-y-4">
      {inner}
      <div className="pt-3 border-t border-border space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interaction</div>
        <SelectField
          label="Scroll animation"
          value={p.animation || "none"}
          options={["none", "fade", "slide-up", "slide-left", "zoom"]}
          onChange={(v) => set("animation", v)}
        />
      </div>
    </div>
  );
}

function pageHref(p: Pick<ProjectPage, "name" | "slug">, isFirst: boolean): string {
  if (isFirst) return "/";
  return `/${p.slug ? pageSlug(p.slug) : pageSlug(p.name)}`;
}

function PagePicker({
  pages,
  onPick,
}: {
  pages: Pick<ProjectPage, "id" | "name" | "slug">[];
  onPick: (href: string) => void;
}) {
  if (!pages || pages.length === 0) return null;
  return (
    <select
      aria-label="Link to a page"
      value=""
      onChange={(e) => {
        if (!e.target.value) return;
        onPick(e.target.value);
        e.target.value = "";
      }}
      className="h-9 rounded-md border border-input bg-background px-2 text-xs"
      title="Link to a page in this project"
    >
      <option value="">↗ Link to page…</option>
      {pages.map((pg, i) => (
        <option key={pg.id} value={pageHref(pg, i === 0)}>
          {pg.name}
        </option>
      ))}
    </select>
  );
}

function renderTypeFields(block: Props["block"], p: any, set: (k: string, v: any) => void, pages?: Pick<ProjectPage, "id" | "name" | "slug">[]) {
  switch (block.type) {
    case "navbar":
      return (
        <div className="space-y-3">
          <SelectField label="Layout" value={p.layout ?? "split"} options={["split", "center", "stacked", "minimal"]} onChange={(v) => set("layout", v)} />
          <Field label="CTA label" value={p.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="CTA href" value={p.ctaHref} onChange={(v) => set("ctaHref", v)} /></div>
            <PagePicker pages={pages ?? []} onPick={(href) => set("ctaHref", href)} />
          </div>
          <ListEditor
            label="Links"
            items={p.links || []}
            fields={["label", "href"]}
            empty={{ label: "New link", href: "#" }}
            onChange={(items) => set("links", items)}
            pages={pages}
            hrefField="href"
          />
        </div>
      );
    case "hero":
      return (
        <div className="space-y-3">
          <SelectField label="Layout" value={p.layout ?? "center"} options={["center", "split", "left", "minimal"]} onChange={(v) => set("layout", v)} />
          <Field label="Eyebrow" value={p.eyebrow} onChange={(v) => set("eyebrow", v)} />
          <Field label="Headline" value={p.headline} onChange={(v) => set("headline", v)} multiline />
          <Field label="Subheadline" value={p.subheadline} onChange={(v) => set("subheadline", v)} multiline />
          <Field label="Primary CTA label" value={p.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="Primary CTA href" value={p.ctaHref} onChange={(v) => set("ctaHref", v)} /></div>
            <PagePicker pages={pages ?? []} onPick={(href) => set("ctaHref", href)} />
          </div>
          <Field label="Secondary CTA label" value={p.secondaryLabel} onChange={(v) => set("secondaryLabel", v)} />
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="Secondary CTA href" value={p.secondaryHref} onChange={(v) => set("secondaryHref", v)} /></div>
            <PagePicker pages={pages ?? []} onPick={(href) => set("secondaryHref", href)} />
          </div>
        </div>
      );
    case "features":
      return (
        <div className="space-y-3">
          <SelectField label="Layout" value={p.layout ?? "grid"} options={["grid", "list", "bento", "alternating"]} onChange={(v) => set("layout", v)} />
          <Field label="Title" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Subtitle" value={p.subtitle} onChange={(v) => set("subtitle", v)} multiline />
          <ListEditor
            label="Items"
            items={p.items || []}
            fields={["icon", "title", "body"]}
            empty={{ icon: "✨", title: "New feature", body: "Describe it." }}
            onChange={(items) => set("items", items)}
          />
        </div>
      );
    case "cta":
      return (
        <div className="space-y-3">
          <SelectField label="Layout" value={p.layout ?? "banner"} options={["banner", "split", "minimal", "full"]} onChange={(v) => set("layout", v)} />
          <Field label="Headline" value={p.headline} onChange={(v) => set("headline", v)} multiline />
          <Field label="Subheadline" value={p.subheadline} onChange={(v) => set("subheadline", v)} multiline />
          <Field label="CTA label" value={p.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="CTA href" value={p.ctaHref} onChange={(v) => set("ctaHref", v)} /></div>
            <PagePicker pages={pages ?? []} onPick={(href) => set("ctaHref", href)} />
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="space-y-3">
          <SelectField label="Layout" value={p.layout ?? "columns"} options={["columns", "centered", "minimal"]} onChange={(v) => set("layout", v)} />
          <Field label="Tagline" value={p.tagline} onChange={(v) => set("tagline", v)} multiline />
          <p className="text-xs text-muted-foreground">Footer columns are preset. Edit JSON via raw mode in a future update.</p>
        </div>
      );
    case "heading":
      return (
        <div className="space-y-3">
          <Field label="Title" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Subtitle" value={p.subtitle} onChange={(v) => set("subtitle", v)} multiline />
          <SelectField label="Align" value={p.align ?? "center"} options={["left", "center", "right"]} onChange={(v) => set("align", v)} />
        </div>
      );
    case "text":
      return (
        <div className="space-y-3">
          <Field label="Body" value={p.body} onChange={(v) => set("body", v)} multiline />
          <SelectField label="Align" value={p.align ?? "left"} options={["left", "center", "right"]} onChange={(v) => set("align", v)} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Image</Label>
            <AssetPicker value={p.src} onChange={(v) => set("src", v)} />
          </div>
          <Field label="Alt text" value={p.alt} onChange={(v) => set("alt", v)} />
          <Field label="Caption" value={p.caption} onChange={(v) => set("caption", v)} />
          <NumField label="Max width (px)" value={p.maxWidth ?? 960} onChange={(v) => set("maxWidth", v)} />
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-3">
          <SelectField label="Layout" value={p.layout ?? "grid"} options={["grid", "masonry", "carousel", "wide"]} onChange={(v) => set("layout", v)} />
          <Label className="text-xs">Images</Label>
          <div className="space-y-2">
            {(p.images || []).map((im: any, i: number) => (
              <div key={i} className="rounded border border-border p-2 space-y-1.5 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-muted-foreground">#{i + 1}</span>
                  <button
                    onClick={() => set("images", (p.images || []).filter((_: any, j: number) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <AssetPicker value={im.src} onChange={(v) => set("images", (p.images || []).map((x: any, j: number) => j === i ? { ...x, src: v } : x))} />
                <Input placeholder="alt" value={im.alt ?? ""} onChange={(e) => set("images", (p.images || []).map((x: any, j: number) => j === i ? { ...x, alt: e.target.value } : x))} />
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => set("images", [...(p.images || []), { src: "", alt: "" }])}>
              <Plus className="size-3.5" /> Add image
            </Button>
          </div>
        </div>
      );
    case "button":
      return (
        <div className="space-y-3">
          <Field label="Label" value={p.label} onChange={(v) => set("label", v)} />
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="Link (href)" value={p.href} onChange={(v) => set("href", v)} /></div>
            <PagePicker pages={pages ?? []} onPick={(href) => set("href", href)} />
          </div>
          <SelectField label="Style" value={p.style ?? "solid"} options={["solid", "outline"]} onChange={(v) => set("style", v)} />
          <SelectField label="Align" value={p.align ?? "center"} options={["left", "center", "right"]} onChange={(v) => set("align", v)} />
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <Field label="YouTube/Vimeo URL" value={p.url} onChange={(v) => set("url", v)} />
          <p className="text-xs text-muted-foreground">Paste a full link, e.g. https://youtu.be/...</p>
        </div>
      );
    case "divider":
      return (
        <div className="space-y-3">
          <SelectField label="Style" value={p.style ?? "line"} options={["line", "space"]} onChange={(v) => set("style", v)} />
          <NumField label="Spacing (px)" value={p.spacing ?? 48} onChange={(v) => set("spacing", v)} />
        </div>
      );
    case "form":
      return (
        <div className="space-y-3">
          <Field label="Title" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Subtitle" value={p.subtitle} onChange={(v) => set("subtitle", v)} multiline />
          <Field label="Submit button" value={p.submitLabel} onChange={(v) => set("submitLabel", v)} />
          <Label className="text-xs">Fields</Label>
          <div className="space-y-2">
            {(p.fields || []).map((f: any, i: number) => (
              <div key={i} className="rounded border border-border p-2 space-y-1.5 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-muted-foreground">#{i + 1}</span>
                  <button onClick={() => set("fields", (p.fields || []).filter((_: any, j: number) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <Input placeholder="Name (id)" value={f.name ?? ""} onChange={(e) => set("fields", p.fields.map((x: any, j: number) => j === i ? { ...x, name: e.target.value } : x))} />
                <Input placeholder="Label" value={f.label ?? ""} onChange={(e) => set("fields", p.fields.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x))} />
                <select
                  value={f.type ?? "text"}
                  onChange={(e) => set("fields", p.fields.map((x: any, j: number) => j === i ? { ...x, type: e.target.value } : x))}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {["text","email","tel","number","textarea"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={!!f.required} onChange={(e) => set("fields", p.fields.map((x: any, j: number) => j === i ? { ...x, required: e.target.checked } : x))} />
                  Required
                </label>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => set("fields", [...(p.fields || []), { name: `field${(p.fields?.length ?? 0) + 1}`, label: "New field", type: "text", required: false }])}>
              <Plus className="size-3.5" /> Add field
            </Button>
          </div>
        </div>
      );
    default:
      return (
        <div className="space-y-3">
          {Object.keys(p).filter((k) => typeof p[k] === "string" && k !== "animation").map((k) => (
            <Field key={k} label={k} value={p[k]} onChange={(v) => set(k, v)} />
          ))}
        </div>
      );
  }
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function ListEditor({ label, items, fields, empty, onChange, pages, hrefField }: { label: string; items: any[]; fields: string[]; empty: any; onChange: (items: any[]) => void; pages?: Pick<ProjectPage, "id" | "name" | "slug">[]; hrefField?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Button size="sm" variant="ghost" onClick={() => onChange([...items, { ...empty }])}>
          <Plus className="size-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded border border-border p-2 space-y-1.5 bg-background">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted-foreground">#{i + 1}</span>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3" />
              </button>
            </div>
            {fields.map((f) => (
              <Input
                key={f}
                placeholder={f}
                value={it[f] ?? ""}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f]: e.target.value } : x)))}
              />
            ))}
            {hrefField && pages && pages.length > 0 && (
              <PagePicker
                pages={pages}
                onPick={(href) =>
                  onChange(items.map((x, j) => (j === i ? { ...x, [hrefField]: href } : x)))
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}