import {test,expect} from '@playwright/test';

async function openSkill(page,id) {
  await page.goto('math-coach.html');
  const button=page.locator('[data-math-open="'+id+'"]');
  await expect(button).toBeVisible();
  await button.click();
}

async function beginGuided(page) {
  await page.locator('[data-math-stage="worked"]').click();
  await page.locator('[data-math-stage="guided"]').click();
  await expect(page.locator('[data-math-guided-form]')).toBeVisible();
}

async function submitSet(page,kind,id) {
  const response=await page.request.get('data/math-coach/'+id+'.json');
  expect(response.ok()).toBeTruthy();
  const skill=await response.json();
  const questions=skill[kind];
  const form=page.locator('[data-math-set-form="'+kind+'"]');
  await expect(form).toBeVisible();
  await expect(form.locator('[data-math-set-navigation]')).toBeVisible();
  for(let index=0;index<questions.length;index+=1){
    const question=questions[index];
    await expect(form.locator('.math-set-question').nth(index)).toBeVisible();
    await expect(form.locator('[data-math-set-count]')).toContainText('Question '+(index+1)+' of '+questions.length);
    await form.locator('input[name="'+question.id+'"]').fill(String(question.answer));
    if(index<questions.length-1){
      await form.locator('[data-math-set-next]').click();
    }
  }
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('.math-answer-review .math-review-card')).toHaveCount(questions.length);
  await expect(page.locator('.math-review-card').first()).toContainText(questions[0].prompt);
  await expect(page.locator('.math-review-card').first()).toContainText('Worked equation');
  await expect(form).toHaveCount(0);
}

test('Math Coach accepts overnight TRT correctly and holds every graded explanation before advancing',async({page})=>{
  await openSkill(page,'total-recording-time');
  await beginGuided(page);
  await expect(page.locator('.math-practice-panel')).toContainText('23:00');
  await page.locator('[data-math-guided-form] input[name="answer"]').fill('480');
  await page.locator('[data-math-guided-form] button[type="submit"]').click();
  await expect(page.locator('.math-feedback.correct')).toContainText('Verified calculation');
  await expect(page.locator('[data-math-continue-independent]')).toBeVisible();
  await expect(page.locator('[data-math-workspace]')).toHaveAttribute('data-stage','guided');
  await page.locator('[data-math-continue-independent]').click();
  await expect(page.locator('[data-math-workspace]')).toHaveAttribute('data-stage','independent');
  await submitSet(page,'independent','total-recording-time');
  await expect(page.locator('[data-math-workspace]')).toHaveAttribute('data-stage','independent');
  await page.locator('[data-math-continue-mastery]').click();
  await expect(page.locator('[data-math-workspace]')).toHaveAttribute('data-stage','mastery');
  await submitSet(page,'mastery','total-recording-time');
  await expect(page.locator('[data-math-workspace]')).toHaveAttribute('data-stage','mastery');
  await expect(page.locator('[data-math-finish-skill]')).toBeVisible();
  await page.locator('[data-math-finish-skill]').click();
  await expect(page.locator('[data-math-workspace]')).toHaveAttribute('data-stage','complete');
});

test('Math Coach flags wrong answers and offers a retry with visible reasoning',async({page})=>{
  await openSkill(page,'pressure-support');
  await beginGuided(page);
  await page.locator('[data-math-guided-form] input[name="answer"]').fill('99');
  await page.locator('[data-math-guided-form] button[type="submit"]').click();
  await expect(page.locator('.math-feedback.retry')).toBeVisible();
  await expect(page.locator('[data-math-guided-form]')).toBeVisible();
  await expect(page.locator('[data-math-whiteboard]')).toBeVisible();
  const response=await page.request.get('data/math-coach/pressure-support.json');
  expect(response.ok()).toBeTruthy();
  const skill=await response.json();
  await page.locator('[data-math-guided-form] input[name="answer"]').fill(String(skill.guided[0].answer));
  // Incorrect attempts stay on the same problem so the learner can retry.
  await page.locator('[data-math-guided-form] button[type="submit"]').click();
  await expect(page.locator('.math-feedback.correct')).toContainText('Verified calculation');
  await page.locator('[data-math-continue-independent]').click();
  const form=page.locator('[data-math-set-form="independent"]');
  await expect(form.locator('[data-math-set-navigation]')).toBeVisible();
  for(let index=0;index<skill.independent.length;index+=1){
    await form.locator('input[name="'+skill.independent[index].id+'"]').fill('0');
    if(index<skill.independent.length-1) await form.locator('[data-math-set-next]').click();
  }
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('[data-math-retry-set="independent"]')).toBeVisible();
  await page.locator('[data-math-retry-set="independent"]').click();
  const retryForm=page.locator('[data-math-set-form="independent"]');
  await expect(retryForm.locator('[data-math-set-count]')).toContainText('Question 1 of '+skill.independent.length);
  await expect(retryForm.locator('.math-set-question').first()).toBeVisible();
});
