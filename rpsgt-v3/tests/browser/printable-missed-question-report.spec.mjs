import {test,expect} from '@playwright/test';

test('missed Guild question, selected answer, correct answer and rationale appear in printable Practice report',async({page})=>{
  await page.goto('index.html');
  const example=await page.evaluate(async()=>{
    const response=await fetch('data/question-bank/d1a.json');
    const data=await response.json();
    const q=data.questions.find(item=>item&&item.taskCode==='D1A'&&item.options?.length>=2&&item.options.includes(item.answer)&&item.rationale&&item.prompt&&!(item.qa?.manualReviewRecommended)&&item.reviewStatus!=='retired');
    if(!q)throw Error('No eligible sample question in D1A.');
    const wrong=q.options.find(option=>option!==q.answer);
    const saved=window.RPSGTStorage.load();
    saved.progress.answered=1;saved.progress.correct=0;
    saved.progress.byTask={D1A:{answered:1,correct:0}};
    saved.progress.byDomain={D1:{answered:1,correct:0}};
    saved.progress.history=[{questionId:q.id,taskCode:'D1A',correct:false,selectedAnswer:wrong,answeredAt:'2026-10-24T10:00:00.000Z'}];
    saved.review.missedIds=[q.id];saved.review.masteredIds=[];
    window.RPSGTStorage.save(saved);
    return {prompt:q.prompt,answer:q.answer,wrong,rationale:q.rationale};
  });
  await page.goto('study-summary.html?report=practice');
  await expect(page.locator('[data-summary-content]')).toBeVisible({timeout:45000});
  const review=page.locator('[data-report-section="missed"]');
  await expect(review).toBeVisible();
  await expect(review).toContainText(example.prompt);
  await expect(review).toContainText(example.wrong);
  await expect(review).toContainText(example.answer);
  await expect(review).toContainText(example.rationale);
  await expect(review).toContainText('D1A');
  await expect(page.getByText('Privacy and content statement')).toHaveCount(0);
  const data=await page.evaluate(()=>window.RPSGTStudySummaryEngine&&document.querySelector('[data-summary-missed]')?.textContent);
  expect(data).toContain(example.rationale);
  await page.locator('[data-summary-csv]').click();
  // Clicking export must not navigate away or alter progress.
  await expect(page).toHaveURL(/study-summary.html\?report=practice$/);
  expect(await page.evaluate(()=>window.RPSGTStorage.load().progress.answered)).toBe(1);
});

test('all populated report tables fit a phone without hiding task evidence',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium','Phone-width report card layout.');
  await page.goto('study-summary.html?report=full');
  await expect(page.locator('[data-summary-content]')).toBeVisible({timeout:45000});
  const taskTable=page.locator('[data-summary-tasks] table');
  await expect(taskTable).toBeVisible();
  await expect(taskTable.locator('tbody tr')).toHaveCount(12);
  const firstTask=taskTable.locator('tbody tr').first();
  await expect(firstTask).toBeInViewport({ratio:0});
  const geometry=await page.evaluate(()=>{
    const root=document.documentElement;
    const task=document.querySelector('[data-summary-tasks] table');
    const first=task.querySelector('tbody tr');
    return {viewport:root.clientWidth,scroll:root.scrollWidth,
      firstTaskWidth:first.getBoundingClientRect().width,
      tableWidth:task.getBoundingClientRect().width,
      label:getComputedStyle(first.querySelector('td:nth-child(2)'),'::before').content};
  });
  expect(geometry.scroll,JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewport+2);
  expect(geometry.tableWidth).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.firstTaskWidth).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.label).toContain('Practice');
});
