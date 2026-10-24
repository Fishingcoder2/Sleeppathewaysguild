import {test,expect} from '@playwright/test';

async function openExam(page){
 await page.goto('mock.html');
 await expect(page.locator('[data-mock-home]')).toBeVisible({timeout:40000});
 await expect(page.locator('[data-mock-shell]')).toBeHidden();
 await expect(page.locator('[data-mock-review]')).toBeHidden();
 await expect(page.locator('[data-mock-results]')).toBeHidden();
 await page.locator('[data-start-mock]').click();
 await expect(page.locator('[data-mock-shell]')).toBeVisible({timeout:20000});
 await expect(page.locator('[data-mock-home]')).toBeHidden();
 await expect(page.locator('[data-mock-results]')).toBeHidden();
 await expect(page.locator('[data-mock-palette] button')).toHaveCount(175);
 await expect(page.locator('[data-question-number]')).toContainText('1 of 175');
}
async function jumpTo(page,num){
 const details=page.locator('[data-mock-nav-details]');
 if(!(await details.evaluate(el=>el.open)))await details.locator('summary').click();
 await page.locator('[data-mock-palette] button').nth(num-1).click();
 await expect(page.locator('[data-question-number]')).toContainText('Question '+num+' of 175');
}

test('Mock next, previous, answer, flag, question navigator and save/resume all work',async({page})=>{
 await openExam(page);
 const first=await page.locator('[data-question-prompt]').textContent();
 const answer=page.locator('[data-question-choices] .practice-choice').first();
 await answer.click();
 await expect(answer).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-mock-answered]')).toHaveText('1');
 await page.locator('[data-flag-question]').click();
 await expect(page.locator('[data-flag-question]')).toContainText('Flagged');
 await expect(page.locator('[data-mock-flagged]')).toHaveText('1');
 await page.locator('[data-next-question]').click();
 await expect(page.locator('[data-question-number]')).toContainText('2 of 175');
 await expect(page.locator('[data-question-prompt]')).not.toHaveText(first);
 await page.locator('[data-prev-question]').click();
 await expect(page.locator('[data-question-prompt]')).toHaveText(first);
 await expect(page.locator('[data-flag-question]')).toContainText('Flagged');
 await expect(page.locator('[data-question-choices] .practice-choice.selected')).toHaveCount(1);
 await jumpTo(page,24);
 await expect(page.locator('[data-question-prompt]')).toBeInViewport();
 await page.locator('[data-pause-mock]').click();
 await expect(page.locator('[data-mock-home]')).toBeVisible();
 await expect(page.locator('[data-mock-shell]')).toBeHidden();
 await expect(page.locator('[data-resume-card]')).toBeVisible();
 await page.reload();
 await expect(page.locator('[data-resume-card]')).toBeVisible({timeout:40000});
 await page.locator('[data-resume-mock]').click();
 await expect(page.locator('[data-question-number]')).toContainText('24 of 175');
 await expect(page.locator('[data-mock-answered]')).toHaveText('1');
 await expect(page.locator('[data-mock-flagged]')).toHaveText('1');
 const store=await page.evaluate(()=>window.RPSGTStorage.load());
 expect(store.mock.activeSession.index).toBe(23);
 expect(Object.keys(store.mock.activeSession.answers)).toHaveLength(1);
 expect(store.mock.history).toHaveLength(0);
});

test('Mock finish button opens review, returns to question and only final submit scores once',async({page})=>{
 await openExam(page);
 await page.locator('[data-flag-question]').click();
 await jumpTo(page,175);
 await expect(page.locator('[data-next-question]')).toHaveText('Review and submit');
 await page.locator('[data-next-question]').click();
 await expect(page.locator('[data-mock-review]')).toBeVisible();
 await expect(page.locator('[data-mock-shell]')).toBeHidden();
 await expect(page.locator('[data-review-unanswered]')).toHaveText('175');
 await expect(page.locator('[data-review-flagged]')).toHaveText('1');
 let store=await page.evaluate(()=>window.RPSGTStorage.load());
 expect(store.mock.history).toHaveLength(0);
 expect(store.mock.activeSession).not.toBeNull();
 await page.locator('[data-review-back]').click();
 await expect(page.locator('[data-question-number]')).toContainText('175 of 175');
 await page.locator('[data-submit-mock]').click();
 await expect(page.locator('[data-mock-review]')).toBeVisible();
 await page.locator('[data-review-flagged-first]').click();
 await expect(page.locator('[data-question-number]')).toContainText('1 of 175');
 await page.locator('[data-question-choices] .practice-choice').first().click();
 await page.locator('[data-submit-mock]').click();
 await expect(page.locator('[data-review-answered]')).toHaveText('1');
 await expect(page.locator('[data-review-unanswered]')).toHaveText('174');
 await page.locator('[data-review-submit]').click();
 await expect(page.locator('[data-mock-results]')).toBeVisible();
 await expect(page.locator('[data-mock-shell]')).toBeHidden();
 await expect(page.locator('[data-mock-review]')).toBeHidden();
 await expect(page.locator('[data-result-answered]')).toContainText('1 / 175');
 await expect(page.locator('[data-result-correct]')).toContainText('/ 150');
 store=await page.evaluate(()=>window.RPSGTStorage.load());
 expect(store.mock.activeSession).toBeNull();
 expect(store.mock.history).toHaveLength(1);
 expect(store.mock.history[0].itemResults).toHaveLength(175);
 expect(store.mock.history[0].scoredCount).toBe(150);
 expect(store.mock.history[0].pretestCount).toBe(25);
 await expect(page.locator('[data-result-report-link]')).toHaveAttribute('href',/reports\.html\?mock=/);
 await page.locator('[data-new-mock]').click();
 await expect(page.locator('[data-mock-home]')).toBeVisible();
 await expect(page.locator('[data-mock-history] .mock-history-row')).toHaveCount(1);
});

test('Mock discard and replacement confirm preserve the learner session until approved',async({page})=>{
 await openExam(page);
 await page.locator('[data-question-choices] .practice-choice').first().click();
 await page.locator('[data-pause-mock]').click();
 page.once('dialog',async dialog=>{expect(dialog.message()).toMatch(/Replace it/);await dialog.dismiss();});
 await page.locator('[data-start-mock]').click();
 await expect(page.locator('[data-mock-home]')).toBeVisible();
 let saved=await page.evaluate(()=>window.RPSGTStorage.load());
 expect(Object.keys(saved.mock.activeSession.answers)).toHaveLength(1);
 page.once('dialog',async dialog=>{expect(dialog.message()).toMatch(/Discard/);await dialog.dismiss();});
 await page.locator('[data-discard-mock]').click();
 await expect(page.locator('[data-resume-card]')).toBeVisible();
 page.once('dialog',async dialog=>await dialog.accept());
 await page.locator('[data-discard-mock]').click();
 await expect(page.locator('[data-resume-card]')).toBeHidden();
 saved=await page.evaluate(()=>window.RPSGTStorage.load());
 expect(saved.mock.activeSession).toBeNull();
});
