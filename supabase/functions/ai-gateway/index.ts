import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { decryptKey } from "../_shared/crypto.ts";
import { rateLimit, logEvent, readJsonCapped, isResponse } from "../_shared/limits.ts";

type Provider = "groq" | "gemini" | "huggingface" | "cohere" | "pollinations" | "mistral";
type Task =
  | "generate_copy"
  | "generate_image"
  | "analyze_screenshot"
  | "translate_content"
  | "generate_alt_text"
  | "suggest_layout"
  | "generate_seo_meta"
  | "summarize_content"
  | "search_templates"
  | "generate_color_name";

// Preferred provider order per task (auto-routing).
const TASK_ROUTES: Record<Task, Provider[]> = {
  generate_copy: ["groq", "mistral", "gemini"],
  generate_image: ["pollinations"],
  analyze_screenshot: ["gemini"],
  translate_content: ["huggingface", "groq"],
  generate_alt_text: ["huggingface", "gemini", "groq"],
  suggest_layout: ["groq", "gemini", "mistral"],
  generate_seo_meta: ["groq", "gemini", "mistral"],
  summarize_content: ["huggingface", "groq", "mistral"],
  search_templates: ["cohere"],
  generate_color_name: ["groq", "mistral", "gemini"],
};

const PROVIDERS_NEEDING_KEY: Provider[] = [
  "groq", "gemini", "huggingface", "cohere", "mistral",
];

async function getKeyForProvider(
  supa: ReturnType<typeof createClient>,
  userId: string,
  provider: Provider,
): Promise<string | null> {
  if (provider === "pollinations") return "no-key";
  // env wins
  const envName = ({
    groq: "GROQ_API_KEY",
    gemini: "GEMINI_API_KEY",
    huggingface: "HUGGINGFACE_API_KEY",
    cohere: "COHERE_API_KEY",
    mistral: "MISTRAL_API_KEY",
  } as const)[provider];
  const fromEnv = Deno.env.get(envName);
  if (fromEnv) return fromEnv;

  const { data } = await supa
    .from("user_ai_keys")
    .select("ciphertext, iv")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (!data) return null;
  try {
    return await decryptKey(data.ciphertext as string, data.iv as string);
  } catch (e) {
    console.error("decrypt failed", provider, e);
    return null;
  }
}

async function trackUsage(
  supa: ReturnType<typeof createClient>,
  userId: string,
  provider: Provider,
) {
  if (provider === "pollinations") return;
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supa
    .from("ai_usage")
    .select("id, request_count")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("day", today)
    .maybeSingle();
  if (existing) {
    await supa.from("ai_usage")
      .update({ request_count: (existing.request_count as number) + 1 })
      .eq("id", existing.id);
  } else {
    await supa.from("ai_usage").insert({
      user_id: userId, provider, day: today, request_count: 1,
    });
  }
}

// ─── provider callers ──────────────────────────────────────────────
async function callGroq(key: string, system: string, user: string, jsonOut = false) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.7,
      ...(jsonOut ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callMistral(key: string, system: string, user: string, jsonOut = false) {
  const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(jsonOut ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`Mistral ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(
  key: string, system: string, user: string,
  imageBase64?: string, mime?: string, jsonOut = false,
) {
  const parts: any[] = [{ text: user }];
  if (imageBase64 && mime) parts.push({ inline_data: { mime_type: mime, data: imageBase64 } });
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        ...(jsonOut ? { generationConfig: { response_mime_type: "application/json" } } : {}),
      }),
    },
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callHuggingFace(key: string, model: string, payload: unknown) {
  const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`HF ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function callCohereEmbed(key: string, texts: string[]) {
  const r = await fetch("https://api.cohere.com/v1/embed", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ texts, model: "embed-english-light-v3.0", input_type: "search_document" }),
  });
  if (!r.ok) throw new Error(`Cohere ${r.status}: ${await r.text()}`);
  return await r.json();
}

function pollinationsImage(prompt: string, w = 1200, h = 630, seed?: number) {
  const s = seed ?? Math.floor(Math.random() * 1e9);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${s}&nologo=true`;
}

// ─── task → provider dispatch ──────────────────────────────────────
async function runTask(
  task: Task, provider: Provider, key: string, payload: any,
): Promise<any> {
  switch (task) {
    case "generate_copy": {
      const sys = "You are a senior brand copywriter. Write punchy, on-brand copy. Be concise.";
      const usr = String(payload.prompt || "");
      if (provider === "groq") return { text: await callGroq(key, sys, usr) };
      if (provider === "mistral") return { text: await callMistral(key, sys, usr) };
      return { text: await callGemini(key, sys, usr) };
    }
    case "generate_image": {
      const url = pollinationsImage(String(payload.prompt || ""), payload.width, payload.height, payload.seed);
      return { url };
    }
    case "analyze_screenshot": {
      const sys = "Describe the website screenshot's layout, sections, and color palette. Output a structured JSON with { sections: string[], palette: string[], style: string }.";
      const usr = String(payload.prompt || "Analyze this website screenshot.");
      const text = await callGemini(key, sys, usr, payload.imageBase64, payload.mime || "image/png", true);
      return { analysis: text };
    }
    case "translate_content": {
      const target = payload.target || "bn";
      const model = `Helsinki-NLP/opus-mt-en-${target}`;
      const out = await callHuggingFace(key, model, { inputs: String(payload.text || "") });
      const text = Array.isArray(out) ? out[0]?.translation_text ?? "" : "";
      return { text };
    }
    case "generate_alt_text": {
      if (provider === "huggingface") {
        // BLIP image captioning expects raw bytes; use base64 via fetch helper
        const r = await fetch(
          "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/octet-stream" },
            body: payload.imageBase64
              ? Uint8Array.from(atob(payload.imageBase64), (c) => c.charCodeAt(0))
              : undefined,
          },
        );
        if (!r.ok) throw new Error(`HF ${r.status}: ${await r.text()}`);
        const data = await r.json();
        return { alt: Array.isArray(data) ? data[0]?.generated_text ?? "" : "" };
      }
      if (provider === "gemini") {
        const text = await callGemini(
          key,
          "Generate a concise, descriptive alt text (max 120 chars) for the provided image. Output only the alt text.",
          "Generate alt text",
          payload.imageBase64, payload.mime || "image/jpeg",
        );
        return { alt: text.trim() };
      }
      const text = await callGroq(
        key,
        "Write a concise alt text (max 120 chars) describing this image based on the user's description.",
        String(payload.prompt || "an image"),
      );
      return { alt: text.trim() };
    }
    case "suggest_layout": {
      const sys = "You are a website architect. Given a description, propose 5–8 sections with names. Output JSON: { sections: [{ name, purpose }] }.";
      const usr = String(payload.prompt || "");
      if (provider === "groq") return { suggestion: await callGroq(key, sys, usr, true) };
      if (provider === "gemini") return { suggestion: await callGemini(key, sys, usr, undefined, undefined, true) };
      return { suggestion: await callMistral(key, sys, usr, true) };
    }
    case "generate_seo_meta": {
      const sys = `You are an SEO expert. Output JSON: { title (<= 60 chars), description (<= 155 chars), ogTitle, ogDescription, keywords: string[] }`;
      const usr = `Page intent: ${payload.prompt || ""}\nExisting content: ${payload.content || ""}`;
      if (provider === "groq") return { meta: JSON.parse(await callGroq(key, sys, usr, true)) };
      if (provider === "gemini") return { meta: JSON.parse(await callGemini(key, sys, usr, undefined, undefined, true)) };
      return { meta: JSON.parse(await callMistral(key, sys, usr, true)) };
    }
    case "summarize_content": {
      if (provider === "huggingface") {
        const out = await callHuggingFace(key, "facebook/bart-large-cnn", {
          inputs: String(payload.text || ""),
          parameters: { max_length: 130, min_length: 30 },
        });
        return { summary: Array.isArray(out) ? out[0]?.summary_text ?? "" : "" };
      }
      const sys = "Summarize the user's content in 2-3 concise sentences.";
      if (provider === "groq") return { summary: await callGroq(key, sys, String(payload.text || "")) };
      return { summary: await callMistral(key, sys, String(payload.text || "")) };
    }
    case "search_templates": {
      const data = await callCohereEmbed(key, [String(payload.query || ""), ...(payload.candidates || [])]);
      return { embeddings: data.embeddings };
    }
    case "generate_color_name": {
      const sys = "Given a hex color, output a short, evocative 1-3 word name. Output only the name.";
      const usr = String(payload.hex || "#000000");
      if (provider === "groq") return { name: (await callGroq(key, sys, usr)).trim() };
      if (provider === "mistral") return { name: (await callMistral(key, sys, usr)).trim() };
      return { name: (await callGemini(key, sys, usr)).trim() };
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();
  let userId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logEvent({ fn: "ai-gateway", ok: false, ms: Date.now() - t0, err_code: "unauthorized" });
      return jsonResponse({ error: "Unauthorized", code: "unauthorized" }, 401);
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supa.auth.getUser();
    const user = u?.user;
    if (!user) {
      logEvent({ fn: "ai-gateway", ok: false, ms: Date.now() - t0, err_code: "unauthorized" });
      return jsonResponse({ error: "Unauthorized", code: "unauthorized" }, 401);
    }
    userId = user.id;

    const limited = rateLimit({ key: `ai-gateway:${user.id}`, perMinute: 60, capacity: 30 });
    if (limited) {
      logEvent({ fn: "ai-gateway", user_id: userId, ok: false, ms: Date.now() - t0, err_code: "rate_limited" });
      return limited;
    }

    const parsed = await readJsonCapped<{ task: Task; payload: any; provider_preference?: Provider | "auto" }>(req, 256 * 1024);
    if (isResponse(parsed)) {
      logEvent({ fn: "ai-gateway", user_id: userId, ok: false, ms: Date.now() - t0, err_code: "bad_payload" });
      return parsed;
    }
    const task = parsed.task;
    const payload = parsed.payload ?? {};
    const preference = (parsed.provider_preference ?? "auto") as Provider | "auto";

    const VALID_TASKS: Task[] = [
      "generate_copy","generate_image","analyze_screenshot","translate_content",
      "generate_alt_text","suggest_layout","generate_seo_meta","summarize_content",
      "search_templates","generate_color_name",
    ];
    if (!VALID_TASKS.includes(task)) {
      logEvent({ fn: "ai-gateway", user_id: userId, ok: false, ms: Date.now() - t0, err_code: "unknown_task" });
      return jsonResponse({ error: "Unknown task", code: "unknown_task" }, 400);
    }

    // Stricter sub-limit for image generation (heavier)
    if (task === "generate_image") {
      const subLimited = rateLimit({ key: `ai-gateway:img:${user.id}`, perMinute: 10, capacity: 5 });
      if (subLimited) {
        logEvent({ fn: "ai-gateway", user_id: userId, ok: false, ms: Date.now() - t0, err_code: "rate_limited_image" });
        return subLimited;
      }
    }

    const route = TASK_ROUTES[task];
    const order: Provider[] = preference === "auto" || !route.includes(preference as Provider)
      ? route
      : [preference as Provider, ...route.filter((p) => p !== preference)];

    const errors: { provider: Provider; error: string }[] = [];
    for (const provider of order) {
      const tp = Date.now();
      try {
        const key = PROVIDERS_NEEDING_KEY.includes(provider)
          ? await getKeyForProvider(supa, user.id, provider)
          : "no-key";
        if (!key) { errors.push({ provider, error: "no_key" }); continue; }
        const result = await runTask(task, provider, key, payload);
        await trackUsage(supa, user.id, provider);
        const ms = Date.now() - t0;
        logEvent({ fn: "ai-gateway", user_id: userId, ok: true, ms, meta: { task, provider, provider_ms: Date.now() - tp } });
        return jsonResponse({ provider, latency_ms: Date.now() - tp, result });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`provider ${provider} failed (${Date.now() - tp}ms):`, msg);
        errors.push({ provider, error: msg });
      }
    }

    logEvent({ fn: "ai-gateway", user_id: userId, ok: false, ms: Date.now() - t0, err_code: "all_providers_failed", meta: { task, errors } });
    return jsonResponse({
      error: "All providers failed for this task. Add or fix an API key in Settings → AI.",
      code: "all_providers_failed",
      errors,
    }, 502);
  } catch (e) {
    console.error("ai-gateway error:", e);
    logEvent({ fn: "ai-gateway", user_id: userId, ok: false, ms: Date.now() - t0, err_code: "internal" });
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown", code: "internal" }, 500);
  }
});
