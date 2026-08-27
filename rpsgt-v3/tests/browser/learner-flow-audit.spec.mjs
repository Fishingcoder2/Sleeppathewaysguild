import {expect,test} from '@playwright/test';

async function expectTargetNearTop(page,selector){
  const target=page.locator(selector);
  await expect(target).toBeVisible({timeout:15_000});
  await page.waitForTimeout(120);
  const geometry=await page.evaluate(sel=>{
    const target=document.querySelector(sel);
    const topbar=document.querySelector('.topbar');
    const rect=target.getBoundingClientRect();
    const bar=topbar?topbar.getBoundingClientRect():{bottom:0};
    return {top:rect.top,bottom:rect.bottom,barBottom:bar.bottom,height:innerHeight,width:innerWidth};
  },selector);
  expect(geometry.top,`${selector} should not be hidden under the sticky top bar`).toBeGreaterThanOrEqual(geometry.barBottom-4);
  expect(geometry.top,`${selector} should land in the upper visible portion of the viewport`).toBeLessThan(Math.max(geometry.barBottom+320,geometry.height*.62));
}

async function expectBoxInsideViewport(page,selector){
  const locator=page.locator(selector).first();
  await expect(locator).toBeVisible();
  const box=await locator.boundingBox();
  const viewport=page.viewportSize();
  expect(box,`${selector} should have a layout box`).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-2);
  expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+2);
  expect(box.y+Math.min(box.height,48)).toBeGreaterThan(0);
  expect(box.y).toBeLessThan(viewport.height);
}

test('labeled study, report, and Guild-resource deep links land on their visible destination',async({page})=>{
  for(const code of ['D1','D2','D3','D4']){
    await page.goto(`study.html#${code}`);
    await expectTargetNearTop(page,`#${code}`);
  }

  await page.goto('reports.html#guided-trail-report');
  await expectTargetNearTop(page,'#guided-trail-report');

  await page.goto('index.html#guild-resources');
  await expectTargetNearTop(page,'#guild-resources');
});

test('Guided Study exposes direct area choices instead of making learners scroll through unrelated sections',async({page})=>{
  await page.goto('study.html');
  const chooser=page.locator('#guided-study-area-chooser');
  await expect(chooser).toBeVisible();
  await expect(chooser).toContainText('Go straight to the learning area you need');
  const links=chooser.locator('.guided-study-area-link');
  await expect(links).toHaveCount(4);
  await expect(links.nth(0)).toHaveAttribute('href','#respiratory-pap-trail');
  await expect(links.nth(1)).toHaveAttribute('href','#guided-study-progress');
  await expect(links.nth(2)).toHaveAttribute('href','#explorer-journey');
  await expect(links.nth(3)).toHaveAttribute('href','#rpsgt-domain-map');

  await links.nth(3).click();
  await expectTargetNearTop(page,'#rpsgt-domain-map');
});

test('sidebar blueprint labels resolve to real D1-D4 containers and Readiness uses the same name as its destination',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Sidebar is checked once on desktop; mobile uses the compact navigation shell.');
  await page.goto('study.html');
  for(const code of ['D1','D2','D3','D4']){
    await expect(page.locator(`.sidebar a[href="study.html#${code}"]`)).toBeVisible();
    await expect(page.locator(`#${code}`)).toBeVisible();
  }
  await expect(page.locator('.sidebar a[href="readiness.html"]')).toContainText('Readiness Check');
  await expect(page.locator('.sidebar a[href="readiness.html"]')).not.toContainText('Targeted Review');
});

test('Practice keeps the question, choices, and primary submit/next control usable on the learner screen',async({page})=>{
  await page.goto('practice.html');
  await page.locator('[data-practice-size]').selectOption('5');
  await page.locator('[data-start-practice]').click();
  await expect(page.locator('[data-practice-shell]')).toBeVisible();
  await expectBoxInsideViewport(page,'[data-question-prompt]');
  await expectBoxInsideViewport(page,'[data-question-choices] .practice-choice');
  await expectBoxInsideViewport(page,'[data-next-question]');

  await page.locator('[data-question-choices] .practice-choice').first().click();
  await expect(page.locator('[data-next-question]')).toBeEnabled();
  await page.locator('[data-next-question]').click();
  await expect(page.locator('[data-answer-feedback]')).toBeVisible();
  await expectBoxInsideViewport(page,'[data-next-question]');
  await expect(page.locator('[data-next-question]')).toHaveText('Next question');
});

test('Guided Study checkpoint keeps prompt, answer choices, and navigation controls reachable',async({page})=>{
  await page.goto('study.html');
  const task=page.locator('.task-map-card').first();
  await expect(task).toBeVisible();
  await task.locator('[data-checkpoint-start]').click();
  await expect(page.locator('[data-checkpoint-workspace]')).toBeVisible();
  await expectBoxInsideViewport(page,'#checkpoint-title');
  await expectBoxInsideViewport(page,'.checkpoint-option');
  await expectBoxInsideViewport(page,'[data-checkpoint-next]');
  await expect(page.locator('[data-checkpoint-next]')).toBeDisabled();
  await page.locator('.checkpoint-option').first().click();
  await expect(page.locator('[data-checkpoint-next]')).toBeEnabled();
});

test('compact navigation leaves room for learning content on phone-sized screens',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium','Phone-specific navigation density check.');
  await page.goto('study.html');
  await expect(page.locator('[data-toggle-menu]')).toBeVisible();
  await expect(page.locator('[data-open-settings]')).toBeVisible();
  await expect(page.locator('.top-actions>a:visible')).toHaveCount(0);
  const topbar=await page.locator('.topbar').boundingBox();
  expect(topbar.height).toBeLessThanOrEqual(74);

  await page.locator('[data-toggle-menu]').click();
  await expect(page.locator('body')).toHaveClass(/rpsgt-menu-open/);
  await expect(page.locator('[data-toggle-menu]')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('.sidebar')).toBeVisible();
});
