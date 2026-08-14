import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('flashcards.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('restored V2 deck loads, persists learner state, and accepts custom cards without duplicates',async({page})=>{
  const stage=page.locator('[data-card-stage]');
  await expect(stage).toBeVisible();
  await expect(page.locator('[data-card-empty]')).toBeHidden();
  await expect(page.locator('[data-card-total]')).toHaveText('20 cards');
  await expect(page.locator('[data-card-position]')).toHaveText('Card 1 of 20');
  await expect(page.locator('[data-card-front]')).toContainText('regular rate of 60–100 bpm');
  await expect(page.locator('[data-card-context]')).toContainText('Cardiac rhythm recognition');

  await page.locator('[data-card-flip]').click();
  await expect(page.locator('[data-flashcard]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-card-back]')).toHaveText('Normal Sinus Rhythm');
  await expect(page.locator('[data-card-explanation]')).toContainText('Every P wave is followed');
  await expect(page.locator('[data-card-resources-wrap]')).toBeHidden();

  await page.locator('[data-card-next]').click();
  await expect(page.locator('[data-card-position]')).toHaveText('Card 2 of 20');
  await expect(page.locator('[data-card-back]')).toHaveText('Sinus Bradycardia');
  await page.locator('[data-card-prev]').click();
  await expect(page.locator('[data-card-position]')).toHaveText('Card 1 of 20');

  await page.locator('[data-card-flag]').click();
  await expect(page.locator('[data-card-flag]')).toHaveText('Remove flag');
  await page.locator('[data-card-mastered]').click();
  await expect(page.locator('[data-card-mastered]')).toHaveText('Mastered ✓');

  await page.reload();
  await expect(page.locator('[data-card-total]')).toHaveText('20 cards');
  await expect(page.locator('[data-card-flag]')).toHaveText('Remove flag');
  await expect(page.locator('[data-card-mastered]')).toHaveText('Mastered ✓');

  await page.locator('[data-custom-card-open]').first().click();
  const dialog=page.locator('[data-custom-card-dialog]');
  await expect(dialog).toBeVisible();
  await dialog.locator('[name="front"]').fill('What is the AHI formula?');
  await dialog.locator('[name="back"]').fill('Apneas plus hypopneas divided by total sleep time in hours.');
  await dialog.locator('[name="explanation"]').fill('Convert total sleep time to hours before dividing.');
  await dialog.locator('[name="memoryClue"]').fill('Events divided by sleep hours.');
  await dialog.locator('[name="coachBobNote"]').fill('Write the denominator with its unit before calculating.');
  await dialog.locator('[name="domain"]').fill('Study Analysis and Reporting');
  await dialog.locator('[name="task"]').fill('Generate and verify report');
  await dialog.locator('[name="topic"]').fill('Report calculations');
  await dialog.locator('button[type="submit"]').click();

  await expect(page.locator('[data-card-total]')).toHaveText('21 cards');
  await expect(page.locator('[data-card-front]')).toHaveText('What is the AHI formula?');
  await expect(page.locator('[data-card-context]')).toContainText('Report calculations');

  await page.locator('[data-custom-card-open]').first().click();
  await dialog.locator('[name="front"]').fill('  What is the AHI formula?  ');
  await dialog.locator('[name="back"]').fill('Apneas plus hypopneas divided by total sleep time in hours.');
  await dialog.locator('button[type="submit"]').click();
  await expect(page.locator('[data-card-total]')).toHaveText('21 cards');

  await page.locator('[data-card-status]').selectOption('custom');
  await expect(page.locator('[data-card-total]')).toHaveText('1 card');
  await expect(page.locator('[data-card-front]')).toHaveText('What is the AHI formula?');

  const storage=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
  expect(Object.keys(storage)).toEqual(['spg_rpsgt_v3']);
  const record=JSON.parse(storage.spg_rpsgt_v3);
  expect(record.flashcards.catalogVersion).toBe('2026-08-14-v2-restore-1');
  expect(Object.keys(record.flashcards.cards)).toHaveLength(21);
  expect(record.flashcards.order).toHaveLength(21);
  expect(record.flashcards.cards['builtin:v2-ekg-nsr'].flagged).toBe(true);
  expect(record.flashcards.cards['builtin:v2-ekg-nsr'].masteryStatus).toBe('mastered');
  expect(JSON.stringify(record.flashcards)).not.toContain('referenceKeys');
  expect(JSON.stringify(record.flashcards)).not.toContain('studyRecommendationKeys');
});
