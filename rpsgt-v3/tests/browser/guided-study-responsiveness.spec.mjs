import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Guided Study leaves loading state and keeps the browser event loop responsive', async ({ page }) => {
  test.setTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('study.html', { waitUntil: 'domcontentloaded' });

  const cards = page.locator('.task-map-card');
  await expect(cards).toHaveCount(12, { timeout: 7000 });
  await expect(page.locator('[data-blueprint-summary]')).not.toContainText('loading domains');
  await expect(page.locator('[data-blueprint-map]')).not.toContainText('Loading the RPSGT learning map');
  await expect(page.locator('[data-guided-trail-dashboard]')).not.toContainText('Loading Guided Study progress');

  const heartbeat = await page.evaluate(() => new Promise(resolve => {
    const started = performance.now();
    setTimeout(() => resolve(performance.now() - started), 50);
  }));
  expect(heartbeat).toBeLessThan(1500);
  expect(errors).toEqual([]);
});
