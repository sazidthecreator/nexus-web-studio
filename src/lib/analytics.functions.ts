// Authenticated analytics aggregations for project owners.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  projectId: z.string().uuid(),
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
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
      return {
        daily: [], topPaths: [], totalViews: 0, uniqueVisitors: 0,
        formSubmissions: 0, vitals: [],
      };
    }

    const since = new Date(Date.now() - data.days * 86400_000).toISOString();
    const [pvRes, formRes, vitalsRes] = await Promise.all([
      supabase
        .from("page_views")
        .select("ts, page_path, visitor_hash")
        .eq("project_id", data.projectId)
        .gte("ts", since)
        .order("ts", { ascending: true })
        .limit(10000),
      supabase
        .from("form_responses")
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId)
        .gte("created_at", since),
      supabase
        .from("vitals_reports")
        .select("name, value, rating")
        .eq("project_id", data.projectId)
        .gte("created_at", since)
        .limit(2000),
    ]);
    const rows = pvRes.data;

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

    // Median per vital metric (LCP, CLS, INP, FCP, TTFB)
    const vitalBuckets = new Map<string, { values: number[]; good: number; total: number }>();
    for (const v of vitalsRes.data ?? []) {
      const name = (v.name as string) || "";
      if (!name) continue;
      const b = vitalBuckets.get(name) ?? { values: [], good: 0, total: 0 };
      b.values.push(Number(v.value));
      b.total += 1;
      if (v.rating === "good") b.good += 1;
      vitalBuckets.set(name, b);
    }
    const vitals = Array.from(vitalBuckets.entries()).map(([name, b]) => {
      const sorted = b.values.slice().sort((a, c) => a - c);
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
      return { name, median, goodPct: b.total ? Math.round((b.good / b.total) * 100) : 0, samples: b.total };
    }).sort((a, c) => a.name.localeCompare(c.name));

    return {
      daily,
      topPaths,
      totalViews: rows?.length ?? 0,
      uniqueVisitors: allVisitors.size,
      formSubmissions: formRes.count ?? 0,
      vitals,
    };
  });
