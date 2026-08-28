import {test,expect} from '@playwright/test';

test('fictional PAP titration report stays synthetic, internally coherent, and discoverable',async({page})=>{
  await page.goto('sample-pap-titration-report.html');
  const host=page.locator('[data-sample-pap-report]');
  await expect(host).toBeVisible();
  await expect(host).toContainText('Fictional PAP Titration Polysomnogram');
  await expect(host).toContainText('Synthetic pressures');
  await expect(host).toContainText('not a real prescription');
  await expect(host).toContainText('Avery Morgan, MD');
  await expect(host).toContainText('Robertson, B., Marshall, B., & Carno, M. A. (2014)');
  await expect(host).toContainText('11 cm H2O');
  await expect(host).toContainText('1.5 /h');
  await expect(host).toContainText('24.0 min');

  const data=await page.evaluate(async()=>fetch('data/visual/sample-pap-titration-report.json').then(r=>r.json()));
  expect(data.meta.fictional).toBe(true);
  expect(data.therapy.pressureSegments).toHaveLength(4);
  const stageMinutes=data.study.stages.reduce((sum,item)=>sum+item.minutes,0);
  expect(Math.abs(stageMinutes-data.study.totalSleepMinutes)).toBeLessThan(.01);
  expect(data.therapy.pressureSegments.at(-1).residualAhi).toBe(data.therapy.finalPressureResidualAhi);
  expect(data.therapy.pressureSegments.at(-1).spo2Nadir).toBe(data.therapy.finalPressureNadirSpo2);

  await page.goto('reports.html');
  await expect(page.locator('#sample-clinical-reports')).toBeVisible();
  await expect(page.locator('a[href="sample-psg-report.html"]')).toBeVisible();
  await expect(page.locator('a[href="sample-pap-titration-report.html"]')).toBeVisible();

  await page.goto('lab-scoring.html');
  await expect(page.locator('a[href="sample-psg-report.html"]')).toBeVisible();
  await expect(page.locator('a[href="sample-pap-titration-report.html"]')).toBeVisible();
});
