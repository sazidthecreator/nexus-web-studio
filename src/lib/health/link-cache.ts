/**
 * Tiny localStorage-backed cache for broken-link crawl results.
 * Keyed per project so re-runs can show diffs (newly broken / recovered).
 */
export type LinkCacheEntry = { ok: boolean; checkedAt: number; reason?: string };
export type LinkCache = Record<string, LinkCacheEntry>;

const KEY = (projectId: string) => `sitely.linkcache.${projectId}`;
const META_KEY = (projectId: string) => `sitely.linkcache.${projectId}.meta`;

export type LinkCacheMeta = { lastCrawlAt: number; total: number; dead: number };

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function loadLinkCache(projectId: string): LinkCache {
  if (typeof localStorage === "undefined") return {};
  return safeParse<LinkCache>(localStorage.getItem(KEY(projectId)), {});
}

export function loadLinkCacheMeta(projectId: string): LinkCacheMeta | null {
  if (typeof localStorage === "undefined") return null;
  return safeParse<LinkCacheMeta | null>(localStorage.getItem(META_KEY(projectId)), null);
}

export function saveLinkCache(projectId: string, cache: LinkCache, meta: LinkCacheMeta): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY(projectId), JSON.stringify(cache));
    localStorage.setItem(META_KEY(projectId), JSON.stringify(meta));
  } catch { /* quota / disabled — ignore */ }
}

export function clearLinkCache(projectId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY(projectId));
  localStorage.removeItem(META_KEY(projectId));
}

export type LinkDiff = {
  newlyBroken: string[];   // ok before, dead now
  recovered: string[];     // dead before, ok now
  stillBroken: string[];   // dead before & now
  firstSeen: string[];     // not in previous cache
};

export function diffLinkCache(prev: LinkCache, next: LinkCache): LinkDiff {
  const out: LinkDiff = { newlyBroken: [], recovered: [], stillBroken: [], firstSeen: [] };
  for (const [url, entry] of Object.entries(next)) {
    const before = prev[url];
    if (!before) { out.firstSeen.push(url); continue; }
    if (!entry.ok && before.ok) out.newlyBroken.push(url);
    else if (entry.ok && !before.ok) out.recovered.push(url);
    else if (!entry.ok && !before.ok) out.stillBroken.push(url);
  }
  return out;
}
