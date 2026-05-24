// Quick health computation for dashboard project cards.
// Mirrors the in-editor health-panel signals at a fraction of the cost so the
// grid stays snappy: just counts blocks, missing alts, missing seo title.
import type { ProjectContent } from "@/lib/blocks";

export type DashboardHealth = {
  level: "good" | "warn" | "bad";
  score: number; // 0-100
  reasons: string[];
};

export function computeDashboardHealth(
  content: ProjectContent | null | undefined,
  seo: { title?: string; description?: string } | null | undefined,
): DashboardHealth {
  const reasons: string[] = [];
  let score = 100;
  const blocks = content?.pages?.[0]?.blocks ?? [];

  if (blocks.length === 0) { reasons.push("Empty page"); score -= 60; }
  if (blocks.length > 0 && blocks.length < 3) { reasons.push("Very thin page"); score -= 20; }

  const imgs = blocks.filter((b) => b.type === "image" || b.type === "gallery");
  const missingAlt = imgs.filter((b) => {
    const alt = (b.props as any)?.alt;
    if (b.type === "gallery") {
      const items = (b.props as any)?.items as any[] | undefined;
      return Array.isArray(items) && items.some((i) => !i?.alt);
    }
    return !alt;
  }).length;
  if (missingAlt > 0) { reasons.push(`${missingAlt} image(s) missing alt`); score -= Math.min(20, missingAlt * 5); }

  if (!seo?.title?.trim()) { reasons.push("Missing SEO title"); score -= 10; }
  if (!seo?.description?.trim()) { reasons.push("Missing SEO description"); score -= 10; }

  const hasHero = blocks.some((b) => b.type === "hero");
  if (!hasHero && blocks.length > 0) { reasons.push("No hero section"); score -= 5; }

  score = Math.max(0, Math.min(100, score));
  const level: DashboardHealth["level"] =
    score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
  return { level, score, reasons };
}
