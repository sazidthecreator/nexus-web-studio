import type { Block, Branding } from "@/lib/blocks";

// Renders a block JSON node as production-quality HTML/CSS using
// the project's branding. Pure presentational — no editor controls.

const ANIM_CLASS: Record<string, string> = {
  none: "",
  fade: "wb-anim wb-fade",
  "slide-up": "wb-anim wb-slide-up",
  "slide-left": "wb-anim wb-slide-left",
  zoom: "wb-anim wb-zoom",
};

function renderBlock(block: Block, branding: Branding) {
  switch (block.type) {
    case "navbar": return <Navbar block={block} branding={branding} />;
    case "hero": return <Hero block={block} branding={branding} />;
    case "features": return <Features block={block} branding={branding} />;
    case "cta": return <CTA block={block} branding={branding} />;
    case "footer": return <Footer block={block} branding={branding} />;
    case "heading": return <Heading block={block} />;
    case "text": return <TextBlock block={block} />;
    case "image": return <ImageBlock block={block} />;
    case "image_generation": return <AiImageBlock block={block} />;
    case "gallery": return <Gallery block={block} />;
    case "button": return <ButtonBlock block={block} branding={branding} />;
    case "video": return <Video block={block} />;
    case "divider": return <Divider block={block} />;
    case "form": return <FormBlock block={block} branding={branding} />;
    case "install_prompt": return <InstallPromptBlock block={block} branding={branding} />;
    case "cookie_consent": return <CookieConsentBlock block={block} branding={branding} />;
    case "popup": return <PopupBlock block={block} branding={branding} />;
    default: return null;
  }
}

export function BlockRenderer({ block, branding }: { block: Block; branding: Branding }) {
  const inner = renderBlock(block, branding);
  const anim = (block.props as any)?.animation as string | undefined;
  if (!anim || anim === "none") return inner;
  const cls = ANIM_CLASS[anim] || "";
  if (!cls) return inner;
  return <div className={cls} data-anim>{inner}</div>;
}


function Navbar({ block, branding }: { block: Block; branding: Branding }) {
  const { links = [], ctaLabel, ctaHref, layout = "split" } = block.props;
  // layout: split (default) | center | stacked | minimal
  const isCenter = layout === "center";
  const isStacked = layout === "stacked";
  const isMinimal = layout === "minimal";
  const showLinks = !isMinimal && links.length > 0;
  return (
    <header className="w-full border-b border-black/5 bg-white/70 backdrop-blur sticky top-0 z-30">
      <div
        className={
          isStacked
            ? "mx-auto max-w-6xl flex flex-col items-center gap-3 px-4 sm:px-6 py-4 text-center"
            : isCenter
              ? "mx-auto max-w-6xl grid grid-cols-[1fr_auto_1fr] md:grid-cols-3 items-center gap-3 px-4 sm:px-6 py-4"
              : "mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 sm:px-6 py-4"
        }
      >
        <div className={`font-bold text-lg truncate ${isCenter ? "justify-self-start" : ""}`} style={{ color: branding.primaryColor }}>
          {branding.siteName}
        </div>
        {showLinks && (
          <nav
            className={
              isStacked
                ? "flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-700"
                : isCenter
                  ? "hidden md:flex justify-center gap-6 text-sm text-slate-700"
                  : "hidden md:flex gap-6 text-sm text-slate-700"
            }
          >
            {links.map((l: any, i: number) => (
              <a key={i} href={l.href} className="hover:opacity-70">{l.label}</a>
            ))}
          </nav>
        )}
        <div className={`flex items-center gap-2 ${isCenter ? "justify-self-end" : ""}`}>
          {ctaLabel && (
            <a
              href={ctaHref}
              className="hidden sm:inline-block text-sm font-medium px-3 py-1.5 rounded-md text-white whitespace-nowrap"
              style={{ background: branding.primaryColor }}
            >
              {ctaLabel}
            </a>
          )}
          {showLinks && !isStacked && (
            <details className="md:hidden relative">
              <summary
                aria-label="Open menu"
                className="list-none cursor-pointer size-9 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-700 [&::-webkit-details-marker]:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-2 flex flex-col text-sm">
                {links.map((l: any, i: number) => (
                  <a key={i} href={l.href} className="px-3 py-2 rounded hover:bg-slate-50 text-slate-700">{l.label}</a>
                ))}
                {ctaLabel && (
                  <a
                    href={ctaHref}
                    className="mt-1 px-3 py-2 rounded-md text-white text-center font-medium"
                    style={{ background: branding.primaryColor }}
                  >
                    {ctaLabel}
                  </a>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  const layout = p.layout || "center"; // center | split | left | minimal
  const glow: React.CSSProperties = {
    backgroundImage: `radial-gradient(60% 60% at 50% 0%, ${branding.primaryColor}14, transparent 70%)`,
  };
  const eyebrow = p.eyebrow && (
    <div
      className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-5"
      style={{ background: branding.primaryColor + "20", color: branding.primaryColor }}
    >
      {p.eyebrow}
    </div>
  );
  const ctaPrimary = p.ctaLabel && (
    <a
      href={p.ctaHref}
      className="px-5 py-2.5 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-shadow"
      style={{ background: branding.primaryColor }}
    >
      {p.ctaLabel}
    </a>
  );
  const ctaSecondary = p.secondaryLabel && (
    <a
      href={p.secondaryHref}
      className="px-5 py-2.5 rounded-lg font-medium border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors"
    >
      {p.secondaryLabel}
    </a>
  );
  const ctas = (ctaPrimary || ctaSecondary) && (
    <div className={`mt-8 flex items-center gap-3 flex-wrap ${layout === "center" || layout === "minimal" ? "justify-center" : "justify-start"}`}>
      {ctaPrimary}
      {ctaSecondary}
    </div>
  );

  const Visual = (
    <div
      className="aspect-[4/3] rounded-2xl border border-slate-200 overflow-hidden bg-slate-50"
      style={p.imageUrl ? undefined : { background: `linear-gradient(135deg, ${branding.primaryColor}22, ${branding.primaryColor}10)` }}
      aria-hidden={!p.imageUrl}
    >
      {p.imageUrl && (
        <img src={p.imageUrl} alt={p.imageAlt || p.headline || ""} loading="eager" className="w-full h-full object-cover" />
      )}
    </div>
  );

  if (layout === "split") {
    return (
      <section className="relative overflow-hidden bg-white" style={glow}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="text-left">
            {eyebrow}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight text-balance">{p.headline}</h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl text-pretty">{p.subheadline}</p>
            {ctas}
          </div>
          {Visual}
        </div>
      </section>
    );
  }

  if (layout === "left") {
    return (
      <section className="relative overflow-hidden bg-white" style={glow}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24 text-left">
          {eyebrow}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight max-w-3xl text-balance">{p.headline}</h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl text-pretty">{p.subheadline}</p>
          {ctas}
        </div>
      </section>
    );
  }

  if (layout === "minimal") {
    return (
      <section className="relative overflow-hidden bg-white" style={glow}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-tight text-balance">{p.headline}</h1>
          {p.subheadline && <p className="mt-4 text-base text-slate-600 text-pretty">{p.subheadline}</p>}
          {ctas}
        </div>
      </section>
    );
  }

  // center (default)
  return (
    <section className="relative overflow-hidden bg-white" style={glow}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        {eyebrow}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight text-balance">{p.headline}</h1>
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto text-pretty">{p.subheadline}</p>
        {ctas}
      </div>
    </section>
  );
}

function Features({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  const layout = p.layout || "grid"; // grid | list | bento | alternating
  const items = p.items || [];

  const Header = (
    <div className={`max-w-2xl mb-10 ${layout === "list" || layout === "alternating" ? "" : "text-center mx-auto"}`}>
      {p.title && <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{p.title}</h2>}
      {p.subtitle && <p className="mt-3 text-slate-600">{p.subtitle}</p>}
    </div>
  );

  if (layout === "list") {
    return (
      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-20">
          {Header}
          <ul className="divide-y divide-slate-200 rounded-2xl bg-white border border-slate-200">
            {items.map((it: any, i: number) => (
              <li key={i} className="flex items-start gap-4 p-5 sm:p-6">
                <div className="size-10 shrink-0 rounded-lg flex items-center justify-center text-xl" style={{ background: branding.primaryColor + "20" }}>
                  <span>{it.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{it.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{it.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (layout === "alternating") {
    return (
      <section className="bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-20 space-y-12">
          {Header}
          {items.map((it: any, i: number) => (
            <div key={i} className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div
                className="aspect-[4/3] rounded-2xl border border-slate-200 overflow-hidden bg-slate-100"
                style={it.imageUrl ? undefined : { background: `linear-gradient(135deg, ${branding.primaryColor}22, ${branding.primaryColor}10)` }}
                aria-hidden={!it.imageUrl}
              >
                {it.imageUrl && (
                  <img src={it.imageUrl} alt={it.imageAlt || it.title || ""} loading="lazy" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <div className="size-10 rounded-lg flex items-center justify-center text-xl mb-3" style={{ background: branding.primaryColor + "20" }}>
                  <span>{it.icon}</span>
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 text-balance">{it.title}</h3>
                <p className="text-slate-600 mt-2 text-pretty">{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (layout === "bento") {
    return (
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          {Header}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-[minmax(160px,auto)] gap-4">
            {items.map((it: any, i: number) => {
              // First card spans wide on desktop, others vary
              const span =
                i === 0 ? "lg:col-span-4 lg:row-span-2" :
                i % 3 === 1 ? "lg:col-span-2" :
                i % 3 === 2 ? "lg:col-span-3" :
                "lg:col-span-3";
              return (
                <div key={i} className={`rounded-xl bg-white border border-slate-200 p-6 ${span}`}>
                  <div className="size-10 rounded-lg flex items-center justify-center text-xl mb-3" style={{ background: branding.primaryColor + "20" }}>
                    <span>{it.icon}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{it.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{it.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // grid (default)
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        {Header}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it: any, i: number) => (
            <div key={i} className="rounded-xl bg-white border border-slate-200 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
              <div className="size-10 rounded-lg flex items-center justify-center text-xl mb-3" style={{ background: branding.primaryColor + "20" }}>
                <span>{it.icon}</span>
              </div>
              <h3 className="font-semibold text-slate-900 text-balance">{it.title}</h3>
              <p className="text-sm text-slate-600 mt-1 text-pretty">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  const layout = p.layout || "banner"; // banner | split | minimal | full

  if (layout === "split") {
    return (
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div
            className="rounded-2xl p-8 sm:p-12 text-white grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center"
            style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryColor}cc)` }}
          >
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">{p.headline}</h2>
              <p className="mt-2 text-white/90 max-w-xl">{p.subheadline}</p>
            </div>
            <a
              href={p.ctaHref}
              className="inline-block px-6 py-3 rounded-lg bg-white font-semibold whitespace-nowrap justify-self-start md:justify-self-end"
              style={{ color: branding.primaryColor }}
            >
              {p.ctaLabel}
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (layout === "minimal") {
    return (
      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">{p.headline}</h2>
          {p.subheadline && <p className="mt-2 text-slate-600 max-w-xl mx-auto">{p.subheadline}</p>}
          <a
            href={p.ctaHref}
            className="inline-block mt-5 px-5 py-2.5 rounded-lg text-white font-medium"
            style={{ background: branding.primaryColor }}
          >
            {p.ctaLabel}
          </a>
        </div>
      </section>
    );
  }

  if (layout === "full") {
    return (
      <section
        className="text-white"
        style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryColor}cc)` }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold">{p.headline}</h2>
          <p className="mt-4 text-white/90 max-w-2xl mx-auto text-base sm:text-lg">{p.subheadline}</p>
          <a
            href={p.ctaHref}
            className="inline-block mt-8 px-7 py-3.5 rounded-lg bg-white font-semibold"
            style={{ color: branding.primaryColor }}
          >
            {p.ctaLabel}
          </a>
        </div>
      </section>
    );
  }

  // banner (default)
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
        <div
          className="rounded-2xl p-8 sm:p-12 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryColor}cc)` }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold">{p.headline}</h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto">{p.subheadline}</p>
          <a href={p.ctaHref} className="inline-block mt-6 px-6 py-3 rounded-lg bg-white font-semibold" style={{ color: branding.primaryColor }}>
            {p.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  const layout = p.layout || "columns"; // columns | minimal | centered
  const cols = p.columns || [];

  if (layout === "minimal") {
    return (
      <footer className="bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-bold text-lg" style={{ color: branding.primaryColor }}>{branding.siteName}</div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {cols.flatMap((c: any) => c.links || []).map((l: any, i: number) => (
              <a key={i} href={l.href} className="hover:text-white">{l.label}</a>
            ))}
          </nav>
          <div className="text-xs text-slate-500">© {new Date().getFullYear()} {branding.siteName}</div>
        </div>
      </footer>
    );
  }

  if (layout === "centered") {
    return (
      <footer className="bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 text-center">
          <div className="font-bold text-xl" style={{ color: branding.primaryColor }}>{branding.siteName}</div>
          {p.tagline && <p className="text-sm mt-2 text-slate-400">{p.tagline}</p>}
          <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {cols.flatMap((c: any) => c.links || []).map((l: any, i: number) => (
              <a key={i} href={l.href} className="hover:text-white">{l.label}</a>
            ))}
          </nav>
          <div className="border-t border-white/10 mt-8 pt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} {branding.siteName}. All rights reserved.
          </div>
        </div>
      </footer>
    );
  }

  // columns (default)
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="font-bold text-white text-lg" style={{ color: branding.primaryColor }}>{branding.siteName}</div>
          <p className="text-sm mt-2 text-slate-400">{p.tagline}</p>
        </div>
        {cols.map((c: any, i: number) => (
          <div key={i}>
            <h4 className="text-white text-sm font-semibold mb-3">{c.title}</h4>
            <ul className="space-y-2 text-sm">
              {c.links.map((l: any, j: number) => <li key={j}><a href={l.href} className="hover:text-white">{l.label}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-4 text-xs text-center text-slate-500">
        © {new Date().getFullYear()} {branding.siteName}. All rights reserved.
      </div>
    </footer>
  );
}

function Heading({ block }: { block: Block }) {
  const p = block.props;
  const align = (p.align ?? "center") as "left" | "center" | "right";
  const alignCls = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <section className="bg-white">
      <div className={`mx-auto max-w-4xl px-4 sm:px-6 py-12 ${alignCls}`}>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{p.title}</h2>
        {p.subtitle && <p className="mt-3 text-slate-600">{p.subtitle}</p>}
      </div>
    </section>
  );
}

function TextBlock({ block }: { block: Block }) {
  const p = block.props;
  const align = (p.align ?? "left") as "left" | "center" | "right";
  const alignCls = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <section className="bg-white">
      <div className={`mx-auto max-w-3xl px-4 sm:px-6 py-8 ${alignCls}`}>
        <p className="text-base sm:text-lg text-slate-700 leading-relaxed whitespace-pre-line">{p.body}</p>
      </div>
    </section>
  );
}

function ImageBlock({ block }: { block: Block }) {
  const p = block.props;
  return (
    <section className="bg-white">
      <figure className="mx-auto px-4 sm:px-6 py-8" style={{ maxWidth: p.maxWidth ?? 960 }}>
        {p.src ? (
          <img
            src={p.src}
            alt={p.alt || ""}
            loading="lazy"
            className={`w-full h-auto ${p.rounded ? "rounded-xl" : ""}`}
          />
        ) : (
          <div className="aspect-video w-full rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
            Upload an image in the properties panel
          </div>
        )}
        {p.caption && <figcaption className="text-center text-sm text-slate-500 mt-3">{p.caption}</figcaption>}
      </figure>
    </section>
  );
}

function AiImageBlock({ block }: { block: Block }) {
  const p = block.props;
  const ratio = p.width && p.height ? `${p.width} / ${p.height}` : "16 / 9";
  return (
    <section className="bg-white">
      <figure className="mx-auto px-4 sm:px-6 py-8" style={{ maxWidth: p.maxWidth ?? 1024 }}>
        {p.src ? (
          <img
            src={p.src}
            alt={p.alt || p.prompt || ""}
            loading="lazy"
            className={`w-full h-auto ${p.rounded !== false ? "rounded-xl" : ""}`}
          />
        ) : (
          <div
            className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-500 text-sm p-6 text-center"
            style={{ aspectRatio: ratio }}
          >
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">AI image · awaiting generation</div>
            <div className="max-w-md italic">"{p.prompt || "No prompt set"}"</div>
          </div>
        )}
        {p.caption && <figcaption className="text-center text-sm text-slate-500 mt-3">{p.caption}</figcaption>}
      </figure>
    </section>
  );
}

function Gallery({ block }: { block: Block }) {
  const p = block.props;
  const images = p.images || [];
  const layout = p.layout || "grid"; // grid | masonry | carousel | wide
  const Tile = ({ im, i, extra = "" }: { im: any; i: number; extra?: string }) =>
    im.src ? (
      <img
        key={i}
        src={im.src}
        alt={im.alt || ""}
        loading="lazy"
        className={`w-full h-full object-cover rounded-lg ${extra}`}
      />
    ) : (
      <div
        key={i}
        className={`w-full h-full rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs ${extra}`}
      >
        Empty
      </div>
    );

  if (layout === "masonry") {
    return (
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
          {images.map((im: any, i: number) => (
            <div key={i} className="mb-4 break-inside-avoid">
              {im.src ? (
                <img src={im.src} alt={im.alt || ""} loading="lazy" className="w-full h-auto rounded-lg" />
              ) : (
                <div className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs">
                  Empty
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (layout === "carousel") {
    return (
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 [scrollbar-width:thin]">
            {images.map((im: any, i: number) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[80%] sm:w-[45%] lg:w-[32%] aspect-[4/3]"
              >
                <Tile im={im} i={i} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "wide") {
    // Editorial: first image hero, rest as grid
    const [first, ...rest] = images;
    return (
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 space-y-4">
          {first && (
            <div className="aspect-[16/7] w-full">
              <Tile im={first} i={0} />
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rest.map((im: any, i: number) => (
              <div key={i + 1} className="aspect-square">
                <Tile im={im} i={i + 1} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // grid (default)
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((im: any, i: number) => (
          <div key={i} className="aspect-square">
            <Tile im={im} i={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ButtonBlock({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  const align = (p.align ?? "center") as "left" | "center" | "right";
  const justifyCls = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  const style: React.CSSProperties =
    p.style === "outline"
      ? { borderColor: branding.primaryColor, color: branding.primaryColor, borderWidth: 2 }
      : { background: branding.primaryColor, color: "#fff" };
  return (
    <section className="bg-white">
      <div className={`mx-auto max-w-4xl px-4 sm:px-6 py-8 flex ${justifyCls}`}>
        <a href={p.href || "#"} className={`inline-block px-6 py-3 rounded-lg font-medium ${p.style === "outline" ? "border" : ""}`} style={style}>
          {p.label || "Button"}
        </a>
      </div>
    </section>
  );
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}
function Video({ block }: { block: Block }) {
  const url = block.props.url || "";
  const yt = youtubeId(url);
  const vm = vimeoId(url);
  const embed = yt ? `https://www.youtube.com/embed/${yt}` : vm ? `https://player.vimeo.com/video/${vm}` : null;
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
          {embed ? (
            <iframe src={embed} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">Paste a YouTube or Vimeo URL</div>
          )}
        </div>
      </div>
    </section>
  );
}

function Divider({ block }: { block: Block }) {
  const p = block.props;
  const spacing = p.spacing ?? 48;
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6" style={{ paddingTop: spacing / 2, paddingBottom: spacing / 2 }}>
        {p.style === "line" ? <hr className="border-slate-200" /> : <div />}
      </div>
    </section>
  );
}

function FormBlock({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  const fields = p.fields || [];
  const formId = block.id;
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">{p.title}</h2>
          {p.subtitle && <p className="mt-2 text-slate-600">{p.subtitle}</p>}
        </div>
        <form
          className="space-y-4 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8"
          data-form-id={formId}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const data: Record<string, string> = {};
            fd.forEach((v, k) => { data[k] = String(v); });
            const honeypot = data.__website || "";
            delete data.__website;

            // Resolve site slug from URL: /sites/<slug>
            const m = typeof window !== "undefined" ? window.location.pathname.match(/\/sites\/([^/]+)/) : null;
            const projectSlug = m ? m[1] : null;
            const status = form.querySelector("[data-form-status]") as HTMLElement | null;

            if (!projectSlug) {
              if (status) { status.textContent = "Form preview only"; status.dataset.kind = "info"; }
              return;
            }
            try {
              const res = await fetch("/api/public/forms/submit", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ projectSlug, formId, fields: data, honeypot }),
              });
              const j = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(j.error || "Submit failed");
              if (status) { status.textContent = "Thanks! We'll be in touch."; status.dataset.kind = "ok"; }
              form.reset();
            } catch (err: any) {
              if (status) { status.textContent = err.message || "Something went wrong"; status.dataset.kind = "err"; }
            }
          }}
        >
          {fields.map((f: any, i: number) => (
            <div key={i} className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                {f.label}{f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea name={f.name} required={f.required} rows={4} className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2" style={{ ["--tw-ring-color" as any]: branding.primaryColor }} />
              ) : (
                <input name={f.name} type={f.type || "text"} required={f.required} className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2" style={{ ["--tw-ring-color" as any]: branding.primaryColor }} />
              )}
            </div>
          ))}
          {/* Honeypot — hidden from real users */}
          <input type="text" name="__website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }} />
          <button type="submit" className="w-full px-5 py-2.5 rounded-lg text-white font-medium" style={{ background: branding.primaryColor }}>
            {p.submitLabel || "Submit"}
          </button>
          <p data-form-status className="text-sm text-center text-slate-600 min-h-[1.25rem]" />
        </form>
      </div>
    </section>
  );
}
function InstallPromptBlock({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  // Capture beforeinstallprompt and surface a CTA. SSR-safe via inline script.
  const script = `
(function(){
  var deferred=null;
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;
    var btn=document.querySelector('[data-install-cta]');
    if(btn){btn.style.display='inline-flex';}
  });
  document.addEventListener('click',function(e){
    var t=e.target;
    if(!t||!(t instanceof Element))return;
    if(t.closest('[data-install-cta]')&&deferred){deferred.prompt();deferred=null;}
    if(t.closest('[data-install-dismiss]')){
      var box=t.closest('[data-install-box]'); if(box) box.remove();
    }
  });
})();`;
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div data-install-box className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{p.body}</p>
          </div>
          <div className="flex gap-2">
            <button data-install-dismiss className="px-3 py-2 text-sm rounded-md border border-slate-200 text-slate-700">{p.dismissLabel || "Not now"}</button>
            <button data-install-cta className="px-4 py-2 text-sm font-medium rounded-md text-white" style={{ background: branding.primaryColor, display: "none" }}>{p.ctaLabel || "Install"}</button>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: script }} />
      </div>
    </section>
  );
}

function CookieConsentBlock({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  const pos = p.position === "top" ? "top-4" : "bottom-4";
  const script = `
(function(){
  try{
    if(localStorage.getItem('cc:consent')){var b=document.querySelector('[data-cc-box]');if(b)b.remove();return;}
  }catch(e){}
  document.addEventListener('click',function(e){
    var t=e.target;if(!t||!(t instanceof Element))return;
    var box=t.closest('[data-cc-box]');if(!box)return;
    if(t.closest('[data-cc-accept]')){try{localStorage.setItem('cc:consent','all');}catch(e){}box.remove();window.dispatchEvent(new CustomEvent('cookie-consent',{detail:'all'}));}
    else if(t.closest('[data-cc-reject]')){try{localStorage.setItem('cc:consent','essential');}catch(e){}box.remove();window.dispatchEvent(new CustomEvent('cookie-consent',{detail:'essential'}));}
  });
})();`;
  return (
    <div data-cc-box className={`fixed ${pos} left-1/2 -translate-x-1/2 z-50 w-[min(680px,calc(100%-2rem))] rounded-2xl border border-slate-200 bg-white shadow-xl p-4 sm:p-5`}>
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:items-center">
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">{p.title}</div>
          <div className="text-xs text-slate-600 mt-1">
            {p.body}{" "}
            {p.learnMoreHref && (
              <a href={p.learnMoreHref} className="underline" style={{ color: branding.primaryColor }}>{p.learnMoreLabel || "Learn more"}</a>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button data-cc-reject className="px-3 py-2 text-xs rounded-md border border-slate-200 text-slate-700">{p.rejectLabel || "Reject"}</button>
          <button data-cc-accept className="px-3 py-2 text-xs font-medium rounded-md text-white" style={{ background: branding.primaryColor }}>{p.acceptLabel || "Accept"}</button>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </div>
  );
}

function PopupBlock({ block, branding }: { block: Block; branding: Branding }) {
  const p = block.props;
  const trigger = p.trigger || "delay";
  const delay = Number(p.delaySeconds || 8) * 1000;
  const once = p.showOnce !== false;
  const key = `pop:${block.id}`;
  const script = `
(function(){
  var key='${key}';
  try{ if(${once} && localStorage.getItem(key)) return; }catch(e){}
  var box=document.querySelector('[data-pop-id="${block.id}"]');
  if(!box) return;
  function show(){box.removeAttribute('hidden');try{if(${once})localStorage.setItem(key,'1');}catch(e){}}
  ${trigger === "exit"
    ? `document.addEventListener('mouseout',function(e){if(!e.relatedTarget&&e.clientY<=0)show();},{once:true});`
    : `setTimeout(show,${delay});`}
  box.addEventListener('click',function(e){
    var t=e.target;if(!t||!(t instanceof Element))return;
    if(t.closest('[data-pop-close]')||t===box)box.setAttribute('hidden','');
  });
})();`;
  return (
    <div data-pop-id={block.id} hidden className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button data-pop-close className="absolute top-3 right-3 size-7 rounded-full hover:bg-slate-100 text-slate-500 text-lg leading-none">×</button>
        <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{p.body}</p>
        {p.ctaLabel && (
          <a href={p.ctaHref || "#"} className="mt-4 inline-flex px-4 py-2 text-sm font-medium rounded-md text-white" style={{ background: branding.primaryColor }}>
            {p.ctaLabel}
          </a>
        )}
      </div>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </div>
  );
}
