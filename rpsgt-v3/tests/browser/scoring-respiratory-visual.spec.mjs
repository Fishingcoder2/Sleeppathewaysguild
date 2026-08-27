import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('lab-scoring.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('Scoring Lab keeps staging renderer while loading respiratory classification practicum',async({page})=>{
  const host=page.locator('[data-scoring-respiratory-visual]');
  await expect(host).toBeVisible();
  await expect(host).toContainText('Respiratory Event Classification');
  await expect.poll(()=>page.evaluate(()=>window.RPSGTVisualPSGRenderer&&window.RPSGTVisualPSGRenderer.VERSION)).toBe('0.3.0');
  await expect.poll(()=>page.evaluate(()=>window.RPSGTVisualRespiratoryRenderer&&window.RPSGTVisualRespiratoryRenderer.VERSION)).toBe('0.2.0');

  await host.locator('[data-respiratory-start]').click();
  await expect(host.locator('[data-respiratory-canvas]')).toBeVisible();
  await expect(host.locator('[data-respiratory-class]')).toHaveCount(4);

  await host.getByRole('button',{name:'Obstructive apnea pattern',exact:true}).click();
  await host.locator('[data-respiratory-check-class]').click();
  await expect(host).toContainText('Correct classification');
  await expect(host).toContainText('Prove the classification');

  await host.getByRole('button',{name:'Airflow nearly disappears while respiratory effort persists or increases.',exact:true}).click();
  await host.locator('[data-respiratory-check-evidence]').click();
  await expect(host).toContainText('Evidence matched');
  await expect(host.locator('[data-respiratory-next]')).toBeVisible();

  await expect.poll(()=>page.evaluate(()=>window.RPSGTVisualPSGRenderer&&window.RPSGTVisualPSGRenderer.VERSION)).toBe('0.3.0');
});
