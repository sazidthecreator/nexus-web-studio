import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, ExternalLink, Trash2, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ai-keys")({
  head: () => ({ meta: [{ title: "AI Keys — Sitely" }] }),
  component: AiKeysPage,
});

type ProviderRow = {
  provider: "groq" | "gemini" | "huggingface" | "cohere" | "mistral";
  connected: boolean;
  env_override: boolean;
  hint: string | null;
  updated_at: string | null;
  usage_today: number;
};

const PROVIDER_META: Record<ProviderRow["provider"], {
  name: string;
  free: string;
  dailyLimit: number;
  signupUrl: string;
  description: string;
}> = {
  groq: {
    name: "Groq",
    free: "14,400 req/day · 30 req/min",
    dailyLimit: 14400,
    signupUrl: "https://console.groq.com/keys",
    description: "Fastest free LLM. Powers AI copy, SEO, layout suggestions.",
  },
  gemini: {
    name: "Google Gemini",
    free: "1,500 req/day · 15 req/min",
    dailyLimit: 1500,
    signupUrl: "https://aistudio.google.com/app/apikey",
    description: "Multimodal: screenshot → analysis, vision tasks.",
  },
  huggingface: {
    name: "Hugging Face",
    free: "1,000 req/day",
    dailyLimit: 1000,
    signupUrl: "https://huggingface.co/settings/tokens",
    description: "Translation, summarization, image captioning (BLIP).",
  },
  cohere: {
    name: "Cohere",
    free: "100 req/min trial",
    dailyLimit: 1000,
    signupUrl: "https://dashboard.cohere.com/api-keys",
    description: "Semantic embeddings for template search.",
  },
  mistral: {
    name: "Mistral AI",
    free: "Limited free tier",
    dailyLimit: 500,
    signupUrl: "https://console.mistral.ai/api-keys/",
    description: "Backup LLM when Groq is rate-limited.",
  },
};

function AiKeysPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-keys", { method: "GET" });
      if (error) throw error;
      return (data as { providers: ProviderRow[] }).providers;
    },
  });

  const save = useMutation({
    mutationFn: async ({ provider, key }: { provider: string; key: string }) => {
      const { data, error } = await supabase.functions.invoke("ai-keys", {
        method: "POST",
        body: { provider, key },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-keys"] });
      toast.success("Key saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (provider: string) => {
      const { data, error } = await supabase.functions.invoke("ai-keys", {
        method: "DELETE",
        body: {},
        headers: {},
      } as any);
      // fall back to URL-based delete via fetch when invoke doesn't pass query params
      if (error || (data as any)?.error) {
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-keys?provider=${provider}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        if (!res.ok) throw new Error(await res.text());
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-keys"] });
      toast.success("Key removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-1">
        <Sparkles className="size-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">AI Configuration</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Connect free-tier API keys for multi-provider AI. Pollinations (image generation) needs no key.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {data?.map((row) => (
            <ProviderCard
              key={row.provider}
              row={row}
              onSave={(key) => save.mutate({ provider: row.provider, key })}
              onRemove={() => remove.mutate(row.provider)}
              saving={save.isPending}
            />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold flex items-center gap-2">
          <KeyRound className="size-4" /> Self-hosted mode
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Workspace admins can set <code className="text-xs bg-muted px-1 rounded">GROQ_API_KEY</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">GEMINI_API_KEY</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">HUGGINGFACE_API_KEY</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">COHERE_API_KEY</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">MISTRAL_API_KEY</code> as backend secrets.
          Env keys override per-user keys for the whole workspace.
        </p>
      </div>
    </div>
  );
}

function ProviderCard({
  row, onSave, onRemove, saving,
}: {
  row: ProviderRow;
  onSave: (key: string) => void;
  onRemove: () => void;
  saving: boolean;
}) {
  const meta = PROVIDER_META[row.provider];
  const [key, setKey] = useState("");
  const [editing, setEditing] = useState(false);
  const pct = Math.min(100, (row.usage_today / meta.dailyLimit) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`size-2.5 rounded-full ${row.connected ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
          <div>
            <h3 className="font-semibold">{meta.name}</h3>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {row.env_override && <Badge variant="secondary">env override</Badge>}
          {row.connected ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20">
              <CheckCircle2 className="size-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{meta.free}</span>
            <span className="tabular-nums">{row.usage_today.toLocaleString()} / {meta.dailyLimit.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%`, transition: "width var(--duration-base) var(--ease-smooth)" }}
            />
          </div>
        </div>

        {editing || (!row.connected && !row.env_override) ? (
          <div className="space-y-2">
            <Label className="text-xs">API key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste key…"
                autoComplete="off"
              />
              <Button
                size="sm"
                disabled={!key.trim() || saving}
                onClick={() => { onSave(key.trim()); setKey(""); setEditing(false); }}
              >
                Save
              </Button>
              {editing && (
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setKey(""); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {row.env_override ? "Using workspace env key" : `Key: ${row.hint ?? "saved"}`}
            </span>
            <div className="flex gap-1">
              {!row.env_override && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Update</Button>
                  <Button size="sm" variant="ghost" onClick={onRemove}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <a
            href={meta.signupUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
          >
            Get free key <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
