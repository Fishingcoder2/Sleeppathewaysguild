import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('flashcards.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('complete RPSGT deck renders as interactive sticky notes and preserves focused study controls',async({page})=>{
  await expect(page.locator('[data-card-empty]')).toBeHidden();
  await expect(page.locator('[data-card-total]')).toHaveText('332 cards');
  await expect(page.locator('[data-card-grid] .deck-note')).toHaveCount(332);
  await expect(page.locator('[data-card-summary]')).toContainText('332 shown');
  await expect(page.locator('[data-card-summary]')).toContainText('332 total');

  const first=page.locator('[data-card-grid] .deck-note').first();
  await expect(first.locator('.deck-note-title')).toHaveText('FiO2');
  await expect(first.locator('.deck-note-category')).toContainText('Oxygen, CO2 & Units');
  await first.locator('.deck-note-card').click();
  await expect(first).toHaveClass(/is-flipped/);
  await expect(first.locator('.deck-note-answer')).toContainText('Fraction of inspired oxygen');

  await first.locator('button[title="Flag this card"]').click();
  await expect(first.locator('button[title="Remove flag"]')).toBeVisible();
  await expect(page.locator('[data-card-summary]')).toContainText('1 flagged');

  await first.locator('button[title="Open focused study card"]').click();
  await expect(page.locator('[data-focus-dialog]')).toBeVisible();
  await expect(page.locator('[data-card-stage]')).toBeVisible();
  await expect(page.locator('[data-card-position]')).toHaveText('Card 1 of 332');
  await expect(page.locator('[data-card-front]')).toHaveText('FiO2');
  await expect(page.locator('[data-card-context]')).toContainText('Oxygen, CO2 & Units');

  await page.locator('[data-card-flip]').click();
  await expect(page.locator('[data-flashcard]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-card-back]')).toContainText('Fraction of inspired oxygen');
  await expect(page.locator('[data-card-memory]')).toContainText('FiO2 is what goes in');
  await expect(page.locator('[data-card-resources-wrap]')).toBeVisible();
  await expect(page.locator('[data-card-resources]')).toContainText('American Association of Sleep Technologists.');

  await page.locator('[data-card-mastered]').click();
  await expect(page.locator('[data-card-mastered]')).toHaveText('Mastered ✓');
  await page.locator('[data-focus-close]').last().click();
  await expect(page.locator('[data-focus-dialog]')).toBeHidden();

  await page.reload();
  await expect(page.locator('[data-card-grid] .deck-note')).toHaveCount(332);
  await expect(page.locator('[data-card-summary]')).toContainText('1 flagged');

  await page.locator('[data-study-flagged]').click();
  await expect(page.locator('[data-card-total]')).toHaveText('1 card');
  await expect(page.locator('[data-card-grid] .deck-note')).toHaveCount(1);
  await expect(page.locator('[data-card-grid] .deck-note-title')).toHaveText('FiO2');
  await page.locator('[data-show-all]').first().click();
  await expect(page.locator('[data-card-total]')).toHaveText('332 cards');

  await page.locator('[data-card-search]').fill('FiO2');
  await expect(page.locator('[data-card-total]')).not.toHaveText('332 cards');
  await page.locator('[data-show-all]').first().click();
  await expect(page.locator('[data-card-total]')).toHaveText('332 cards');

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

  await expect(page.locator('[data-card-total]')).toHaveText('333 cards');
  await expect(page.locator('[data-card-grid] .deck-note')).toHaveCount(333);
  await expect(page.locator('[data-focus-dialog]')).toBeVisible();
  await expect(page.locator('[data-card-front]')).toHaveText('What is the AHI formula?');
  await expect(page.locator('[data-card-context]')).toContainText('Report calculations');
  await page.locator('[data-focus-close]').last().click();

  await page.locator('[data-custom-card-open]').first().click();
  await dialog.locator('[name="front"]').fill('  What is the AHI formula?  ');
  await dialog.locator('[name="back"]').fill('Apneas plus hypopneas divided by total sleep time in hours.');
  await dialog.locator('button[type="submit"]').click();
  await expect(page.locator('[data-card-total]')).toHaveText('333 cards');
  await page.locator('[data-focus-close]').last().click();

  await page.locator('[data-card-status]').selectOption('custom');
  await expect(page.locator('[data-card-total]')).toHaveText('1 card');
  await expect(page.locator('[data-card-grid] .deck-note-title')).toHaveText('What is the AHI formula?');

  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')));
  expect(record.flashcards.catalogVersion).toBe('2026-08-27-v2-332-forward-catalog-1');
  expect(Object.keys(record.flashcards.cards)).toHaveLength(333);
  expect(record.flashcards.order).toHaveLength(333);
  expect(record.flashcards.cards['builtin:v2-fc-fio2'].flagged).toBe(true);
  expect(record.flashcards.cards['builtin:v2-fc-fio2'].masteryStatus).toBe('mastered');
  expect(JSON.stringify(record.flashcards)).not.toContain('referenceKeys');
  expect(JSON.stringify(record.flashcards)).not.toContain('studyRecommendationKeys');
});
