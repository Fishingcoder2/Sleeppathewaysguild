import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

// Synthetic learner-only fixture. No test reads, clears or modifies real user progress.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const bank=JSON.parse(await readFile(resolve(root,'data/question-bank/d3a.json'),'utf8')).questions;
const cases=bank.filter(q=>!q.qa?.manualReviewRecommended && q.options?.length===4 && q.options.includes(q.answer)).slice(0,20);
if(cases.length!==20)throw new Error('Review fixture needs 20 learner-ready questions');

async function prepareMissedList(page,questions){
  await page.goto('index.html');
  await page.evaluate(ids=>{
    const state=window.RPSGTStorage.createDefaultState();
    state.review.missedIds=ids;
    localStorage.setItem('spg_rpsgt_v3',JSON.stringify(state));
  },questions.map(q=>q.id));
  await page.goto('review.html?list=missed');
  await expect(page.locator('[data-review-shell]')).toBeVisible();
  await expect(page.locator('[data-question-prompt]')).not.toBeEmpty();
}
function result(page){return page.locator('[data-review-complete]')}
function active(page){return page.locator('[data-question-panel]')}

test('twenty-item missed review shows only the question modal before the first answer',async({page})=>{
  await prepareMissedList(page,cases);
  await expect(page.locator('[data-question-number]')).toHaveText('Question 1 of 20');
  await expect(page.locator('[data-review-count]').last()).toHaveText('20');
  await expect(page.locator('[data-session-answered]')).toHaveText('0');
  await expect(active(page)).toBeVisible();
  await expect(result(page)).toBeHidden();
  expect(await result(page).evaluate(el=>getComputedStyle(el).display)).toBe('none');
  if(test.info().project.name==='mobile-chromium') await expect(page.locator('.session-rail')).toBeHidden();
  else await expect(page.locator('.session-rail')).toBeVisible();
  await expect(page.locator('[data-review-forward]')).toHaveText('Check answer');
  const choices=page.locator('[data-question-choices] .practice-choice');
  await expect(choices).toHaveCount(4);
  await choices.first().click();
  await page.locator('[data-review-forward]').click();
  await expect(page.locator('[data-answer-feedback]')).toBeVisible();
  await expect(result(page)).toBeHidden();
  await expect(active(page)).toBeVisible();
  await expect(page.locator('[data-session-answered]')).toHaveText('1');
});

test('results replace the question only after all selected missed items are reviewed',async({page})=>{
  const questions=cases.slice(0,3);
  await prepareMissedList(page,questions);
  for(let i=0;i<questions.length;i++){
    await expect(result(page)).toBeHidden();
    await expect(active(page)).toBeVisible();
    await expect(page.locator('[data-question-number]')).toHaveText('Question '+(i+1)+' of 3');
    // The app deliberately shuffles options at runtime, so select by visible
    // answer text instead of trusting the source bank's original option index.
    const choice=page.locator('[data-question-choices] .practice-choice').filter({has:page.getByText(questions[i].answer,{exact:true})});
    await expect(choice).toHaveCount(1);
    await choice.click();
    await page.locator('[data-review-forward]').click();
    await expect(page.locator('[data-answer-feedback]')).toBeVisible();
    await expect(result(page)).toBeHidden();
    await page.locator('[data-review-forward]').click();
  }
  await expect(active(page)).toBeHidden();
  await expect(result(page)).toBeVisible();
  await expect(page.locator('.session-rail')).toBeHidden();
  await expect(page.locator('[data-complete-score]')).toHaveText('3 / 3');
  await expect(page.locator('[data-complete-percent]')).toHaveText('100%');
  const saved=await page.evaluate(()=>window.RPSGTStorage.load());
  expect(saved.progress.answered).toBe(3);
  expect(saved.review.missedIds).toEqual([]);
  expect(saved.review.masteredIds.map(String)).toEqual(questions.map(q=>String(q.id)));
});
