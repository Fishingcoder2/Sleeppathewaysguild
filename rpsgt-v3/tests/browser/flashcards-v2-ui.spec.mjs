import {expect,test} from '@playwright/test';

test('Flashcard Center uses the v2-style library modal with custom cards and flag/unflag review',async({page})=>{
  await page.goto('flashcards.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading',{name:'Flashcard Center'})).toBeVisible();
  await expect(page.locator('[data-card-status]')).toBeVisible();
  await expect(page.locator('[data-card-shuffle]')).toBeVisible();
  await expect(page.locator('[data-card-stage]')).toBeHidden();

  await page.locator('[data-custom-card-open]').first().click();
  const dialog=page.locator('[data-custom-card-dialog]');
  await expect(dialog).toBeVisible();
  await dialog.locator('textarea[name="front"]').fill('What does AHI represent?');
  await dialog.locator('textarea[name="back"]').fill('Apnea-hypopnea index');
  await dialog.locator('textarea[name="explanation"]').fill('A respiratory-event index used in sleep-study interpretation.');
  await dialog.locator('input[name="domain"]').fill('Core Sleep Terms');
  await dialog.getByRole('button',{name:'Save flashcard'}).click();

  const review=page.locator('[data-card-stage]');
  await expect(review).toBeVisible();
  await expect(review.locator('.flashcard-front .flashcard-face-label')).toHaveText('FRONT OF CARD');
  await expect(page.locator('[data-card-front-topic]')).toHaveText('Core Sleep Terms');
  await expect(page.locator('[data-card-front]')).toHaveText('What does AHI represent?');
  await expect(page.locator('[data-card-modal-title]')).toHaveText('What does AHI represent?');

  await page.locator('[data-card-flip]').click();
  await expect(review.locator('.flashcard-back .flashcard-face-label')).toHaveText('BACK OF CARD');
  await expect(page.locator('[data-card-back]')).toHaveText('Apnea-hypopnea index');
  await expect(page.locator('[data-card-flip]')).toHaveText('Show front');

  const flag=page.locator('[data-card-flag]');
  await expect(flag).toHaveText('Flag for review');
  await flag.click();
  await expect(flag).toHaveText('Unflag');
  await expect(flag).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-card-flag-state]')).toBeVisible();

  await page.locator('[data-card-close]').click();
  await expect(review).toBeHidden();
  const coreCategory=page.locator('.flashcard-category').filter({has:page.locator('summary').filter({hasText:'Core Sleep Terms'})});
  await expect(coreCategory).toHaveClass(/flashcard-category--2/);
  await expect(page.locator('.flashcard-category summary').getByText('Core Sleep Terms',{exact:true})).toBeVisible();
  const tile=page.locator('[data-card-tile]').filter({hasText:'What does AHI represent?'});
  await expect(tile).toBeVisible();
  await expect(tile).toContainText('Flagged for review');

  await page.locator('[data-card-show-flagged]').click();
  await expect(page.locator('[data-card-status]')).toHaveValue('flagged');
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(review).toBeVisible();
  await page.locator('[data-card-flag]').click();
  await expect(page.locator('[data-card-empty]')).toBeVisible();
  await expect(review).toBeHidden();
});