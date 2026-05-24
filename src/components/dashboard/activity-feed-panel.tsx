// Recent activity panel shown on the dashboard.
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Activity, MessageSquare, Inbox, Rocket, History } from "lucide-react";
import { fetchRecentActivity, type ActivityItem } from "@/lib/activity-feed";

export function ActivityFeedPanel({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["activity-feed", userId],
    queryFn: () => fetchRecentActivity(userId, 12),
    staleTime: 30_000,
  });

  return (
    <section
      aria-label="Recent activity"
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Recent activity</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Last {data.length || 0}
        </span>
      </header>
      {isLoading ? (
        <ul className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="px-4 py-3 animate-pulse">
              <div className="h-3 w-2/3 bg-muted rounded mb-2" />
              <div className="h-2 w-1/3 bg-muted rounded" />
            </li>
          ))}
        </ul>
      ) : data.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">
          No activity yet. Edits, comments, publishes, and form submissions will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-border max-h-[420px] overflow-auto">
          {data.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon =
    item.kind === "edited" ? Activity
    : item.kind === "comment" ? MessageSquare
    : item.kind === "submission" ? Inbox
    : Rocket;
  const tone =
    item.kind === "edited" ? "text-foreground"
    : item.kind === "comment" ? "text-blue-600 dark:text-blue-400"
    : item.kind === "submission" ? "text-emerald-600 dark:text-emerald-400"
    : "text-primary";
  return (
    <li>
      <Link
        to="/editor/$projectId"
        params={{ projectId: item.projectId }}
        className="flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
      >
        <Icon className={`size-4 mt-0.5 shrink-0 ${tone}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm truncate">
            <span className="font-medium">{item.projectName}</span>
            <span className="text-muted-foreground"> · {item.label}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
          </p>
        </div>
      </Link>
    </li>
  );
}
