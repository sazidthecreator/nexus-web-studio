/**
 * Local Lighthouse-lite — pure, deterministic per-page quality audit.
 *
 * Inspects the in-memory ProjectContent + the live editor canvas DOM and
 * produces a 0-100 score with actionable issues. No network calls, runs in
 * <50ms on typical pages, never throws (every internal step is guarded).
 */
import type { Block, ProjectContent } from "@/lib/blocks";

export type AuditCategory = "seo" | "a11y" | "performance" | "best";
export type AuditSeverity = "info" | "warn" | "error";

export type AuditIssue = {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  detail: string;
  fix?: string;
  /** Penalty applied to the 100-point score. */
  weight: number;
};

export type AuditCategoryScore = {
  category: AuditCategory;
  score: number;
  issues: AuditIssue[];
};

export type AuditReport = {
  overall: number;
  scannedAt: string;
  page: { id: string; name: string; blockCount: number };
  categories: AuditCategoryScore[];
  issues: AuditIssue[];
  metrics: {
    images: number;
    imagesWithoutAlt: number;
    headings: number;
    h1Count: number;
    estimatedKb: number;
    interactiveElements: number;
    smallTouchTargets: number;
    fontFamilies: number;
  };
};

const MAX_PENALTY_PER_CAT = 100;

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function safeText(b: Block): string {
  try {
    return Object.values(b.props || {})
      .filter((v): v is string => typeof v === "string")
      .join(" ");
  } catch {
    return "";
  }
}

/**
 * Estimate page weight from block content. This is a heuristic — purely
 * client-side, no fetch — but stable enough to surface "this page is heavy"
 * style warnings.
 */
function estimateKb(blocks: Block[]): number {
  let kb = 0;
  for (const b of blocks) {
    const p = b.props || {};
    // Text/markup baseline.
    kb += Math.ceil(safeText(b).length / 1024);
    if (b.type === "image" && (p as any).src) kb += 80; // assume 80KB per stock image
    if (b.type === "gallery" && Array.isArray((p as any).items)) {
      kb += ((p as any).items.length || 0) * 70;
    }
    if (b.type === "video") kb += 40; // poster / iframe overhead
  }
  return kb + 35; // baseline editor frame
}

function uniqueFontFamilies(root: HTMLElement | null): number {
  if (!root) return 1;
  try {
    const seen = new Set<string>();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let n: Node | null = walker.currentNode;
    let visited = 0;
    while (n && visited < 400) {
      const el = n as HTMLElement;
      try {
        const ff = window.getComputedStyle(el).fontFamily;
        if (ff) seen.add(ff.split(",")[0]?.trim().toLowerCase() || ff);
      } catch {
        /* ignore */
      }
      n = walker.nextNode();
      visited++;
    }
    return seen.size || 1;
  } catch {
    return 1;
  }
}

function smallTouchTargets(root: HTMLElement | null): number {
  if (!root) return 0;
  try {
    const els = root.querySelectorAll<HTMLElement>('a, button, [role="button"], input, select, textarea');
    let bad = 0;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32)) bad++;
    });
    return bad;
  } catch {
    return 0;
  }
}

function countInteractive(root: HTMLElement | null): number {
  if (!root) return 0;
  try {
    return root.querySelectorAll('a, button, [role="button"], input, select, textarea').length;
  } catch {
    return 0;
  }
}

function countImagesAndAlts(blocks: Block[]) {
  let images = 0;
  let missing = 0;
  for (const b of blocks) {
    const p = b.props as any;
    if (b.type === "image") {
      if (p?.src) {
        images++;
        if (!String(p?.alt || "").trim()) missing++;
      }
    } else if (b.type === "gallery" && Array.isArray(p?.items)) {
      for (const it of p.items) {
        if (it?.src) {
          images++;
          if (!String(it?.alt || "").trim()) missing++;
        }
      }
    }
  }
  return { images, missing };
}

function pickPage(content: ProjectContent, pageId?: string) {
  const page =
    (pageId && content.pages.find((p) => p.id === pageId)) || content.pages[0];
  return page;
}

/** Pure heuristics — no DOM access. Used as a safe fallback when canvas is absent. */
function buildPureIssues(blocks: Block[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const types = new Set(blocks.map((b) => b.type));
  const { images, missing } = countImagesAndAlts(blocks);

  if (missing > 0) {
    issues.push({
      id: "alt-missing",
      category: "a11y",
      severity: "error",
      title: `${missing} image${missing > 1 ? "s" : ""} missing alt text`,
      detail: "Screen readers can't describe images without an alt attribute.",
      fix: "Open the Health panel → Apply alt-text fix to all images.",
      weight: Math.min(40, missing * 6),
    });
  }
  if (images === 0 && blocks.length > 2) {
    issues.push({
      id: "no-images",
      category: "best",
      severity: "info",
      title: "No images on this page",
      detail: "Pages with at least one supporting image tend to convert better.",
      weight: 4,
    });
  }
  if (!types.has("hero") && !blocks.some((b) => b.type === "heading")) {
    issues.push({
      id: "no-h1",
      category: "seo",
      severity: "error",
      title: "Missing top-level heading (H1)",
      detail: "Search engines use the H1 to understand page topic.",
      fix: "Add a Hero or Heading block at the top of the page.",
      weight: 25,
    });
  }
  if (!types.has("navbar")) {
    issues.push({
      id: "no-nav",
      category: "best",
      severity: "warn",
      title: "No navigation block",
      detail: "Visitors expect a top nav to orient themselves.",
      fix: "Add a Navbar block.",
      weight: 8,
    });
  }
  if (!types.has("footer")) {
    issues.push({
      id: "no-footer",
      category: "best",
      severity: "warn",
      title: "No footer block",
      detail: "Footers anchor the page and host secondary nav and legal links.",
      fix: "Add a Footer block.",
      weight: 6,
    });
  }
  if (!types.has("cta") && !blocks.some((b) => b.type === "button")) {
    issues.push({
      id: "no-cta",
      category: "best",
      severity: "warn",
      title: "No clear call-to-action",
      detail: "Pages without a CTA leave visitors guessing what to do next.",
      fix: "Add a CTA or Button block.",
      weight: 10,
    });
  }
  // Text-heavy block without enough copy
  const sparseText = blocks.find(
    (b) => b.type === "text" && safeText(b).trim().length < 20,
  );
  if (sparseText) {
    issues.push({
      id: "sparse-text",
      category: "seo",
      severity: "info",
      title: "Very short text block",
      detail: "Thin content can hurt search ranking.",
      weight: 4,
    });
  }
  return issues;
}

export function auditPage(
  content: ProjectContent | null,
  opts: { pageId?: string; canvasEl?: HTMLElement | null } = {},
): AuditReport {
  const fallback: AuditReport = {
    overall: 0,
    scannedAt: new Date().toISOString(),
    page: { id: "", name: "", blockCount: 0 },
    categories: [],
    issues: [],
    metrics: {
      images: 0,
      imagesWithoutAlt: 0,
      headings: 0,
      h1Count: 0,
      estimatedKb: 0,
      interactiveElements: 0,
      smallTouchTargets: 0,
      fontFamilies: 0,
    },
  };
  if (!content || !content.pages?.length) return fallback;

  try {
    const page = pickPage(content, opts.pageId);
    if (!page) return fallback;
    const blocks = page.blocks || [];
    const root = opts.canvasEl ?? null;

    const issues: AuditIssue[] = buildPureIssues(blocks);

    // DOM-derived metrics
    const headings = root ? root.querySelectorAll("h1,h2,h3,h4,h5,h6").length : 0;
    const h1Count = root ? root.querySelectorAll("h1").length : 0;
    const interactive = countInteractive(root);
    const smallTargets = smallTouchTargets(root);
    const fonts = uniqueFontFamilies(root);
    const { images, missing } = countImagesAndAlts(blocks);
    const kb = estimateKb(blocks);

    // Performance heuristics
    if (kb > 600) {
      issues.push({
        id: "page-weight",
        category: "performance",
        severity: kb > 1200 ? "error" : "warn",
        title: `Heavy page (~${kb}KB est.)`,
        detail: "Large pages slow down first paint, especially on mobile.",
        fix: "Compress images and remove unused galleries.",
        weight: kb > 1200 ? 25 : 12,
      });
    }
    // A11y: small touch targets
    if (smallTargets > 0) {
      issues.push({
        id: "small-targets",
        category: "a11y",
        severity: "warn",
        title: `${smallTargets} touch target${smallTargets > 1 ? "s" : ""} below 32×32`,
        detail: "Mobile visitors struggle with tiny tap targets.",
        fix: "Increase button/link padding or font size.",
        weight: Math.min(20, smallTargets * 4),
      });
    }
    // Heading order: multiple H1
    if (h1Count > 1) {
      issues.push({
        id: "multi-h1",
        category: "seo",
        severity: "warn",
        title: `${h1Count} H1 headings on this page`,
        detail: "Use a single H1 — demote the rest to H2 for clarity.",
        weight: 10,
      });
    }
    // Best practices: too many fonts
    if (fonts > 3) {
      issues.push({
        id: "too-many-fonts",
        category: "best",
        severity: "info",
        title: `${fonts} font families detected`,
        detail: "Limiting fonts to 2 keeps designs cohesive and pages light.",
        weight: 4,
      });
    }

    // Score per category
    const categories: AuditCategoryScore[] = (
      ["seo", "a11y", "performance", "best"] as AuditCategory[]
    ).map((cat) => {
      const cIssues = issues.filter((i) => i.category === cat);
      const penalty = Math.min(
        MAX_PENALTY_PER_CAT,
        cIssues.reduce((s, i) => s + i.weight, 0),
      );
      return { category: cat, score: clamp(100 - penalty), issues: cIssues };
    });

    // Weighted overall
    const overall = clamp(
      Math.round(
        categories.reduce((s, c) => {
          const w =
            c.category === "seo"
              ? 0.3
              : c.category === "a11y"
                ? 0.3
                : c.category === "performance"
                  ? 0.25
                  : 0.15;
          return s + c.score * w;
        }, 0),
      ),
    );

    return {
      overall,
      scannedAt: new Date().toISOString(),
      page: { id: page.id, name: page.name, blockCount: blocks.length },
      categories,
      issues: issues.sort(
        (a, b) =>
          severityRank(b.severity) - severityRank(a.severity) || b.weight - a.weight,
      ),
      metrics: {
        images,
        imagesWithoutAlt: missing,
        headings,
        h1Count,
        estimatedKb: kb,
        interactiveElements: interactive,
        smallTouchTargets: smallTargets,
        fontFamilies: fonts,
      },
    };
  } catch {
    return fallback;
  }
}

function severityRank(s: AuditSeverity): number {
  return s === "error" ? 3 : s === "warn" ? 2 : 1;
}

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  seo: "SEO",
  a11y: "Accessibility",
  performance: "Performance",
  best: "Best practices",
};
