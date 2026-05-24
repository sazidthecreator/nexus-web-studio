// Pre-publish quality checklist. Pure function — runs against ProjectContent + SEO.
import type { ProjectContent } from "@/lib/blocks";
import { gradeSeo } from "@/lib/health/seo-grader";
import { scanLinks } from "@/lib/health/link-scanner";

export type ChecklistItem = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
};

export function runPrePublishChecklist(content: ProjectContent | null, seo: any): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  if (!content) return [{ id: "no-content", label: "Project has content", status: "fail" }];

  // SEO meta
  items.push({
    id: "seo-title",
    label: "SEO title set (30–65 chars)",
    status: seo?.title && seo.title.length >= 30 && seo.title.length <= 65 ? "pass" : "warn",
    detail: !seo?.title ? "Missing" : `${seo.title.length} chars`,
  });
  items.push({
    id: "seo-desc",
    label: "Meta description set (50–160 chars)",
    status: seo?.description && seo.description.length >= 50 && seo.description.length <= 160 ? "pass" : "warn",
    detail: !seo?.description ? "Missing" : `${seo.description.length} chars`,
  });
  items.push({
    id: "og-image",
    label: "OG image configured",
    status: seo?.ogImage ? "pass" : "warn",
  });

  // SEO grade
  const sr = gradeSeo(content, seo || {});
  items.push({
    id: "seo-score",
    label: "SEO grade ≥ 70",
    status: sr.score >= 70 ? "pass" : sr.score >= 50 ? "warn" : "fail",
    detail: `${sr.score}/100`,
  });

  // Links
  const li = scanLinks(content);
  const broken = li.filter((i) => i.kind === "internal-missing" || i.kind === "empty");
  items.push({
    id: "no-broken-links",
    label: "No broken or empty links",
    status: broken.length === 0 ? "pass" : "fail",
    detail: broken.length ? `${broken.length} issue(s)` : undefined,
  });

  // Pages
  const pages = content.pages || [];
  items.push({
    id: "has-pages",
    label: "At least one page",
    status: pages.length > 0 ? "pass" : "fail",
  });

  // Content density
  const blocks = pages.flatMap((p) => p.blocks || []);
  items.push({
    id: "content-density",
    label: "Page has ≥ 3 content blocks",
    status: blocks.length >= 3 ? "pass" : "warn",
    detail: `${blocks.length} blocks`,
  });

  return items;
}
