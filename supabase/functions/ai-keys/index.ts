import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { encryptKey } from "../_shared/crypto.ts";
import { rateLimit, logEvent, readJsonCapped, isResponse } from "../_shared/limits.ts";

const PROVIDERS = ["groq", "gemini", "huggingface", "cohere", "mistral"] as const;
type Provider = typeof PROVIDERS[number];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();
  let userId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized", code: "unauthorized" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supa.auth.getUser();
    const user = u?.user;
    if (!user) return jsonResponse({ error: "Unauthorized", code: "unauthorized" }, 401);
    userId = user.id;

    const limited = rateLimit({ key: `ai-keys:${user.id}`, perMinute: 30, capacity: 15 });
    if (limited) {
      logEvent({ fn: "ai-keys", user_id: userId, ok: false, ms: Date.now() - t0, err_code: "rate_limited" });
      return limited;
    }

    if (req.method === "GET") {
      // List providers + which have a key (also report env-overrides)
      const { data: rows } = await supa
        .from("user_ai_keys").select("provider, hint, updated_at");
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await supa
        .from("ai_usage").select("provider, request_count").eq("day", today);

      const envOverrides: Record<string, boolean> = {
        groq: !!Deno.env.get("GROQ_API_KEY"),
        gemini: !!Deno.env.get("GEMINI_API_KEY"),
        huggingface: !!Deno.env.get("HUGGINGFACE_API_KEY"),
        cohere: !!Deno.env.get("COHERE_API_KEY"),
        mistral: !!Deno.env.get("MISTRAL_API_KEY"),
      };

      const result = PROVIDERS.map((p) => ({
        provider: p,
        connected: !!rows?.find((r) => r.provider === p) || envOverrides[p],
        env_override: envOverrides[p],
        hint: rows?.find((r) => r.provider === p)?.hint ?? null,
        updated_at: rows?.find((r) => r.provider === p)?.updated_at ?? null,
        usage_today: usage?.find((u) => u.provider === p)?.request_count ?? 0,
      }));
      return jsonResponse({ providers: result });
    }

    if (req.method === "POST") {
      const parsed = await readJsonCapped<{ provider: Provider; key: string }>(req, 8 * 1024);
      if (isResponse(parsed)) return parsed;
      const provider = parsed.provider;
      const key = String(parsed.key || "").trim();
      if (!PROVIDERS.includes(provider)) return jsonResponse({ error: "Invalid provider", code: "invalid_provider" }, 400);
      if (key.length < 8 || key.length > 500) return jsonResponse({ error: "Invalid key", code: "invalid_key" }, 400);

      const enc = await encryptKey(key);
      const hint = key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "••••";

      const { error } = await supa.from("user_ai_keys").upsert(
        {
          user_id: user.id,
          provider,
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          auth_tag: enc.auth_tag,
          hint,
        },
        { onConflict: "user_id,provider" },
      );
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ ok: true, hint });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const provider = url.searchParams.get("provider") as Provider;
      if (!PROVIDERS.includes(provider)) return jsonResponse({ error: "Invalid provider" }, 400);
      const { error } = await supa.from("user_ai_keys").delete().eq("provider", provider);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Method not allowed", code: "method_not_allowed" }, 405);
  } catch (e) {
    console.error("ai-keys error:", e);
    logEvent({ fn: "ai-keys", user_id: userId, ok: false, ms: Date.now() - t0, err_code: "internal" });
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown", code: "internal" }, 500);
  }
});
