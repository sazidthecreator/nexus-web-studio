// Focus timer + microtask checklist. Tasks live in localStorage so they
// survive reloads. Each task has a target duration (5-20 min) and a
// per-task countdown that the user can start/pause/reset; finishing the
// countdown auto-marks the task complete and plays a soft chime.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, RotateCcw, Plus, Trash2, Check, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/focus")({
  component: FocusPage,
  head: () => ({
    meta: [
      { title: "Focus Timer — Microtasks" },
      { name: "description", content: "Run a built-in 5-20 minute focus timer for each microtask and mark them complete as you go." },
    ],
  }),
});

type Task = {
  id: string;
  title: string;
  minutes: number; // 5-20
  remaining: number; // seconds left in current run
  running: boolean;
  startedAt: number | null; // epoch ms when running, else null
  done: boolean;
};

const STORAGE_KEY = "focus.tasks.v1";
const clampMin = (n: number) => Math.max(5, Math.min(20, Math.round(n || 0)));

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Task[];
    // Reconcile running timers across reloads.
    const now = Date.now();
    return parsed.map((t) => {
      if (t.running && t.startedAt) {
        const elapsed = Math.floor((now - t.startedAt) / 1000);
        const remaining = Math.max(0, t.remaining - elapsed);
        return { ...t, remaining, running: remaining > 0, startedAt: remaining > 0 ? now : null, done: t.done || remaining === 0 };
      }
      return t;
    });
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function chime() {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.type = "sine";
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.65);
  } catch {}
}

function FocusPage() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState(15);
  const tickRef = useRef<number | null>(null);

  // Persist on every change.
  useEffect(() => { saveTasks(tasks); }, [tasks]);

  // 1Hz tick — drives all running tasks.
  useEffect(() => {
    const anyRunning = tasks.some((t) => t.running);
    if (!anyRunning) return;
    tickRef.current = window.setInterval(() => {
      setTasks((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (!t.running) return t;
          const remaining = Math.max(0, t.remaining - 1);
          if (remaining === 0) {
            changed = true;
            chime();
            toast.success(`"${t.title}" — time's up. Nice work.`);
            return { ...t, remaining: 0, running: false, startedAt: null, done: true };
          }
          changed = true;
          return { ...t, remaining };
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [tasks.some((t) => t.running)]); // eslint-disable-line react-hooks/exhaustive-deps

  const addTask = useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;
    const mins = clampMin(newMinutes);
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title,
        minutes: mins,
        remaining: mins * 60,
        running: false,
        startedAt: null,
        done: false,
      },
    ]);
    setNewTitle("");
  }, [newTitle, newMinutes]);

  const update = (id: string, fn: (t: Task) => Task) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));

  const start = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t.running ? { ...t, running: false, startedAt: null } : t;
        const remaining = t.remaining > 0 ? t.remaining : t.minutes * 60;
        return { ...t, running: true, startedAt: Date.now(), remaining, done: false };
      }),
    );
  const pause = (id: string) => update(id, (t) => ({ ...t, running: false, startedAt: null }));
  const reset = (id: string) => update(id, (t) => ({ ...t, running: false, startedAt: null, remaining: t.minutes * 60, done: false }));
  const toggleDone = (id: string) =>
    update(id, (t) => ({ ...t, done: !t.done, running: false, startedAt: null }));
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const clearDone = () => setTasks((prev) => prev.filter((t) => !t.done));

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const minutes = tasks.reduce((s, t) => s + t.minutes, 0);
    return { total, done, minutes };
  }, [tasks]);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Timer className="size-7 text-primary" /> Focus Timer
        </h1>
        <p className="text-muted-foreground">
          Add a microtask, pick 5-20 minutes, hit start. Finish the round and mark it done.
        </p>
        {stats.total > 0 && (
          <p className="text-xs text-muted-foreground">
            {stats.done}/{stats.total} complete · {stats.minutes} min planned
          </p>
        )}
      </header>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="What's the next microtask?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={5}
              max={20}
              value={newMinutes}
              onChange={(e) => setNewMinutes(clampMin(Number(e.target.value)))}
              className="w-20"
              aria-label="Minutes"
            />
            <span className="text-sm text-muted-foreground">min</span>
            <Button onClick={addTask} disabled={!newTitle.trim()}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Tip: tasks live in your browser, so they survive a reload.</p>
      </Card>

      <div className="space-y-3">
        {tasks.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            No microtasks yet. Add one above to start a focused round.
          </Card>
        )}
        {tasks.map((t) => {
          const pct = Math.round(((t.minutes * 60 - t.remaining) / (t.minutes * 60)) * 100);
          return (
            <Card key={t.id} className={cn("p-4 transition-colors", t.done && "opacity-60")}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleDone(t.id)}
                  aria-label={t.done ? "Mark incomplete" : "Mark complete"}
                  className={cn(
                    "mt-1 size-5 rounded-md border flex items-center justify-center shrink-0",
                    t.done ? "bg-primary border-primary text-primary-foreground" : "border-input hover:border-primary",
                  )}
                >
                  {t.done && <Check className="size-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn("font-medium truncate", t.done && "line-through")}>{t.title}</div>
                    <div className="font-mono text-lg tabular-nums">{fmt(t.remaining)}</div>
                  </div>
                  <div className="mt-2"><Progress value={pct} /></div>
                  <div className="mt-3 flex items-center gap-2">
                    {t.running ? (
                      <Button size="sm" variant="secondary" onClick={() => pause(t.id)}>
                        <Pause className="size-4" /> Pause
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => start(t.id)} disabled={t.done && t.remaining === 0}>
                        <Play className="size-4" /> {t.remaining < t.minutes * 60 && t.remaining > 0 ? "Resume" : "Start"}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => reset(t.id)} title="Reset timer">
                      <RotateCcw className="size-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground ml-1">{t.minutes} min round</span>
                    <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => remove(t.id)} aria-label="Delete task">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {tasks.some((t) => t.done) && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearDone}>Clear completed</Button>
        </div>
      )}
    </div>
  );
}
