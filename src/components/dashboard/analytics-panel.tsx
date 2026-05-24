// Analytics panel: 30-day page view chart + top paths for one project.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart2 } from "lucide-react";
import { getProjectAnalytics } from "@/lib/analytics.functions";

type Project = { id: string; name: string; published: boolean };

export function AnalyticsPanel({ projects }: { projects: Project[] }) {
  const published = useMemo(() => projects.filter((p) => p.published), [projects]);
  const [projectId, setProjectId] = useState<string>(published[0]?.id ?? "");
  const fetchFn = useServerFn(getProjectAnalytics);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", projectId],
    queryFn: () => fetchFn({ data: { projectId, days: 30 } }),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  if (published.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BarChart2 className="size-4" /> Analytics
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Publish a project to start collecting page views.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BarChart2 className="size-4" /> Analytics · 30d
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="text-xs bg-background border rounded-md px-2 py-1 max-w-[140px]"
          aria-label="Project"
        >
          {published.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Views" value={data?.totalViews ?? 0} />
        <Stat label="Visitors" value={data?.uniqueVisitors ?? 0} />
      </div>

      <div className="h-32">
        {isLoading ? (
          <div className="h-full grid place-items-center text-xs text-muted-foreground">Loading…</div>
        ) : (data?.daily?.length ?? 0) === 0 ? (
          <div className="h-full grid place-items-center text-xs text-muted-foreground">No views yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data!.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {(data?.topPaths?.length ?? 0) > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Top pages</div>
          <ul className="space-y-1">
            {data!.topPaths.slice(0, 5).map((p) => (
              <li key={p.path} className="flex items-center justify-between text-xs">
                <span className="truncate max-w-[180px]" title={p.path}>{p.path}</span>
                <span className="tabular-nums text-muted-foreground">{p.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
    </div>
  );
}
