import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ai } from "@/lib/ai-gateway";

export type SeoMeta = {
  title: string;
  description: string;
  ogImage: string;
  ogTitle?: string;
  ogDescription?: string;
  keywords?: string[];
};

export function SeoPanel({
  open, onOpenChange, projectId, projectName, initial, contentSummary,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName: string;
  initial: Partial<SeoMeta>;
  contentSummary: string;
}) {
  const qc = useQueryClient();
  const [meta, setMeta] = useState<SeoMeta>({
    title: initial.title || "",
    description: initial.description || "",
    ogImage: initial.ogImage || "",
    ogTitle: initial.ogTitle || "",
    ogDescription: initial.ogDescription || "",
    keywords: initial.keywords || [],
  });

  useEffect(() => {
    setMeta({
      title: initial.title || "",
      description: initial.description || "",
      ogImage: initial.ogImage || "",
      ogTitle: initial.ogTitle || "",
      ogDescription: initial.ogDescription || "",
      keywords: initial.keywords || [],
    });
  }, [initial.title, initial.description, initial.ogImage, initial.ogTitle, initial.ogDescription, open]);

  const generate = useMutation({
    mutationFn: async () => {
      const r = await ai.seoMeta(projectName, contentSummary.slice(0, 4000));
      return r.result.meta;
    },
    onSuccess: (m) => {
      setMeta((cur) => ({
        ...cur,
        title: m.title || cur.title,
        description: m.description || cur.description,
        ogTitle: m.ogTitle || m.title || cur.ogTitle,
        ogDescription: m.ogDescription || m.description || cur.ogDescription,
        keywords: m.keywords || cur.keywords,
      }));
      toast.success("SEO meta generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateOgImage = useMutation({
    mutationFn: async () => {
      const prompt = `${projectName} — ${meta.description || meta.title || "modern website"}, hero, photographic, vibrant`;
      const r = await ai.image(prompt, { width: 1200, height: 630 });
      return r.result.url;
    },
    onSuccess: (url) => {
      setMeta((m) => ({ ...m, ogImage: url }));
      toast.success("OG image generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("projects")
        .update({ seo: meta as any })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("SEO saved");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Search className="size-5" /> SEO & Social
          </SheetTitle>
          <SheetDescription>Edit metadata or generate it with AI.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Button
            variant="outline"
            className="w-full"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate with AI
          </Button>

          <div className="space-y-1.5">
            <Label>
              Title <span className="text-xs text-muted-foreground">({meta.title.length}/60)</span>
            </Label>
            <Input
              value={meta.title}
              maxLength={120}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Description <span className="text-xs text-muted-foreground">({meta.description.length}/155)</span>
            </Label>
            <Textarea
              value={meta.description}
              rows={3}
              maxLength={300}
              onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Keywords</Label>
            <Input
              value={(meta.keywords || []).join(", ")}
              onChange={(e) =>
                setMeta((m) => ({
                  ...m,
                  keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                }))
              }
              placeholder="comma, separated, keywords"
            />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Social preview</div>
            <div className="space-y-1.5">
              <Label>OG image URL</Label>
              <Input
                value={meta.ogImage}
                onChange={(e) => setMeta((m) => ({ ...m, ogImage: e.target.value }))}
                placeholder="https://…"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={generateOgImage.isPending}
                onClick={() => generateOgImage.mutate()}
              >
                {generateOgImage.isPending
                  ? <Loader2 className="size-4 animate-spin" />
                  : <Sparkles className="size-4" />}
                Generate OG image (1200×630)
              </Button>
            </div>
            {meta.ogImage && (
              <div className="rounded-md overflow-hidden border border-border">
                <img src={meta.ogImage} alt="OG preview" className="w-full aspect-[1200/630] object-cover" />
                <div className="p-3 bg-card">
                  <div className="text-xs text-muted-foreground">your-site.lovable.app</div>
                  <div className="font-semibold text-sm truncate">{meta.ogTitle || meta.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{meta.ogDescription || meta.description}</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-3 bg-muted/30">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Google preview</div>
            <div className="text-xs text-blue-600 truncate">your-site.lovable.app</div>
            <div className="text-base text-foreground line-clamp-1">{meta.title || "Untitled"}</div>
            <div className="text-sm text-muted-foreground line-clamp-2">{meta.description || "No description set."}</div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save SEO"}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
