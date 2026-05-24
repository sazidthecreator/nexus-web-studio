CREATE TABLE public.vitals_reports (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  rating TEXT NOT NULL,
  url TEXT NOT NULL,
  ts BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vitals_project_ts ON public.vitals_reports(project_id, ts DESC);

ALTER TABLE public.vitals_reports ENABLE ROW LEVEL SECURITY;

-- Project owners can read their own vitals
CREATE POLICY "Project owners view vitals" ON public.vitals_reports
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- Inserts only via server (admin client bypasses RLS) — no client write policy.