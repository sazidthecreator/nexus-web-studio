// Translate the current page/site to other locales using ai.translate.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Languages, Trash2, Rocket, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LOCALES, translateContent, isRtl } from "@/lib/i18n";
import { TranslateEditPanel } from "@/components/editor/translate-edit-panel";
import type { ProjectContent } from "@/lib/blocks";

export function TranslatePanel({
  open, onOpenChange, projectId, content,
}: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string; content: ProjectContent | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data: locales = [] } = useQuery({
    queryKey: ["project_locales", projectId, open],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_locales")
        .select("locale, updated_at")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  async function generate(code: string) {
    if (!content) return;
    setBusy(code);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const translated = await translateContent(content, code);
      const { error } = await supabase.from("project_locales").upsert({
        project_id: projectId,
        user_id: u.user.id,
        locale: code,
        content: translated as any,
      }, { onConflict: "project_id,locale" });
      if (error) throw error;
      toast.success(`Translated to ${code}${isRtl(code) ? " (RTL)" : ""}`);
      qc.invalidateQueries({ queryKey: ["project_locales", projectId] });
    } catch (e: any) {
      toast.error(e.message || "Translation failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(code: string) {
    const { error } = await supabase.from("project_locales").delete().eq("project_id", projectId).eq("locale", code);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["project_locales", projectId] });
  }

  const has = (c: string) => locales.some((l: any) => l.locale === c);

  async function translateAllAndPublish() {
    if (!content) return;
    setBulkBusy(true);
    const targets = LOCALES.filter((l) => l.code !== "en").map((l) => l.code);
    let ok = 0;
    let failed = 0;
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      for (const code of targets) {
        setBusy(code);
        try {
          const translated = await translateContent(content, code);
          const { error } = await supabase.from("project_locales").upsert({
            project_id: projectId,
            user_id: u.user.id,
            locale: code,
            content: translated as any,
          }, { onConflict: "project_id,locale" });
          if (error) throw error;
          ok++;
        } catch (e: any) {
          failed++;
          console.warn(`[translate] ${code} failed:`, e?.message);
        }
      }
      // Bump published_version to bust the CDN cache for /sites/<slug>.
      const { data: proj } = await supabase
        .from("projects")
        .select("published_version, published")
        .eq("id", projectId)
        .maybeSingle();
      if (proj?.published) {
        await supabase
          .from("projects")
          .update({ published_version: ((proj as any).published_version ?? 1) + 1 })
          .eq("id", projectId);
      }
      qc.invalidateQueries({ queryKey: ["project_locales", projectId] });
      toast.success(`Translated ${ok}/${targets.length} languages${failed ? ` · ${failed} failed` : ""}${proj?.published ? " · cache busted" : " · publish your site to go live"}`);
    } catch (e: any) {
      toast.error(e.message || "Bulk translate failed");
    } finally {
      setBusy(null);
      setBulkBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Languages className="size-4" /> Translations</SheetTitle>
          <SheetDescription>Generate localized copies of your site. RTL languages auto-flip layout.</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <Button
            size="sm"
            className="w-full"
            disabled={bulkBusy || !content}
            onClick={translateAllAndPublish}
          >
            {bulkBusy ? (
              <><Loader2 className="size-3.5 animate-spin mr-2" /> Translating{busy ? ` · ${busy}` : "…"}</>
            ) : (
              <><Rocket className="size-3.5 mr-2" /> Translate all & republish</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Generates every supported language and bumps the published version so the CDN serves fresh translations immediately.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {LOCALES.map((l) => (
            <div key={l.code} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">{l.label}</div>
                <div className="text-xs text-muted-foreground">{l.code}{l.rtl && " · RTL"}{has(l.code) && " · saved"}</div>
              </div>
              <div className="flex items-center gap-1">
                {has(l.code) && (
                  <Button size="icon" variant="ghost" onClick={() => remove(l.code)} title="Remove" aria-label={`Remove ${l.code} translation`}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
                <Button size="sm" variant={has(l.code) ? "secondary" : "default"} disabled={busy === l.code || l.code === "en" || bulkBusy} onClick={() => generate(l.code)}>
                  {busy === l.code ? <Loader2 className="size-3.5 animate-spin" /> : has(l.code) ? "Re-translate" : l.code === "en" ? "Source" : "Translate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
