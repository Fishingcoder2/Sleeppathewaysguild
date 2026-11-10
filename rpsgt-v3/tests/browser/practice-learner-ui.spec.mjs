import { expect, test } from '@playwright/test';

test('Learner Practice hides internal metadata, checks on option click, and preserves reviewed questions', async ({ page }) => {
  await page.goto('practice.html');
  await expect(page.locator('[data-practice-setup]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Quality review');
  await expect(page.locator('body')).not.toContainText('Quality-review pool');
  await expect(page.locator('body')).not.toContainText('Manual review record');

  await page.locator('[data-practice-size]').selectOption('5');
  await page.locator('[data-start-practice]').click();
  await expect(page.locator('[data-question-panel]')).toBeVisible();
  await expect(page.locator('[data-question-task]')).not.toHaveText(/^D[1-4][A-C]\b/);
  await expect(page.locator('[data-practice-flag]')).toBeVisible();
  await expect(page.locator('[data-practice-review-later]')).toBeVisible();
  await expect(page.locator('[data-practice-flashcard]')).toBeVisible();
  await expect(page.locator('[data-previous-question]')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Check answer'})).toBeHidden();

  await page.locator('[data-practice-flag]').click();
  await page.locator('[data-practice-review-later]').click();
  await page.locator('[data-practice-flashcard]').click();
  await page.locator('[data-practice-flashcard]').click();

  const savedActions=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')));
  expect(savedActions.review.flaggedIds).toHaveLength(1);
  expect(savedActions.review.reviewLaterIds).toHaveLength(1);
  expect(savedActions.flashcards.order).toHaveLength(1);
  expect(savedActions.migration.importEnabled).toBe(false);

  await page.locator('[data-choice-index]').first().click();
  await expect(page.locator('[data-next-question]')).toBeEnabled();
  const feedback=page.locator('[data-answer-feedback]');
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText('Answer & reasoning');
  await expect(feedback).toContainText('Correct answer');
  await expect(feedback).toContainText('Reasoning:');
  await expect(feedback).not.toContainText('Mapped source keys');
  await expect(page.locator('[data-next-question]')).toHaveText('Next question');

  const firstHistoryCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')).progress.history.length);
  expect(firstHistoryCount).toBe(1);

  await page.locator('[data-next-question]').click();
  await expect(page.locator('[data-question-number]')).toContainText('Question 2 of 5');
  await expect(page.locator('[data-previous-question]')).toBeEnabled();
  await page.locator('[data-previous-question]').click();
  await expect(page.locator('[data-question-number]')).toContainText('Question 1 of 5');
  await expect(page.locator('[data-answer-feedback]')).toBeVisible();
  const revisitedHistoryCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')).progress.history.length);
  expect(revisitedHistoryCount).toBe(1);
});


test('ECG subject stays locked for the full focused Practice session', async ({ page }) => {
  await page.goto('practice.html');
  await expect(page.locator('[data-practice-setup]')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('175-Question Mock-Style Practice');

  await page.locator('[data-practice-subject]').selectOption('ekg');
  await page.locator('[data-practice-size]').selectOption('5');
  await page.locator('[data-start-practice]').click();

  const shell=page.locator('[data-practice-shell]');
  await expect(shell).toHaveAttribute('data-practice-subject-lock','ekg');
  await expect(shell).toHaveAttribute('data-question-subject-match','true');
  await expect(page.locator('[data-session-subject]')).toHaveText('ECG / cardiac rhythm');

  for(let index=0;index<4;index+=1){
    await expect(shell).toHaveAttribute('data-question-subject-match','true');
    await page.locator('[data-choice-index]').first().click();
    await expect(page.locator('[data-answer-feedback]')).toBeVisible();
    await page.locator('[data-next-question]').click();
  }
  await expect(page.locator('[data-question-number]')).toContainText('Question 5 of 5');
  await expect(shell).toHaveAttribute('data-question-subject-match','true');
});


test('a task-specific recommendation opens the intended Practice session',async({page})=>{
  await page.goto('practice.html?task=D3A&start=1');
  await expect(page.locator('[data-practice-shell]')).toBeVisible();
  await expect(page.locator('[data-practice-task]')).toHaveValue('D3A');
  // Task identifiers are intentionally hidden on learner-facing question screens.
  await expect(page.locator('[data-practice-domain]')).toHaveValue('D3');
  await expect(page.locator('[data-question-task]')).not.toBeEmpty();
  await expect(page.locator('[data-question-panel]')).toBeVisible();
});

test('Practice completion recommends the next activity from this session, without auto-redirect',async({page})=>{
  await page.goto('practice.html');
  await expect(page.locator('[data-practice-setup]')).toBeVisible();
  // A single task avoids loading the entire bank for a completion-UI test.
  await page.locator('[data-practice-domain]').selectOption('D3');
  await page.locator('[data-practice-task]').selectOption('D3A');
  await page.locator('[data-practice-size]').selectOption('5');
  await page.locator('[data-start-practice]').click();
  await expect(page.locator('[data-question-panel]')).toBeVisible();
  for(let index=0;index<5;index+=1){
    await expect(page.locator('[data-question-number]')).toContainText('Question '+(index+1)+' of 5');
    await page.locator('[data-choice-index]').first().click();
    await expect(page.locator('[data-answer-feedback]')).toBeVisible();
    await page.locator('[data-next-question]').click();
  }
  const completion=page.locator('[data-session-complete]');
  await expect(completion).toBeVisible();
  await expect(completion.locator('[data-recommendation-title]')).toBeVisible();
  const saved=await page.evaluate(()=>window.RPSGTStorage.load());
  const missed=saved.progress.history.filter(answer=>answer.correct===false).length;
  const sequence=['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C'];
  const tasks=[...new Set(saved.progress.history.map(answer=>answer.taskCode))];
  const position=tasks.length===1?sequence.indexOf(tasks[0]):-1;
  const href=missed?'review.html?list=missed':position>=0&&sequence[position+1]?'study.html#'+sequence[position+1]:'reports.html';
  await expect(completion.locator('[data-recommendation-link]')).toHaveAttribute('href',href);
  await expect(completion.locator('.completion-recommendation .btn.primary')).toHaveCount(1);
  await expect(page).toHaveURL(/practice\.html$/);
});
