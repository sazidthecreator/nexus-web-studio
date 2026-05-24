/**
 * Deterministic headline rewriter — generates template-based variants.
 * No randomness, no LLM. Same input → same output.
 */

export type HeadlineVariant = {
  style: "question" | "number" | "howto" | "benefit" | "urgent";
  text: string;
};

function pickKeyword(input: string): string {
  const words = input.replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  // Skip first 1-2 stop-ish words, return longest meaningful word.
  const candidates = words.filter((w) => w.length >= 4);
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || words[0] || "this";
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function rewriteHeadline(input: string): HeadlineVariant[] {
  const base = (input || "").trim();
  if (!base) return [];
  const lower = base.toLowerCase().replace(/[.!?]+$/, "");
  const kw = pickKeyword(base);
  const kwTitle = titleCase(kw);

  return [
    { style: "question", text: `Why ${lower}?` },
    { style: "number", text: `7 Ways to ${kwTitle}` },
    { style: "howto", text: `How to ${kwTitle} (Step by Step)` },
    { style: "benefit", text: `${kwTitle} — Without the Hassle` },
    { style: "urgent", text: `Start ${kwTitle} Today` },
  ];
}
