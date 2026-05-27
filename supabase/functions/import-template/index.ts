import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { rateLimit, logEvent, readJsonCapped, isResponse } from "../_shared/limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MAX_RESPONSE_BYTES = 256 * 1024;

// Block requests targeting internal / private network ranges (SSRF protection).
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv4 literal check
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  try {
    // Require authenticated user to prevent unauthenticated SSRF/proxy abuse.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logEvent({ fn: "import-template", ok: false, ms: Date.now() - t0, err_code: "unauthorized" });
      return jsonResp({ error: "Unauthorized", code: "unauthorized" }, 401);
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supa.auth.getUser();
    const user = u?.user;
    if (!user) {
      logEvent({ fn: "import-template", ok: false, ms: Date.now() - t0, err_code: "unauthorized" });
      return jsonResp({ error: "Unauthorized", code: "unauthorized" }, 401);
    }

    const limited = rateLimit({ key: `import-tmpl:${user.id}`, perMinute: 20, capacity: 10 });
    if (limited) {
      logEvent({ fn: "import-template", ok: false, ms: Date.now() - t0, err_code: "rate_limited", meta: { user: user.id } });
      return limited;
    }

    const parsed = await readJsonCapped<{ url: string }>(req, 8 * 1024);
    if (isResponse(parsed)) {
      logEvent({ fn: "import-template", ok: false, ms: Date.now() - t0, err_code: "bad_payload" });
      return parsed;
    }
    const url = parsed.url;
    if (!url || typeof url !== "string") {
      return jsonResp({ error: "Missing url", code: "missing_url" }, 400);
    }
    let target: URL;
    try { target = new URL(url); } catch {
      return jsonResp({ error: "Invalid URL", code: "invalid_url" }, 400);
    }
    if (!/^https?:$/.test(target.protocol)) {
      return jsonResp({ error: "Only http(s) URLs allowed", code: "invalid_protocol" }, 400);
    }
    if (isPrivateHost(target.hostname)) {
      logEvent({ fn: "import-template", ok: false, ms: Date.now() - t0, err_code: "blocked_host", meta: { host: target.hostname } });
      return jsonResp({ error: "URL host not allowed", code: "blocked_host" }, 400);
    }

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15_000);
    let resp: Response;
    try {
      resp = await fetch(target.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SitelyImporter/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!resp.ok) {
      logEvent({ fn: "import-template", ok: false, ms: Date.now() - t0, err_code: "upstream_status", meta: { status: resp.status } });
      return jsonResp({ error: `Source returned ${resp.status}`, code: "upstream_status" }, 502);
    }

    // Cap response size while reading.
    const reader = resp.body?.getReader();
    if (!reader) {
      return jsonResp({ error: "Empty response", code: "empty_response" }, 502);
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        try { await reader.cancel(); } catch {}
        logEvent({ fn: "import-template", ok: false, ms: Date.now() - t0, err_code: "response_too_large" });
        return jsonResp({ error: "Source content too large (256KB max)", code: "response_too_large" }, 413);
      }
      chunks.push(value);
    }
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { buf.set(c, offset); offset += c.byteLength; }
    const html = new TextDecoder("utf-8").decode(buf);
    const finalUrl = resp.url || target.toString();
    logEvent({ fn: "import-template", ok: true, ms: Date.now() - t0, meta: { bytes: total } });
    return new Response(JSON.stringify({ html, finalUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-template error:", e);
    logEvent({ fn: "import-template", ok: false, ms: Date.now() - t0, err_code: "internal" });
    return jsonResp({ error: e instanceof Error ? e.message : "Unknown", code: "internal" }, 500);
  }
});
