import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.clear());
});

test('Guided Study keeps internal mappings out of the learner view',async({page})=>{
  await page.goto('study.html');

  const cards=page.locator('.task-map-card');
  await expect(cards).toHaveCount(12);
  await expect(page.getByText('Show mapped resource keys',{exact:true})).toHaveCount(0);
  await expect(page.locator('.mapping-warning')).toHaveCount(0);
  await expect(page.locator('[data-blueprint-summary]')).not.toContainText('review-only cross-task records');
  await expect(page.locator('[data-blueprint-summary]')).toContainText('15 questions per checkpoint');
  await expect(page.locator('[data-blueprint-summary]')).toContainText('80% task-award goal');

  const explorer=page.locator('[data-explorer-journey]');
  await expect(explorer).toContainText('Sleep Pathways Explorer Journey');
  await expect(explorer).toContainText('Trail Starter');
  await expect(explorer).toContainText('Your virtual Explorer vest');
  await expect(explorer.locator('.explorer-patch')).toHaveCount(12);
  await expect(explorer).toContainText('Trailhead Ribbon');
  await expect(explorer).toContainText('Full Expedition Ribbon');
  await expect(explorer).toContainText('Fresh-question rotation');

  const resources=cards.first().locator('details[data-resource-ready="true"]');
  await expect(resources).toBeVisible();
  const resourceSummary=resources.locator('summary');
  await expect(resourceSummary).toHaveText('Related reference materials');
  await resourceSummary.click();
  await expect(resources).toHaveAttribute('open','');
  await expect(resources.locator('.resource-title-chip').first()).toBeVisible();
  await expect(resources).not.toContainText('fundamentals-sleep-technology-3e');
  await expect(resources).not.toContainText('studyRecommendationKeys');
  await expect(resources).not.toContainText('referenceKeys');

  await cards.first().locator('[data-checkpoint-start]').click();
  const checkpoint=page.locator('[data-checkpoint-workspace]');
  await expect(checkpoint).toBeVisible();
  await expect(checkpoint).toContainText('Question 1 of 15');
  await expect(checkpoint).not.toContainText('Exact task mapping');
  await expect(checkpoint.locator('.checkpoint-modal-head .eyebrow')).toHaveText('Guided Study checkpoint');
  await expect(checkpoint.locator('.checkpoint-task-label')).not.toHaveText(/^D[1-4][A-C]\b/);

  const stem=checkpoint.locator('#checkpoint-title');
  const stemText=(await stem.innerText()).trim();
  expect(stemText.length).toBeGreaterThan(11);
  expect(stemText).not.toMatch(/(?:\.{3,}|…)$/);
  const stemStyle=await stem.evaluate(node=>{
    const style=getComputedStyle(node);
    return {
      display:style.display,
      height:style.height,
      maxHeight:style.maxHeight,
      overflow:style.overflow,
      textOverflow:style.textOverflow,
      whiteSpace:style.whiteSpace,
      lineClamp:style.getPropertyValue('-webkit-line-clamp')
    };
  });
  expect(stemStyle.display).not.toBe('-webkit-box');
  expect(stemStyle.overflow).not.toBe('hidden');
  expect(stemStyle.textOverflow).not.toBe('ellipsis');
  expect(stemStyle.whiteSpace).toBe('normal');
  expect(['none','unset','']).toContain(stemStyle.lineClamp);

  await checkpoint.locator('[data-coach-toggle]').click();
  const coachHeading=checkpoint.locator('.coach-question-panel h3');
  await expect(coachHeading).toBeVisible();
  await expect(coachHeading).not.toHaveText('Slow down and match the task.');
});

test('Guided Trail fresh rotation removes duplicate wording and holds back recent questions',async({page})=>{
  await page.goto('study.html');
  const result=await page.evaluate(()=>{
    const saved=window.RPSGTStorage.load();
    const records=Array.from({length:30},(_,index)=>({
      id:`q${index+1}`,
      taskCode:'D1A',
      prompt:`Unique Guided Trail question ${index+1}?`,
      options:['A','B'],
      answer:'A',
      qa:{manualReviewRecommended:false}
    }));
    records.push({
      id:'duplicate-q1',
      taskCode:'D1A',
      prompt:'Unique Guided Trail question 1?',
      options:['A','B'],
      answer:'A',
      qa:{manualReviewRecommended:false}
    });
    saved.guidedStudy.checkpointHistory=[{
      id:'prior-d1a',
      task:'D1A',
      total:15,
      questionIds:Array.from({length:15},(_,index)=>`q${index+1}`)
    }];
    window.RPSGTStorage.save(saved);
    const selected=window.RPSGTGuidedTrailExplorer.selectFreshQuestions(records,'D1A',15,'browser-test');
    return {ids:selected.map(question=>question.id),prompts:selected.map(question=>question.prompt)};
  });

  expect(result.ids).toHaveLength(15);
  expect(result.ids.some(id=>/^q(?:[1-9]|1[0-5])$/.test(id))).toBe(false);
  expect(result.ids).not.toContain('duplicate-q1');
  expect(new Set(result.prompts).size).toBe(15);
});
