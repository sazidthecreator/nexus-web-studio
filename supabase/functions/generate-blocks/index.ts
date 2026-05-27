import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { rateLimit, logEvent, readJsonCapped, isResponse } from "../_shared/limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a website builder AI. Given a user's description, output a JSON array of blocks for a landing page.

Allowed block types and their props schemas:
- navbar: { links: [{label, href}], ctaLabel, ctaHref }
- hero: { eyebrow, headline, subheadline, ctaLabel, ctaHref, secondaryLabel, secondaryHref }
- heading: { title, subtitle, align: "left"|"center"|"right" }
- text: { body, align: "left"|"center"|"right" }
- features: { title, subtitle, items: [{icon (single emoji), title, body}] (3-6 items) }
- gallery: { images: [{src: "", alt}] (3-6 items, leave src empty so user can upload) }
- button: { label, href, style: "solid"|"outline", align: "center" }
- video: { url } (youtube/vimeo)
- divider: { style: "line", spacing: 48 }
- form: { title, subtitle, submitLabel, fields: [{name, label, type: "text"|"email"|"textarea", required}] }
- cta: { headline, subheadline, ctaLabel, ctaHref }
- footer: { tagline, columns: [{title, links: [{label, href}]}] }

Always start with navbar and end with footer. Pick the right mix of blocks for the user's described site (e.g. portfolio → gallery; restaurant → image+features; SaaS → hero+features+cta). Use realistic, on-brand copy.`;

function jsonResp(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  try {
    // Require authenticated user — this function consumes paid AI credits.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logEvent({ fn: "generate-blocks", ok: false, ms: Date.now() - t0, err_code: "unauthorized" });
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
      logEvent({ fn: "generate-blocks", ok: false, ms: Date.now() - t0, err_code: "unauthorized" });
      return jsonResp({ error: "Unauthorized", code: "unauthorized" }, 401);
    }

    // Per-user rate limit (was per-IP — trivially bypassable).
    const limited = rateLimit({ key: `gen-blocks:${user.id}`, perMinute: 10, capacity: 5 });
    if (limited) {
      logEvent({ fn: "generate-blocks", ok: false, ms: Date.now() - t0, err_code: "rate_limited", meta: { user: user.id } });
      return limited;
    }

    const parsed = await readJsonCapped<{ prompt: string }>(req, 16 * 1024);
    if (isResponse(parsed)) {
      logEvent({ fn: "generate-blocks", ok: false, ms: Date.now() - t0, err_code: "bad_payload" });
      return parsed;
    }
    const prompt = String(parsed.prompt || "").slice(0, 4000);
    if (prompt.length < 3) {
      return jsonResp({ error: "Prompt too short", code: "invalid_prompt" }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "build_page",
            description: "Return blocks for the page",
            parameters: {
              type: "object",
              properties: {
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["navbar","hero","features","cta","footer"] },
                      props: { type: "object", additionalProperties: true },
                    },
                    required: ["type","props"],
                  },
                },
              },
              required: ["blocks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "build_page" } },
      }),
    });

    if (resp.status === 429) {
      logEvent({ fn: "generate-blocks", ok: false, ms: Date.now() - t0, err_code: "upstream_rate_limited" });
      return jsonResp({ error: "Rate limit exceeded, try again shortly.", code: "upstream_rate_limited" }, 429);
    }
    if (resp.status === 402) {
      logEvent({ fn: "generate-blocks", ok: false, ms: Date.now() - t0, err_code: "credits_exhausted" });
      return jsonResp({ error: "AI credits exhausted. Add credits in workspace settings.", code: "credits_exhausted" }, 402);
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      logEvent({ fn: "generate-blocks", ok: false, ms: Date.now() - t0, err_code: "upstream_error" });
      return jsonResp({ error: "AI gateway error", code: "upstream_error" }, 500);
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { blocks: [] };
    logEvent({ fn: "generate-blocks", ok: true, ms: Date.now() - t0, meta: { blocks: Array.isArray(args.blocks) ? args.blocks.length : 0 } });
    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-blocks error:", e);
    logEvent({ fn: "generate-blocks", ok: false, ms: Date.now() - t0, err_code: "internal" });
    return jsonResp({ error: e instanceof Error ? e.message : "Unknown", code: "internal" }, 500);
  }
});
