// Deep link for a specific page in a published multi-page site.
// URL shape: /sites/<slug>/<page-slug>?lang=
// Page slug = slugified `name`. The first page also responds at /sites/<slug>.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublishedSite } from "@/lib/site.functions";
import { BlockRenderer } from "@/components/block-renderer";
import { DEFAULT_BRANDING, type Block, type ProjectContent } from "@/lib/blocks";
import { getTypoPreset, googleFontsHref, typoStyleVars } from "@/lib/typography";
import { isRtl } from "@/lib/i18n";
import { useEffect, useMemo } from "react";
import { z } from "zod";

const search = z.object({ lang: z.string().optional() });

function pageSlug(name: string) {
  return (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "page";
}

export const Route = createFileRoute("/sites/$slug/$pagePath")({
  validateSearch: search,
  loaderDeps: ({ search }) => ({ lang: search.lang ?? "" }),
  loader: async ({ params, deps }) => {
    try {
      const data = await getPublishedSite({ data: { slug: params.slug, lang: deps.lang } });
      const pages = ((data.content as any)?.pages ?? []) as ProjectContent["pages"];
      const idx = pages.findIndex((p) => pageSlug(p.name) === params.pagePath);
      if (idx === -1) throw notFound();
      return { ...data, pageIndex: idx };
    } catch (err: any) {
      if (err?.statusCode === 404) throw notFound();
      throw err;
    }
  },
  head: ({ loaderData }) => {
    const seo = (loaderData?.seo as any) || {};
    const content = (loaderData?.content as any) || {};
    const page = content.pages?.[loaderData?.pageIndex ?? 0];
    const baseTitle = seo.title || loaderData?.name || "Published site";
    const title = page?.name ? `${page.name} — ${baseTitle}` : baseTitle;
    const description = seo.description || "";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "theme-color", content: content?.branding?.primaryColor || "#7c5cff" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(seo.ogImage ? [{ property: "og:image", content: seo.ogImage as string }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="text-muted-foreground mt-2">This page does not exist on this site.</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
  component: SubPage,
});

function SubPage() {
  const data = Route.useLoaderData();
  const content = data.content as ProjectContent;
  const branding = content.branding ?? DEFAULT_BRANDING;
  const blocks: Block[] = (content.pages?.[data.pageIndex]?.blocks ?? []).filter((b) => !b.props?.__hidden);
  const lang = data.lang || "en";
  const dir = isRtl(lang) ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    try {
      const payload = JSON.stringify({
        slug: data.slug,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      });
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/public/pv", blob);
      else fetch("/api/public/pv", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true });
    } catch { /* best effort */ }
  }, [data.slug, data.pageIndex]);

  const typoPreset = useMemo(() => getTypoPreset(branding.typographyPreset), [branding.typographyPreset]);
  const gfHref = googleFontsHref(typoPreset);

  return (
    <main dir={dir} lang={lang} className="wb-canvas" style={{ fontFamily: branding.fontFamily, ...typoStyleVars(typoPreset) }}>
      {gfHref && <link rel="stylesheet" href={gfHref} />}
      {blocks.map((b) => <BlockRenderer key={b.id} block={b} branding={branding} />)}
    </main>
  );
}

export { pageSlug };
