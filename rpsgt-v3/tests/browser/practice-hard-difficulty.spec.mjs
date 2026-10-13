import {expect,test} from '@playwright/test';

test('Hard Practice uses Advanced and Tricky labels and serves requested 25 questions',async({page})=>{
  await page.goto('practice.html');
  await expect(page.locator('[data-practice-setup]')).toBeVisible();
  await page.locator('[data-practice-difficulty]').selectOption('hard');
  await page.locator('[data-practice-size]').selectOption('25');
  await page.locator('[data-start-practice]').click();
  await expect(page.locator('[data-practice-shell]')).toBeVisible();
  await expect(page.locator('[data-question-number]')).toHaveText('Question 1 of 25');
  await expect.poll(async()=>Number((await page.locator('[data-session-pool]').innerText()).replace(/,/g,''))).toBeGreaterThan(25);
  await expect(page.locator('[data-session-availability-note]')).toContainText('Showing 25 of');
  await expect(page.locator('[data-question-difficulty]')).toContainText(/Hard|Advanced|Tricky/);
  await expect(page.locator('[data-practice-shell]')).toHaveAttribute('data-practice-difficulty-lock','hard');
});

test('task-level hard filters disclose smaller available pools without mixing other tasks',async({page})=>{
  await page.goto('practice.html');
  await expect(page.locator('[data-practice-setup]')).toBeVisible();
  await page.locator('[data-practice-domain]').selectOption('D3');
  await page.locator('[data-practice-task]').selectOption('D3B');
  await page.locator('[data-practice-difficulty]').selectOption('hard');
  await page.locator('[data-practice-size]').selectOption('10');
  await page.locator('[data-start-practice]').click();
  await expect(page.locator('[data-practice-shell]')).toBeVisible();
  await expect(page.locator('[data-session-availability-note]')).toContainText(/Only \d+ eligible questions match your filters/);
  const pool=Number(await page.locator('[data-session-pool]').innerText());
  expect(pool).toBeGreaterThan(0);
  expect(pool).toBeLessThan(10);
  await expect(page.locator('[data-question-number]')).toHaveText('Question 1 of '+pool);
  await expect(page.locator('[data-question-task]')).toContainText('D3B');
  await expect(page.locator('[data-question-difficulty]')).toContainText(/Hard|Advanced|Tricky/);
});
