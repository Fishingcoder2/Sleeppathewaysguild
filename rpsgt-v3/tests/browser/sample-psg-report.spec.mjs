import {test,expect} from '@playwright/test';

test('fictional PSG report clearly separates technical data from physician interpretation',async({page})=>{
  await page.goto('sample-psg-report.html');
  const report=page.locator('[data-sample-psg-report]');
  await expect(report).toBeVisible();
  await expect(report).toContainText('Fictional Diagnostic Polysomnogram');
  await expect(report).toContainText('Fictional patient');
  await expect(report).toContainText('Synthetic values');
  await expect(report).toContainText('AHI');
  await expect(report).toContainText('18.1 /h');
  await expect(report).toContainText('SpO₂ nadir');
  await expect(report).toContainText('82%');
  await expect(report).toContainText('Technologist-Style Study Summary');
  await expect(report).toContainText('Sample Reading-Physician Interpretation');
  await expect(report).toContainText('Avery Morgan, MD');
  await expect(report).toContainText('Fictional reading physician');
  await expect(report).toContainText('not medical advice');
  await expect(report.locator('a[href="lab-scoring.html"]')).toBeVisible();
});

test('workstation links to the fictional PSG report example',async({page})=>{
  await page.goto('lab-scoring.html');
  const link=page.locator('a[href="sample-psg-report.html"]').first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/sample-psg-report\.html$/);
  await expect(page.locator('[data-sample-psg-report]')).toContainText('Fictional Diagnostic Polysomnogram');
});
