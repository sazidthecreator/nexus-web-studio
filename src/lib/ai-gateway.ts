import { supabase } from "@/integrations/supabase/client";

export type AiProvider = "groq" | "gemini" | "huggingface" | "cohere" | "pollinations" | "mistral";

export type AiTask =
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

export interface AiCallOptions {
  task: AiTask;
  payload: Record<string, unknown>;
  provider_preference?: AiProvider | "auto";
}

export interface AiResponse<T = unknown> {
  provider: AiProvider;
  latency_ms?: number;
  result: T;
}

// Last-call telemetry, exposed for UI provider chips.
type AiTelemetry = { provider: AiProvider; latency_ms: number; task: AiTask; ok: boolean; at: number; error?: string };
let lastTelemetry: AiTelemetry | null = null;
const telemetryListeners = new Set<(t: AiTelemetry) => void>();
export function getLastAiTelemetry() { return lastTelemetry; }
export function onAiTelemetry(fn: (t: AiTelemetry) => void) {
  telemetryListeners.add(fn);
  return () => telemetryListeners.delete(fn);
}
function emitTelemetry(t: AiTelemetry) {
  lastTelemetry = t;
  telemetryListeners.forEach((l) => { try { l(t); } catch { /* noop */ } });
}

export async function callAi<T = unknown>(opts: AiCallOptions): Promise<AiResponse<T>> {
  const t0 = Date.now();
  const { data, error } = await supabase.functions.invoke("ai-gateway", { body: opts });
  if (error) {
    emitTelemetry({ provider: "groq", latency_ms: Date.now() - t0, task: opts.task, ok: false, at: Date.now(), error: error.message });
    throw error;
  }
  if ((data as any)?.error) {
    emitTelemetry({ provider: "groq", latency_ms: Date.now() - t0, task: opts.task, ok: false, at: Date.now(), error: (data as any).error });
    throw new Error((data as any).error);
  }
  const resp = data as AiResponse<T>;
  emitTelemetry({
    provider: resp.provider,
    latency_ms: resp.latency_ms ?? Date.now() - t0,
    task: opts.task, ok: true, at: Date.now(),
  });
  return resp;
}

// Convenience helpers
export const ai = {
  copy: (prompt: string) =>
    callAi<{ text: string }>({ task: "generate_copy", payload: { prompt } }),
  image: (prompt: string, opts?: { width?: number; height?: number; seed?: number }) =>
    callAi<{ url: string }>({ task: "generate_image", payload: { prompt, ...opts } }),
  altText: (prompt: string, imageBase64?: string, mime?: string) =>
    callAi<{ alt: string }>({ task: "generate_alt_text", payload: { prompt, imageBase64, mime } }),
  seoMeta: (prompt: string, content: string) =>
    callAi<{ meta: { title: string; description: string; ogTitle: string; ogDescription: string; keywords: string[] } }>({
      task: "generate_seo_meta",
      payload: { prompt, content },
    }),
  translate: (text: string, target = "bn") =>
    callAi<{ text: string }>({ task: "translate_content", payload: { text, target } }),
  summarize: (text: string) =>
    callAi<{ summary: string }>({ task: "summarize_content", payload: { text } }),
  colorName: (hex: string) =>
    callAi<{ name: string }>({ task: "generate_color_name", payload: { hex } }),
};
