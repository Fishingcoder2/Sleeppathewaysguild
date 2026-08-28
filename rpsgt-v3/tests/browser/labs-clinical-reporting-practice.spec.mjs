import {test,expect} from '@playwright/test';

test('Skills Labs exposes clinical reporting practice without merging it into scored lab catalog',async({page})=>{
  await page.goto('labs.html');
  const reporting=page.locator('#clinical-reporting-practice');
  await expect(reporting).toBeVisible();
  await expect(reporting).toContainText('Session-only teaching activity');
  await expect(reporting).toContainText('do not write completion into the lab-progress record');
  await expect(reporting.locator('a[href="sample-psg-report.html"]')).toBeVisible();
  await expect(reporting.locator('a[href="sample-pap-titration-report.html"]')).toBeVisible();
  await expect(reporting.locator('a[href="report-reading-practicum.html"]')).toBeVisible();
  await expect(reporting.locator('a[href="report-reading-answer-key.html"]')).toBeVisible();
  await expect(page.locator('.top-actions a[href="report-reading-practicum.html"]')).toBeVisible();
  await expect(reporting.locator('[data-lab-catalog]')).toHaveCount(0);
});
