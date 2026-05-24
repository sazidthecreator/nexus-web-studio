import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, ImageIcon, Loader2, X, Sparkles, Wand2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ai } from "@/lib/ai-gateway";

type Asset = { id: string; url: string; path: string; name: string; type: string; size: number };

export function AssetPicker({
  value, onChange, alt, onAltChange,
}: {
  value?: string;
  onChange: (url: string) => void;
  alt?: string;
  onAltChange?: (alt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [genAlt, setGenAlt] = useState(false);

  async function generateAltFor(url: string) {
    if (!onAltChange) return;
    setGenAlt(true);
    try {
      const r = await ai.altText(`Image at: ${url}`);
      onAltChange(r.result.alt);
      toast.success("Alt text generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate alt text");
    } finally {
      setGenAlt(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group rounded-md overflow-hidden border border-border bg-muted">
          <img src={value} alt={alt || "Selected"} className="w-full h-24 object-cover" />
          <button
            onClick={() => onChange("")}
            className="absolute top-1 right-1 size-6 rounded bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
            title="Clear"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <ImageIcon className="size-3.5" />
            {value ? "Replace image" : "Choose image"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Asset library</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="library">
            <TabsList>
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="ai"><Sparkles className="size-3.5" /> Generate with AI</TabsTrigger>
            </TabsList>
            <TabsContent value="library" className="mt-4">
              <AssetLibrary
                onSelect={(url) => {
                  onChange(url);
                  setOpen(false);
                }}
              />
            </TabsContent>
            <TabsContent value="ai" className="mt-4">
              <AiImageGen
                onSelect={(url) => {
                  onChange(url);
                  setOpen(false);
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Input value={value || ""} placeholder="…or paste an image URL" onChange={(e) => onChange(e.target.value)} />
      {onAltChange && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Alt text</label>
            {value && (
              <button
                type="button"
                onClick={() => generateAltFor(value)}
                disabled={genAlt}
                className="text-xs text-primary inline-flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                {genAlt ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
                AI alt text
              </button>
            )}
          </div>
          <Input value={alt || ""} onChange={(e) => onAltChange(e.target.value)} placeholder="Describe the image" />
        </div>
      )}
    </div>
  );
}

function AiImageGen({ onSelect }: { onSelect: (url: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [generated, setGenerated] = useState<string[]>([]);

  const generate = useMutation({
    mutationFn: async () => {
      // Generate 3 variants with different seeds
      const seeds = [Math.floor(Math.random() * 1e9), Math.floor(Math.random() * 1e9), Math.floor(Math.random() * 1e9)];
      const urls = await Promise.all(
        seeds.map((seed) => ai.image(prompt, { width, height, seed }).then((r) => r.result.url)),
      );
      return urls;
    },
    onSuccess: (urls) => setGenerated(urls),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="A modern minimalist workspace with natural lighting, photographic, 4k…"
        rows={3}
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">W</label>
          <Input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-20" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">H</label>
          <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-20" />
        </div>
        <Button
          className="ml-auto"
          disabled={!prompt.trim() || generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate 3 variants
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Powered by Pollinations — free, no key required. Click a variant to use it.
      </p>
      {generate.isPending ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : generated.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {generated.map((url) => (
            <button
              key={url}
              onClick={() => onSelect(url)}
              className="relative rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
            >
              <img src={url} alt="Generated variant" className="w-full aspect-square object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type StagedAsset = {
  id: string;
  file: File;
  previewUrl: string;
  originalBytes: number;
  compressedBlob: Blob;
  compressedBytes: number;
  outType: string;
  outExt: string;
  width: number;
  height: number;
  alt: string;
  status: "preparing" | "ready" | "uploading" | "done" | "error";
  error?: string;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function AssetLibrary({ onSelect }: { onSelect: (url: string) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [staged, setStaged] = useState<StagedAsset[]>([]);
  const stagedRef = useRef<StagedAsset[]>([]);
  stagedRef.current = staged;

  // Revoke object URLs on unmount / clear.
  useEffect(() => {
    return () => {
      stagedRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
  }, []);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Asset[];
    },
    enabled: !!user,
  });

  const remove = useMutation({
    mutationFn: async (a: Asset) => {
      await supabase.storage.from("assets").remove([a.path]);
      const { error } = await supabase.from("assets").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function clearStaged() {
    staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setStaged([]);
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files || !user) return;
    const { compressImage } = await import("@/lib/image-tools/compress");
    const { suggestAltText } = await import("@/lib/image-tools/alt-text");

    const initial: StagedAsset[] = Array.from(files)
      .filter((f) => {
        if (f.size > 10 * 1024 * 1024) {
          toast.error(`${f.name}: max 10MB`);
          return false;
        }
        return true;
      })
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        originalBytes: file.size,
        compressedBlob: file,
        compressedBytes: file.size,
        outType: file.type || "application/octet-stream",
        outExt: (file.name.split(".").pop() || "bin").toLowerCase(),
        width: 0,
        height: 0,
        alt: "",
        status: "preparing" as const,
      }));
    if (initial.length === 0) return;
    setStaged((prev) => [...prev, ...initial]);

    // Process in parallel; update each row as it finishes.
    await Promise.all(
      initial.map(async (s) => {
        const file = s.file;
        let next: Partial<StagedAsset> = { status: "ready" };
        if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
          try {
            const out = await compressImage(file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.82,
              format: "image/webp",
            });
            const useCompressed = out.bytes < file.size;
            next = {
              status: "ready",
              compressedBlob: useCompressed ? out.blob : file,
              compressedBytes: useCompressed ? out.bytes : file.size,
              outType: useCompressed ? out.format : file.type,
              outExt: useCompressed ? "webp" : (file.name.split(".").pop() || "bin").toLowerCase(),
              width: out.width,
              height: out.height,
            };
            try {
              next.alt = await suggestAltText({ file, filename: file.name, width: out.width, height: out.height });
            } catch { /* best-effort */ }
          } catch (err) {
            next = { status: "ready", error: err instanceof Error ? err.message : "Compression failed" };
          }
        }
        setStaged((prev) => prev.map((p) => (p.id === s.id ? { ...p, ...next } : p)));
      }),
    );
  }

  function updateStaged(id: string, patch: Partial<StagedAsset>) {
    setStaged((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const t = prev.find((p) => p.id === id);
      if (t) URL.revokeObjectURL(t.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function uploadAllStaged() {
    if (!user || staged.length === 0) return;
    setUploading(true);
    try {
      for (const s of staged) {
        if (s.status === "done") continue;
        updateStaged(s.id, { status: "uploading", error: undefined });
        try {
          const path = `${user.id}/${crypto.randomUUID()}.${s.outExt}`;
          const { error: upErr } = await supabase.storage
            .from("assets")
            .upload(path, s.compressedBlob, { contentType: s.outType });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("assets").getPublicUrl(path);
          const { error: insErr } = await supabase.from("assets").insert({
            user_id: user.id,
            url: pub.publicUrl,
            path,
            name: s.file.name,
            type: s.outType,
            size: s.compressedBytes,
            ...(s.alt ? { alt: s.alt } : {}),
          } as any);
          if (insErr) throw insErr;
          updateStaged(s.id, { status: "done" });
        } catch (err) {
          updateStaged(s.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }
      qc.invalidateQueries({ queryKey: ["assets"] });
      const ok = stagedRef.current.filter((s) => s.status === "done").length;
      const failed = stagedRef.current.filter((s) => s.status === "error").length;
      if (ok > 0) toast.success(`Uploaded ${ok} ${ok === 1 ? "image" : "images"}`);
      if (failed === 0) clearStaged();
      else toast.error(`${failed} upload${failed === 1 ? "" : "s"} failed`);
    } finally {
      setUploading(false);
    }
  }

  const totalOriginal = staged.reduce((a, s) => a + s.originalBytes, 0);
  const totalCompressed = staged.reduce((a, s) => a + s.compressedBytes, 0);
  const totalSaved = Math.max(0, totalOriginal - totalCompressed);
  const allReady = staged.length > 0 && staged.every((s) => s.status === "ready" || s.status === "done");

  return (
    <div className="space-y-3">
      <label className="block">
        <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Upload className="size-4" /> Click to add images (compressed on-device, max 10MB each)
          </div>
        </div>
      </label>

      {staged.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">{staged.length}</span> ready to upload ·
              {" "}
              <span className="line-through">{formatBytes(totalOriginal)}</span>
              <ArrowRight className="inline size-3 mx-1" />
              <span className="font-medium text-foreground">{formatBytes(totalCompressed)}</span>
              {totalSaved > 0 && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                  (saved {formatBytes(totalSaved)} · {Math.round((totalSaved / totalOriginal) * 100)}%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearStaged} disabled={uploading}>Clear</Button>
              <Button size="sm" onClick={uploadAllStaged} disabled={uploading || !allReady}>
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                Upload {staged.length}
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {staged.map((s) => {
              const saved = s.originalBytes - s.compressedBytes;
              const pct = s.originalBytes > 0 ? Math.round((saved / s.originalBytes) * 100) : 0;
              return (
                <div key={s.id} className="flex gap-3 rounded-md border border-border bg-background p-2">
                  <img src={s.previewUrl} alt="" className="size-16 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium truncate flex-1" title={s.file.name}>{s.file.name}</div>
                      {s.status === "preparing" && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                      {s.status === "done" && <Check className="size-3 text-emerald-500" />}
                      <button
                        onClick={() => removeStaged(s.id)}
                        disabled={s.status === "uploading"}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                        title="Remove"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center flex-wrap gap-x-1">
                      <span className="line-through">{formatBytes(s.originalBytes)}</span>
                      <ArrowRight className="size-2.5" />
                      <span className="font-medium text-foreground">{formatBytes(s.compressedBytes)}</span>
                      {saved > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">−{pct}%</span>
                      )}
                      {s.width > 0 && <span>· {s.width}×{s.height}</span>}
                      {s.outExt === "webp" && s.compressedBytes < s.originalBytes && (
                        <span className="px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">webp</span>
                      )}
                    </div>
                    <Input
                      value={s.alt}
                      onChange={(ev) => updateStaged(s.id, { alt: ev.target.value })}
                      placeholder="Alt text (suggested on-device)"
                      className="h-7 text-xs"
                      disabled={s.status === "uploading" || s.status === "done"}
                    />
                    {s.error && <div className="text-[11px] text-destructive">{s.error}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No assets yet. Upload one above.</p>
      ) : (
        <div className="grid grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
          {assets.map((a) => (
            <div key={a.id} className="relative group rounded-md overflow-hidden border border-border">
              <button onClick={() => onSelect(a.url)} className="block w-full aspect-square">
                <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
              </button>
              <button
                onClick={() => remove.mutate(a)}
                className="absolute top-1 right-1 size-6 rounded bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
