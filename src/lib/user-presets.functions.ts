// User-saved block presets — list / create / delete.
// Stored in `user_presets` (RLS: auth.uid() = user_id).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BlockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  props: z.record(z.string(), z.any()),
});

const CreateInput = z.object({
  name: z.string().min(1).max(80),
  category: z.string().max(40).nullable().optional(),
  thumbnail: z.string().max(2048).nullable().optional(),
  blocks: z.array(BlockSchema).min(1).max(50),
});

const DeleteInput = z.object({ id: z.string().uuid() });

export type UserPreset = {
  id: string;
  name: string;
  category: string | null;
  thumbnail: string | null;
  blocks: z.infer<typeof BlockSchema>[];
  created_at: string;
};

export const listUserPresets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ presets: UserPreset[] }> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("user_presets")
      .select("id, name, category, thumbnail, blocks, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { presets: (data ?? []) as UserPreset[] };
  });

export const createUserPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }): Promise<{ preset: UserPreset }> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("user_presets")
      .insert({
        user_id: userId,
        name: data.name,
        category: data.category ?? null,
        thumbnail: data.thumbnail ?? null,
        blocks: data.blocks as any,
      })
      .select("id, name, category, thumbnail, blocks, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { preset: row as UserPreset };
  });

export const deleteUserPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase } = context;
    const { error } = await supabase.from("user_presets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
