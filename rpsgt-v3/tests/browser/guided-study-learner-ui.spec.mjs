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
  await expect(page.locator('[data-blueprint-summary]')).toContainText('5 questions per checkpoint');
  await expect(page.locator('[data-blueprint-summary]')).toContainText('80% task-award goal');

  const resources=cards.first().locator('details[data-resource-ready="true"]');
  await expect(resources).toBeVisible();
  await expect(resources.locator('summary')).toHaveText('Recommended study resources');
  await resources.locator('summary').click();
  await expect(resources).toHaveAttribute('open','');
  await expect(resources.locator('.resource-title-chip').first()).toBeVisible();
  await expect(resources).not.toContainText('fundamentals-sleep-technology-3e');
  await expect(resources).not.toContainText('studyRecommendationKeys');
  await expect(resources).not.toContainText('referenceKeys');

  await cards.first().locator('[data-checkpoint-start]').click();
  const checkpoint=page.locator('[data-checkpoint-workspace]');
  await expect(checkpoint).toBeVisible();
  await expect(checkpoint).toContainText('Question 1 of 5');
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
