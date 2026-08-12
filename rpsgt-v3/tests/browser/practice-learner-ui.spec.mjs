import { expect, test } from '@playwright/test';

test('Learner Practice hides internal metadata, uses Next to check, and preserves reviewed questions', async ({ page }) => {
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
  await expect(page.locator('[data-previous-question]')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Check answer'})).toBeHidden();

  await page.locator('[data-practice-flag]').click();
  await page.locator('[data-practice-review-later]').click();
  await page.locator('[data-practice-flashcard]').click();
  await page.locator('[data-practice-flashcard]').click();

  const savedActions=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')));
  expect(savedActions.review.flaggedIds).toHaveLength(1);
  expect(savedActions.review.reviewLaterIds).toHaveLength(1);
  expect(savedActions.flashcards.order).toHaveLength(1);
  expect(savedActions.migration.importEnabled).toBe(false);

  await page.locator('[data-choice-index]').first().click();
  await expect(page.locator('[data-next-question]')).toBeEnabled();
  await page.locator('[data-next-question]').click();
  const feedback=page.locator('[data-answer-feedback]');
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText('Answer & reasoning');
  await expect(feedback).toContainText('Correct answer');
  await expect(feedback).toContainText('Reasoning:');
  await expect(feedback).not.toContainText('Mapped source keys');
  await expect(page.locator('[data-next-question]')).toHaveText('Next question');

  const firstHistoryCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')).progress.history.length);
  expect(firstHistoryCount).toBe(1);

  await page.locator('[data-next-question]').click();
  await expect(page.locator('[data-question-number]')).toContainText('Question 2 of 5');
  await expect(page.locator('[data-previous-question]')).toBeEnabled();
  await page.locator('[data-previous-question]').click();
  await expect(page.locator('[data-question-number]')).toContainText('Question 1 of 5');
  await expect(page.locator('[data-answer-feedback]')).toBeVisible();
  const revisitedHistoryCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')).progress.history.length);
  expect(revisitedHistoryCount).toBe(1);
});
