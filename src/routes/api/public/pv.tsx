// Public beacon endpoint for recording a page view on a published site.
// Inserts via admin client (no auth needed). Hashes IP+UA for unique-visitor
// counts without storing PII.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash } from "crypto";

const MAX_BODY_BYTES = 4 * 1024;

export const Route = createFileRoute("/api/public/pv")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }: any) => {
        const cl = request.headers.get("content-length");
        if (cl && Number(cl) > MAX_BODY_BYTES) return json({ error: "Too large" }, 413);
        const text = await request.text();
        if (text.length > MAX_BODY_BYTES) return json({ error: "Too large" }, 413);
        let body: any;
        try { body = JSON.parse(text); } catch { return json({ error: "Bad JSON" }, 400); }

        const slug = typeof body?.slug === "string" ? body.slug.slice(0, 200) : "";
        const path = typeof body?.path === "string" ? body.path.slice(0, 500) : "/";
        const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;
        if (!slug) return json({ error: "Missing slug" }, 400);

        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("id, published")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        if (!project) return json({ error: "Not found" }, 404);

        const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0";
        const ua = request.headers.get("user-agent") || "";
        const country = request.headers.get("cf-ipcountry") || null;
        const day = new Date().toISOString().slice(0, 10);
        const visitor_hash = createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 32);

        await supabaseAdmin.from("page_views").insert({
          project_id: project.id,
          page_path: path,
          referrer,
          visitor_hash,
          user_agent: ua.slice(0, 300),
          country,
        });

        return json({ ok: true });
      },
    },
  },
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}
