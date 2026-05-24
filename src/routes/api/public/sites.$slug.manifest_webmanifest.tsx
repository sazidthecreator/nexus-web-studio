// Public Web App Manifest for a published site.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { manifestFromContent } from "@/lib/pwa/manifest";
import type { ProjectContent } from "@/lib/blocks";

export const Route = createFileRoute("/api/public/sites/$slug/manifest_webmanifest")({
  server: {
    handlers: {
      GET: async ({ params, request }: any) => {
        const url = new URL(request.url);
        const sb = createClient(
          (import.meta as any).env.VITE_SUPABASE_URL,
          (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
        );
        const { data } = await sb.from("projects")
          .select("published_content, name").eq("slug", params.slug).eq("published", true).maybeSingle();
        if (!data?.published_content) return new Response("Not found", { status: 404 });
        const startUrl = `${url.protocol}//${url.host}/sites/${params.slug}`;
        const m = manifestFromContent(data.published_content as ProjectContent, {
          startUrl, scope: `/sites/${params.slug}`,
          name: (data as any).name || undefined,
        });
        return new Response(JSON.stringify(m), {
          headers: { "content-type": "application/manifest+json", "cache-control": "no-cache" },
        });
      },
    },
  },
});
