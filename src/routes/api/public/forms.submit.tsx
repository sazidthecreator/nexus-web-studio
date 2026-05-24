// Public form submission endpoint. Validates honeypot, rate-limits per IP and
// per-project, then inserts into form_responses using the admin client.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RATE_WINDOW_SEC = 30;
const RATE_MAX_PER_IP = 3;
const MAX_BODY_BYTES = 64 * 1024;

// In-memory per-project burst limit (best-effort, per server instance).
type Burst = { count: number; windowStart: number };
const projectBursts = new Map<string, Burst>();
const PROJECT_WINDOW_MS = 60_000;
const PROJECT_MAX_PER_MIN = 10;

function checkProjectBurst(projectId: string): boolean {
  const now = Date.now();
  const b = projectBursts.get(projectId);
  if (!b || now - b.windowStart > PROJECT_WINDOW_MS) {
    projectBursts.set(projectId, { count: 1, windowStart: now });
    return true;
  }
  b.count += 1;
  return b.count <= PROJECT_MAX_PER_MIN;
}

export const Route = createFileRoute("/api/public/forms/submit")({
  server: {
    handlers: {
      POST: async ({ request }: any) => {
        // Cap body size before parsing.
        const cl = request.headers.get("content-length");
        if (cl && Number(cl) > MAX_BODY_BYTES) {
          return json({ error: "Payload too large" }, 413);
        }
        const text = await request.text();
        if (text.length > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);
        let body: any;
        try { body = JSON.parse(text); } catch { return json({ error: "Invalid JSON" }, 400); }

        const { projectSlug, formId, fields, honeypot, _website, submittedAt } = body || {};
        if (!projectSlug || !formId || typeof fields !== "object" || fields === null) {
          return json({ error: "Missing fields" }, 400);
        }
        if (typeof projectSlug !== "string" || projectSlug.length > 200) return json({ error: "Bad slug" }, 400);
        if (typeof formId !== "string" || formId.length > 80) return json({ error: "Bad form id" }, 400);

        // Honeypot: bots fill hidden field. Accept either name.
        if ((honeypot && String(honeypot).trim() !== "") ||
            (_website && String(_website).trim() !== "")) {
          return json({ ok: true }); // silently accept
        }
        // Time-trap: forms submitted in <800ms are almost certainly bots.
        if (submittedAt && typeof submittedAt === "number") {
          const age = Date.now() - submittedAt;
          if (age >= 0 && age < 800) return json({ ok: true });
        }

        // Resolve project
        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("id, user_id, published")
          .eq("slug", projectSlug)
          .eq("published", true)
          .maybeSingle();
        if (!project) return json({ error: "Site not found" }, 404);

        // Per-project burst limit (independent of IP).
        if (!checkProjectBurst(project.id)) {
          return json({ error: "Too many submissions to this site, slow down" }, 429);
        }

        // IP + per-IP rate-limit (DB-backed)
        const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
        const ua = request.headers.get("user-agent") || "";
        const now = new Date();
        const { data: rate } = await supabaseAdmin
          .from("form_submit_rate")
          .select("last_at, count")
          .eq("ip", ip).eq("project_id", project.id).maybeSingle();

        if (rate) {
          const elapsed = (now.getTime() - new Date(rate.last_at).getTime()) / 1000;
          if (elapsed < RATE_WINDOW_SEC && (rate.count || 0) >= RATE_MAX_PER_IP) {
            return json({ error: "Too many submissions, slow down" }, 429);
          }
          await supabaseAdmin.from("form_submit_rate").update({
            last_at: now.toISOString(),
            count: elapsed < RATE_WINDOW_SEC ? (rate.count || 1) + 1 : 1,
          }).eq("ip", ip).eq("project_id", project.id);
        } else {
          await supabaseAdmin.from("form_submit_rate").insert({
            ip, project_id: project.id, last_at: now.toISOString(), count: 1,
          });
        }

        // Sanitize: only stringify primitives, cap sizes, cap field count
        const safe: Record<string, string> = {};
        let count = 0;
        for (const [k, v] of Object.entries(fields)) {
          if (count >= 50) break;
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            safe[String(k).slice(0, 80)] = String(v).slice(0, 5000);
            count += 1;
          }
        }

        const { error } = await supabaseAdmin.from("form_responses").insert({
          project_id: project.id,
          user_id: project.user_id,
          form_id: String(formId).slice(0, 80),
          data: safe,
          ip, user_agent: ua.slice(0, 300),
        });
        if (error) return json({ error: error.message }, 500);
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
