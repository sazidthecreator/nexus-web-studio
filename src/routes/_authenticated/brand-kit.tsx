import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, Shuffle, Lock, Unlock, Download, Copy, Check, Palette as PaletteIcon, Type, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  generatePalette, auditPalette, paletteToCss, paletteToTailwind, paletteToScss,
  type Palette, type PaletteSet, type MoodKey, MOODS,
} from "@/lib/brand-kit/palette";
import { FONT_PAIRINGS, googleFontsImport, type FontPairing } from "@/lib/brand-kit/fonts";
import { generateLogoSvg, type LogoVariant, type LogoKind } from "@/lib/brand-kit/logo";
import { buildBrandKitZip, downloadBlob } from "@/lib/brand-kit/zip";

export const Route = createFileRoute("/_authenticated/brand-kit")({
  head: () => ({
    meta: [
      { title: "Brand Kit — Sitely" },
      { name: "description", content: "Generate a logo, color palette, and typography system for your brand in seconds." },
    ],
  }),
  component: BrandKitPage,
});

const MOOD_KEYS: MoodKey[] = Object.keys(MOODS) as MoodKey[];
const VARIANTS: LogoVariant[] = ["minimal", "bold", "gradient"];
const KINDS: { id: LogoKind; label: string }[] = [
  { id: "lettermark", label: "Lettermark" },
  { id: "abstract", label: "Abstract" },
  { id: "wordmark", label: "Wordmark" },
  { id: "combination", label: "Combination" },
];

function BrandKitPage() {
  const [brand, setBrand] = useState("Northwind");
  const [industry, setIndustry] = useState("technology");
  const [style, setStyle] = useState("clean modern");
  const [moods, setMoods] = useState<MoodKey[]>(["calm", "minimal"]);
  const [variation, setVariation] = useState(0);
  const [locked, setLocked] = useState<Partial<Record<keyof Palette, string>>>({});
  const [pairingId, setPairingId] = useState<string>(FONT_PAIRINGS[1].id);
  const [logoVariant, setLogoVariant] = useState<LogoVariant>("bold");
  const [logoKind, setLogoKind] = useState<LogoKind>("combination");
  const [exporting, setExporting] = useState(false);

  const pairing = FONT_PAIRINGS.find((p) => p.id === pairingId)!;

  useEffect(() => {
    const id = `bk-fonts-${pairing.id}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    const enc = (s: string) => s.replace(/ /g, "+");
    link.href = `https://fonts.googleapis.com/css2?family=${enc(pairing.display.family)}:wght@${pairing.display.weights}&family=${enc(pairing.body.family)}:wght@${pairing.body.weights}&display=swap`;
    document.head.appendChild(link);
  }, [pairing]);

  const generated = useMemo(() => generatePalette(brand || "Brand", moods, variation), [brand, moods, variation]);
  const paletteSet: PaletteSet = useMemo(() => ({
    light: { ...generated.light, ...locked },
    dark: generated.dark,
  }), [generated, locked]);

  const audit = useMemo(() => auditPalette(paletteSet.light), [paletteSet]);

  const logos = useMemo(() => {
    const baseFont = `"${pairing.display.family}", system-ui, sans-serif`;
    return VARIANTS.map((v) =>
      generateLogoSvg({ brand, industry, style, palette: paletteSet.light, variant: v, kind: logoKind, font: baseFont }, 256)
    );
  }, [brand, industry, style, paletteSet, logoKind, pairing]);

  const heroLogo = useMemo(() => {
    const baseFont = `"${pairing.display.family}", system-ui, sans-serif`;
    return generateLogoSvg({ brand, industry, style, palette: paletteSet.light, variant: logoVariant, kind: "combination", font: baseFont }, 256);
  }, [brand, industry, style, paletteSet, logoVariant, pairing]);

  function toggleMood(m: MoodKey) {
    setMoods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
    setVariation(0);
  }
  function toggleLock(key: keyof Palette) {
    setLocked((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = paletteSet.light[key];
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await buildBrandKitZip({
        brand: brand || "Brand", industry, style,
        variant: logoVariant, paletteSet, font: pairing,
      });
      downloadBlob(blob, `${(brand || "brand").toLowerCase().replace(/\s+/g, "-")}-brand-kit.zip`);
      toast.success("Brand kit downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveAsDefault() {
    const { saveBrandKit } = await import("@/lib/brand-kit/saved");
    saveBrandKit({
      brandName: brand || "Brand",
      primaryColor: paletteSet.light.primary,
      fontFamily: `"${pairing.body.family}", system-ui, sans-serif`,
      logoSvg: heroLogo,
    });
    toast.success("Saved — will auto-apply to new templates");
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Kit</h1>
          <p className="text-sm text-muted-foreground mt-1">Logo, palette, and typography — generated, refined, and exported.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSaveAsDefault} size="lg">
            <Check className="size-4" /> Save as default
          </Button>
          <Button onClick={handleExport} disabled={exporting} size="lg">
            <Download className="size-4" /> {exporting ? "Packaging…" : "Download (.zip)"}
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <aside className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand name</Label>
            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Northwind" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="technology" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="style">Style keywords (1–3)</Label>
            <Input id="style" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="clean modern" />
          </div>

          <div className="space-y-2">
            <Label>Mood</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_KEYS.map((m) => {
                const on = moods.includes(m);
                return (
                  <button key={m} onClick={() => toggleMood(m)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo type</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {KINDS.map((k) => (
                <button key={k.id} onClick={() => setLogoKind(k.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs border transition-colors ${logoKind === k.id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Variant</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {VARIANTS.map((v) => (
                <button key={v} onClick={() => setLogoVariant(v)}
                  className={`px-2.5 py-1.5 rounded-md text-xs border capitalize transition-colors ${logoVariant === v ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => setVariation((n) => n + 1)}>
            <Shuffle className="size-4" /> Shuffle palette
          </Button>
        </aside>

        <section className="space-y-6">
          <Tabs defaultValue="logo">
            <TabsList>
              <TabsTrigger value="logo"><Hexagon className="size-3.5" /> Logo</TabsTrigger>
              <TabsTrigger value="palette"><PaletteIcon className="size-3.5" /> Palette</TabsTrigger>
              <TabsTrigger value="type"><Type className="size-3.5" /> Typography</TabsTrigger>
              <TabsTrigger value="export"><Download className="size-3.5" /> Export</TabsTrigger>
            </TabsList>

            <TabsContent value="logo" className="space-y-4 mt-4">
              <div className="rounded-xl border border-border p-8 grid place-items-center"
                style={{ background: paletteSet.light.surface }}>
                <div className="w-full max-w-xl" dangerouslySetInnerHTML={{ __html: heroLogo }} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {logos.map((svg, i) => (
                  <button key={i} onClick={() => setLogoVariant(VARIANTS[i])}
                    className={`rounded-xl border p-6 text-left transition-all ${logoVariant === VARIANTS[i] ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                    style={{ background: paletteSet.light.surface }}>
                    <div className="aspect-square grid place-items-center" dangerouslySetInnerHTML={{ __html: svg }} />
                    <div className="mt-3 text-xs uppercase tracking-wider font-semibold capitalize">{VARIANTS[i]}</div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="palette" className="space-y-4 mt-4">
              <PalettePreview palette={paletteSet.light} locked={locked} onToggleLock={toggleLock} mode="Light" />
              <PalettePreview palette={paletteSet.dark} mode="Dark" />
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="text-sm font-semibold">WCAG AA Contrast</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {audit.map((a) => (
                    <div key={a.pair} className="flex items-center justify-between text-xs px-3 py-2 rounded-md border border-border">
                      <span className="text-muted-foreground">{a.pair}</span>
                      <Badge variant={a.pass ? "default" : "destructive"}>{a.ratio.toFixed(2)} {a.pass ? "✓" : "fail"}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <SiteMockup palette={paletteSet.light} font={pairing} brand={brand} logoSvg={heroLogo} />
            </TabsContent>

            <TabsContent value="type" className="space-y-4 mt-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Pairings</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[260px] overflow-auto pr-1">
                  {FONT_PAIRINGS.map((p) => (
                    <button key={p.id} onClick={() => setPairingId(p.id)}
                      className={`text-left rounded-lg border p-3 transition-all ${pairingId === p.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.vibe}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-8 space-y-6"
                style={{ background: paletteSet.light.background, color: paletteSet.light.foreground }}>
                <div style={{ fontFamily: `"${pairing.display.family}", system-ui`, fontWeight: 700, fontSize: "clamp(2.5rem, 6vw, 4rem)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {brand}
                </div>
                <div style={{ fontFamily: `"${pairing.display.family}", system-ui`, fontWeight: 600, fontSize: "1.75rem", lineHeight: 1.15 }}>
                  Building things worth making.
                </div>
                <p style={{ fontFamily: `"${pairing.body.family}", system-ui`, fontSize: "1rem", lineHeight: 1.65, maxWidth: "60ch", color: paletteSet.light.mutedForeground }}>
                  Body copy in {pairing.body.family}. Pairings have been chosen for hierarchy and harmony, not decoration alone. Display sets the tone; body carries the meaning.
                </p>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: paletteSet.light.mutedForeground }}>
                  {pairing.rule}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-4 mt-4">
              <CopyBlock label="CSS variables" content={`${paletteToCss(paletteSet.light, ":root")}\n${paletteToCss(paletteSet.dark, ":root.dark")}`} />
              <CopyBlock label="Tailwind config" content={paletteToTailwind(paletteSet)} />
              <CopyBlock label="SCSS variables" content={paletteToScss(paletteSet)} />
              <CopyBlock label="HEX array" content={JSON.stringify([paletteSet.light.primary, paletteSet.light.secondary, paletteSet.light.accent, paletteSet.light.background, paletteSet.light.surface], null, 2)} />
              <CopyBlock label="Google Fonts @import" content={googleFontsImport(pairing)} />
              <Button onClick={handleExport} disabled={exporting} className="w-full" size="lg">
                <Download className="size-4" /> {exporting ? "Packaging…" : "Download full brand kit (.zip)"}
              </Button>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}

function PalettePreview({ palette, mode, locked, onToggleLock }: {
  palette: Palette; mode: string;
  locked?: Partial<Record<keyof Palette, string>>;
  onToggleLock?: (k: keyof Palette) => void;
}) {
  const tokens: (keyof Palette)[] = ["primary", "secondary", "accent", "background", "surface", "foreground"];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{mode} mode</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tokens.map((k) => {
          const isLocked = locked && !!locked[k];
          const fg = ["background", "surface"].includes(k) ? palette.foreground : palette.background;
          return (
            <div key={k} className="rounded-lg overflow-hidden border border-border">
              <div className="aspect-[16/10] flex items-end justify-between p-3 text-xs font-semibold"
                style={{ background: palette[k], color: fg }}>
                <span className="capitalize">{k}</span>
                {onToggleLock && (
                  <button onClick={() => onToggleLock(k)} title={isLocked ? "Unlock" : "Lock"}
                    className="rounded p-1 hover:bg-black/10">
                    {isLocked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5 opacity-60" />}
                  </button>
                )}
              </div>
              <div className="px-3 py-2 text-[11px] font-mono text-muted-foreground">{palette[k]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SiteMockup({ palette, font, brand, logoSvg }: { palette: Palette; font: FontPairing; brand: string; logoSvg: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <div style={{ background: palette.background, color: palette.foreground, fontFamily: `"${font.body.family}", system-ui` }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${palette.surface}` }}>
          <div className="h-8 w-32" dangerouslySetInnerHTML={{ __html: logoSvg }} />
          <div className="flex gap-4 text-sm">
            {["Product", "Pricing", "About"].map((x) => <span key={x} style={{ color: palette.mutedForeground }}>{x}</span>)}
            <span className="px-3 py-1 rounded-md text-sm font-semibold" style={{ background: palette.primary, color: palette.background }}>Sign up</span>
          </div>
        </div>
        <div className="px-10 py-14">
          <h2 style={{ fontFamily: `"${font.display.family}", system-ui`, fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: 0 }}>
            {brand} — built with care.
          </h2>
          <p style={{ marginTop: 16, color: palette.mutedForeground, maxWidth: "55ch", lineHeight: 1.6 }}>
            Every brand starts with intention. This mockup uses your palette and typography exactly as it would render on a live site.
          </p>
          <div className="mt-6 flex gap-3">
            <span className="px-4 py-2 rounded-md text-sm font-semibold" style={{ background: palette.primary, color: palette.background }}>Get started</span>
            <span className="px-4 py-2 rounded-md text-sm font-semibold border" style={{ borderColor: palette.foreground, color: palette.foreground }}>Learn more</span>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[palette.primary, palette.secondary, palette.accent].map((c, i) => (
              <div key={i} className="rounded-lg p-4" style={{ background: palette.surface }}>
                <div className="size-8 rounded" style={{ background: c }} />
                <div style={{ marginTop: 8, fontWeight: 600, fontSize: 14 }}>Feature {i + 1}</div>
                <div style={{ color: palette.mutedForeground, fontSize: 13, marginTop: 2 }}>Short supporting copy.</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Button size="sm" variant="ghost" onClick={async () => {
          await navigator.clipboard.writeText(content);
          setCopied(true); setTimeout(() => setCopied(false), 1500);
          toast.success(`${label} copied`);
        }}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Copy
        </Button>
      </div>
      <pre className="text-xs p-4 overflow-auto max-h-64 font-mono leading-relaxed bg-muted/30">{content}</pre>
    </div>
  );
}
