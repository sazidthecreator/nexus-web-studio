---
name: sitely-build-protocol
description: Production build protocol for the Sitely no-code website builder. Use when implementing, refactoring, or shipping any feature in the Sitely codebase — enforces the 10 operating rules (R1–R10), the strict 7-phase implementation order plus CMS finale, the quality gate checklist, performance targets, and the canonical utility imports (blocks, offline-cache, dbQuery, errors, AI gateway, motion tokens, plan gating, toast helpers, CMS).
---

# Sitely Build Protocol

You are shipping production code for Sitely, a no-code website builder that is ~85% complete. The bar is top-1% craft, not "it works".

## Operating Rules (all mandatory)

- **R1 Read before write** — never edit a file unread this session; never call an unverified signature; never query an unconfirmed column.
- **R2 One phase at a time** — finish a phase fully (every matrix cell ✅) before starting the next.
- **R3 Atomic changes** — each change describable in one sentence, else split.
- **R4 Frozen files** — never edit: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `src/routeTree.gen.ts`, any `.env`.
- **R5 Migrations first** — write the SQL migration before any code that queries the new table.
- **R6 Type safety** — `npm run check` must report 0 errors after every change.
- **R7 Offline or it doesn't ship** — every user-facing feature handles offline (min: graceful error; preferred: queue + replay).
- **R8 Performance targets** (non-negotiable): published TTFB <100ms, editor load <2s on Fast 3G, image gen <5s, analytics query <500ms, command palette open <16ms, initial JS <200KB gzipped.
- **R9 Security** — every new table has RLS enabled in the migration; sanitize all user HTML with DOMPurify before render; never `dangerouslySetInnerHTML` without it.
- **R10 Quality gate** — before declaring a phase done: happy path ✓, error toast ✓, loading state ✓, mobile ≥320px ✓, keyboard (Tab/Enter/Esc) ✓, 0 TS errors ✓, unit test for core logic ✓, graceful offline ✓.

## Implementation order (strict, no parallelism)

1. Phase 1 — Custom Domain Resolution (≤6 files)
2. Phase 2 — Complete Offline/PWA (≤5 files)
3. Phase 3 — Multi-Page Editing UI (≤4 files)
4. Phase 4 — Analytics Dashboard (≤6 files)
5. Phase 5 — AI Features (≤7 files)
6. Phase 6 — Block Presets (≤5 files)
7. Phase 7 — 5 New Templates (≤2 files)
8. CMS Mode — Blog/CMS (≤12 files) — final differentiator, depends on phases 1–4.

## First five actions when starting work

1. Read source tree (don't assume layout).
2. Read `src/lib/blocks.ts` — understand `BLOCK_LIBRARY` and `createBlock()`.
3. Read `src/integrations/supabase/types.ts` for the DB schema.
4. Read `src/routes/sites.$slug.tsx` for the current loader.
5. Begin Phase 1 using the 5-Before-1 Rule (read 5 related files before writing 1).

## Craft standard (the difference between $10 and $200/mo)

- Feels inevitable, not assembled.
- Spring physics on transitions, never linear easing.
- Empty states are invitations, not blank space.
- Error messages tell you what to do, not what went wrong.
- Loading states match the shape of the content they replace.
- OKLCH colors via design tokens — no hardcoded hex in JSX.
- Every async action: optimistic UI + rollback on failure.

## Canonical utilities — always use these, don't reinvent

See `references/quick-reference.md` for full snippets. Summary:

- Blocks: `createBlock`, `uid`, `BLOCK_LIBRARY` from `@/lib/blocks`
- Offline: `cacheProject`, `getCachedProject`, `queueEdit`, `isOnline` from `@/lib/offline-cache`
- DB: always wrap with `dbQuery` from `@/lib/db-wrapper`
- Errors: `handleError`, `ValidationError` from `@/lib/errors`
- AI: `invokeLLM` from `@/server/_core/llm`
- Motion: `spring`, `duration`, `easing`, `prefersReducedMotion` from `@/lib/motion` — always branch on `prefersReducedMotion()`
- Plans: `usePlanGate`, `PaywallGate` from `@/lib/plans`
- Toasts: `saveWithToast` from `@/lib/toast-helpers`
- CMS: `scaffoldBlog`, `createCollection` from `@/lib/cms`

## Source-of-truth docs

The four-document stack defines the full system. Read before deep work:
`SITELY_MASTER_PROMPT.md`, `SITELY_TOP1PCT_ENHANCEMENT.md`, `SITELY_ELITE_VOL2.md`, `SITELY_ELITE_VOL3_SUPERSKILLSETS.md`.

Ship only at ≥90/100 on the Part 25 (Vol 2) production score.
