import { expect, test } from '@playwright/test';

test('respiratory visual pack supports 120-second routine and five-minute periodic views', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('lab-respiratory-visual.html');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-respiratory-visual-host] canvas')).toBeVisible();
  await expect(page.locator('[data-respiratory-visual-host]')).toContainText('120-second view');
  await expect(page.locator('[data-resp-view="30"]')).toBeVisible();
  await expect(page.locator('[data-resp-view="120"]')).toBeVisible();

  await page.locator('[data-resp-view="30"]').click();
  await expect(page.locator('[data-respiratory-visual-host]')).toContainText('30-second close-up');
  await page.locator('[data-resp-view="120"]').click();
  await expect(page.locator('[data-respiratory-visual-host]')).toContainText('120-second view');

  for (let i = 0; i < 7; i += 1) await page.locator('[data-resp-next]').click();
  await expect(page.locator('[data-respiratory-visual-host]')).toContainText('5-minute overview');
  await expect(page.locator('[data-respiratory-visual-host]')).toContainText('Case 8 of 9');
  await page.locator('[data-resp-reveal]').click();
  await expect(page.locator('[data-resp-reveal-host]')).toContainText('Cheyne-Stokes');

  await page.locator('[data-resp-next]').click();
  await expect(page.locator('[data-respiratory-visual-host]')).toContainText('Case 9 of 9');
  await expect(page.locator('[data-respiratory-visual-host]')).toContainText('5-minute overview');
  expect(errors).toEqual([]);
});
