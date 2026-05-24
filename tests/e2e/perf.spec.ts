import { test, expect } from '@playwright/test';

/**
 * Performance regression — budgets enforced via Navigation Timing + Paint Timing.
 * Thresholds are intentionally generous for local dev; tighten in CI against a prod build.
 */
const PERF_BUDGETS = {
  FCP_MS: 2500,
  LOAD_MS: 5000,
  DOM_CONTENT_LOADED_MS: 3000,
};

test('perf: home page within budget', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    return {
      fcp,
      load: nav.loadEventEnd - nav.startTime,
      dcl: nav.domContentLoadedEventEnd - nav.startTime,
    };
  });

  console.log('Perf metrics:', metrics);
  expect(metrics.fcp, 'FCP').toBeLessThan(PERF_BUDGETS.FCP_MS);
  expect(metrics.load, 'Load').toBeLessThan(PERF_BUDGETS.LOAD_MS);
  expect(metrics.dcl, 'DCL').toBeLessThan(PERF_BUDGETS.DOM_CONTENT_LOADED_MS);
});
