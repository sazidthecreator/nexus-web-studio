// Analytics panel: 30-day page view chart + top paths for one project.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart2, Inbox, Gauge } from "lucide-react";
import { getProjectAnalytics } from "@/lib/analytics.functions";

type Project = { id: string; name: string; published: boolean };

type Range = 7 | 30 | 90;

export function AnalyticsPanel({ projects }: { projects: Project[] }) {
  const published = useMemo(() => projects.filter((p) => p.published), [projects]);
  const [projectId, setProjectId] = useState<string>(published[0]?.id ?? "");
  const [days, setDays] = useState<Range>(30);
  const fetchFn = useServerFn(getProjectAnalytics);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", projectId, days],
    queryFn: () => fetchFn({ data: { projectId, days } }),
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
          <BarChart2 className="size-4" /> Analytics
        </div>
        <div className="flex items-center gap-1">
          <div role="tablist" aria-label="Date range" className="inline-flex rounded-md border bg-background p-0.5">
            {([7, 30, 90] as Range[]).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={days === r}
                onClick={() => setDays(r)}
                className={
                  "px-2 py-0.5 text-[11px] rounded transition-colors " +
                  (days === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {r}d
              </button>
            ))}
          </div>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="text-xs bg-background border rounded-md px-2 py-1 max-w-[120px]"
            aria-label="Project"
          >
            {published.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Views" value={data?.totalViews ?? 0} />
        <Stat label="Visitors" value={data?.uniqueVisitors ?? 0} />
        <Stat label="Forms" value={data?.formSubmissions ?? 0} icon={<Inbox className="size-3" />} />
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

      {(data?.vitals?.length ?? 0) > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Gauge className="size-3" /> Web vitals (median)
          </div>
          <div className="grid grid-cols-3 gap-1">
            {data!.vitals.slice(0, 6).map((v) => (
              <div key={v.name} className="rounded-md border bg-background px-2 py-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{v.name}</div>
                <div className="text-xs font-semibold tabular-nums">{formatVital(v.name, v.median)}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">{v.goodPct}% good</div>
              </div>
            ))}
          </div>
        </div>
      )}

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

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
    </div>
  );
}

function formatVital(name: string, value: number): string {
  // CLS is unitless (typically 0-1). Others are milliseconds.
  if (name === "CLS") return value.toFixed(2);
  if (value >= 1000) return (value / 1000).toFixed(2) + "s";
  return Math.round(value) + "ms";
}
