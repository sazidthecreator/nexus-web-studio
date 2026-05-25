// Per-locale editor sheet — load the translated content for one language,
// edit text values inline, and AI-rewrite individual fields. Saves back to
// the project_locales table.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ai } from "@/lib/ai-gateway";
import { isRtl, translateContent } from "@/lib/i18n";
import { logAiGeneration } from "@/lib/ai-history";
import type { ProjectContent } from "@/lib/blocks";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  locale: string | null;
  sourceContent: ProjectContent | null;
};

const TEXT_KEYS = [
  "headline", "subheadline", "title", "subtitle",
  "body", "tagline", "eyebrow", "ctaLabel", "secondaryLabel",
  "label", "caption", "description",
];

export function TranslateEditPanel({ open, onOpenChange, projectId, locale, sourceContent }: Props) {
  const [draft, setDraft] = useState<ProjectContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyField, setBusyField] = useState<string | null>(null);

  const { data: row, isLoading, refetch } = useQuery({
    queryKey: ["project_locale_row", projectId, locale],
    enabled: open && !!locale,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_locales")
        .select("locale, content")
        .eq("project_id", projectId)
        .eq("locale", locale!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open) return;
    if (row?.content) {
      setDraft(row.content as unknown as ProjectContent);
    } else if (sourceContent) {
      // No translation yet — start from source so the user can edit
      setDraft(JSON.parse(JSON.stringify(sourceContent)));
    } else {
      setDraft(null);
    }
  }, [open, row, sourceContent]);

  const pages = useMemo(() => draft?.pages ?? [], [draft]);

  function updateField(pageId: string, blockId: string, key: string, value: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next: ProjectContent = JSON.parse(JSON.stringify(prev));
      for (const page of next.pages) {
        if (page.id !== pageId) continue;
        for (const block of page.blocks) {
          if (block.id === blockId) {
            (block.props as any)[key] = value;
            return next;
          }
        }
      }
      return next;
    });
  }

  async function aiRewriteField(pageId: string, blockId: string, key: string, currentValue: string) {
    if (!locale) return;
    const fieldKey = `${pageId}.${blockId}.${key}`;
    setBusyField(fieldKey);
    try {
      const instruction =
        `Rewrite this ${locale} text. Keep meaning, tone, and approximate length. ` +
        `Return ONLY the rewritten text with no quotes or commentary.\n\n${currentValue}`;
      const res = await ai.copy(instruction);
      const text = (res as any)?.result?.text?.trim();
      if (!text) throw new Error("AI returned empty text");
      const cleaned = text.replace(/^["'`]+|["'`]+$/g, "");
      updateField(pageId, blockId, key, cleaned);
      void logAiGeneration({
        kind: "translate_field",
        prompt: `Rewrite ${key} (${locale})`,
        output_text: cleaned,
        block_id: blockId,
        locale,
      });
      toast.success("Field rewritten");
    } catch (e: any) {
      toast.error(e?.message ?? "Rewrite failed");
    } finally {
      setBusyField(null);
    }
  }

  async function regenerateAll() {
    if (!sourceContent || !locale) return;
    setSaving(true);
    try {
      const translated = await translateContent(sourceContent, locale);
      setDraft(translated);
      toast.success("Re-translated from source — review then save");
    } catch (e: any) {
      toast.error(e?.message ?? "Translation failed");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!draft || !locale) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("project_locales").upsert({
        project_id: projectId,
        user_id: u.user.id,
        locale,
        content: draft as any,
      }, { onConflict: "project_id,locale" });
      if (error) throw error;
      void logAiGeneration({
        kind: "translate_locale",
        prompt: `Saved ${locale} edits`,
        locale,
      });
      toast.success(`Saved ${locale}${isRtl(locale) ? " (RTL)" : ""}`);
      void refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const rtl = locale ? isRtl(locale) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" dir={rtl ? "rtl" : "ltr"}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Languages className="size-4" /> Edit {locale ?? ""} {rtl && <span className="text-xs text-muted-foreground">RTL</span>}
          </SheetTitle>
          <SheetDescription>Edit each translated field directly, or AI-rewrite any field.</SheetDescription>
        </SheetHeader>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={regenerateAll} disabled={saving || !sourceContent}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Re-translate from source
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !draft}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
          </Button>
        </div>
        <div className="mt-4 space-y-4">
          {isLoading && <div className="text-xs text-muted-foreground py-6 text-center">Loading…</div>}
          {!isLoading && pages.map((page) => (
            <div key={page.id} className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{page.name}</div>
              {page.blocks.map((block) => {
                const fields = TEXT_KEYS
                  .map((k) => ({ k, v: (block.props as any)?.[k] }))
                  .filter(({ v }) => typeof v === "string" && v.trim().length > 0);
                if (fields.length === 0) return null;
                return (
                  <div key={block.id} className="rounded-md border border-border p-3 space-y-2 bg-card">
                    <div className="text-xs font-semibold capitalize">{block.type}</div>
                    {fields.map(({ k, v }) => {
                      const fieldKey = `${page.id}.${block.id}.${k}`;
                      const busy = busyField === fieldKey;
                      const Cmp = (v as string).length > 60 ? Textarea : Input;
                      return (
                        <div key={k} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] text-muted-foreground">{k}</Label>
                            <button
                              type="button"
                              className="text-[10px] text-primary flex items-center gap-1 disabled:opacity-50"
                              onClick={() => aiRewriteField(page.id, block.id, k, v as string)}
                              disabled={busy}
                              title="AI rewrite this field"
                            >
                              {busy ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                              Rewrite
                            </button>
                          </div>
                          <Cmp
                            value={v as string}
                            onChange={(e: any) => updateField(page.id, block.id, k, e.target.value)}
                            rows={Cmp === Textarea ? 2 : undefined}
                            dir={rtl ? "rtl" : "ltr"}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
