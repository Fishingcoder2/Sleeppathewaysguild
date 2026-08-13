import { expect, test } from '@playwright/test';

test('ETCO2 trend uses mmHg references', async ({ page }) => {
  await page.goto('lab-respiratory-visual.html');
  await page.waitForLoadState('networkidle');
  const trend = page.locator('canvas[data-etco2-trend]');
  await expect(trend).toBeVisible();
  await expect(trend).toHaveAttribute('aria-label', /30, 40, and 50 mmHg/);
  const scale = await page.evaluate(() => window.RPSGTVisualPSGRenderer.ETCO2_TREND_SCALE);
  expect(scale.unit).toBe('mmHg');
  expect(scale.ticks).toEqual([50, 40, 30]);
  expect(scale.baselineDefault).toBe(40);
});
