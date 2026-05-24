// Small status chip showing the last AI provider + latency, with one-click
// link to /ai-keys when a call fails because of a missing key.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, AlertTriangle, KeyRound } from "lucide-react";
import { getLastAiTelemetry, onAiTelemetry } from "@/lib/ai-gateway";

export function AiProviderChip() {
  const [t, setT] = useState(getLastAiTelemetry());
  useEffect(() => { const off = onAiTelemetry(setT); return () => { off(); }; }, []);
  if (!t) {
    return (
      <p className="text-[10px] text-muted-foreground">
        Tip: add a free API key in <Link to="/ai-keys" className="underline hover:text-foreground">AI Keys</Link> for the best results.
      </p>
    );
  }
  const ok = t.ok;
  const isKeyError = !ok && /no_key|api key|unauthorized|401/i.test(t.error || "");
  return (
    <div className={`flex items-center gap-2 text-[11px] rounded-md border px-2 py-1.5 ${ok ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"}`}>
      {ok ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertTriangle className="size-3.5 shrink-0" />}
      <span className="font-medium capitalize">{t.provider}</span>
      <span className="opacity-70">· {t.latency_ms}ms</span>
      {!ok && (
        <Link to="/ai-keys" className="ml-auto inline-flex items-center gap-1 underline">
          <KeyRound className="size-3" /> {isKeyError ? "Add key" : "Manage"}
        </Link>
      )}
    </div>
  );
}
