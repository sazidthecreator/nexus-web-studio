// Synthesize a unified "recent activity" feed from existing tables
// (project_snapshots, project_comments, form_responses) — no new DB schema.
import { supabase } from "@/integrations/supabase/client";

export type ActivityKind = "edited" | "comment" | "submission" | "published";

export type ActivityItem = {
  id: string;
  projectId: string;
  projectName: string;
  kind: ActivityKind;
  at: string; // ISO
  label: string;
};

type ProjectLite = { id: string; name: string; updated_at: string; published: boolean; published_at: string | null };

export async function fetchRecentActivity(userId: string, limit = 25): Promise<ActivityItem[]> {
  // Fetch the user's projects first so we can scope sub-queries and label each row.
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("id, name, updated_at, published, published_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (pErr) throw pErr;
  const list = (projects || []) as ProjectLite[];
  if (list.length === 0) return [];
  const byId = new Map(list.map((p) => [p.id, p]));
  const ids = list.map((p) => p.id);

  // Run the three feed sources in parallel.
  const [snaps, comments, subs] = await Promise.all([
    supabase
      .from("project_snapshots")
      .select("id, project_id, created_at, label")
      .in("project_id", ids)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("project_comments")
      .select("id, project_id, body, created_at")
      .in("project_id", ids)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("form_responses")
      .select("id, project_id, form_id, created_at")
      .in("project_id", ids)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const items: ActivityItem[] = [];

  for (const r of snaps.data || []) {
    const p = byId.get((r as any).project_id);
    if (!p) continue;
    items.push({
      id: `snap-${(r as any).id}`,
      projectId: p.id,
      projectName: p.name,
      kind: "edited",
      at: (r as any).created_at,
      label: (r as any).label || "Edited",
    });
  }
  for (const r of comments.data || []) {
    const p = byId.get((r as any).project_id);
    if (!p) continue;
    items.push({
      id: `cmt-${(r as any).id}`,
      projectId: p.id,
      projectName: p.name,
      kind: "comment",
      at: (r as any).created_at,
      label: truncate(String((r as any).body || ""), 80),
    });
  }
  for (const r of subs.data || []) {
    const p = byId.get((r as any).project_id);
    if (!p) continue;
    items.push({
      id: `sub-${(r as any).id}`,
      projectId: p.id,
      projectName: p.name,
      kind: "submission",
      at: (r as any).created_at,
      label: `New submission${((r as any).form_id) ? ` · ${(r as any).form_id}` : ""}`,
    });
  }
  // Synthesize "published" rows from project metadata so first-time publishes show up.
  for (const p of list) {
    if (p.published && p.published_at) {
      items.push({
        id: `pub-${p.id}-${p.published_at}`,
        projectId: p.id,
        projectName: p.name,
        kind: "published",
        at: p.published_at,
        label: "Published",
      });
    }
  }

  items.sort((a, b) => b.at.localeCompare(a.at));
  return items.slice(0, limit);
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
