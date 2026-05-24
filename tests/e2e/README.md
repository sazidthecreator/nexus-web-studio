# Playwright — Visual + Perf Regression

## Setup (one-time)

```bash
bunx playwright install chromium webkit
```

## Run

```bash
# Local (boots dev server automatically)
bunx playwright test

# Against a deployed URL
PLAYWRIGHT_BASE_URL=https://your-site.lovable.app bunx playwright test

# Update visual baselines after intentional UI changes
bunx playwright test --update-snapshots

# Open last HTML report
bunx playwright show-report
```

## What's covered

- `visual.spec.ts` — full-page screenshot diffs for `/`, `/templates`, `/login` on desktop + mobile.
- `perf.spec.ts` — FCP / DCL / Load budgets via Navigation Timing.

Tweak budgets in `tests/e2e/perf.spec.ts` and add routes in `visual.spec.ts` as needed.
