// Public sitemap.xml for a published site.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildSitemapXml } from "@/lib/seo/sitemap";
import type { ProjectContent } from "@/lib/blocks";

export const Route = createFileRoute("/api/public/sites/$slug/sitemap_xml")({
  server: {
    handlers: {
      GET: async ({ params, request }: any) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}/sites/${params.slug}`;
        const sb = createClient(
          (import.meta as any).env.VITE_SUPABASE_URL,
          (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
        );
        const { data } = await sb.from("projects")
          .select("published_content").eq("slug", params.slug).eq("published", true).maybeSingle();
        if (!data?.published_content) return new Response("Not found", { status: 404 });
        const xml = buildSitemapXml(origin, data.published_content as ProjectContent);
        return new Response(xml, { headers: { "content-type": "application/xml" } });
      },
    },
  },
});
