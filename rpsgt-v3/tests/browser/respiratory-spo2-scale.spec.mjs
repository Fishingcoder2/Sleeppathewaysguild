import { expect, test } from '@playwright/test';

test('respiratory SpO2 trend exposes percentage scale semantics', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('lab-respiratory-visual.html');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-respiratory-visual-host] canvas')).toBeVisible();

  const result = await page.evaluate(() => {
    const renderer = window.RPSGTVisualPSGRenderer;
    const scale = renderer && renderer.SPO2_PERCENT_SCALE;
    const channel = { type: 'spo2', amplitude: 0.86, phase: 0.3, features: [{ type: 'desaturation', start: 5, nadir: 10, end: 15, strength: 0.95 }] };
    return {
      installed: Boolean(renderer && renderer.__spo2PercentScaleInstalled),
      ticks: scale && scale.ticks,
      baseline: renderer && renderer.spo2Percent ? renderer.spo2Percent(channel, 0) : null,
      nadir: renderer && renderer.spo2Percent ? renderer.spo2Percent(channel, 10) : null
    };
  });

  expect(result.installed).toBe(true);
  expect(result.ticks).toEqual([100, 95, 90]);
  expect(result.baseline).toBeGreaterThan(96);
  expect(result.baseline).toBeLessThan(98);
  expect(result.nadir).toBeLessThan(result.baseline);
  expect(errors).toEqual([]);
});
