CREATE TABLE IF NOT EXISTS public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  kind text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  output_text text,
  output_url text,
  block_id text,
  locale text,
  revert_payload jsonb,
  reverted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_project_created
  ON public.ai_generations (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_created
  ON public.ai_generations (user_id, created_at DESC);

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai generations"
  ON public.ai_generations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ai generations"
  ON public.ai_generations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ai generations"
  ON public.ai_generations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own ai generations"
  ON public.ai_generations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);