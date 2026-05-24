import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, Download, Loader2, Trash2, ArrowRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TEMPLATES, TEMPLATE_CATEGORIES, type Template } from "@/lib/templates";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { IMPORT_SOURCES, parseHtmlToProjectContent } from "@/lib/template-importer";
import { SmartImportDialog } from "@/components/templates/smart-import-dialog";
import { cacheTemplate } from "@/lib/offline-cache";
import type { ProjectContent } from "@/lib/blocks";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Sitely" },
      { name: "description", content: "Production-ready website templates across SaaS, agency, e-commerce, portfolio and more. One-click to start editing." },
      { property: "og:title", content: "Templates — Sitely" },
      { property: "og:description", content: "Pick a template and start editing in seconds." },
    ],
  }),
  component: TemplatesPage,
});

type ImportedRow = {
  id: string;
  name: string;
  source_url: string;
  category: string;
  thumbnail_url: string | null;
  content: ProjectContent;
};

function TemplatesPage() {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [usingId, setUsingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Cache full catalog into IndexedDB on first visit so users can browse offline.
  useEffect(() => {
    TEMPLATES.forEach((t) => {
      try {
        cacheTemplate({ id: t.id, name: t.name, category: t.category, content: t.buildContent(), cachedAt: Date.now() });
      } catch { /* ignore individual failures */ }
    });
  }, []);

  const importedQuery = useQuery({
    queryKey: ["imported-templates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imported_templates")
        .select("id,name,source_url,category,thumbnail_url,content")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ImportedRow[];
    },
  });

  const filtered = useMemo(() => {
    return TEMPLATES.filter((t) => category === "All" || t.category === category)
      .filter((t) => !query || (t.name + " " + t.description).toLowerCase().includes(query.toLowerCase()));
  }, [category, query]);

  const filteredImported = useMemo(() => {
    const rows = importedQuery.data || [];
    return rows
      .filter((t) => category === "All" || t.category === category || category === "Imported")
      .filter((t) => !query || (t.name + " " + t.source_url).toLowerCase().includes(query.toLowerCase()));
  }, [importedQuery.data, category, query]);

  const useTemplate = async (tpl: Template) => {
    if (!user) {
      try { sessionStorage.setItem("pendingTemplateId", tpl.id); } catch { /* noop */ }
      navigate({ to: "/signup" });
      return;
    }
    setUsingId(tpl.id);
    try {
      // Apply user's saved brand kit (palette/font/name) on top of template defaults.
      const { getSavedBrandKit, applyBrandingToContent } = await import("@/lib/brand-kit/saved");
      const kit = getSavedBrandKit();
      const content = applyBrandingToContent(tpl.buildContent(), kit);
      if (kit) toast.success(`Applied your "${kit.brandName}" brand kit`);
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: kit?.brandName ? `${kit.brandName} — ${tpl.name}` : tpl.name,
          description: tpl.description,
          template_id: tpl.id,
          content: content as any,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Project created from template");
      navigate({ to: "/editor/$projectId", params: { projectId: data.id as string } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create project");
    } finally {
      setUsingId(null);
    }
  };

  const createFromImported = useMutation({
    mutationFn: async (row: ImportedRow) => {
      if (!user) throw new Error("Sign in to create a project");
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: row.name,
          description: `Imported from ${row.source_url}`,
          template_id: `imported:${row.id}`,
          content: row.content as any,
          thumbnail_url: row.thumbnail_url,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Project created from imported template");
      navigate({ to: "/editor/$projectId", params: { projectId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteImported = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("imported_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["imported-templates", user?.id] });
      toast.success("Imported template removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="container mx-auto px-4 py-10 max-w-7xl">
      <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {TEMPLATES.length}+ production-ready starters. Pick one and you're editing in seconds — or import any open-source HTML page from the web.
          </p>
        </div>
        <div className="flex gap-2">
          {user ? (
            <>
              <SmartImportDialog
                userId={user.id}
                onImported={() => qc.invalidateQueries({ queryKey: ["imported-templates", user.id] })}
              />
              <ImportDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                onImported={() => qc.invalidateQueries({ queryKey: ["imported-templates", user.id] })}
                userId={user.id}
              />
            </>
          ) : (
            <Button asChild variant="outline">
              <Link to="/login">Sign in to import <ArrowRight className="size-4" /></Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates…" className="pl-9" />
        </div>
        <div className="-mx-1 px-1 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {[...TEMPLATE_CATEGORIES, "Imported"].map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={active}
                  className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filteredImported.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your imported templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredImported.map((t) => (
              <article key={t.id} className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition-all">
                <div className="aspect-video relative bg-muted">
                  {t.thumbnail_url ? (
                    <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No preview</div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/40 text-white px-2 py-0.5 rounded">Imported</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{t.source_url}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1" disabled={createFromImported.isPending} onClick={() => createFromImported.mutate(t)}>Use</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteImported.mutate(t.id)} aria-label="Delete imported template">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Built-in templates</h2>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Sparkles className="size-7 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold">No templates match "{query || category}"</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Try a different keyword, or import any public webpage as a template.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</Button>
            {user && <Button onClick={() => setImportOpen(true)}><Download className="size-4" /> Import from URL</Button>}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => (
            <article key={t.id} className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition-all">
              <div className="aspect-video relative" style={{ background: t.thumbnailGradient }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/95 font-bold text-xl drop-shadow tracking-tight" style={{ fontFamily: t.branding.fontFamily }}>
                    {t.branding.siteName}
                  </div>
                </div>
                <div className="absolute top-0 inset-x-0 h-7 bg-black/25 backdrop-blur-sm flex items-center gap-1.5 px-3">
                  <span className="size-1.5 rounded-full bg-white/60" />
                  <span className="size-1.5 rounded-full bg-white/60" />
                  <span className="size-1.5 rounded-full bg-white/60" />
                </div>
                <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide bg-black/45 text-white px-2 py-0.5 rounded">{t.category}</span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold tracking-tight truncate">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  disabled={usingId === t.id}
                  onClick={() => useTemplate(t)}
                >
                  {usingId === t.id ? <><Loader2 className="size-3.5 animate-spin" /> Creating…</> : <>Use this template <ArrowRight className="size-3.5" /></>}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onImported,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
  userId: string | undefined;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function runImport() {
    if (!userId) { toast.error("Not signed in"); return; }
    if (!url.trim()) { toast.error("Enter a URL"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-template", { body: { url: url.trim() } });
      if (error) throw error;
      const payload = data as { html?: string; finalUrl?: string; error?: string };
      if (payload?.error || !payload?.html) throw new Error(payload?.error || "Failed to fetch source");
      const result = parseHtmlToProjectContent(payload.html, payload.finalUrl || url.trim());
      const finalName = name.trim() || result.detectedTitle;
      const { error: insErr } = await supabase.from("imported_templates").insert({
        user_id: userId,
        name: finalName,
        source_url: payload.finalUrl || url.trim(),
        category: "Imported",
        thumbnail_url: result.thumbnailDataUrl,
        content: result.content as any,
      });
      if (insErr) throw insErr;
      toast.success(`Imported — ${result.blockCount} blocks parsed`);
      onImported();
      onOpenChange(false);
      setUrl(""); setName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Download className="size-4 mr-2" /> Import from URL</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import template from URL</DialogTitle>
          <DialogDescription>
            Paste any public HTML page. We fetch it server-side, parse sections (nav, hero, features, CTA, footer) and convert them into editable blocks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="imp-url">Page URL</Label>
            <Input id="imp-url" placeholder="https://html5up.net/uploads/demos/forty/" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imp-name">Name (optional)</Label>
            <Input id="imp-name" placeholder="Auto-detected from page title" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-medium mb-2">Suggested sources</p>
            <div className="flex flex-wrap gap-1.5">
              {IMPORT_SOURCES.map((s) => (
                <button
                  key={s.url}
                  type="button"
                  onClick={() => setUrl(s.url)}
                  className="text-xs px-2 py-1 rounded border border-border bg-card hover:border-primary/50"
                  title={s.note}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={runImport} disabled={busy}>
            {busy ? <><Loader2 className="size-4 mr-2 animate-spin" /> Importing…</> : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
