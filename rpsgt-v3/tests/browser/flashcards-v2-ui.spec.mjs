import {expect,test} from '@playwright/test';

test('Flashcard Center keeps custom cards and explicit flag/unflag review flow',async({page})=>{
  await page.goto('flashcards.html');
  await expect(page.getByRole('heading',{name:'Flashcard Center'})).toBeVisible();
  await expect(page.locator('[data-card-status]')).toBeVisible();
  await expect(page.locator('[data-card-shuffle]')).toBeHidden();

  await page.locator('[data-custom-card-open]').first().click();
  const dialog=page.locator('[data-custom-card-dialog]');
  await expect(dialog).toBeVisible();
  await dialog.locator('textarea[name="front"]').fill('What does AHI represent?');
  await dialog.locator('textarea[name="back"]').fill('Apnea-hypopnea index');
  await dialog.locator('textarea[name="explanation"]').fill('A respiratory-event index used in sleep-study interpretation.');
  await dialog.getByRole('button',{name:'Save flashcard'}).click();

  await expect(page.locator('[data-card-stage]')).toBeVisible();
  await expect(page.locator('[data-card-front]')).toHaveText('What does AHI represent?');
  await expect(page.locator('[data-card-shuffle]')).toBeVisible();
  const flag=page.locator('[data-card-flag]');
  await expect(flag).toHaveText('Flag for review');
  await expect(flag).toHaveAttribute('aria-pressed','false');

  await flag.click();
  await expect(flag).toHaveText('Unflag');
  await expect(flag).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-card-flag-state]')).toBeVisible();

  await page.locator('[data-card-show-flagged]').click();
  await expect(page.locator('[data-card-status]')).toHaveValue('flagged');
  await expect(page.locator('[data-card-stage]')).toBeVisible();

  await flag.click();
  await expect(page.locator('[data-card-empty]')).toBeVisible();
  await expect(page.locator('[data-card-stage]')).toBeHidden();
});