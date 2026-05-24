/**
 * Pure helpers that apply SEO auto-fixes to a single page's block list.
 * Used by both the single-page "Fix all" and the cross-page bulk action.
 */
import { createBlock, type Block } from "@/lib/blocks";
import type { SeoFixId } from "@/components/editor/health-panel";

export type BlockFixResult = {
  blocks: Block[];
  applied: string[];
  skipped: string[];
  changed: boolean;
};

function altFromSrc(src: unknown): string {
  const s = String(src || "").split("/").pop() || "";
  const base = s.split("?")[0].replace(/\.[a-z0-9]+$/i, "").replace(/[_\-]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Image";
}

export function applyBlockSeoFixes(blocks: Block[], ids: Iterable<SeoFixId>): BlockFixResult {
  const wants = new Set(ids);
  const applied: string[] = [];
  const skipped: string[] = [];
  let next = blocks;
  let changed = false;

  // 1. alt
  if (wants.has("alt")) {
    let touched = 0;
    next = next.map((b) => {
      if (b.type === "image" && !((b.props as any)?.alt || "").trim() && (b.props as any)?.src) {
        touched += 1;
        return { ...b, props: { ...b.props, alt: altFromSrc((b.props as any).src) } };
      }
      if (b.type === "gallery" && Array.isArray((b.props as any)?.items)) {
        const items = (b.props as any).items.map((it: any) => {
          if (!(it?.alt || "").trim() && it?.src) {
            touched += 1;
            return { ...it, alt: altFromSrc(it.src) };
          }
          return it;
        });
        return { ...b, props: { ...b.props, items } };
      }
      return b;
    });
    if (touched > 0) { applied.push(`alt text (${touched})`); changed = true; }
  }

  // 2. h1
  if (wants.has("h1")) {
    const hasHero = next.some((b) => b.type === "hero");
    const hasH1 = next.some((b) => b.type === "heading" && ((b.props as any)?.level === 1 || !(b.props as any)?.level));
    if (!hasHero && !hasH1) {
      const idx = next.findIndex((b) => b.type === "heading");
      if (idx >= 0) {
        next = next.map((b, i) => i === idx ? { ...b, props: { ...b.props, level: 1 } } : b);
        applied.push("H1");
        changed = true;
      } else {
        skipped.push("H1");
      }
    }
  }

  // 3. navbar / footer / cta — add if missing
  for (const t of ["navbar", "footer", "cta"] as const) {
    if (!wants.has(t)) continue;
    if (!next.some((b) => b.type === t)) {
      const block = createBlock(t);
      if (t === "navbar") next = [block, ...next];
      else next = [...next, block];
      applied.push(t);
      changed = true;
    }
  }

  return { blocks: next, applied, skipped, changed };
}

export function pickFirstImageSrc(blocks: Block[]): string | undefined {
  return (blocks.find((b) => b.type === "image" && (b.props as any)?.src)?.props as any)?.src
    || (blocks.find((b) => b.type === "gallery" && (b.props as any)?.items?.[0]?.src)?.props as any)?.items?.[0]?.src;
}

export function joinBlockText(blocks: Block[]): string {
  return blocks
    .map((b) => Object.values(b.props || {}).filter((v) => typeof v === "string").join(" "))
    .join(" ").trim();
}
