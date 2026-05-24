import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles, MousePointerClick, LayoutTemplate,
  ArrowRight, Wand2, Globe, Shield, Palette, Code2, Check, Star, Layers, Rocket, Eye,
  Menu, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { TEMPLATES, TEMPLATE_CATEGORIES, type Template } from "@/lib/templates";
import { IMPORT_SOURCES } from "@/lib/template-importer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sitely — The top 1% AI website builder" },
      { name: "description", content: "Build production-grade websites with AI prompts, drag-and-drop editing, and gorgeous templates. Export clean HTML/CSS in one click." },
      { property: "og:title", content: "Sitely — The top 1% AI website builder" },
      { property: "og:description", content: "Generate, refine and ship stunning websites in minutes." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Sparkles, title: "AI prompt builder", desc: "Describe your idea — get a full draft with copy, layout and brand in seconds.", bullets: ["Tone & audience aware", "Section-by-section control"] },
  { icon: MousePointerClick, title: "Visual canvas", desc: "Drag, drop and refine every block with pixel-precise controls.", bullets: ["Snap & smart guides", "Keyboard-first workflow"] },
  { icon: LayoutTemplate, title: "Premium templates", desc: "Production-quality designs spanning SaaS, agencies, portfolios, ecom.", bullets: ["50+ ready to ship", "Import from the web"] },
  { icon: Wand2, title: "Brand Kit", desc: "Logos, palettes, typography — auto-applied across every page.", bullets: ["AI palette generator", "Font pairing presets"] },
  { icon: Globe, title: "1-click publish", desc: "Custom domains, SSL, sitemaps, robots.txt and OG tags handled.", bullets: ["Free SSL & CDN", "Edge-cached globally"] },
  { icon: Shield, title: "Auth & forms", desc: "Built-in auth, secure submissions, and spam-resistant capture.", bullets: ["Email + OAuth", "Honeypot + rate-limit"] },
  { icon: Palette, title: "Dark / light theming", desc: "Semantic tokens with cohesive contrast in every mode.", bullets: ["WCAG AA contrast", "One-click theme swap"] },
  { icon: Code2, title: "Clean export", desc: "Production HTML/CSS bundle. Host anywhere — no vendor lock-in.", bullets: ["Zero runtime deps", "Lighthouse 95+"] },
];

const steps = [
  { n: "01", icon: Wand2, title: "Prompt", desc: "Describe your site in plain English — tone, audience, the sections you need.", time: "~10 sec", output: "Full draft generated" },
  { n: "02", icon: Layers, title: "Refine", desc: "Tweak blocks on the visual canvas, rewrite copy with AI, swap palette in one click.", time: "~5 min", output: "Pixel-perfect layout" },
  { n: "03", icon: Rocket, title: "Ship", desc: "Publish to a custom domain with SSL, OG tags and sitemaps — or export clean HTML.", time: "~30 sec", output: "Live on the internet" },
];

const stats = [
  { k: "12k+", v: "Sites generated" },
  { k: "99.99%", v: "Uptime" },
  { k: "2.3s", v: "Avg first paint" },
  { k: "4.9/5", v: "Builder rating" },
];

const tiers = [
  { name: "Starter", monthly: 0, yearly: 0, tag: "Forever free", best: "For exploring",
    features: ["1 project", "Sitely subdomain", "AI drafts (50/mo)", "Export HTML"], cta: "Start free" },
  { name: "Pro", monthly: 19, yearly: 15, tag: "Most popular", best: "For founders & freelancers",
    features: ["Unlimited projects", "Custom domain + SSL", "Brand Kit + AI rewrite", "Priority generation", "Advanced SEO + analytics"], cta: "Go pro", featured: true },
  { name: "Studio", monthly: 49, yearly: 39, tag: "For teams", best: "For agencies & teams",
    features: ["Everything in Pro", "Team workspace + roles", "Comments & versioning", "White-label export", "Dedicated support"], cta: "Contact us" },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("reveal"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ref = useReveal();
  const [mx, setMx] = useState({ x: 0, y: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [tplCategory, setTplCategory] = useState<string>("All");
  const [usingId, setUsingId] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [demoStep, setDemoStep] = useState(0);

  // Cycle the animated hero demo through 4 stages
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setDemoStep((s) => (s + 1) % 4), 2800);
    return () => clearInterval(id);
  }, []);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#workflow", label: "Workflow" },
    { href: "#templates", label: "Templates" },
    { href: "#pricing", label: "Pricing" },
  ];

  const scrollTo = (hash: string) => {
    setMenuOpen(false);
    const el = document.querySelector(hash) as HTMLElement | null;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const featuredTemplates = useMemo(() => {
    const list = tplCategory === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === tplCategory);
    return list.slice(0, 8);
  }, [tplCategory]);

  const useTemplate = async (tpl: Template) => {
    if (!user) {
      // Persist intent so signup can resume
      try { sessionStorage.setItem("pendingTemplateId", tpl.id); } catch { /* noop */ }
      navigate({ to: "/signup" });
      return;
    }
    setUsingId(tpl.id);
    try {
      const content = tpl.buildContent();
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: tpl.name,
          description: tpl.description,
          template_id: tpl.id,
          content: content as any,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Project created");
      navigate({ to: "/editor/$projectId", params: { projectId: data.id as string } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create project");
    } finally {
      setUsingId(null);
    }
  };

  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="container mx-auto px-4 mt-4">
          <div className="glass-card-strong rounded-2xl flex h-14 items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <span className="relative inline-flex items-center justify-center size-8 rounded-xl overflow-hidden">
                <span className="absolute inset-0 conic-ring opacity-90" />
                <span className="absolute inset-[2px] rounded-[10px] bg-background flex items-center justify-center">
                  <Sparkles className="size-4 text-primary" />
                </span>
              </span>
              <span className="tracking-tight">Sitely</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/40">{l.label}</a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              {user ? (
                <Button asChild size="sm" className="shine hidden sm:inline-flex">
                  <Link to="/dashboard">Dashboard <ArrowRight className="size-3.5" /></Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button>
                  <Button asChild size="sm" className="shine hidden sm:inline-flex"><Link to="/signup">Get started</Link></Button>
                </>
              )}
              <button
                type="button"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden inline-flex items-center justify-center size-9 rounded-xl glass-card hover:bg-accent/40 transition-colors"
              >
                {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          <div
            id="mobile-nav"
            className={`md:hidden overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${menuOpen ? "max-h-[480px] opacity-100 translate-y-0 mt-2" : "max-h-0 opacity-0 -translate-y-1"}`}
          >
            <div className="glass-card-strong rounded-2xl p-3 space-y-1">
              {navLinks.map((l) => (
                <button
                  key={l.href}
                  onClick={() => scrollTo(l.href)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-accent/40 transition-colors flex items-center justify-between"
                >
                  <span>{l.label}</span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </button>
              ))}
              <div className="pt-2 mt-2 border-t border-border/40 grid grid-cols-2 gap-2">
                {user ? (
                  <Button asChild size="sm" className="col-span-2 shine">
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
                    </Button>
                    <Button asChild size="sm" className="shine">
                      <Link to="/signup" onClick={() => setMenuOpen(false)}>Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative"
        onMouseMove={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setMx({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
        }}
      >
        <div className="aurora" />
        <div className="absolute inset-0 -z-10 bg-grid" />
        <div className="container mx-auto px-4 pt-20 md:pt-28 pb-16 text-center">
          <div data-reveal className="reveal inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5 text-xs md:text-sm">
            <span className="relative inline-flex size-1.5 rounded-full bg-primary">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
            </span>
            <span className="text-muted-foreground">New</span>
            <span className="text-foreground/90">AI Brand Kit · auto-themed pages</span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
          </div>

          <h1 data-reveal className="reveal reveal-delay-1 mt-6 text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight max-w-5xl mx-auto leading-[1.02]">
            Ship websites that feel
            <span className="block text-gradient-hero">impossibly polished.</span>
          </h1>
          <p data-reveal className="reveal reveal-delay-2 mt-6 text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Sitely combines AI generation, a real-time visual canvas, and a clean code export — so you go from idea to a live, top‑1% site in minutes.
          </p>
          <div data-reveal className="reveal reveal-delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="shine h-12 px-7 text-base shadow-[var(--shadow-elegant)]">
              <Link to={user ? "/dashboard" : "/signup"}>Start building free <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base glass-card border-0">
              <Link to="/templates"><Eye className="size-4" /> Explore templates</Link>
            </Button>
          </div>

          {/* Hero glass preview */}
          <div data-reveal className="reveal reveal-delay-4 relative mt-16 mx-auto max-w-5xl">
            <div
              className="absolute -inset-8 -z-10 rounded-[2rem] opacity-60 blur-3xl"
              style={{
                background: `radial-gradient(600px circle at ${mx.x * 100}% ${mx.y * 100}%, var(--primary-glow), transparent 60%)`,
              }}
            />
            <div className="glass-card-strong rounded-3xl p-2 md:p-3 shadow-[var(--shadow-elegant)]">
              <div className="rounded-2xl bg-background/60 border border-border/60 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-4 h-9 border-b border-border/60 bg-card/50">
                  <span className="size-2.5 rounded-full bg-red-400/70" />
                  <span className="size-2.5 rounded-full bg-yellow-400/70" />
                  <span className="size-2.5 rounded-full bg-green-400/70" />
                  <div className="ml-4 flex-1 max-w-md mx-auto">
                    <div className="h-5 rounded-md bg-muted/60 text-[10px] flex items-center justify-center text-muted-foreground gap-1">
                      <Globe className="size-3" /> sitely.app/preview
                    </div>
                  </div>
                </div>
                {/* Animated demo: prompt → generate → refine → publish */}
                <div className="grid grid-cols-12 gap-3 p-4 md:p-6">
                  <div className="col-span-3 hidden md:block space-y-2">
                    {[
                      { I: Wand2, label: "Prompt", step: 0 },
                      { I: Sparkles, label: "Generate", step: 1 },
                      { I: Layers, label: "Refine", step: 2 },
                      { I: Rocket, label: "Publish", step: 3 },
                      { I: Code2, label: "Export" },
                    ].map(({ I, label, step }, i) => {
                      const active = step === demoStep;
                      return (
                        <div
                          key={i}
                          className={`rounded-lg h-9 flex items-center px-3 text-xs gap-2 transition-all duration-500 ${active ? "bg-primary/15 text-foreground border border-primary/40 shadow-[var(--shadow-glow)]" : "glass-card text-muted-foreground"}`}
                        >
                          <I className={`size-3.5 ${active ? "text-primary" : ""}`} /> <span className="truncate">{label}</span>
                          {active && <span className="ml-auto size-1.5 rounded-full bg-primary animate-pulse" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="col-span-12 md:col-span-9 space-y-3 min-h-[260px]">
                    {/* Stage 0 — Prompt */}
                    {demoStep === 0 && (
                      <div className="glass-card rounded-xl p-5 text-left animate-fade-in">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                          <Wand2 className="size-3 text-primary" /> AI prompt
                        </div>
                        <div className="mt-3 font-mono text-sm md:text-base leading-relaxed">
                          <span>"Build a landing page for </span>
                          <span className="text-gradient font-semibold">Lumen</span>
                          <span>, a calm meditation app — minimal, warm palette, with pricing."</span>
                          <span className="inline-block w-2 h-4 align-middle bg-primary ml-1 animate-pulse" />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {["Wellness", "Minimal", "Warm tones", "3 sections"].map((t) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Stage 1 — Generating */}
                    {demoStep === 1 && (
                      <div className="glass-card rounded-xl p-5 text-left animate-fade-in">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                          <span className="flex items-center gap-2"><Sparkles className="size-3 text-primary" /> Generating</span>
                          <span>78%</span>
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: "78%", background: "var(--gradient-primary)" }} />
                        </div>
                        <ul className="mt-4 space-y-2 text-xs">
                          {[
                            { l: "Brand palette", d: true },
                            { l: "Hero & headline", d: true },
                            { l: "Features grid", d: true },
                            { l: "Pricing tiers", d: false },
                          ].map((r) => (
                            <li key={r.l} className="flex items-center gap-2">
                              {r.d ? <Check className="size-3.5 text-green-500" /> : <Loader2 className="size-3.5 animate-spin text-primary" />}
                              <span className={r.d ? "text-foreground" : "text-muted-foreground"}>{r.l}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Stage 2 — Refine on canvas */}
                    {demoStep === 2 && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="glass-card rounded-xl p-5 text-left relative">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Hero · selected</div>
                          <div className="mt-1 text-2xl md:text-3xl font-bold text-gradient">Find your stillness.</div>
                          <div className="mt-1 text-xs md:text-sm text-muted-foreground">A 5-minute reset for busy minds.</div>
                          <div className="mt-3 flex gap-2">
                            <span className="h-7 px-3 rounded-md text-[11px] inline-flex items-center bg-primary text-primary-foreground">Try free</span>
                            <span className="h-7 px-3 rounded-md text-[11px] inline-flex items-center border border-border">Watch demo</span>
                          </div>
                          <div className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-xl border-2 border-primary/60 pointer-events-none" />
                          <div className="absolute -top-2 left-3 px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-primary text-primary-foreground rounded">Hero block</div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {["Calm", "Focus", "Sleep"].map((label, i) => (
                            <div key={label} className="glass-card rounded-xl p-3 text-left">
                              <div className="size-7 rounded-md mb-2" style={{ background: "var(--gradient-primary)", opacity: 0.6 + i * 0.15 }} />
                              <div className="text-xs font-semibold">{label}</div>
                              <div className="h-1.5 w-2/3 rounded bg-muted mt-1.5" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Stage 3 — Published */}
                    {demoStep === 3 && (
                      <div className="glass-card rounded-xl p-6 text-left animate-fade-in">
                        <div className="flex items-center gap-2">
                          <span className="size-9 rounded-full bg-green-500/15 flex items-center justify-center">
                            <Check className="size-5 text-green-500" />
                          </span>
                          <div>
                            <div className="text-sm font-semibold">Published in 4.2s</div>
                            <div className="text-xs text-muted-foreground">Live at lumen.sitely.app</div>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          {[
                            { k: "98", v: "Performance" },
                            { k: "100", v: "SEO" },
                            { k: "100", v: "Best practices" },
                          ].map((s) => (
                            <div key={s.v} className="rounded-lg border border-border/60 p-2">
                              <div className="text-lg font-bold text-gradient">{s.k}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Progress dots */}
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      {[0, 1, 2, 3].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDemoStep(i)}
                          aria-label={`Demo step ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all ${demoStep === i ? "w-6 bg-primary" : "w-1.5 bg-muted hover:bg-muted-foreground/40"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating chips */}
            <div className="hidden md:flex absolute -left-6 top-24 glass-card rounded-xl px-3 py-2 text-xs items-center gap-2 float-slow">
              <Wand2 className="size-3.5 text-primary" /> AI rewrote 3 sections
            </div>
            <div className="hidden md:flex absolute -right-6 bottom-24 glass-card rounded-xl px-3 py-2 text-xs items-center gap-2 float-slow" style={{ animationDelay: "1.5s" }}>
              <Check className="size-3.5 text-green-500" /> Published in 4.2s
            </div>
          </div>

          {/* Stats */}
          <div data-reveal className="reveal mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {stats.map((s) => (
              <div key={s.v} className="glass-card rounded-2xl p-5">
                <div className="text-2xl md:text-3xl font-bold text-gradient">{s.k}</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos / trust */}
      <section className="container mx-auto px-4 py-10">
        <div className="glass-card rounded-2xl py-5 overflow-hidden">
          <div className="flex gap-12 marquee-track whitespace-nowrap text-muted-foreground/70 text-sm font-medium px-6" style={{ width: "200%" }}>
            {[..."Acme · Northwind · Lumen · Atlas · Vertex · Helio · Quanta · Cobalt · Mosaic · Drift".split(" · "),
              ..."Acme · Northwind · Lumen · Atlas · Vertex · Helio · Quanta · Cobalt · Mosaic · Drift".split(" · ")].map((n, i) => (
              <span key={i} className="inline-flex items-center gap-2 tracking-widest uppercase">
                <Star className="size-3.5" /> {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div data-reveal className="text-center mb-14 max-w-2xl mx-auto">
          <div className="inline-flex glass-card rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">Features</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">A complete builder, <span className="text-gradient">crafted to ship</span></h2>
          <p className="mt-4 text-muted-foreground">Every primitive you need — and nothing you don't. Designed for speed, polish and longevity.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={f.title} data-reveal className={`reveal-delay-${(i % 4) + 1} glass-card tilt rounded-2xl p-6 group flex flex-col`}>
              <div className="size-11 rounded-xl flex items-center justify-center mb-4 shine relative overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
                <f.icon className="size-5 text-primary-foreground relative z-10" />
              </div>
              <h3 className="font-semibold tracking-tight">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
              <ul className="mt-4 pt-4 border-t border-border/40 space-y-1.5 text-xs text-muted-foreground">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-1.5">
                    <Check className="size-3 text-primary shrink-0" /> <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="relative py-24">
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
        <div className="container mx-auto px-4">
          <div data-reveal className="text-center mb-14 max-w-2xl mx-auto">
            <div className="inline-flex glass-card rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">Workflow</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">From prompt to <span className="text-gradient">production</span> — in three moves</h2>
            <p className="mt-4 text-muted-foreground">No agencies, no template farms, no boilerplate. The whole loop, end-to-end, in one place.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 relative">
            {steps.map((s, i) => (
              <div key={s.n} data-reveal className={`reveal-delay-${i + 1} glass-card-strong rounded-2xl p-6 relative flex flex-col`}>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-mono tracking-widest text-muted-foreground">{s.n}</span>
                  <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
                    <s.icon className="size-5 text-primary-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">{s.time}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-2 text-xs">
                  <Check className="size-3.5 text-green-500 shrink-0" />
                  <span className="text-foreground/90">{s.output}</span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 size-5 text-primary/60" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates gallery */}
      <section id="templates" className="container mx-auto px-4 py-24">
        <div data-reveal className="text-center mb-10 max-w-2xl mx-auto">
          <div className="inline-flex glass-card rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">Templates</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Start from a <span className="text-gradient">stunning template</span></h2>
          <p className="mt-4 text-muted-foreground">Production-ready designs across every category. One click and you're editing.</p>
        </div>

        {/* Category filters */}
        <div data-reveal className="reveal mb-8 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {TEMPLATE_CATEGORIES.map((c) => {
              const active = tplCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => setTplCategory(c)}
                  className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${active ? "text-primary-foreground shadow-[var(--shadow-glow)]" : "glass-card text-muted-foreground hover:text-foreground"}`}
                  style={active ? { background: "var(--gradient-primary)" } : undefined}
                  aria-pressed={active}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        {featuredTemplates.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Sparkles className="size-7 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No templates in {tplCategory}</h3>
            <p className="text-sm text-muted-foreground mt-1">Try another category, or browse the full library.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/templates">Browse all</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredTemplates.map((t, i) => (
              <article
                key={t.id}
                data-reveal
                className={`reveal-delay-${(i % 4) + 1} group glass-card rounded-2xl overflow-hidden hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition-all`}
              >
                <div className="aspect-[4/3] relative overflow-hidden" style={{ background: t.thumbnailGradient }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white/95 font-bold text-2xl drop-shadow tracking-tight" style={{ fontFamily: t.branding.fontFamily }}>
                      {t.branding.siteName}
                    </div>
                  </div>
                  {/* mock browser chrome overlay */}
                  <div className="absolute top-0 inset-x-0 h-7 bg-black/25 backdrop-blur-sm flex items-center gap-1.5 px-3">
                    <span className="size-1.5 rounded-full bg-white/60" />
                    <span className="size-1.5 rounded-full bg-white/60" />
                    <span className="size-1.5 rounded-full bg-white/60" />
                  </div>
                  <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide bg-black/45 text-white px-2 py-0.5 rounded">{t.category}</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold tracking-tight truncate">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  <Button
                    size="sm"
                    className="mt-3 w-full shine"
                    disabled={usingId === t.id}
                    onClick={() => useTemplate(t)}
                  >
                    {usingId === t.id ? <><Loader2 className="size-3.5 animate-spin" /> Creating…</> : <>Use this template <ArrowRight className="size-3.5" /></>}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline" className="glass-card border-0">
            <Link to="/templates">Browse all {TEMPLATES.length}+ templates <ArrowRight className="size-4" /></Link>
          </Button>
        </div>

        {/* Import from the web — trusted open sources */}
        <div data-reveal className="reveal mt-16 glass-card-strong rounded-3xl p-6 md:p-10">
          <div className="grid md:grid-cols-[1.1fr_2fr] gap-8 items-start">
            <div>
              <div className="inline-flex glass-card rounded-full px-3 py-1 text-xs text-muted-foreground mb-3">
                <Globe className="size-3 mr-1.5" /> Import from the web
              </div>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Bring any open-source template in <span className="text-gradient">one paste</span></h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Sitely fetches the page server-side, parses sections (nav, hero, features, CTA, footer) and converts them into editable blocks — keeping the structure clean and the license intact.
              </p>
              <Button asChild className="mt-5 shine">
                <Link to="/templates">Open import wizard <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {IMPORT_SOURCES.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group glass-card rounded-xl px-3.5 py-3 flex items-start gap-3 hover:border-primary/40 transition-all"
                >
                  <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
                    <LayoutTemplate className="size-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{s.name}</span>
                      {s.license && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 shrink-0">{s.license}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.note}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-24">
        <div data-reveal className="text-center mb-10 max-w-2xl mx-auto">
          <div className="inline-flex glass-card rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">Pricing</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Fair pricing, <span className="text-gradient">unfair quality</span></h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when you outgrow it. Cancel any time — no contracts.</p>
        </div>

        {/* Billing toggle */}
        <div data-reveal className="reveal flex justify-center mb-10">
          <div className="glass-card-strong rounded-full p-1 inline-flex items-center gap-1 text-sm">
            {(["monthly", "yearly"] as const).map((mode) => {
              const active = billing === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBilling(mode)}
                  className={`px-4 py-1.5 rounded-full transition-all capitalize ${active ? "text-primary-foreground shadow-[var(--shadow-glow)]" : "text-muted-foreground hover:text-foreground"}`}
                  style={active ? { background: "var(--gradient-primary)" } : undefined}
                  aria-pressed={active}
                >
                  {mode}
                  {mode === "yearly" && <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${active ? "bg-white/20" : "bg-primary/15 text-primary"}`}>−20%</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map((t, i) => {
            const price = billing === "yearly" ? t.yearly : t.monthly;
            return (
            <div
              key={t.name}
              data-reveal
              className={`reveal-delay-${i + 1} relative rounded-2xl p-6 flex flex-col ${t.featured ? "glass-card-strong ring-2 ring-primary/40 shadow-[var(--shadow-glow)] md:-translate-y-2" : "glass-card"}`}
            >
              {t.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  {t.tag}
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{t.name}</h3>
                {!t.featured && <span className="text-xs text-muted-foreground">{t.tag}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.best}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">${price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 h-4">
                {billing === "yearly" && t.monthly > 0 ? `Billed yearly · save $${(t.monthly - t.yearly) * 12}/yr` : ""}
              </p>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-primary shrink-0 mt-0.5" /> <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className={`mt-6 w-full ${t.featured ? "shine" : ""}`} variant={t.featured ? "default" : "outline"}>
                <Link to={user ? "/dashboard" : "/signup"}>{t.cta}</Link>
              </Button>
            </div>
            );
          })}
        </div>

        <p data-reveal className="reveal text-center text-xs text-muted-foreground mt-8">
          All plans include free SSL, global CDN, and the visual editor. <span className="text-foreground">No credit card to start.</span>
        </p>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div data-reveal className="reveal relative overflow-hidden rounded-3xl glass-card-strong p-10 md:p-16 text-center">
          <div className="aurora" />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
            Your next site, <span className="text-gradient-hero">live before lunch.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Join builders shipping production-grade sites with Sitely.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shine h-12 px-7"><Link to={user ? "/dashboard" : "/signup"}>Get started — free <ArrowRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7"><Link to="/templates">Browse templates</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md" style={{ background: "var(--gradient-primary)" }} />
            <span>© {new Date().getFullYear()} Sitely. Crafted for builders.</span>
          </div>
          <div className="flex items-center gap-5">
            <a className="hover:text-foreground" href="#features">Features</a>
            <a className="hover:text-foreground" href="#pricing">Pricing</a>
            <Link className="hover:text-foreground" to="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
