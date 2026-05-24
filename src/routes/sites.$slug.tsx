// Public published site rendered from `published_content`. No auth.
// Supports ?lang= for translated locales served from project_locales.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublishedSite } from "@/lib/site.functions";
import { BlockRenderer } from "@/components/block-renderer";
import { DEFAULT_BRANDING, type Block, type ProjectContent } from "@/lib/blocks";
import { getTypoPreset, googleFontsHref, typoStyleVars } from "@/lib/typography";
import { isRtl } from "@/lib/i18n";
import { initScrollReveal } from "@/lib/scroll-reveal";
import { ScrollProgressBar } from "@/components/published/scroll-progress-bar";
import { trackVitals } from "@/lib/vitals";
import { useEffect, useMemo } from "react";
import { z } from "zod";

const search = z.object({ lang: z.string().optional() });

export const Route = createFileRoute("/sites/$slug")({
  validateSearch: search,
  loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
  loader: async ({ params, deps }) => {
    try {
      return await getPublishedSite({ data: { slug: params.slug, lang: deps.lang } });
    } catch (err: any) {
      if (err?.statusCode === 404) throw notFound();
      throw err;
    }
  },
  head: ({ loaderData }) => {
    const seo = (loaderData?.seo as any) || {};
    const title = seo.title || loaderData?.name || "Published site";
    const description = seo.description || "";
    const content = (loaderData?.content as any) || {};
    const websiteLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: content?.branding?.siteName || loaderData?.name || title,
    };
    const slug = loaderData?.slug;
    const hreflangs = (loaderData?.availableLocales || []).map((code: string) => ({
      rel: "alternate",
      hreflang: code,
      href: typeof window !== "undefined"
        ? `${window.location.origin}/sites/${slug}${code === "en" ? "" : `?lang=${code}`}`
        : `/sites/${slug}${code === "en" ? "" : `?lang=${code}`}`,
    }));
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "theme-color", content: content?.branding?.primaryColor || "#7c5cff" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(seo.ogImage ? [{ property: "og:image", content: seo.ogImage as string }] : []),
      ],
      links: [
        ...hreflangs,
        { rel: "manifest", href: `/api/public/sites/${slug}/manifest_webmanifest` },
      ],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(websiteLd) }],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Site not found</h1>
        <p className="text-muted-foreground mt-2">This site does not exist or is not published.</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
  component: SitePage,
});

function SitePage() {
  const data = Route.useLoaderData();
  const content = data.content as ProjectContent;
  const branding = content.branding ?? DEFAULT_BRANDING;
  const blocks: Block[] = (content.pages?.[0]?.blocks ?? []).filter((b) => !b.props?.__hidden);
  const lang = data.lang || "en";
  const dir = isRtl(lang) ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  // Inject head/body custom code on mount
  useEffect(() => {
    const tags: HTMLElement[] = [];
    if (data.head_code) {
      const el = document.createElement("div");
      el.innerHTML = data.head_code;
      Array.from(el.childNodes).forEach((n) => {
        if (n.nodeType === 1) { document.head.appendChild(n); tags.push(n as HTMLElement); }
      });
    }
    if (data.body_code) {
      const el = document.createElement("div");
      el.innerHTML = data.body_code;
      Array.from(el.childNodes).forEach((n) => {
        if (n.nodeType === 1) { document.body.appendChild(n); tags.push(n as HTMLElement); }
      });
    }
    return () => { tags.forEach((t) => t.remove()); };
  }, [data.head_code, data.body_code]);

  // Block animation observer: reveal .wb-anim when scrolled into view.
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".wb-anim");
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("wb-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [blocks]);

  // Page-view beacon: fires once per mount via sendBeacon (non-blocking).
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    try {
      const payload = JSON.stringify({
        slug: data.slug,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      });
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/public/pv", blob);
      } else {
        fetch("/api/public/pv", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true });
      }
    } catch { /* analytics is best-effort */ }
  }, [data.slug]);

  // Init scroll-reveal animations + Core Web Vitals tracking once.
  useEffect(() => {
    const dispose = initScrollReveal();
    if (data.id) trackVitals(data.id);
    return () => dispose();
  }, [data.id, blocks.length]);

  const typoPreset = useMemo(() => getTypoPreset(branding.typographyPreset), [branding.typographyPreset]);
  const gfHref = googleFontsHref(typoPreset);

  return (
    <div
      dir={dir}
      lang={lang}
      className="wb-canvas"
      style={{ fontFamily: branding.fontFamily, ...typoStyleVars(typoPreset) }}
    >
      <ScrollProgressBar />
      {gfHref && <link rel="stylesheet" href={gfHref} />}
      {blocks.map((b) => <BlockRenderer key={b.id} block={b} branding={branding} />)}
    </div>
  );
}
