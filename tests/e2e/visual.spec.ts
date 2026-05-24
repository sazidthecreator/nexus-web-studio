import { test, expect } from '@playwright/test';

/**
 * Visual regression — snapshots key public routes.
 * First run generates baseline; later runs diff against it.
 */
const routes = [
  { name: 'home', path: '/' },
  { name: 'templates', path: '/templates' },
  { name: 'login', path: '/login' },
];

for (const route of routes) {
  test(`visual: ${route.name}`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    // Wait for fonts + scroll-reveal init
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`${route.name}.png`, { fullPage: true });
  });
}
