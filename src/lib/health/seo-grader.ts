// Per-page SEO grader. Pure function — operates on canvas JSON only.
import type { Block, ProjectContent } from "@/lib/blocks";

export type SeoCheck = {
  id: string;
  label: string;
  weight: number;
  pass: boolean;
  detail?: string;
};

export type SeoReport = {
  score: number; // 0..100
  checks: SeoCheck[];
};

function collectText(blocks: Block[]): string {
  return blocks
    .map((b) => Object.values(b.props || {}).filter((v) => typeof v === "string").join(" "))
    .join("\n");
}

function countByType(blocks: Block[], type: string): number {
  return blocks.filter((b) => b.type === type).length;
}

function imagesWithoutAlt(blocks: Block[]): number {
  let missing = 0;
  for (const b of blocks) {
    if (b.type === "image" && !(b.props?.alt || "").trim()) missing++;
    if (b.type === "gallery") {
      const items: any[] = b.props?.items || [];
      missing += items.filter((i) => !(i?.alt || "").trim()).length;
    }
  }
  return missing;
}

function totalImages(blocks: Block[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.type === "image") n++;
    if (b.type === "gallery") n += (b.props?.items || []).length;
  }
  return n;
}

function internalLinkCount(blocks: Block[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.type === "navbar") n += (b.props?.links || []).length;
    if (b.type === "button" && /^\/?[#a-z]/i.test(String(b.props?.href || ""))) n++;
  }
  return n;
}

export function gradeSeo(
  content: ProjectContent,
  seo: { title?: string; description?: string; ogImage?: string } = {},
): SeoReport {
  const blocks = content.pages[0]?.blocks ?? [];
  const text = collectText(blocks);
  const title = (seo.title || "").trim();
  const desc = (seo.description || "").trim();
  const h1Count = countByType(blocks, "hero") + blocks.filter((b) => b.type === "heading" && (b.props?.level === 1 || !b.props?.level)).length;
  const noAlt = imagesWithoutAlt(blocks);
  const imgs = totalImages(blocks);
  const internalLinks = internalLinkCount(blocks);

  const checks: SeoCheck[] = [
    { id: "title", label: "Meta title (50–60 chars)", weight: 15,
      pass: title.length >= 30 && title.length <= 65,
      detail: title ? `${title.length} chars` : "missing" },
    { id: "desc", label: "Meta description (150–160 chars)", weight: 10,
      pass: desc.length >= 80 && desc.length <= 165,
      detail: desc ? `${desc.length} chars` : "missing" },
    { id: "h1", label: "Exactly one H1 / hero", weight: 15,
      pass: h1Count === 1,
      detail: `${h1Count} found` },
    { id: "alt", label: "All images have alt text", weight: 10,
      pass: noAlt === 0,
      detail: imgs === 0 ? "no images" : `${noAlt} missing of ${imgs}` },
    { id: "links", label: "At least 2 internal links", weight: 5,
      pass: internalLinks >= 2,
      detail: `${internalLinks} link(s)` },
    { id: "og", label: "Social share image (og:image)", weight: 10,
      pass: !!(seo.ogImage || "").trim() },
    { id: "content", label: "Page has substantial content", weight: 10,
      pass: text.trim().length >= 200,
      detail: `${text.trim().length} chars` },
    { id: "footer", label: "Site has a footer", weight: 5,
      pass: countByType(blocks, "footer") >= 1 },
    { id: "cta", label: "Page has a call-to-action", weight: 10,
      pass: countByType(blocks, "cta") >= 1 || countByType(blocks, "button") >= 1 },
    { id: "navbar", label: "Site has navigation", weight: 10,
      pass: countByType(blocks, "navbar") >= 1 },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
  return { score: Math.round((earned / totalWeight) * 100), checks };
}
