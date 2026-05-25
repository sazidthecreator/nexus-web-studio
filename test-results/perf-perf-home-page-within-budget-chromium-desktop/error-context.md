# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: perf.spec.ts >> perf: home page within budget
- Location: tests/e2e/perf.spec.ts:13:1

# Error details

```
Error: FCP

expect(received).toBeLessThan(expected)

Expected: < 2500
Received:   2956
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "This page didn't load" [level=1] [ref=e3]
  - paragraph [ref=e4]: Something went wrong on our end. You can try refreshing or head back home.
  - generic [ref=e5]:
    - button "Try again" [ref=e6] [cursor=pointer]
    - link "Go home" [ref=e7] [cursor=pointer]:
      - /url: /
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Performance regression — budgets enforced via Navigation Timing + Paint Timing.
  5  |  * Thresholds are intentionally generous for local dev; tighten in CI against a prod build.
  6  |  */
  7  | const PERF_BUDGETS = {
  8  |   FCP_MS: 2500,
  9  |   LOAD_MS: 5000,
  10 |   DOM_CONTENT_LOADED_MS: 3000,
  11 | };
  12 | 
  13 | test('perf: home page within budget', async ({ page }) => {
  14 |   await page.goto('/', { waitUntil: 'load' });
  15 | 
  16 |   const metrics = await page.evaluate(() => {
  17 |     const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  18 |     const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
  19 |     return {
  20 |       fcp,
  21 |       load: nav.loadEventEnd - nav.startTime,
  22 |       dcl: nav.domContentLoadedEventEnd - nav.startTime,
  23 |     };
  24 |   });
  25 | 
  26 |   console.log('Perf metrics:', metrics);
> 27 |   expect(metrics.fcp, 'FCP').toBeLessThan(PERF_BUDGETS.FCP_MS);
     |                              ^ Error: FCP
  28 |   expect(metrics.load, 'Load').toBeLessThan(PERF_BUDGETS.LOAD_MS);
  29 |   expect(metrics.dcl, 'DCL').toBeLessThan(PERF_BUDGETS.DOM_CONTENT_LOADED_MS);
  30 | });
  31 | 
```