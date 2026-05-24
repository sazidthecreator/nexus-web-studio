/**
 * Smart Writer Toolkit — public API.
 * All functions are pure, offline, and deterministic.
 */

export { analyzeReadability } from "./readability";
export type { ReadabilityResult } from "./readability";

export { analyzeTone } from "./tone";
export type { Tone, ToneResult, ToneScores } from "./tone";

export { slugify, uniqueSlug } from "./slug";

export { summarize, metaDescription } from "./summarize";

export { rewriteHeadline } from "./headlines";
export type { HeadlineVariant } from "./headlines";

export { checkSpelling } from "./spelling";
export type { SpellSuggestion } from "./spelling";

import { analyzeReadability } from "./readability";
import { analyzeTone } from "./tone";
import { metaDescription } from "./summarize";
import { checkSpelling } from "./spelling";

/** Single-call helper for editor "Tools" panel — never throws. */
export function analyzeText(text: string) {
  try {
    return {
      ok: true as const,
      readability: analyzeReadability(text),
      tone: analyzeTone(text),
      meta: metaDescription(text),
      issues: checkSpelling(text),
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Analysis failed",
    };
  }
}
