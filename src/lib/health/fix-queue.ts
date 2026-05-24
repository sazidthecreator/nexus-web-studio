/**
 * Per-project queue of auto-suggested bulk SEO fixes.
 * Populated by the scheduled link re-crawler when it detects regressions
 * (newly broken links) and/or sees outstanding SEO check failures.
 *
 * Persisted in localStorage so suggestions survive editor reloads.
 */
import type { SeoFixId } from "@/components/editor/health-panel";
import type { LinkDiff } from "@/lib/health/link-cache";
import type { SeoReport } from "@/lib/health/seo-grader";

export type FixSuggestion = {
  /** Stable id so the UI can dedupe across ticks. */
  id: string;
  createdAt: number;
  /** Why this was suggested — shown in the banner. */
  reason: string;
  /** Which SEO fix categories the bulk action should target. */
  fixIds: SeoFixId[];
  /** Counts shown in the banner for context. */
  newlyBroken: number;
  failingChecks: number;
};

const KEY = (projectId: string) => `sitely.fixqueue.${projectId}`;

export function loadFixQueue(projectId: string): FixSuggestion[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FixSuggestion[]) : [];
  } catch {
    return [];
  }
}

export function saveFixQueue(projectId: string, queue: FixSuggestion[]): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(KEY(projectId), JSON.stringify(queue)); } catch { /* ignore */ }
}

export function clearFixQueue(projectId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY(projectId));
}

/**
 * Build a suggestion from a crawl diff + current SEO report.
 * Returns null when nothing relevant changed.
 */
export function buildSuggestion(
  diff: LinkDiff | null,
  report: SeoReport | null,
): Omit<FixSuggestion, "id" | "createdAt"> | null {
  const newlyBroken = diff?.newlyBroken.length ?? 0;
  const failing = report?.checks.filter((c) => !c.pass) ?? [];
  if (newlyBroken === 0 && failing.length === 0) return null;

  const fixIds = Array.from(new Set(failing.map((c) => c.id as SeoFixId)));
  const parts: string[] = [];
  if (newlyBroken > 0) parts.push(`${newlyBroken} newly broken link${newlyBroken === 1 ? "" : "s"}`);
  if (failing.length > 0) parts.push(`${failing.length} SEO check${failing.length === 1 ? "" : "s"} failing`);

  return {
    reason: parts.join(" · "),
    fixIds,
    newlyBroken,
    failingChecks: failing.length,
  };
}

/** Append a suggestion, dedupe near-identical recent ones (same reason within 1h). */
export function enqueueSuggestion(
  projectId: string,
  partial: Omit<FixSuggestion, "id" | "createdAt">,
): FixSuggestion[] {
  const now = Date.now();
  const queue = loadFixQueue(projectId);
  const dup = queue.find((s) => s.reason === partial.reason && now - s.createdAt < 3600_000);
  if (dup) return queue;
  const next: FixSuggestion = {
    ...partial,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
  };
  const trimmed = [next, ...queue].slice(0, 5);
  saveFixQueue(projectId, trimmed);
  return trimmed;
}

export function dismissSuggestion(projectId: string, id: string): FixSuggestion[] {
  const next = loadFixQueue(projectId).filter((s) => s.id !== id);
  saveFixQueue(projectId, next);
  return next;
}
