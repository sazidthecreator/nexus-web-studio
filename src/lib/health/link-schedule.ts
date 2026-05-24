/**
 * Per-project schedule settings for the broken-link crawler.
 * Persisted in localStorage; read by HealthPanel which runs an in-tab
 * interval to fire crawls when due.
 */
export type LinkScheduleIntervalHours = 0 | 1 | 6 | 24;

export type LinkScheduleSettings = {
  enabled: boolean;
  intervalHours: LinkScheduleIntervalHours; // 0 = off
  lastRunAt: number; // epoch ms; 0 if never
};

const KEY = (projectId: string) => `sitely.linkschedule.${projectId}`;

const DEFAULTS: LinkScheduleSettings = { enabled: false, intervalHours: 0, lastRunAt: 0 };

export function loadLinkSchedule(projectId: string): LinkScheduleSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY(projectId));
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<LinkScheduleSettings>;
    return {
      enabled: !!parsed.enabled,
      intervalHours: ((parsed.intervalHours ?? 0) as LinkScheduleIntervalHours),
      lastRunAt: typeof parsed.lastRunAt === "number" ? parsed.lastRunAt : 0,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveLinkSchedule(projectId: string, settings: LinkScheduleSettings): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(KEY(projectId), JSON.stringify(settings)); } catch { /* ignore */ }
}

/** Returns ms until the next due run, or 0 if due now, or Infinity if disabled. */
export function nextDueIn(s: LinkScheduleSettings, now = Date.now()): number {
  if (!s.enabled || s.intervalHours === 0) return Infinity;
  const intervalMs = s.intervalHours * 3600 * 1000;
  const due = (s.lastRunAt || 0) + intervalMs;
  return Math.max(0, due - now);
}

export function isDue(s: LinkScheduleSettings, now = Date.now()): boolean {
  return nextDueIn(s, now) === 0;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return "off";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
