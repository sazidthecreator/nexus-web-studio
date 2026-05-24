import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresencePeer = {
  user_id: string;
  name: string;
  color: string;
  online_at?: string;
  page?: string;
};
export type PresenceMap = Record<string, PresencePeer[]>;

/** Compact "active 5s/2m/1h/3d ago" formatter for presence tooltips. */
export function formatRelativeShort(iso?: string): string {
  if (!iso) return "just now";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "just now";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * Observes presence channels for a set of project ids and returns a map of
 * project_id -> peers currently viewing/editing that project.
 *
 * Read-only: does not track the dashboard viewer as a peer.
 */
export function useProjectsPresence(projectIds: string[]): PresenceMap {
  const key = projectIds.slice().sort().join(",");
  const [map, setMap] = useState<PresenceMap>({});

  useEffect(() => {
    if (!projectIds.length) {
      setMap({});
      return;
    }
    const channels = projectIds.map((pid) => {
      const ch = supabase.channel(`presence:project:${pid}`, {
        config: { presence: { key: `observer:${Math.random().toString(36).slice(2)}` } },
      });
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState() as Record<string, PresencePeer[]>;
        // Dedupe by user_id so multiple tabs of the same user render as one avatar.
        const byUser = new Map<string, PresencePeer>();
        for (const arr of Object.values(state)) {
          const p = arr?.[0];
          if (p?.user_id && !byUser.has(p.user_id)) byUser.set(p.user_id, p);
        }
        setMap((prev) => ({ ...prev, [pid]: Array.from(byUser.values()) }));
      }).subscribe();
      return ch;
    });
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}
