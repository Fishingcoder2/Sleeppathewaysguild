import {test,expect} from '@playwright/test';

test('fictional report reading practicum compares diagnostic and PAP titration reports without learner-progress writes',async({page})=>{
  await page.goto('report-reading-practicum.html');
  const host=page.locator('[data-report-reading-practicum]');
  await expect(host).toBeVisible();
  await expect(host).toContainText('Fictional teaching boundary');
  await expect(host).toContainText('Session only');
  await expect(host).toContainText('Robertson, B., Marshall, B., & Carno, M. A. (2014)');
  const answers=[
    'The synthetic SpO₂ nadir was 82%.',
    'Respiratory disturbance is greater supine (31.5/h) than non-supine (9.2/h).',
    'Residual AHI decreases from 18.6/h at 5 cm H2O to 1.5/h at 11 cm H2O.',
    '24.0 minutes of supine REM were represented at the final teaching pressure.',
    'Synthesizing measured findings into impressions and recommendations.',
    'Current official guidance, physician orders, device instructions, and facility protocol.'
  ];
  for(let i=0;i<answers.length;i+=1){
    await expect(host).toContainText(`Question ${i+1} / 6`);
    await host.locator('[data-report-practicum-answer]',{hasText:answers[i]}).click();
    await host.locator('[data-report-practicum-check]').click();
    await expect(host.locator('.report-practicum-feedback')).toContainText('Correct');
    await host.locator('[data-report-practicum-next]').click();
  }
  await expect(host).toContainText('Report Reading Practicum complete');
  await expect(host).toContainText('6/6 · 100%');
  await expect(host.locator('a[href="sample-psg-report.html"]')).toBeVisible();
  await expect(host.locator('a[href="sample-pap-titration-report.html"]')).toBeVisible();
});

test('both fictional reports link back to the report reading practicum',async({page})=>{
  await page.goto('sample-psg-report.html');
  await expect(page.locator('a[href="report-reading-practicum.html"]')).toBeVisible();
  await page.goto('sample-pap-titration-report.html');
  await expect(page.locator('a[href="report-reading-practicum.html"]')).toBeVisible();
});
