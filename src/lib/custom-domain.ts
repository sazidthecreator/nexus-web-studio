// Server-only helper: resolve an incoming Host header to a published project slug.
// Used by the worker entry to rewrite custom-domain requests into /sites/<slug>.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CacheEntry = { slug: string | null; expires: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function normalizeHost(host: string | null): string | null {
  if (!host) return null;
  const h = host.toLowerCase().split(":")[0].trim();
  if (!h) return null;
  if (h === "localhost" || h.endsWith(".localhost")) return null;
  if (h.endsWith(".lovable.app") || h.endsWith(".lovable.dev")) return null;
  return h;
}

export function isCustomHost(host: string | null): boolean {
  return normalizeHost(host) !== null;
}

export async function resolveSlugForHost(host: string | null): Promise<string | null> {
  const h = normalizeHost(host);
  if (!h) return null;

  const now = Date.now();
  const cached = cache.get(h);
  if (cached && cached.expires > now) return cached.slug;

  try {
    const { data } = await supabaseAdmin
      .from("projects")
      .select("slug, published")
      .eq("custom_domain", h)
      .eq("published", true)
      .maybeSingle();
    const slug = data?.slug ?? null;
    cache.set(h, { slug, expires: now + TTL_MS });
    return slug;
  } catch (err) {
    console.error("[custom-domain] resolve failed", err);
    return null;
  }
}
