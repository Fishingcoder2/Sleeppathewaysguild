import {test,expect} from '@playwright/test';

test('seven-station scoring review is a guided auto-recording walkthrough',async({page})=>{
  await page.goto('lab-scoring.html');
  const host=page.locator('[data-scoring-stations]');
  await expect(host).toBeVisible();
  await expect(host.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(host).toContainText('Station 1 of 7');
  await expect(host).toContainText('0/7 complete');
  await expect(host.locator('[data-scoring-station-complete]')).toHaveText('Complete station & continue');

  const firstTitle=await host.locator('.scoring-walkthrough-card h3').textContent();
  expect(firstTitle).toContain('Wake, N1, N2, N3, and REM recognition');

  await host.locator('[data-scoring-station-complete]').click();
  await expect(host).toContainText('Station 2 of 7');
  await expect(host).toContainText('1/7 complete');
  await expect(host.locator('[data-scoring-station-open="0"]')).toContainText('Done');

  const record=await page.evaluate(()=>{
    const raw=localStorage.getItem('spg_rpsgt_v3');
    return raw?JSON.parse(raw).labs?.scoring:null;
  });
  expect(record).not.toBeNull();
  expect(record.checklist['stage-recognition']).toBe(true);
  expect(record.checklist['stage-transitions']).toBe(false);

  await host.locator('[data-scoring-station-previous]').click();
  await expect(host).toContainText('Station 1 of 7');
  await expect(host).toContainText('This station is already recorded');
  await expect(host.locator('[data-scoring-station-next]')).toHaveText('Continue to next station');
});
