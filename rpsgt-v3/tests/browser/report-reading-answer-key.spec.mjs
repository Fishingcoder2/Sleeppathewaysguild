import {test,expect} from '@playwright/test';

test('annotated report reading answer key maps conclusions to fictional report evidence and reconciles AHI/RDI math',async({page})=>{
  await page.goto('report-reading-answer-key.html');
  const host=page.locator('[data-report-reading-answer-key]');
  await expect(host).toBeVisible();
  await expect(host).toContainText('Fictional teaching boundary');
  await expect(host).toContainText('Show the evidence before the conclusion');
  await expect(host).toContainText('SpO₂ nadir = 82%');
  await expect(host).toContainText('Supine AHI');
  await expect(host).toContainText('31.5 /h');
  await expect(host).toContainText('Non-supine AHI');
  await expect(host).toContainText('9.2 /h');
  await expect(host).toContainText('5 cm H2O → residual AHI 18.6/h');
  await expect(host).toContainText('11 cm H2O → residual AHI 1.5/h');
  await expect(host).toContainText('24.0 min');
  await expect(host).toContainText('Reconcile the report math');
  await expect(host).toContainText('Reported synthetic AHI: 18.1 /h');
  await expect(host).toContainText('Reported synthetic RDI: 21.6 /h');
  await expect(host).toContainText('Robertson, B., Marshall, B., & Carno, M. A. (2014)');
  await expect(host.locator('[data-answer-key-item]')).toHaveCount(6);
});

test('Reports Center exposes report practicum and annotated key as a teaching-report tile',async({page})=>{
  await page.goto('reports.html');
  const tile=page.locator('[data-report-reading-practicum-tile]');
  await expect(tile).toBeVisible();
  await expect(tile).toContainText('Report Reading Practicum');
  await expect(tile.locator('a[href="report-reading-practicum.html"]')).toBeVisible();
  await expect(tile.locator('a[href="report-reading-answer-key.html"]')).toBeVisible();
});

test('completed report practicum exposes annotated answer key handoff',async({page})=>{
  await page.goto('report-reading-practicum.html');
  const host=page.locator('[data-report-reading-practicum]');
  const answers=[
    'The synthetic SpO₂ nadir was 82%.',
    'Respiratory disturbance is greater supine (31.5/h) than non-supine (9.2/h).',
    'Residual AHI decreases from 18.6/h at 5 cm H2O to 1.5/h at 11 cm H2O.',
    '24.0 minutes of supine REM were represented at the final teaching pressure.',
    'Synthesizing measured findings into impressions and recommendations.',
    'Current official guidance, physician orders, device instructions, and facility protocol.'
  ];
  for(const answer of answers){
    await host.locator('[data-report-practicum-answer]',{hasText:answer}).click();
    await host.locator('[data-report-practicum-check]').click();
    await host.locator('[data-report-practicum-next]').click();
  }
  await expect(host).toContainText('6/6 · 100%');
  await expect(host.locator('[data-report-answer-key-link]')).toBeVisible();
  await expect(host.locator('[data-report-answer-key-link]')).toHaveAttribute('href','report-reading-answer-key.html');
});
