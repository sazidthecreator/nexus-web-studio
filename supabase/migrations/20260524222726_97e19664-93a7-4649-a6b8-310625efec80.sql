CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  cover_url text,
  body text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_posts_status_check CHECK (status IN ('draft','published'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_project_slug ON public.blog_posts(project_id, slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_project_published ON public.blog_posts(project_id, status, published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own posts" ON public.blog_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners update own posts" ON public.blog_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners delete own posts" ON public.blog_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public can read published posts of published projects" ON public.blog_posts FOR SELECT TO anon, authenticated USING (status = 'published' AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.published = true AND p.slug IS NOT NULL));

CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();