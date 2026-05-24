// Server function to fetch published site data (can safely use server-only APIs)
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const Input = z.object({
  slug: z.string(),
  lang: z.string().optional(),
});

export const getPublishedSite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { data: proj, error } = await supabase
      .from("projects")
      .select("id, name, published_content, head_code, body_code, seo, slug, published, published_version")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    if (!proj || !proj.published_content) {
      const err = new Error("Not found");
      (err as any).statusCode = 404;
      throw err;
    }

    // Edge cache: short s-maxage, long SWR; ETag changes on republish.
    setResponseHeaders(
      new Headers({
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
        "Cloudflare-CDN-Cache-Control": "public, s-maxage=300",
        ETag: `W/"${proj.id}-${proj.published_version ?? 1}"`,
      }),
    );

    // Available locales for hreflang
    const { data: locs } = await supabase
      .from("project_locales")
      .select("locale, content")
      .eq("project_id", proj.id);

    const lang = (data.lang || "").toLowerCase();
    const localized = lang ? (locs || []).find((l: any) => l.locale === lang) : null;

    return {
      id: proj.id,
      name: proj.name,
      slug: proj.slug,
      head_code: proj.head_code,
      body_code: proj.body_code,
      seo: proj.seo,
      published_content: proj.published_content,
      published_version: proj.published_version,
      lang: lang || "en",
      content: localized?.content || proj.published_content,
      availableLocales: ["en", ...(locs || []).map((l: any) => l.locale).filter((c: string) => c !== "en")],
    };
  });
