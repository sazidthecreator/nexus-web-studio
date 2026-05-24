/**
 * Conflict-aware project sync helpers — pure logic, no React.
 *
 * Strategy:
 *   1. Each local edit remembers `baseUpdatedAt` (the `updated_at` value
 *      of the remote project at the time the edit started).
 *   2. Before writing, we re-read the remote `updated_at`. If it has
 *      moved past `baseUpdatedAt`, another tab/user wrote concurrently —
 *      that's a conflict. We surface both sides so the caller can show a
 *      merge UI.
 *   3. Resolution choices:
 *        - "local" — overwrite remote with local (last-write-wins manual)
 *        - "remote" — discard local edit, take server copy
 *        - "merge" — accept a caller-merged content blob
 */
import { supabase } from "@/integrations/supabase/client";
import type { ProjectContent } from "@/lib/blocks";

export type ConflictCheckResult =
  | { status: "ok"; remoteUpdatedAt: number }
  | { status: "conflict"; remoteUpdatedAt: number; remoteContent: ProjectContent }
  | { status: "missing" };

/** Check whether the remote copy has moved past `baseUpdatedAt`. */
export async function checkRemoteConflict(
  projectId: string,
  baseUpdatedAt: number | undefined,
): Promise<ConflictCheckResult> {
  const { data, error } = await supabase
    .from("projects")
    .select("content, updated_at")
    .eq("id", projectId)
    .maybeSingle();
  if (error || !data) return { status: "missing" };
  const remoteUpdatedAt = data.updated_at ? Date.parse(data.updated_at as string) : 0;
  if (!baseUpdatedAt || remoteUpdatedAt <= baseUpdatedAt) {
    return { status: "ok", remoteUpdatedAt };
  }
  return {
    status: "conflict",
    remoteUpdatedAt,
    remoteContent: (data.content as ProjectContent) ?? { branding: {} as any, pages: [] },
  };
}

/** Hard write — caller has already resolved the conflict. */
export async function writeProjectContent(
  projectId: string,
  content: ProjectContent,
): Promise<{ updatedAt: number }> {
  const { data, error } = await supabase
    .from("projects")
    .update({ content: content as any })
    .eq("id", projectId)
    .select("updated_at")
    .maybeSingle();
  if (error) throw error;
  return { updatedAt: data?.updated_at ? Date.parse(data.updated_at as string) : Date.now() };
}

/** Lightweight "are these projects different in any meaningful way" check.
 *  Used to decide whether to bother prompting the user for a conflict
 *  resolution at all. JSON-equal content is a no-op merge. */
export function contentEquals(a: ProjectContent, b: ProjectContent): boolean {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

/** Stats summarizing a diff between two contents — fuels the merge UI. */
export type ContentDiffStats = {
  localBlocks: number;
  remoteBlocks: number;
  bothBlocks: number;
  localOnly: number;
  remoteOnly: number;
};

export function diffStats(local: ProjectContent, remote: ProjectContent): ContentDiffStats {
  const localIds = new Set((local.pages?.[0]?.blocks ?? []).map((b: any) => b.id));
  const remoteIds = new Set((remote.pages?.[0]?.blocks ?? []).map((b: any) => b.id));
  let both = 0;
  localIds.forEach((id) => { if (remoteIds.has(id)) both += 1; });
  return {
    localBlocks: localIds.size,
    remoteBlocks: remoteIds.size,
    bothBlocks: both,
    localOnly: localIds.size - both,
    remoteOnly: remoteIds.size - both,
  };
}

/** Per-block 3-way merge: union by id, prefer local on collision. */
export function mergeContents(local: ProjectContent, remote: ProjectContent): ProjectContent {
  const localPage = local.pages?.[0];
  const remotePage = remote.pages?.[0];
  if (!localPage || !remotePage) return local;
  const map = new Map<string, any>();
  for (const b of remotePage.blocks ?? []) map.set(b.id, b);
  for (const b of localPage.blocks ?? []) map.set(b.id, b); // local wins
  // Preserve local order, then append remote-only blocks at the end.
  const order: string[] = (localPage.blocks ?? []).map((b: any) => b.id);
  for (const b of remotePage.blocks ?? []) if (!order.includes(b.id)) order.push(b.id);
  const merged = order.map((id) => map.get(id)).filter(Boolean);
  return {
    ...local,
    pages: local.pages.map((p, i) => i === 0 ? { ...p, blocks: merged } : p),
  };
}
