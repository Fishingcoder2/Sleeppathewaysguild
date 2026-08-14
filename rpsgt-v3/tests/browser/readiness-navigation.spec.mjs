import { expect, test } from '@playwright/test';

test('Readiness uses Next to check, supports Previous, flagging, flashcards, and optional reasoning', async ({ page }) => {
  await page.goto('readiness.html');
  await expect(page.locator('[data-readiness-home]')).toBeVisible();
  await page.locator('[data-start-readiness="25"]').click();
  await expect(page.locator('[data-question-panel]')).toBeVisible();

  await expect(page.getByRole('button',{name:'Check answer'})).toHaveCount(0);
  await expect(page.locator('[data-previous-question]')).toBeDisabled();
  await expect(page.locator('[data-flag-question]')).toBeVisible();
  await expect(page.locator('[data-make-flashcard]')).toBeVisible();
  await expect(page.locator('[data-next-question]')).toBeDisabled();

  await page.locator('[data-flag-question]').click();
  await page.locator('[data-make-flashcard]').click();
  const savedActions=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')));
  expect(savedActions.review.flaggedIds).toHaveLength(1);
  expect(savedActions.flashcards.order).toHaveLength(1);

  await page.locator('[data-choice-index]').first().click();
  await expect(page.locator('[data-next-question]')).toBeEnabled();
  await page.locator('[data-next-question]').click();

  await expect(page.locator('[data-question-number]')).toContainText('Question 1 of 25');
  const feedback=page.locator('[data-answer-feedback]');
  await expect(feedback).toBeVisible();
  await expect(feedback).not.toHaveAttribute('open','');
  await expect(page.locator('[data-answer-feedback-summary]')).toContainText('reasoning');
  await expect(feedback).not.toContainText('Mapped source keys');
  await expect(page.locator('[data-next-question]')).toHaveText('Next question');

  await page.locator('[data-answer-feedback-summary]').click();
  await expect(feedback).toHaveAttribute('open','');
  await expect(page.locator('[data-answer-feedback-body]')).toContainText('Correct answer');
  await expect(page.locator('[data-answer-feedback-body]')).toContainText('Reasoning:');
  await expect(page.locator('[data-answer-feedback-body]')).toContainText('Related reference materials');

  await page.locator('[data-next-question]').click();
  await expect(page.locator('[data-question-number]')).toContainText('Question 2 of 25');
  await expect(page.locator('[data-previous-question]')).toBeEnabled();

  await page.locator('[data-previous-question]').click();
  await expect(page.locator('[data-question-number]')).toContainText('Question 1 of 25');
  await expect(page.locator('[data-answer-feedback]')).toBeVisible();
  await expect(page.locator('[data-answer-feedback]')).not.toHaveAttribute('open','');

  const savedAfterBack=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')));
  expect(savedAfterBack.readiness.activeSession.answers).toBeTruthy();
  expect(Object.keys(savedAfterBack.readiness.activeSession.answers)).toHaveLength(1);
});