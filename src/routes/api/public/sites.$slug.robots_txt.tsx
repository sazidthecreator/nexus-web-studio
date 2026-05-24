// Public robots.txt for a published site.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/sites/$slug/robots_txt")({
  server: {
    handlers: {
      GET: async ({ params, request }: any) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}/sites/${params.slug}`;
        const sitemap = `${url.protocol}//${url.host}/api/public/sites/${params.slug}/sitemap_xml`;
        const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\nHost: ${origin}\n`;
        return new Response(body, { headers: { "content-type": "text/plain" } });
      },
    },
  },
});
