-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles readable by all authenticated" on public.profiles
  for select to authenticated using (true);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Untitled Project',
  description text,
  thumbnail_url text,
  content jsonb not null default '{"pages":[{"id":"home","name":"Home","blocks":[]}]}'::jsonb,
  seo jsonb not null default '{"title":"","description":"","ogImage":""}'::jsonb,
  template_id text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users view own projects" on public.projects
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own projects" on public.projects
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own projects" on public.projects
  for update to authenticated using (auth.uid() = user_id);
create policy "Users delete own projects" on public.projects
  for delete to authenticated using (auth.uid() = user_id);

create index projects_user_id_idx on public.projects(user_id);
create index projects_updated_at_idx on public.projects(updated_at desc);

create or replace function public.update_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger projects_updated_at before update on public.projects
  for each row execute function public.update_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Public assets bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can list assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assets');

CREATE POLICY "Anyone can read assets by URL"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'assets');

CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own assets" ON public.assets
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own assets" ON public.assets
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own assets" ON public.assets
FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_assets_user ON public.assets(user_id, created_at DESC);

create table public.imported_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  source_url text not null,
  category text not null default 'Imported',
  thumbnail_url text,
  content jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.imported_templates enable row level security;

create policy "Users view own imported templates"
  on public.imported_templates for select
  to authenticated using (auth.uid() = user_id);
create policy "Users insert own imported templates"
  on public.imported_templates for insert
  to authenticated with check (auth.uid() = user_id);
create policy "Users delete own imported templates"
  on public.imported_templates for delete
  to authenticated using (auth.uid() = user_id);

create index imported_templates_user_idx on public.imported_templates(user_id, created_at desc);

do $$ begin
  create type public.ai_provider as enum ('groq','gemini','huggingface','cohere','mistral');
exception when duplicate_object then null; end $$;

create table if not exists public.user_ai_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider public.ai_provider not null,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.user_ai_keys enable row level security;

create policy "Users view own ai keys" on public.user_ai_keys
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own ai keys" on public.user_ai_keys
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own ai keys" on public.user_ai_keys
  for update to authenticated using (auth.uid() = user_id);
create policy "Users delete own ai keys" on public.user_ai_keys
  for delete to authenticated using (auth.uid() = user_id);

create trigger user_ai_keys_updated_at
  before update on public.user_ai_keys
  for each row execute function public.update_updated_at();

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider public.ai_provider not null,
  day date not null default current_date,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, provider, day)
);

alter table public.ai_usage enable row level security;

create policy "Users view own ai usage" on public.ai_usage
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own ai usage" on public.ai_usage
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own ai usage" on public.ai_usage
  for update to authenticated using (auth.uid() = user_id);

create index if not exists ai_usage_user_day_idx on public.ai_usage (user_id, day desc);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS published_content jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS head_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS preview_enabled boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS projects_custom_domain_unique
  ON public.projects (lower(custom_domain))
  WHERE custom_domain IS NOT NULL;

DROP POLICY IF EXISTS "Public can view published projects" ON public.projects;
CREATE POLICY "Public can view published projects"
ON public.projects FOR SELECT
TO anon, authenticated
USING (published = true AND slug IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content jsonb NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_project_created
  ON public.project_snapshots (project_id, created_at DESC);

ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own snapshots"
ON public.project_snapshots FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users insert own snapshots"
ON public.project_snapshots FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own snapshots"
ON public.project_snapshots FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.prune_old_snapshots()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.project_snapshots
  WHERE project_id = NEW.project_id
    AND id NOT IN (
      SELECT id FROM public.project_snapshots
      WHERE project_id = NEW.project_id
      ORDER BY created_at DESC
      LIMIT 20
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prune_snapshots_trigger ON public.project_snapshots;
CREATE TRIGGER prune_snapshots_trigger
AFTER INSERT ON public.project_snapshots
FOR EACH ROW EXECUTE FUNCTION public.prune_old_snapshots();

CREATE TABLE public.form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  form_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_responses_project ON public.form_responses(project_id, created_at DESC);
CREATE INDEX idx_form_responses_user ON public.form_responses(user_id);

ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own form responses"
  ON public.form_responses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners delete own form responses"
  ON public.form_responses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.form_submit_rate (
  ip TEXT NOT NULL,
  project_id UUID NOT NULL,
  last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, project_id)
);
ALTER TABLE public.form_submit_rate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to rate limits"
  ON public.form_submit_rate FOR SELECT
  USING (false);

CREATE TABLE public.project_locales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  locale TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, locale)
);

CREATE INDEX idx_project_locales_project ON public.project_locales(project_id);

ALTER TABLE public.project_locales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own locales"
  ON public.project_locales FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners insert own locales"
  ON public.project_locales FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own locales"
  ON public.project_locales FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners delete own locales"
  ON public.project_locales FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Public can read locales of published projects"
  ON public.project_locales FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_locales.project_id
      AND p.published = true
      AND p.slug IS NOT NULL
  ));

CREATE TRIGGER trg_project_locales_updated
  BEFORE UPDATE ON public.project_locales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  page_id text NOT NULL,
  block_id text,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  parent_id uuid REFERENCES public.project_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners view comments"
ON public.project_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Authenticated users insert comments on accessible projects"
ON public.project_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Comment authors update their comments"
ON public.project_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Comment authors or project owners delete comments"
ON public.project_comments FOR DELETE TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
);

CREATE TRIGGER trg_project_comments_updated
BEFORE UPDATE ON public.project_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_old_snapshots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;