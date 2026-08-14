import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('glossary.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('restored RPSGT glossary exposes all 258 terms with search and active recall',async({page})=>{
  await expect(page.locator('[data-glossary-total]')).toHaveText('258');
  await expect(page.locator('[data-glossary-count]')).toHaveText('258 terms');
  await expect(page.locator('[data-glossary-grid] .glossary-entry')).toHaveCount(258);

  await page.locator('[data-glossary-search]').fill('MSLT');
  await expect(page.locator('[data-glossary-count]')).not.toHaveText('258 terms');
  await expect(page.locator('[data-glossary-grid] h3').filter({hasText:'MSLT'})).toBeVisible();

  await page.locator('[data-glossary-search]').fill('');
  await expect(page.locator('[data-glossary-count]')).toHaveText('258 terms');
  await page.locator('[data-glossary-category]').selectOption({label:'Units'});
  await expect(page.locator('[data-glossary-grid] .glossary-entry').first()).toBeVisible();
  await expect(page.locator('[data-glossary-count]')).not.toHaveText('258 terms');

  await page.locator('[data-start-recall]').first().click();
  const recall=page.locator('[data-glossary-recall]');
  await expect(recall).toBeVisible();
  await expect(recall.locator('[data-recall-answer]')).toBeHidden();
  await recall.locator('[data-recall-reveal]').click();
  await expect(recall.locator('[data-recall-answer]')).toBeVisible();
  await expect(recall.locator('[data-recall-definition]')).not.toHaveText('');
  await recall.locator('[data-recall-next]').click();
  await expect(recall.locator('[data-recall-position]')).toContainText('Term 2 of');
});

test('report and glossary links can prefill a flashcard or glossary search',async({page})=>{
  await page.goto('glossary.html?search=AHI');
  await expect(page.locator('[data-glossary-search]')).toHaveValue('AHI');
  await expect(page.locator('[data-glossary-count]')).not.toHaveText('258 terms');

  await page.goto('flashcards.html?search=FiO2');
  await expect(page.locator('[data-card-search]')).toHaveValue('FiO2');
  await expect(page.locator('[data-card-total]')).not.toHaveText('312 cards');
  await expect(page.locator('[data-card-front]')).toContainText('FiO2');
});
