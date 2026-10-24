import {test,expect} from '@playwright/test';

test('Related lab questions open in a modal, stay in the lab, and count toward Practice',async({page})=>{
  await page.goto('lab-respiratory.html');
  await page.evaluate(()=>{
    const saved=window.RPSGTStorage.load();
    saved.progress.answered=1;
    saved.progress.correct=1;
    saved.progress.history=[];
    saved.review.missedIds=[];
    saved.review.flaggedIds=[];
    saved.review.reviewLaterIds=[];
    window.RPSGTStorage.save(saved);
  });
  await page.reload();
  await expect(page.locator('.learner-route-cta').filter({hasText:'Practice Related Items'})).toBeVisible();
  const oldLocation=new URL(page.url()).pathname;
  await page.locator('.learner-route-cta').filter({hasText:'Practice Related Items'}).click();
  const dialog=page.getByRole('dialog',{name:'Related practice questions'});
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.spg-quick-set-prompt')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(oldLocation);
  const taskContext=await dialog.locator('.spg-quick-set-context').textContent();
  expect(taskContext).toMatch(/D2A|D2B|D3B/);
  for(let i=0;i<5;i++){
    await dialog.locator('[data-quick-set-option]').first().click();
    await dialog.locator('[data-quick-set-next]').click();
    await expect(dialog.locator('.spg-quick-set-feedback')).toBeVisible();
    await expect(dialog.locator('.spg-quick-set-feedback')).toContainText('Correct answer:');
    await dialog.locator('[data-quick-set-next]').click();
  }
  await expect(dialog.locator('.spg-quick-set-results')).toBeVisible();
  const saved=await page.evaluate(()=>window.RPSGTStorage.load());
  expect(saved.progress.answered).toBe(6);
  expect(saved.progress.history.filter(record=>record.source==='v3-inline-question-set')).toHaveLength(5);
  expect(new Set(saved.progress.history.map(record=>String(record.questionId))).size).toBe(5);
  await dialog.locator('[data-quick-set-close]').click();
  await expect(dialog).toBeHidden();
  await expect.poll(async()=>page.evaluate(()=>{
    const active=document.activeElement;
    return Boolean(active&&active.matches('[data-route-recommendation] a[href], [data-sidebar-next] a[href], .learner-route-cta'));
  })).toBeTruthy();
  expect(new URL(page.url()).pathname).toBe(oldLocation);
});

test('Task-specific practice opens modal while main Practice menu still navigates normally',async({page})=>{
  await page.goto('study.html');
  await expect(page.locator('[data-inline-question-set-not-a-real-element]')).toHaveCount(0);
  await page.evaluate(()=>{
    const button=document.createElement('a');
    button.href='practice.html?task=D3A';button.className='btn secondary';
    button.textContent='Practice this task';button.id='test-task-question-link';
    document.querySelector('main').prepend(button);
  });
  await page.locator('#test-task-question-link').click();
  const dialog=page.getByRole('dialog',{name:'Related practice questions'});
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.spg-quick-set-context')).toContainText('D3A');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.locator('.sidebar a[data-nav="practice"]').click();
  await expect(page).toHaveURL(/\/practice\.html$/);
});
