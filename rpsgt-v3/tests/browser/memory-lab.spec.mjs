import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('memory.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('Memory Lab uses the shared term and formula libraries for matching',async({page})=>{
  await expect(page.locator('[data-memory-term-total]')).toHaveText('258');
  await expect(page.locator('[data-memory-formula-total]')).toHaveText('20');

  await page.locator('[data-start-matching]').first().click();
  const board=page.locator('[data-memory-board]');
  await expect(board.locator('.memory-tile')).toHaveCount(16);
  await expect(page.locator('[data-memory-matched]')).toHaveText('0 / 8');

  const pair=await board.locator('.memory-tile').first().getAttribute('data-pair');
  const samePair=board.locator(`.memory-tile[data-pair="${pair}"]`);
  await expect(samePair).toHaveCount(2);
  await samePair.nth(0).click();
  await samePair.nth(1).click();
  await expect(page.locator('[data-memory-matched]')).toHaveText('1 / 8');
  await expect(page.locator('[data-memory-moves]')).toHaveText('1');

  await page.locator('[data-memory-size]').selectOption('12');
  await page.locator('[data-start-matching]').first().click();
  await expect(board.locator('.memory-tile')).toHaveCount(24);
  await expect(page.locator('[data-memory-matched]')).toHaveText('0 / 12');
});

test('Memory Lab formula recall runs a 10-question bidirectional round',async({page})=>{
  await page.locator('[data-memory-pool]').selectOption('formulas');
  await expect(page.locator('[data-memory-category]')).toBeDisabled();
  await page.locator('[data-start-memory-recall]').first().click();

  const recall=page.locator('[data-memory-recall]');
  await expect(recall).toBeVisible();
  await expect(recall.locator('[data-recall-question-number]')).toHaveText('Question 1 of 10');
  await expect(recall.locator('[data-recall-choices] .recall-choice')).toHaveCount(4);
  await recall.locator('[data-recall-choices] .recall-choice').first().click();
  await expect(recall.locator('[data-recall-feedback]')).toBeVisible();
  await expect(recall.locator('[data-recall-next-question]')).toBeEnabled();
  await recall.locator('[data-recall-next-question]').click();
  await expect(recall.locator('[data-recall-question-number]')).toHaveText('Question 2 of 10');
});
