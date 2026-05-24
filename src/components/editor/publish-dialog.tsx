// Publish dialog: choose slug, push current content live, copy public URL.
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Copy, ExternalLink, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectContent } from "@/lib/blocks";
import { runPrePublishChecklist } from "@/lib/seo/checklist";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function PublishDialog({
  open, onOpenChange, projectId, projectName, content, currentSlug, currentPublished, onPublished, seo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName: string;
  content: ProjectContent | null;
  currentSlug: string | null;
  currentPublished: boolean;
  onPublished: (slug: string) => void;
  seo?: any;
}) {
  const [slug, setSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const checklist = useMemo(() => runPrePublishChecklist(content, seo), [content, seo]);
  const failures = checklist.filter((c) => c.status === "fail");
  const hasFailures = failures.length > 0;


  useEffect(() => {
    if (!open) return;
    setSlug(currentSlug || slugify(projectName) || "my-site");
    // Hydrate domain + preview from DB on open.
    supabase.from("projects")
      .select("custom_domain, preview_enabled")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data) {
          setCustomDomain((data as any).custom_domain || "");
          setPreviewEnabled((data as any).preview_enabled !== false);
        }
      });
  }, [open, currentSlug, projectName, projectId]);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/sites/${slug}` : `/sites/${slug}`;
  const domainUrl = customDomain ? `https://${customDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : null;

  async function publish() {
    if (!content) return;
    const cleaned = slugify(slug);
    if (!cleaned) return toast.error("Slug required");
    const domainClean = customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") || null;
    setBusy(true);
    const { error } = await supabase.from("projects")
      .update({
        slug: cleaned,
        published: true,
        published_content: content as any,
        published_at: new Date().toISOString(),
        custom_domain: domainClean,
        preview_enabled: previewEnabled,
      })
      .eq("id", projectId);
    setBusy(false);
    if (error) {
      if (error.code === "23505") toast.error("Slug or domain taken");
      else toast.error(error.message);
      return;
    }
    toast.success("Site published");
    onPublished(cleaned);
  }

  async function unpublish() {
    setBusy(true);
    const { error } = await supabase.from("projects").update({ published: false }).eq("id", projectId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Unpublished");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Globe className="size-4" /> Publish site</DialogTitle>
          <DialogDescription>Push the current canvas to a public URL.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground">/sites/</span>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-site" />
            </div>
          </div>
          {currentPublished && currentSlug && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm flex items-center justify-between">
              <span className="truncate">{publicUrl}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Copy site URL" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copied"); }}>
                  <Copy className="size-3.5" />
                </Button>
                <a href={`/sites/${currentSlug}`} target="_blank" rel="noreferrer" aria-label="Open published site in new tab">
                  <Button size="icon" variant="ghost" aria-hidden="true" tabIndex={-1}><ExternalLink className="size-3.5" /></Button>
                </a>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Custom domain (optional)</Label>
            <Input
              placeholder="example.com"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
            />
            {customDomain && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
                <div className="font-medium">DNS instructions</div>
                <div>1. At your registrar, add an <code className="font-mono">A</code> record for the root and <code className="font-mono">www</code>:</div>
                <div className="font-mono pl-3">@ → 185.158.133.1</div>
                <div className="font-mono pl-3">www → 185.158.133.1</div>
                <div>2. Add a <code className="font-mono">TXT</code> record at <code className="font-mono">_lovable</code> with the verification value shown in Project Settings.</div>
                <div>3. Wait for DNS propagation (typically 5–60 minutes; up to 72h). SSL is provisioned automatically.</div>
                <div>4. Visit {domainUrl} once DNS resolves — requests to <code className="font-mono">{customDomain.replace(/^https?:\/\//, "")}</code> render this site.</div>
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-border"
              checked={previewEnabled}
              onChange={(e) => setPreviewEnabled(e.target.checked)}
            />
            Allow production preview at <code className="font-mono text-xs">/sites/{slug}</code>
          </label>
          <div className="rounded-md border border-border p-3 space-y-1.5 max-h-56 overflow-y-auto">
            <div className="text-xs font-medium text-muted-foreground mb-1">Pre-publish checklist</div>
            {checklist.map((item) => {
              const Icon = item.status === "pass" ? CheckCircle2 : item.status === "warn" ? AlertTriangle : XCircle;
              const color = item.status === "pass" ? "text-emerald-500" : item.status === "warn" ? "text-amber-500" : "text-destructive";
              return (
                <div key={item.id} className="flex items-start gap-2 text-xs">
                  <Icon className={`size-3.5 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1">
                    <div>{item.label}</div>
                    {item.detail && <div className="text-muted-foreground">{item.detail}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {currentPublished && currentSlug && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Mirror to another host</div>
              <p className="text-[11px] text-muted-foreground">
                Export the static build (Editor → ⋯ → Export site) then import the ZIP into one of these:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-xs rounded-md border border-border bg-card px-2 py-1.5 text-center hover:border-primary/40">Vercel</a>
                <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-xs rounded-md border border-border bg-card px-2 py-1.5 text-center hover:border-primary/40">Netlify Drop</a>
                <a href="https://dash.cloudflare.com/?to=/:account/pages" target="_blank" rel="noreferrer" className="text-xs rounded-md border border-border bg-card px-2 py-1.5 text-center hover:border-primary/40">CF Pages</a>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {currentPublished && (
            <Button variant="ghost" onClick={unpublish} disabled={busy}>Unpublish</Button>
          )}
          <Button onClick={publish} disabled={busy || hasFailures} title={hasFailures ? "Resolve failing checks first" : undefined}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {currentPublished ? "Republish" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
