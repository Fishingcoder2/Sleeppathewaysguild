import {test,expect} from '@playwright/test';

test('Scoring Lab presents a seven-station PSG workstation shell without changing station logic',async({page})=>{
  await page.goto('lab-scoring.html');
  await expect(page.locator('body')).toHaveClass(/scoring-workstation-page/);

  const dock=page.locator('[data-scoring-workstation-dock]');
  await expect(dock).toBeVisible();
  await expect(dock.locator('[data-workstation-station]')).toHaveCount(7);
  await expect(dock).toContainText('SPG PSG Workstation');
  await expect(dock).toContainText('0 / 7 reviewed');

  await page.locator('[data-workstation-open-first]').click();
  await expect(dock.locator('[data-workstation-station="stage-recognition"]')).toHaveClass(/active/);
  await expect(page.locator('[data-scoring-stage-visual]')).toBeVisible();

  await page.keyboard.press('Alt+4');
  await expect(dock.locator('[data-workstation-station="respiratory-classification"]')).toHaveClass(/active/);
  await expect(page.locator('[data-scoring-respiratory-visual]')).toBeVisible();

  const stageBox=page.locator('[data-scoring-station="stage-recognition"]');
  if(!(await stageBox.isChecked()))await stageBox.check();
  await expect(dock.locator('[data-workstation-station="stage-recognition"]')).toHaveClass(/complete/);
  await expect(dock.locator('[data-workstation-progress]')).toContainText('1 / 7 reviewed');

  await dock.locator('[data-workstation-checkpoint]').click();
  await expect(page.locator('[data-scoring-workspace]')).toBeVisible();
  await expect(page.locator('[data-scoring-form]')).toBeVisible();
  await expect(page.locator('[data-scoring-form] fieldset')).toHaveCount(10);
});
