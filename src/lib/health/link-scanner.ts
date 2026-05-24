// Broken-link detector. Scans canvas blocks for hrefs/srcs.
// Internal links validated against page list; external just classified.
import type { Block, ProjectContent } from "@/lib/blocks";

export type LinkIssue = {
  blockId: string;
  blockType: string;
  url: string;
  kind: "internal-missing" | "empty" | "insecure-http" | "external" | "dead-external" | "ok";
  hint?: string;
};

function pushHref(out: LinkIssue[], block: Block, url: unknown, pages: Set<string>) {
  if (typeof url !== "string") return;
  const v = url.trim();
  if (!v) {
    out.push({ blockId: block.id, blockType: block.type, url: "", kind: "empty" });
    return;
  }
  if (v.startsWith("#")) return; // hash anchor — fine
  if (v.startsWith("/")) {
    const slug = v.slice(1).split(/[?#]/)[0];
    if (slug && !pages.has(slug)) {
      out.push({ blockId: block.id, blockType: block.type, url: v, kind: "internal-missing", hint: `Page "/${slug}" doesn't exist` });
    }
    return;
  }
  if (v.startsWith("http://")) {
    out.push({ blockId: block.id, blockType: block.type, url: v, kind: "insecure-http", hint: "Upgrade to https" });
    return;
  }
  if (v.startsWith("https://")) {
    out.push({ blockId: block.id, blockType: block.type, url: v, kind: "external" });
    return;
  }
  // mailto:/tel:/etc.
}

export function scanLinks(content: ProjectContent): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const pages = new Set(content.pages.map((p) => p.id));
  for (const page of content.pages) {
    for (const b of page.blocks) {
      const p = b.props || {};
      pushHref(issues, b, p.href, pages);
      pushHref(issues, b, p.ctaHref, pages);
      if (Array.isArray(p.links)) {
        for (const l of p.links) pushHref(issues, b, l?.href, pages);
      }
      if (Array.isArray(p.items)) {
        for (const it of p.items) pushHref(issues, b, it?.href, pages);
      }
      if (typeof p.src === "string" && b.type === "image" && !p.src.trim()) {
        issues.push({ blockId: b.id, blockType: b.type, url: "", kind: "empty", hint: "Missing image src" });
      }
    }
  }
  return issues.filter((i) => i.kind !== "ok" && i.kind !== "external");
}

/** Collect every external + insecure URL referenced from canvas blocks
 *  (same traversal as `scanLinks`, but without filtering). Used by the
 *  crawler to probe reachability. */
export function collectExternalLinks(content: ProjectContent): { url: string; blockId: string; blockType: string }[] {
  const out: { url: string; blockId: string; blockType: string }[] = [];
  const seen = new Set<string>();
  const visit = (b: any, url: unknown) => {
    if (typeof url !== "string") return;
    const v = url.trim();
    if (!/^https?:\/\//i.test(v)) return;
    const key = `${b.id}|${v}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url: v, blockId: b.id, blockType: b.type });
  };
  for (const page of content.pages) {
    for (const b of page.blocks) {
      const p = b.props || {};
      visit(b, p.href);
      visit(b, p.ctaHref);
      visit(b, p.src);
      if (Array.isArray(p.links)) for (const l of p.links) visit(b, l?.href);
      if (Array.isArray(p.items)) for (const it of p.items) { visit(b, it?.href); visit(b, it?.src); }
    }
  }
  return out;
}

/** Probe a single URL with `no-cors` HEAD-style fetch + timeout. Network
 *  errors (DNS fail, refused, CORS preflight refusal at the network layer,
 *  abort) → dead. Any opaque or successful response → alive (we can't read
 *  status codes cross-origin, but reachability is what we care about). */
export async function probeUrl(url: string, timeoutMs = 6000): Promise<{ ok: boolean; reason?: string }> {
  if (typeof fetch === "undefined") return { ok: true };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    await fetch(url, { method: "GET", mode: "no-cors", redirect: "follow", signal: ctl.signal });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

/** Per-URL probe outcome — used by the cache so we can tell "ok" apart
 *  from "not yet checked". */
export type LinkProbeResult = {
  url: string;
  blockId: string;
  blockType: string;
  ok: boolean;
  reason?: string;
};

/** Crawl all external URLs in `content` with bounded concurrency.
 *  Returns full results (ok + dead) so callers can cache them. */
export async function crawlExternalLinksFull(
  content: ProjectContent,
  opts: { concurrency?: number; timeoutMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<LinkProbeResult[]> {
  const targets = collectExternalLinks(content);
  const results: LinkProbeResult[] = [];
  const conc = Math.max(1, opts.concurrency ?? 4);
  let done = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const t = targets[cursor++];
      const r = await probeUrl(t.url, opts.timeoutMs);
      results.push({ url: t.url, blockId: t.blockId, blockType: t.blockType, ok: r.ok, reason: r.reason });
      done += 1;
      opts.onProgress?.(done, targets.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(conc, targets.length) }, () => worker()));
  return results;
}

/** Backwards-compat wrapper that returns only the dead links as `LinkIssue`. */
export async function crawlExternalLinks(
  content: ProjectContent,
  opts: { concurrency?: number; timeoutMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<LinkIssue[]> {
  const all = await crawlExternalLinksFull(content, opts);
  return all
    .filter((r) => !r.ok)
    .map((r) => ({ blockId: r.blockId, blockType: r.blockType, url: r.url, kind: "dead-external" as const, hint: r.reason }));
}
