/**
 * Smart offline replay scheduler.
 *
 *  - Walks the IndexedDB edit queue (`listQueue`) instead of draining it
 *    blindly. Each edit carries its own `attempts` + `nextRetryAt`.
 *  - On a per-edit failure: bump attempts, schedule the next retry with
 *    exponential backoff (1s → 2 → 4 → 8 → 16 → 32 → 60s cap), persist
 *    the new metadata. After `MAX_ATTEMPTS` we keep the record (so the
 *    user can still recover their work) but stop auto-retrying it.
 *  - On a conflict: returned to the caller with the remote snapshot —
 *    the editor opens the merge dialog. The queued record is removed,
 *    so a manual resolution doesn't loop.
 *  - On success: remove the edit.
 *
 *  The scheduler runs:
 *    - immediately when invoked
 *    - on `online` events
 *    - on `visibilitychange` (tab refocus)
 *    - on a 30s interval poll while online
 */
import {
  listQueue,
  removeQueuedEdit,
  updateQueuedEdit,
  isOnline,
  type QueuedEdit,
} from "@/lib/offline-cache";
import {
  checkRemoteConflict,
  writeProjectContent,
} from "@/lib/sync/conflict";
import type { ProjectContent } from "@/lib/blocks";

const MAX_ATTEMPTS = 6;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 32000, 60000];

export type ReplayConflict = {
  editId: number;
  remote: ProjectContent;
  remoteUpdatedAt: number;
};

export type ReplaySummary = {
  attempted: number;   // edits whose retry window was due this run
  synced: number;      // successfully written to remote
  conflicted: ReplayConflict[];
  failed: { editId?: number; error: string; attempts: number; givingUp: boolean }[];
  deferred: number;    // edits still waiting on backoff
  pending: number;     // total edits remaining in queue after this run
};

function nextDelay(attempts: number): number {
  return BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
}

/** Run one pass of the scheduler for a single project. Pure logic — the
 *  caller decides what to do with conflicts and the summary. */
export async function runReplayOnce(projectId: string): Promise<ReplaySummary> {
  const summary: ReplaySummary = {
    attempted: 0,
    synced: 0,
    conflicted: [],
    failed: [],
    deferred: 0,
    pending: 0,
  };
  if (!isOnline()) {
    summary.pending = (await listQueue()).filter((e) => e.projectId === projectId).length;
    return summary;
  }

  const now = Date.now();
  const all = await listQueue();
  const mine = all.filter((e) => e.projectId === projectId);
  // Process oldest first so saves replay in order.
  mine.sort((a, b) => a.queuedAt - b.queuedAt);

  for (const edit of mine) {
    const due = (edit.nextRetryAt ?? 0) <= now;
    if (!due) { summary.deferred += 1; continue; }
    summary.attempted += 1;
    try {
      const probe = await checkRemoteConflict(projectId, edit.baseUpdatedAt);
      if (probe.status === "conflict") {
        // Hand off to UI; remove from queue so it doesn't loop.
        if (typeof edit.id === "number") {
          summary.conflicted.push({
            editId: edit.id,
            remote: probe.remoteContent,
            remoteUpdatedAt: probe.remoteUpdatedAt,
          });
          await removeQueuedEdit(edit.id);
        }
        continue;
      }
      if (probe.status === "missing") throw new Error("Project not found on server");
      await writeProjectContent(projectId, edit.content);
      if (typeof edit.id === "number") await removeQueuedEdit(edit.id);
      summary.synced += 1;
    } catch (err) {
      const attempts = (edit.attempts ?? 0) + 1;
      const givingUp = attempts >= MAX_ATTEMPTS;
      const message = err instanceof Error ? err.message : "Sync failed";
      if (typeof edit.id === "number") {
        if (givingUp) {
          // Keep the record (so user can still recover) but push retry far out.
          await updateQueuedEdit({
            ...edit,
            attempts,
            lastError: message,
            nextRetryAt: now + 24 * 60 * 60 * 1000, // pause 24h, manual resync only
          });
        } else {
          await updateQueuedEdit({
            ...edit,
            attempts,
            lastError: message,
            nextRetryAt: now + nextDelay(attempts),
          });
        }
      }
      summary.failed.push({ editId: edit.id, error: message, attempts, givingUp });
    }
  }

  const remaining = await listQueue();
  summary.pending = remaining.filter((e) => e.projectId === projectId).length;
  return summary;
}

export type SchedulerHandle = {
  stop: () => void;
  runNow: () => Promise<ReplaySummary>;
};

/** Start the auto-scheduler. Caller supplies a callback for each summary
 *  so it can show toasts and open the merge dialog. */
export function startReplayScheduler(
  projectId: string,
  onSummary: (s: ReplaySummary) => void,
  opts: { intervalMs?: number } = {},
): SchedulerHandle {
  const intervalMs = opts.intervalMs ?? 30_000;
  let stopped = false;
  let running = false;

  async function run() {
    if (stopped || running) return;
    running = true;
    try {
      const summary = await runReplayOnce(projectId);
      if (!stopped) onSummary(summary);
    } finally {
      running = false;
    }
  }

  const onOnline = () => { void run(); };
  const onVisible = () => { if (typeof document !== "undefined" && !document.hidden) void run(); };

  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
  }
  const timer = typeof window !== "undefined"
    ? window.setInterval(() => { if (isOnline()) void run(); }, intervalMs)
    : null;

  // Kick off an immediate pass.
  void run();

  return {
    stop: () => {
      stopped = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onVisible);
      }
      if (timer != null) clearInterval(timer);
    },
    runNow: async () => {
      const s = await runReplayOnce(projectId);
      onSummary(s);
      return s;
    },
  };
}
