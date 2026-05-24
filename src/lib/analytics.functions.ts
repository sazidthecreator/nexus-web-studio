// Authenticated analytics aggregations for project owners.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  projectId: z.string().uuid(),
  days: z.number().int().min(1).max(90).default(30),
});

export const getProjectAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS already restricts page_views to owned projects, but double-check ownership.
    const { data: proj } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!proj || proj.user_id !== userId) {
      return { daily: [], topPaths: [], totalViews: 0, uniqueVisitors: 0 };
    }

    const since = new Date(Date.now() - data.days * 86400_000).toISOString();
    const { data: rows } = await supabase
      .from("page_views")
      .select("ts, page_path, visitor_hash")
      .eq("project_id", data.projectId)
      .gte("ts", since)
      .order("ts", { ascending: true })
      .limit(10000);

    const dailyMap = new Map<string, { day: string; views: number; visitors: Set<string> }>();
    const pathMap = new Map<string, number>();
    const allVisitors = new Set<string>();

    for (const r of rows ?? []) {
      const day = new Date(r.ts as string).toISOString().slice(0, 10);
      const entry = dailyMap.get(day) ?? { day, views: 0, visitors: new Set<string>() };
      entry.views += 1;
      if (r.visitor_hash) entry.visitors.add(r.visitor_hash as string);
      dailyMap.set(day, entry);

      const p = (r.page_path as string) || "/";
      pathMap.set(p, (pathMap.get(p) ?? 0) + 1);
      if (r.visitor_hash) allVisitors.add(r.visitor_hash as string);
    }

    const daily = Array.from(dailyMap.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((e) => ({ day: e.day, views: e.views, visitors: e.visitors.size }));
    const topPaths = Array.from(pathMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      daily,
      topPaths,
      totalViews: rows?.length ?? 0,
      uniqueVisitors: allVisitors.size,
    };
  });
