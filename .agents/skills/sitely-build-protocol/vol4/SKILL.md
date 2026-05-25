---
name: sitely-elite-vol4
description: "Final Sitely Vol 4 skill: testing scaffold, component spec, onboarding, migrations, Stripe, and completion gate. Use when running Phase verification, CI setup, or preparing a production deploy."
argument-hint: Which Part or task to apply? (e.g., testing, components, onboarding, migrations, stripe, gate)
disable-model-invocation: true
---

# Sitely — Elite Layer Vol.4 (Final)

This skill packages the final file in the five-file Sitely stack. Use it to:
- scaffold and verify tests (Vitest + Playwright)
- enforce component library overrides (OKLCH + shadcn policy)
- implement onboarding flows and first-publish celebration
- run safe schema migrations and large-batch playbooks
- integrate Stripe checkout, webhooks, and pricing copy
- run the five-file completion gate before ship

## Quick Commands

Run unit tests and coverage:

```
npm run test:unit
```

Run Playwright smoke suite (local):

```
npm run test:e2e -- --project=chromium
```

Generate coverage report:

```
npm run test:unit -- --coverage
```

CI sanity:

```
npm run check && npm run build && npm run test:unit && npm run test:e2e
```

## Parts Supported
- Part 36 — Testing scaffold (Vitest config, tests/setup, unit templates, Playwright smoke)
- Part 37 — Component library spec (shadcn/ui override rules, Button, Skeleton, Toast, Form patterns)
- Part 38 — Onboarding flow (dashboard tour, editor tips, first-publish celebration)
- Part 39 — Data migration playbook (schema versioning, migration rules, batch migration pattern)
- Part 40 — Stripe integration, pricing, GTM prompt

## How to use this skill

1. Pick a Part (36/37/38/39/40) or `gate` to run the completion checklist.
2. Execute the First-Five reads (per Sitely protocol) before editing code.
3. For DB changes: write migration first, run it on staging, then deploy app changes.
4. For tests: add unit tests under `tests/unit/` and E2E under `tests/e2e/`.
5. For Stripe: ensure env vars are configured and run webhook tests with the Stripe CLI.

## Testing scaffold (high level)

- Use `vitest.config.ts` exactly as specified in Vol4 Part 36.1.
- Add `tests/setup.ts` mocks for Supabase, LLM, and IndexedDB to avoid external calls.
- Follow unit test templates per phase (copy under `tests/unit/`).
- Use `playwright.config.ts` and `tests/e2e/` smoke specs; add `global-setup.ts` to seed auth storage.

## Component library rules (37 — override, not rewrite)

- Use shadcn/ui components. Override tokens and behaviors only.
- Design tokens must use OKLCH; interactive states use spring physics.
- Buttons, Skeletons, Toasts, and FormField patterns are canonical — import and reuse.

## Onboarding & UX (38)

- Implement dashboard tour, editor tip strip, and publish celebration as described.
- Store lightweight state in `profiles.onboarding_step` and localStorage for ephemeral tips.
- Use confetti and motion sparingly; always honor `prefersReducedMotion()`.

## Migration playbook (39)

- Schema versioning: store `schemaVersion` on projects and migrate on first read via `migrateProject`.
- Follow rules: additive-only changes, backfill before NOT NULL, timestamped migration files, two-phase drops/renames.
- For large datasets, use batched Edge Function migration with admin guard and progress logs.

## Stripe + Pricing (40)

- Add webhook handler in `supabase/functions/stripe-webhook` and checkout helpers in `src/server/billing.ts`.
- Ensure required env vars (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, price IDs) are set in secrets.
- Test webhooks locally via `stripe listen --forward-to localhost:8787/stripe-webhook`.

## Completion gate (`gate`)

Before marking the five-file stack complete, verify:

- All five Sitely files are present and applied.
- TypeScript: 0 errors (`npm run check`).
- Vitest coverage: lines ≥ 80%.
- Playwright smoke: all tests pass.
- Lighthouse/perf targets met for sample published site.
- Stripe webhooks exercised in staging with Stripe CLI.

If any check fails, list failing items and produce an actionable remediation plan with file-level pointers.

## Example prompts

- "start Part 36: scaffold vitest and add global setup"
- "run gate: execute completion checklist and report failures"
- "implement onboarding: add dashboard tour and publish celebration components"

---
This SKILL.md is a workspace-scoped protocol for finalizing Sitely Vol 4. Follow the Sitely build protocol skill for phase ordering and the 5-before-1 rule.
