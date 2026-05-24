
# Sitely — Full Build Plan

## Step 0 — Ingest the zip (`snug-build-forge-main`)

The current project is the blank Lovable starter (only `__root.tsx` + `index.tsx`). The zip is a substantial existing Sitely build: **166 source files**, 17 routes, 4 edge functions, 15 migrations. Notably, the `README.md`/`STATUS.md`/`TODO.md`/`IMPLEMENTATION_GUIDE.md` referenced in your prompt are **not actually present** in the zip — I'll treat the prompt itself as the spec of what's already done vs. what's left.

Actions:
1. Copy the entire zip contents over the project (replacing the placeholder `src/routes/index.tsx`, merging `package.json`, etc.). Do NOT overwrite `src/integrations/supabase/{client,types}.ts` or `routeTree.gen.ts` (they regenerate / are owned by Cloud).
2. `bun install` to sync deps from the zip's `package.json` and `bun.lock`.
3. Enable **Lovable Cloud** (`supabase--enable`). This provisions a fresh Supabase project with new credentials; the zip's `.env` and existing `supabase/migrations/*` will be re-applied against the new project.
4. Apply the 15 existing migrations as one consolidated baseline migration in the new project, then continue with Phase 4 + 6 migrations below.
5. Add secrets required by edge functions (`LOVABLE_API_KEY` via `ai_gateway--create`; the existing AI-keys flow handles per-user keys).

Smoke-test that auth, dashboard, templates, editor, and `/sites/:slug` all load before touching the phases.

## Phase 1 — Custom Domain Resolution

- Add `src/lib/custom-domain.ts`: server-side helper that takes a `Host` header, lowercases/strips port, and looks up `projects` by `custom_domain` via `supabaseAdmin`.
- New request middleware (`src/server/middleware.ts`, registered in `src/start.ts`'s `requestMiddleware`) that, for non-`localhost`/`*.lovable.app` hosts, resolves the project and rewrites the URL into `/sites/<slug>` before the router matches.
- Update `src/routes/sites.$slug.tsx` loader to accept the rewritten request unchanged.
- SSL: Lovable's edge handles cert provisioning for custom domains attached at the platform level. Surface in `publish-dialog` a copy-pastable A/CNAME + the existing DNS instructions; no in-app cert code.

## Phase 2 — Full Offline + PWA

- Extend `src/lib/offline-cache.ts`: add `cacheAllProjects(userId)` and `getCachedProjectList(userId)` (IndexedDB store keyed by user).
- On dashboard mount, hydrate from IndexedDB first, then refresh from Supabase and re-cache.
- `public/sw.js`: precache app shell (HTML, JS chunks via Vite manifest hashing, fonts, core CSS); runtime cache for `/sites/*` GETs (stale-while-revalidate); skip API/edge functions.
- `public/manifest.webmanifest` + register SW in `src/routes/__root.tsx` (client-only effect, prod only).
- Offline fallback panel in dashboard listing cached projects with an "offline" badge when `!navigator.onLine`.

## Phase 3 — Multi-page Editing UI

- New `src/components/editor/pages-panel.tsx`: list pages with add / rename (inline) / delete (with confirm) / drag-reorder (dnd-kit, already in deps).
- Add a `currentPageId` to editor state; persist last-opened page per project in `localStorage`.
- Editor toolbar dropdown to switch active page; canvas + layers + property editor all read `pages[currentIndex].blocks` instead of `pages[0]`.
- Sitemap/SEO/health panels updated to iterate all pages.
- `/sites/:slug/:pagePath?` route param so deep links work (default = first page).

## Phase 4 — Analytics + Edge Caching

Migration:
```sql
CREATE TABLE page_views (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  visitor_hash TEXT,                -- daily-rotating sha256(ip+ua+salt) for unique counts
  referrer TEXT,
  country TEXT
);
CREATE INDEX page_views_project_ts ON page_views(project_id, ts DESC);
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read" ON page_views FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
-- inserts go through supabaseAdmin (no insert policy needed)
```
(`form_submissions` already exists per the zip; verify schema and add missing columns/policies only if needed.)

- `src/server/analytics.ts`: server fns `recordPageView({slug, path})` (admin client) and `getAnalytics({projectId, range})` (auth-protected, aggregates daily counts).
- Beacon: `<script>navigator.sendBeacon('/api/public/pv', ...)</script>` injected into rendered `/sites/:slug` HTML. New route `src/routes/api/public/pv.tsx` POST handler.
- Edge caching: in `sites.$slug.tsx` server handler, set `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` and `Cloudflare-CDN-Cache-Control`. Bust cache on publish by changing a `published_version` int (new column via migration) appended as ETag.
- `src/components/dashboard/analytics-panel.tsx`: line chart (recharts, already in deps) of page views, table of top pages, form submission count per form.

## Phase 5 — AI Image Generation + Translate-and-Publish

- New block type `image-generation` in `src/lib/blocks.ts` + renderer in `src/components/blocks/image-generation-block.tsx`. In editor: prompt input + Generate button calls a new server fn `generateBlockImage` that hits the Lovable AI Gateway (`google/gemini-2.5-flash-image`), uploads the resulting PNG to Supabase Storage, and stores the public URL in the block's `props.src`.
- One-click translate-publish: extend the existing `translate-panel`. New button "Translate & publish all" creates/updates rows in `project_locales` for each enabled language (using existing translate flow), then sets each locale's `published=true`. Show progress + per-language status.

## Phase 6 — Block Presets

Migration:
```sql
CREATE TABLE user_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  blocks JSONB NOT NULL,
  category TEXT,
  thumbnail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner all" ON user_presets FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

- `src/server/presets.ts`: server fns `listPresets`, `createPreset(name, blocks, category)`, `deletePreset(id)`.
- Editor context-menu action "Save as preset…" on selected block(s) → dialog → calls `createPreset`; auto-generates a thumbnail from the block via existing `auto-thumbnail` helper.
- `src/components/editor/presets-panel.tsx`: new tab in left sidebar alongside Blocks/Layers/AI. Click inserts at current selection.

## Phase 7 — +5 Templates

Extend `src/lib/templates.ts` (or new `templates-extra.ts` and re-export) with: `saas-pricing`, `job-board`, `marketplace`, `booking`, `coming-soon`. Each = full block tree + branding + categories + thumbnail (generated via existing `auto-thumbnail`).

## Hard rules respected

- `client.ts`, `types.ts`, `routeTree.gen.ts`, `.env`: never edited.
- All new tables: RLS enabled with scoped policies.
- All schema changes: new migration files.
- All caching/storage: IndexedDB on client, edge cache for read paths.
- Tokens only — no hex colors in components.

## Risk / scope notes

This is genuinely 7 phases' worth of work in one shot — closer to a multi-day implementation than a single iteration. I'll execute top-to-bottom and stop only if a blocker requires your input (e.g., a missing secret, an ambiguous UX decision). Expect a long run with many file writes and one consolidated migration per phase.

If you'd rather de-risk, the natural split is **Step 0 + Phases 1–3** in iteration one, **4–7** in iteration two — but per your answer I'll proceed with all of it.
