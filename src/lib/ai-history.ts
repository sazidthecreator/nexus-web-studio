// AI generation history: logs every AI action and supports revert.
// Persisted in `ai_generations` table (created in phase A migration).
// Safe to call before migration — failures are swallowed.
import { supabase } from "@/integrations/supabase/client";

export type AiGenerationKind =
  | "rewrite_block"
  | "rewrite_site"
  | "generate_image"
  | "translate_locale"
  | "translate_field";

export type RevertPayload = {
  before?: unknown;
  after?: unknown;
  blockId?: string;
  blockType?: string;
  locale?: string;
  prevSrc?: string;
  nextSrc?: string;
  [k: string]: unknown;
};

export interface AiGeneration {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: AiGenerationKind;
  prompt: string;
  output_text: string | null;
  output_url: string | null;
  block_id: string | null;
  locale: string | null;
  revert_payload: RevertPayload | null;
  reverted_at: string | null;
  created_at: string;
}

type LogArgs = {
  kind: AiGenerationKind;
  prompt: string;
  output_text?: string;
  output_url?: string;
  block_id?: string;
  locale?: string;
  revert_payload?: RevertPayload;
  project_id?: string;
};

let currentProjectId: string | null = null;
export function setAiHistoryProject(projectId: string | null) {
  currentProjectId = projectId;
}

const listeners = new Set<() => void>();
export function onAiHistoryChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() { listeners.forEach((l) => { try { l(); } catch { /* noop */ } }); }

export async function logAiGeneration(args: LogArgs): Promise<void> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const project_id = args.project_id ?? currentProjectId;
    await supabase.from("ai_generations" as any).insert({
      user_id: u.user.id,
      project_id,
      kind: args.kind,
      prompt: args.prompt.slice(0, 4000),
      output_text: args.output_text?.slice(0, 8000) ?? null,
      output_url: args.output_url ?? null,
      block_id: args.block_id ?? null,
      locale: args.locale ?? null,
      revert_payload: (args.revert_payload as any) ?? null,
    } as any);
    emit();
  } catch (e) {
    console.warn("[ai-history] log failed", e);
  }
}

export async function listAiGenerations(projectId: string): Promise<AiGeneration[]> {
  const { data, error } = await supabase
    .from("ai_generations" as any)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("[ai-history] list failed", error);
    return [];
  }
  return (data || []) as unknown as AiGeneration[];
}

export async function markReverted(id: string): Promise<void> {
  try {
    await supabase
      .from("ai_generations" as any)
      .update({ reverted_at: new Date().toISOString() } as any)
      .eq("id", id);
    emit();
  } catch (e) {
    console.warn("[ai-history] mark reverted failed", e);
  }
}
