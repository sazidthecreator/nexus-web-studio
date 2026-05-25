---
name: sitely-build-protocol
description: Production build protocol for Sitely, a no-code website builder. Use when the user invokes /skill:sitely-build-protocol, asks to ship a Sitely phase (custom domain, offline/PWA, multi-page editing, analytics, AI features, block presets, templates, CMS/blog), or requests top-1% craft work on Sitely. Enforces phase order, frozen files, RLS-first migrations, offline handling, perf targets, and the 5-Before-1 read rule.
---

# Sitely Build Protocol

Sitely is a no-code website builder ~85% complete. Bar is top-1% craft, not "it works". Ship only at ≥90/100 on the Vol 2 Part 25 production score.

## Operating Rules (all mandatory)

- **R1 Read before write** — never edit a file unread this session; never call an unverified signature; never query an unconfirmed column.
- **R2 One phase at a time** — finish a phase fully before starting the next.
- **R3 Atomic changes** — each change describable in one sentence, else split.
- **R4 Frozen files** — NEVER edit: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `src/routeTree.gen.ts`, any `.env`.
- **R5 Migrations first** — write SQL migration before any code that queries the new table.
- **R6 Type safety** — 0 TS errors after every change.
- **R7 Offline or it doesn't ship** — every user-facing feature handles offline (min: graceful error; preferred: queue + replay).
- **R8 Perf targets**: published TTFB <100ms, editor load <2s Fast 3G, image gen <5s, analytics query <500ms, command palette <16ms, initial JS <200KB gz.
- **R9 Security** — every new table has RLS in the migration; sanitize user HTML with DOMPurify before render; never `dangerouslySetInnerHTML` without it.
- **R10 Quality gate** — before declaring phase done: happy path ✓, error toast ✓, loading state ✓, mobile ≥320px ✓, keyboard (Tab/Enter/Esc) ✓, 0 TS errors ✓, unit test for core logic ✓, graceful offline ✓.

## Phase order (strict, no parallelism)

1. Custom Domain Resolution (≤6 files)
2. Complete Offline/PWA (≤5 files)
3. Multi-Page Editing UI (≤4 files)
4. Analytics Dashboard (≤6 files)
5. AI Features (≤7 files)
6. Block Presets (≤5 files)
7. 5 New Templates (≤2 files)
8. CMS Mode — Blog/CMS (≤12 files) — depends on phases 1–4

## First five actions when starting a fresh phase

1. Read source tree (don't assume layout).
2. Read `src/lib/blocks.ts` — understand `BLOCK_LIBRARY` and `createBlock()`.
3. Read `src/integrations/supabase/types.ts` for DB schema.
4. Read `src/routes/sites.$slug.tsx` for current loader.
5. Begin work using the **5-Before-1 Rule**: read 5 related files before writing 1.

## Craft standard (the $10 vs $200/mo difference)

- Feels inevitable, not assembled.
- Spring physics on transitions, never linear easing.
- Empty states are invitations, not blank space.
- Error messages tell you what to do, not what went wrong.
- Loading states match the shape of the content they replace.
- OKLCH design tokens — no hardcoded hex in JSX.
- Every async action: optimistic UI + rollback on failure.

## Canonical utilities — use these, don't reinvent

See `references/quick-reference.md` for snippets.

- **Blocks**: `createBlock`, `uid`, `BLOCK_LIBRARY` from `@/lib/blocks`
- **Offline**: `cacheProject`, `getCachedProject`, `queueEdit`, `isOnline` from `@/lib/offline-cache`
- **DB**: wrap with `dbQuery` from `@/lib/db-wrapper`
- **Errors**: `handleError`, `ValidationError` from `@/lib/errors`
- **AI**: `invokeLLM` from `@/server/_core/llm`
- **Motion**: `spring`, `duration`, `easing`, `prefersReducedMotion` from `@/lib/motion` — always branch on `prefersReducedMotion()`
- **Plans**: `usePlanGate`, `PaywallGate` from `@/lib/plans`
- **Toasts**: `saveWithToast` from `@/lib/toast-helpers`
- **CMS**: `scaffoldBlog`, `createCollection` from `@/lib/cms`

## Source-of-truth docs

Read before deep work: `SITELY_MASTER_PROMPT.md`, `SITELY_TOP1PCT_ENHANCEMENT.md`, `SITELY_ELITE_VOL2.md`, `SITELY_ELITE_VOL3_SUPERSKILLSETS.md`.

## Workflow

When user says `start` or names a phase:
1. Confirm phase + file budget.
2. Execute First-Five reads.
3. Propose atomic changes within budget.
4. Implement, verify R6/R10 gate.
5. Report files-changed count vs budget, then hand off to next phase (don't auto-start).
