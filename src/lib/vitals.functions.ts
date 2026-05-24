// Public server function to ingest Core Web Vitals from published sites.
// No auth — uses admin client and only inserts vitals_reports rows.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(16),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  url: z.string().min(1).max(2048),
});

export const reportVital = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("vitals_reports").insert({
      project_id: data.projectId,
      name: data.name,
      value: data.value,
      rating: data.rating,
      url: data.url,
      ts: Date.now(),
    });
    return { ok: true };
  });
