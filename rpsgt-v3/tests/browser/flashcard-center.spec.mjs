import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('flashcards.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('complete V2 deck loads, filters, persists learner state, and accepts custom cards without duplicates',async({page})=>{
  const stage=page.locator('[data-card-stage]');
  await expect(stage).toBeVisible();
  await expect(page.locator('[data-card-empty]')).toBeHidden();
  await expect(page.locator('[data-card-total]')).toHaveText('312 cards');
  await expect(page.locator('[data-card-position]')).toHaveText('Card 1 of 312');
  await expect(page.locator('[data-card-front]')).toHaveText('FiO2');
  await expect(page.locator('[data-card-context]')).toContainText('Oxygen, CO2 & Units');

  await page.locator('[data-card-flip]').click();
  await expect(page.locator('[data-flashcard]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-card-back]')).toContainText('Fraction of inspired oxygen');
  await expect(page.locator('[data-card-memory]')).toContainText('FiO2 is what goes in');
  await expect(page.locator('[data-card-resources-wrap]')).toBeHidden();

  await page.locator('[data-card-next]').click();
  await expect(page.locator('[data-card-position]')).toHaveText('Card 2 of 312');
  await expect(page.locator('[data-card-front]')).toHaveText('SpO2');
  await page.locator('[data-card-prev]').click();
  await expect(page.locator('[data-card-position]')).toHaveText('Card 1 of 312');

  await page.locator('[data-card-flag]').click();
  await expect(page.locator('[data-card-flag]')).toHaveText('Remove flag');
  await page.locator('[data-card-mastered]').click();
  await expect(page.locator('[data-card-mastered]')).toHaveText('Mastered ✓');

  await page.reload();
  await expect(page.locator('[data-card-total]')).toHaveText('312 cards');
  await expect(page.locator('[data-card-flag]')).toHaveText('Remove flag');
  await expect(page.locator('[data-card-mastered]')).toHaveText('Mastered ✓');

  await page.locator('[data-card-category]').selectOption({label:'Sleep Disorders & Clinical Terms'});
  await expect(page.locator('[data-card-total]')).toHaveText('17 cards');
  await page.locator('[data-card-category]').selectOption('all');
  await page.locator('[data-card-search]').fill('FiO2');
  await expect(page.locator('[data-card-total]')).not.toHaveText('312 cards');
  await page.locator('[data-card-search]').fill('');
  await expect(page.locator('[data-card-total]')).toHaveText('312 cards');

  await page.locator('[data-custom-card-open]').first().click();
  const dialog=page.locator('[data-custom-card-dialog]');
  await expect(dialog).toBeVisible();
  await dialog.locator('[name="front"]').fill('What is the AHI formula?');
  await dialog.locator('[name="back"]').fill('Apneas plus hypopneas divided by total sleep time in hours.');
  await dialog.locator('[name="explanation"]').fill('Convert total sleep time to hours before dividing.');
  await dialog.locator('[name="memoryClue"]').fill('Events divided by sleep hours.');
  await dialog.locator('[name="coachBobNote"]').fill('Write the denominator with its unit before calculating.');
  await dialog.locator('[name="category"]').fill('Report Math & Indexes');
  await dialog.locator('[name="domain"]').fill('Study Analysis and Reporting');
  await dialog.locator('[name="task"]').fill('Generate and verify report');
  await dialog.locator('[name="topic"]').fill('Report calculations');
  await dialog.locator('button[type="submit"]').click();

  await expect(page.locator('[data-card-total]')).toHaveText('313 cards');
  await expect(page.locator('[data-card-front]')).toHaveText('What is the AHI formula?');
  await expect(page.locator('[data-card-context]')).toContainText('Report calculations');

  await page.locator('[data-custom-card-open]').first().click();
  await dialog.locator('[name="front"]').fill('  What is the AHI formula?  ');
  await dialog.locator('[name="back"]').fill('Apneas plus hypopneas divided by total sleep time in hours.');
  await dialog.locator('button[type="submit"]').click();
  await expect(page.locator('[data-card-total]')).toHaveText('313 cards');

  await page.locator('[data-card-status]').selectOption('custom');
  await expect(page.locator('[data-card-total]')).toHaveText('1 card');
  await expect(page.locator('[data-card-front]')).toHaveText('What is the AHI formula?');

  const storage=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
  expect(Object.keys(storage)).toEqual(['spg_rpsgt_v3']);
  const record=JSON.parse(storage.spg_rpsgt_v3);
  expect(record.flashcards.catalogVersion).toBe('2026-08-14-v2-learning-library-2');
  expect(Object.keys(record.flashcards.cards)).toHaveLength(313);
  expect(record.flashcards.order).toHaveLength(313);
  expect(record.flashcards.cards['builtin:v2-fc-fio2'].flagged).toBe(true);
  expect(record.flashcards.cards['builtin:v2-fc-fio2'].masteryStatus).toBe('mastered');
  expect(JSON.stringify(record.flashcards)).not.toContain('referenceKeys');
  expect(JSON.stringify(record.flashcards)).not.toContain('studyRecommendationKeys');
});
