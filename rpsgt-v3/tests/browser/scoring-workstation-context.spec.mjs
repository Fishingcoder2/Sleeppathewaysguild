import {test,expect} from '@playwright/test';

test('PSG workstation shows synthetic hypnogram summary and three-pane split context',async({page})=>{
  await page.goto('lab-scoring.html');
  const context=page.locator('[data-ws-context-console]');
  await expect(context).toBeVisible();
  await expect(context).toContainText('Teaching Night Overview');
  await expect(context).toContainText('Synthetic 6-hour compressed summary');
  await expect(context.locator('[data-ws-summary-block]')).toHaveCount(30);
  await expect(context.locator('[data-ws-context-pane]')).toHaveCount(3);
  await expect(context.locator('[data-ws-context-canvas]')).toHaveCount(3);
  await expect(context.locator('[data-ws-summary-selected]')).toContainText('Block 11');

  await context.locator('[data-ws-summary-block="23"]').first().click();
  await expect(context.locator('[data-ws-summary-selected]')).toContainText('Block 24');
  await expect(context.locator('[data-ws-context-pane="0"] .ws-context-pane-head')).toContainText('R');

  await context.locator('[data-ws-summary-prev]').click();
  await expect(context.locator('[data-ws-summary-selected]')).toContainText('Block 23');
  await context.locator('[data-ws-summary-next]').click();
  await expect(context.locator('[data-ws-summary-selected]')).toContainText('Block 24');

  const toggle=context.locator('[data-ws-split-toggle]');
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed','false');
  await expect(context.locator('[data-ws-split-context]')).toBeHidden();
  await toggle.click();
  await expect(context.locator('[data-ws-split-context]')).toBeVisible();
});

test('teaching-night summary remains explicitly synthetic and compressed',async({page})=>{
  await page.goto('lab-scoring.html');
  const context=page.locator('[data-ws-context-console]');
  await expect(context).toContainText('Each overview block represents 12 compressed teaching minutes');
  await expect(context).toContainText('not contiguous patient epochs');
  await expect(context.locator('[data-ws-session-marks]')).toBeVisible();
});
