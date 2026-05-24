import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type Template,
  fetchCommunityTemplate,
} from "@/lib/templates";
import { FONTS, type ProjectContent } from "@/lib/blocks";
import { ai } from "@/lib/ai-gateway";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: { paletteIdx?: number; fontValue?: string; start?: "ai" | "template" | "blank" };
};

type Step = 1 | 2 | 3 | 4;

const PALETTES: { name: string; primary: string; gradient: string }[] = [
  { name: "Indigo", primary: "#6366f1", gradient: "linear-gradient(135deg,#6366f1,#22d3ee)" },
  { name: "Rose", primary: "#ef4444", gradient: "linear-gradient(135deg,#ef4444,#f97316)" },
  { name: "Emerald", primary: "#10b981", gradient: "linear-gradient(135deg,#10b981,#06b6d4)" },
  { name: "Amber", primary: "#b45309", gradient: "linear-gradient(135deg,#b45309,#fbbf24)" },
  { name: "Slate", primary: "#0f172a", gradient: "linear-gradient(135deg,#0f172a,#475569)" },
  { name: "Sky", primary: "#0ea5e9", gradient: "linear-gradient(135deg,#0ea5e9,#8b5cf6)" },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

// Walk every block and rewrite copy via AI. We send a compact JSON of
// editable strings, get a parallel JSON back, and merge it into the tree.
async function customizeContentWithAi(content: ProjectContent, prompt: string): Promise<ProjectContent> {
  const editable: Record<string, string> = {};
  const keysToRewrite = ["headline", "subheadline", "title", "subtitle", "body", "tagline", "eyebrow", "ctaLabel"];
  for (const page of content.pages) {
    for (const block of page.blocks) {
      for (const key of keysToRewrite) {
        const v = (block.props as any)[key];
        if (typeof v === "string" && v.trim()) editable[`${block.id}.${key}`] = v;
      }
    }
  }
  if (Object.keys(editable).length === 0) return content;

  const instruction =
    `Rewrite the values of this JSON object to fit the following site description, ` +
    `keeping the same keys and the same approximate length per value. ` +
    `Do not invent new keys. Return ONLY a JSON object with the same keys.\n\n` +
    `Site description: """${prompt}"""\n\n` +
    `Original strings:\n${JSON.stringify(editable, null, 2)}`;

  const res = await ai.copy(instruction).catch((e) => {
    throw new Error(`AI rewrite failed: ${e?.message ?? e}`);
  });
  const text = (res as any)?.result?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no JSON.");
  let rewritten: Record<string, string>;
  try {
    rewritten = JSON.parse(match[0]);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }

  const next: ProjectContent = JSON.parse(JSON.stringify(content));
  for (const page of next.pages) {
    for (const block of page.blocks) {
      for (const key of keysToRewrite) {
        const k = `${block.id}.${key}`;
        if (typeof rewritten[k] === "string") (block.props as any)[key] = rewritten[k];
      }
    }
  }
  return next;
}

export function CreateProjectWizard({ open, onOpenChange, initial }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2
  const [tab, setTab] = useState<"builtin" | "import">("builtin");
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedTpl, setSelectedTpl] = useState<Template>(TEMPLATES[0]);
  const [importUrl, setImportUrl] = useState("");
  const [importedTpl, setImportedTpl] = useState<{ name: string; content: ProjectContent } | null>(null);
  const [importing, setImporting] = useState(false);

  // Step 3
  const [paletteIdx, setPaletteIdx] = useState<number | null>(null);
  const [fontValue, setFontValue] = useState<string | null>(null);

  // Step 4
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);

  // Apply onboarding presets when the wizard opens.
  useMemo(() => {
    if (!open || !initial) return;
    if (typeof initial.paletteIdx === "number") setPaletteIdx(initial.paletteIdx);
    if (initial.fontValue) setFontValue(initial.fontValue);
    if (initial.start === "ai") setAiEnabled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const slug = useMemo(() => slugify(name), [name]);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => category === "All" || t.category === category)
      .filter((t) => !search || (t.name + " " + t.description).toLowerCase().includes(search.toLowerCase()));
  }, [category, search]);

  function reset() {
    setStep(1); setName(""); setDescription("");
    setTab("builtin"); setCategory("All"); setSearch("");
    setSelectedTpl(TEMPLATES[0]); setImportUrl(""); setImportedTpl(null);
    setPaletteIdx(null); setFontValue(null);
    setAiPrompt(""); setAiEnabled(false);
  }

  async function tryImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const tpl = await fetchCommunityTemplate(importUrl.trim());
      setImportedTpl({ name: tpl.name, content: tpl.content });
      toast.success(`Imported "${tpl.name}"`);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in.");

      // 1. Pick base content
      let content: ProjectContent;
      let templateId: string | null;
      if (tab === "import" && importedTpl) {
        content = JSON.parse(JSON.stringify(importedTpl.content));
        templateId = "community";
      } else {
        content = selectedTpl.buildContent();
        templateId = selectedTpl.id;
      }

      // 2. Apply brand kit
      if (paletteIdx !== null) content.branding.primaryColor = PALETTES[paletteIdx].primary;
      if (fontValue) content.branding.fontFamily = fontValue;
      if (name.trim()) content.branding.siteName = name.trim();

      // 3. Optional AI rewrite
      if (aiEnabled && aiPrompt.trim()) {
        try {
          content = await customizeContentWithAi(content, aiPrompt.trim());
        } catch (e: any) {
          toast.error(e?.message ?? "AI customization failed — using template as-is.");
        }
      }

      // 4. Insert
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: name.trim() || (importedTpl?.name ?? selectedTpl.name),
          description: description.trim() || null,
          template_id: templateId,
          slug: slug || null,
          content: content as any,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Project created");
      onOpenChange(false);
      reset();
      navigate({ to: "/editor/$projectId", params: { projectId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canNext: Record<Step, boolean> = {
    1: name.trim().length > 0,
    2: tab === "builtin" ? !!selectedTpl : !!importedTpl,
    3: true,
    4: true,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogDescription>
            Step {step} of 4 — {["Name & description", "Choose a template", "Brand kit", "AI customization (optional)"][step - 1]}
          </DialogDescription>
        </DialogHeader>

        <Stepper step={step} />

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wiz-name">Project name *</Label>
              <Input id="wiz-name" autoFocus placeholder="My awesome website" value={name} onChange={(e) => setName(e.target.value)} />
              {slug && <p className="text-xs text-muted-foreground">Suggested URL slug: <code className="font-mono">{slug}</code></p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wiz-desc">Description (optional)</Label>
              <Textarea id="wiz-desc" rows={3} placeholder="One sentence about what this site is for." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="builtin">Built-in templates</TabsTrigger>
                <TabsTrigger value="import"><Link2 className="size-4" /> Import from URL</TabsTrigger>
              </TabsList>

              <TabsContent value="builtin" className="space-y-3 mt-4">
                <div className="flex gap-2 items-center flex-wrap">
                  <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
                  <div className="flex gap-1.5 flex-wrap">
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredTemplates.map((t) => {
                    const isActive = selectedTpl.id === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTpl(t)}
                        className={`text-left rounded-lg border p-2 transition-all ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                      >
                        <div className="aspect-video rounded mb-2 relative" style={{ background: t.thumbnailGradient }}>
                          {isActive && (
                            <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-white text-primary flex items-center justify-center">
                              <Check className="size-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium truncate">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{t.category}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="import" className="space-y-3 mt-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
                  <p className="font-medium">Import a community template</p>
                  <p className="text-muted-foreground text-xs">
                    Paste an https URL to a JSON template file (raw GitHub, Gist, or any public CDN). The file must
                    follow the WebSculpt template schema: <code>{`{ name, content: { branding, pages[] } }`}</code>.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://raw.githubusercontent.com/.../template.json"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                  />
                  <Button type="button" onClick={tryImport} disabled={importing || !importUrl.trim()}>
                    {importing ? <Loader2 className="size-4 animate-spin" /> : "Fetch"}
                  </Button>
                </div>
                {importedTpl && (
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    <span>Loaded <strong>{importedTpl.name}</strong> · {importedTpl.content.pages.length} page(s).</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Color palette</Label>
              <p className="text-xs text-muted-foreground">Skip to keep the template's defaults.</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PALETTES.map((p, i) => {
                  const isActive = paletteIdx === i;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setPaletteIdx(isActive ? null : i)}
                      className={`rounded-lg border p-2 transition-all ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                    >
                      <div className="aspect-square rounded" style={{ background: p.gradient }} />
                      <div className="text-[11px] mt-1 truncate">{p.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Font pairing</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FONTS.map((f) => {
                  const isActive = fontValue === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFontValue(isActive ? null : f.value)}
                      className={`text-left rounded-lg border p-3 transition-all ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                      style={{ fontFamily: f.value }}
                    >
                      <div className="text-base font-semibold">{f.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">The quick brown fox jumps.</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium"><Sparkles className="size-4 text-primary" /> Optional AI customization</div>
              <p className="text-muted-foreground text-xs">
                Describe your site in one sentence and we'll rewrite the template's copy to match — using your AI provider keys.
                You can always skip and edit by hand later.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded border-border" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />
              Customize with AI before opening
            </label>
            {aiEnabled && (
              <Textarea
                rows={3}
                placeholder="e.g. A minimalist meditation app called Stillwater for busy professionals."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => step > 1 ? setStep((step - 1) as Step) : onOpenChange(false)}>
            <ArrowLeft className="size-4" /> {step > 1 ? "Back" : "Cancel"}
          </Button>
          {step < 4 ? (
            <Button type="button" disabled={!canNext[step]} onClick={() => setStep((step + 1) as Step)}>
              Next <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? <><Loader2 className="size-4 animate-spin" /> Creating…</> : <>Create project <Check className="size-4" /></>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Details", "Template", "Brand", "AI"];
  return (
    <div className="flex items-center gap-2 py-2">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
              active ? "bg-primary text-primary-foreground border-primary"
              : done ? "bg-primary/20 text-primary border-primary/40"
              : "bg-muted text-muted-foreground border-border"
            }`}>
              {done ? <Check className="size-3.5" /> : n}
            </div>
            <span className={`text-xs ${active ? "font-medium" : "text-muted-foreground"} hidden sm:inline`}>{label}</span>
            {i < labels.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
