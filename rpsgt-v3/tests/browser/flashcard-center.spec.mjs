import {test,expect} from '@playwright/test';

test('custom RPSGT flashcards persist without duplicate cards or legacy writes',async({page})=>{
  await page.goto('flashcards.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-card-empty]')).toBeVisible();
  await expect(page.locator('[data-card-stage]')).toBeHidden();

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

  const stage=page.locator('[data-card-stage]');
  await expect(stage).toBeVisible();
  await expect(page.locator('[data-card-empty]')).toBeHidden();
  await expect(page.locator('[data-card-total]')).toHaveText('1 card');
  await expect(page.locator('[data-card-front]')).toHaveText('What is the AHI formula?');
  await expect(page.locator('[data-card-context]')).toContainText('Report calculations');

  await page.locator('[data-card-flip]').click();
  await expect(page.locator('[data-flashcard]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-card-back]')).toHaveText('Apneas plus hypopneas divided by total sleep time in hours.');
  await expect(page.locator('[data-card-explanation]')).toContainText('Convert total sleep time');
  await expect(page.locator('[data-card-memory]')).toContainText('Events divided by sleep hours');
  await expect(page.locator('[data-card-coach]')).toContainText('denominator');
  await expect(page.locator('[data-card-resources-wrap]')).toBeHidden();

  await page.locator('[data-card-flag]').click();
  await expect(page.locator('[data-card-flag]')).toHaveText('Remove flag');
  await page.locator('[data-card-mastered]').click();
  await expect(page.locator('[data-card-mastered]')).toHaveText('Mastered ✓');

  await page.reload();
  await expect(page.locator('[data-card-total]')).toHaveText('1 card');
  await expect(page.locator('[data-card-flag]')).toHaveText('Remove flag');
  await expect(page.locator('[data-card-mastered]')).toHaveText('Mastered ✓');

  await page.locator('[data-custom-card-open]').first().click();
  await dialog.locator('[name="front"]').fill('  What is the AHI formula?  ');
  await dialog.locator('[name="back"]').fill('Apneas plus hypopneas divided by total sleep time in hours.');
  await dialog.locator('button[type="submit"]').click();
  await expect(page.locator('[data-card-total]')).toHaveText('1 card');

  const storage=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
  expect(Object.keys(storage)).toEqual(['spg_rpsgt_v3']);
  const record=JSON.parse(storage.spg_rpsgt_v3);
  expect(Object.keys(record.flashcards.cards)).toHaveLength(1);
  expect(record.flashcards.order).toHaveLength(1);
  expect(JSON.stringify(record.flashcards)).not.toContain('referenceKeys');
  expect(JSON.stringify(record.flashcards)).not.toContain('studyRecommendationKeys');
});
