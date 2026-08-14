import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('math-coach.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('Math Coach restores all 20 V2 lessons and 100 guided questions without removing V3 mastery drills',async({page})=>{
  await expect(page.locator('[data-math-library-count]')).toHaveText('20 lessons · 100 practice questions');
  await expect(page.locator('[data-math-library-list] .math-lesson-button')).toHaveCount(20);
  await expect(page.locator('[data-math-library-detail] h2')).toHaveText('Epoch Time Basics');
  await expect(page.locator('[data-math-library-detail] .math-formula')).toContainText('1 epoch = 30 seconds');
  await expect(page.locator('[data-math-library-detail] .math-question-choice')).toHaveCount(4);

  await page.locator('[data-math-library-detail] .math-question-choice').filter({hasText:'12 minutes'}).click();
  await expect(page.locator('[data-math-library-detail] .math-question-feedback')).toContainText('Correct.');
  await page.locator('[data-math-library-detail] .btn.primary').click();
  await expect(page.locator('[data-math-library-detail] .status').first()).toHaveText('Practice 2 of 5');

  await page.locator('[data-math-library-list] .math-lesson-button').last().click();
  await expect(page.locator('[data-math-library-detail] h2')).toHaveText('10-20 Measurement');
  await expect(page.locator('[data-math-library-detail] .math-question-choice')).toHaveCount(4);

  await expect(page.locator('[data-math-catalog]')).toBeAttached();
  await expect(page.locator('[data-math-workspace]')).toBeAttached();
});
