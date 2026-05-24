// i18n helpers: locale list, RTL detection, deep-clone with translated strings.
import type { Block, ProjectContent } from "@/lib/blocks";
import { ai } from "@/lib/ai-gateway";

export const LOCALES = [
  { code: "en", label: "English", rtl: false },
  { code: "bn", label: "বাংলা (Bengali)", rtl: false },
  { code: "hi", label: "हिन्दी (Hindi)", rtl: false },
  { code: "es", label: "Español", rtl: false },
  { code: "fr", label: "Français", rtl: false },
  { code: "de", label: "Deutsch", rtl: false },
  { code: "ar", label: "العربية", rtl: true },
  { code: "ur", label: "اردو", rtl: true },
  { code: "he", label: "עברית", rtl: true },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export function isRtl(code: string): boolean {
  return LOCALES.find((l) => l.code === code)?.rtl ?? false;
}

// Walks block.props and translates string values.
async function translateProps(props: Record<string, any>, target: string): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (k.startsWith("__") || k === "id" || k === "href" || k === "ctaHref" || k === "src" || k === "imageUrl") {
      out[k] = v; continue;
    }
    if (typeof v === "string" && v.trim().length > 1 && !/^#?[0-9a-fA-F]{3,8}$/.test(v) && !v.startsWith("http")) {
      try {
        const r = await ai.translate(v, target);
        out[k] = r.result.text || v;
      } catch {
        out[k] = v;
      }
    } else if (Array.isArray(v)) {
      out[k] = await Promise.all(v.map(async (item) =>
        item && typeof item === "object" ? await translateProps(item, target) : item,
      ));
    } else if (v && typeof v === "object") {
      out[k] = await translateProps(v, target);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function translateContent(content: ProjectContent, target: string): Promise<ProjectContent> {
  const pages = await Promise.all((content.pages || []).map(async (p) => ({
    ...p,
    blocks: await Promise.all((p.blocks || []).map(async (b: Block) => ({
      ...b,
      props: await translateProps(b.props || {}, target),
    }))),
  })));
  return { ...content, pages };
}
