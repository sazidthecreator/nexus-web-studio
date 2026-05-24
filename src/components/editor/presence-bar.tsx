import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRelativeShort } from "@/lib/use-projects-presence";

type Peer = {
  user_id: string;
  name: string;
  color: string;
  online_at: string;
  page?: string;
};

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function PresenceBar({
  projectId,
  page = "Editor",
}: {
  projectId: string;
  page?: string;
}) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const meRef = useRef<Peer | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    let stop = false;

    const track = async () => {
      const ch = channelRef.current;
      const me = meRef.current;
      if (!ch || !me || !subscribedRef.current) return;
      try { await ch.track({ ...me, online_at: new Date().toISOString() }); } catch { /* noop */ }
    };
    const untrack = async () => {
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      try { await ch.untrack(); } catch { /* noop */ }
    };

    // Fast cleanup so observers see us leave when tab closes/hides.
    const onPageHide = () => { void untrack(); };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void untrack();
      else void track();
    };

    // Heartbeat: refresh online_at every 30s while active so "last active"
    // stays current for observers.
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let lastActivity = Date.now();
    const onActivity = () => { lastActivity = Date.now(); };

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || stop) return;
      meRef.current = {
        user_id: u.user.id,
        name: (u.user.user_metadata?.display_name as string) || u.user.email?.split("@")[0] || "User",
        color: colorFor(u.user.id),
        online_at: new Date().toISOString(),
        page,
      };
      const tabId = (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2);
      const channel = supabase.channel(`presence:project:${projectId}`, {
        config: { presence: { key: `${u.user.id}:${tabId}` } },
      });
      channelRef.current = channel;
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState() as Record<string, Peer[]>;
          const byUser = new Map<string, Peer>();
          for (const arr of Object.values(state)) {
            const p = arr?.[0];
            if (p?.user_id && !byUser.has(p.user_id)) byUser.set(p.user_id, p);
          }
          setPeers(Array.from(byUser.values()));
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            subscribedRef.current = true;
            await track();
          }
        });

      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("beforeunload", onPageHide);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("mousemove", onActivity, { passive: true });
      window.addEventListener("keydown", onActivity);

      heartbeat = setInterval(() => {
        // Only re-broadcast if there's been recent activity (last 60s).
        if (Date.now() - lastActivity < 60_000) void track();
      }, 30_000);
    })();

    return () => {
      stop = true;
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      if (heartbeat) clearInterval(heartbeat);
      const ch = channelRef.current;
      void (async () => {
        await untrack();
        if (ch) await supabase.removeChannel(ch);
      })();
      channelRef.current = null;
      subscribedRef.current = false;
    };
  }, [projectId]);

  // Re-broadcast when the page label changes (e.g. user switches view).
  useEffect(() => {
    if (!meRef.current) return;
    meRef.current = { ...meRef.current, page };
    if (!channelRef.current || !subscribedRef.current) return;
    void channelRef.current.track({ ...meRef.current, online_at: new Date().toISOString() });
  }, [page]);

  if (peers.length <= 1) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex -space-x-2">
        {peers.slice(0, 5).map((p) => (
          <Tooltip key={p.user_id}>
            <TooltipTrigger asChild>
              <div
                className="size-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-semibold text-white cursor-default"
                style={{ background: p.color }}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="font-medium">{p.name}</div>
              <div className="text-muted-foreground">
                {p.page ? `On ${p.page}` : "Online"} · active {formatRelativeShort(p.online_at)}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {peers.length > 5 && (
          <div className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-semibold">
            +{peers.length - 5}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
