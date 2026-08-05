import { expect, test } from '@playwright/test';

test('Learner Practice hides internal metadata and persists learner actions', async ({ page }) => {
  await page.goto('practice.html');
  await expect(page.locator('[data-practice-setup]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Quality review');
  await expect(page.locator('body')).not.toContainText('Quality-review pool');
  await expect(page.locator('body')).not.toContainText('Manual review record');

  await page.locator('[data-practice-size]').selectOption('5');
  await page.locator('[data-start-practice]').click();
  await expect(page.locator('[data-question-panel]')).toBeVisible();
  await expect(page.locator('[data-question-task]')).not.toHaveText(/^D[1-4][A-C]\b/);
  await expect(page.locator('[data-practice-flag]')).toBeVisible();
  await expect(page.locator('[data-practice-review-later]')).toBeVisible();
  await expect(page.locator('[data-practice-flashcard]')).toBeVisible();

  await page.locator('[data-practice-flag]').click();
  await page.locator('[data-practice-review-later]').click();
  await page.locator('[data-practice-flashcard]').click();
  await page.locator('[data-practice-flashcard]').click();

  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')));
  expect(state.review.flaggedIds).toHaveLength(1);
  expect(state.review.reviewLaterIds).toHaveLength(1);
  expect(state.flashcards.order).toHaveLength(1);
  expect(state.migration.importEnabled).toBe(false);

  await page.locator('[data-choice-index]').first().click();
  await page.locator('[data-submit-answer]').click();
  await expect(page.locator('[data-answer-feedback]')).not.toContainText('Mapped source keys');
});
