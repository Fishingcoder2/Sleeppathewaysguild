import {test,expect} from '@playwright/test';

test('dashboard respiratory shortcut restores saved lesson without changing assessment progress',async({page})=>{
  await page.goto('index.html');
  const expected=await page.evaluate(()=>{
    const saved=window.RPSGTStorage.load();
    saved.guidedStudy.respiratoryStudyTrail={
      activeStepId:'osa-pap-treatment',
      completedThroughStepId:'osa-scoring',
      activityProgress:{}
    };
    window.RPSGTStorage.save(saved);
    return {trail:saved.guidedStudy.respiratoryStudyTrail,progress:saved.progress,mock:saved.mock,readiness:saved.readiness};
  });
  await page.getByRole('link',{name:'Respiratory/PAP Study Trail',exact:true}).click();
  await expect(page).toHaveURL(/study\.html#respiratory-pap-trail$/);
  const trail=page.locator('[data-respiratory-study-trail]');
  await expect(trail).toBeVisible();
  await expect(trail.locator('.respiratory-lesson-kicker')).toContainText('Lesson 2');
  await expect(trail.locator('[data-respiratory-next]')).toBeDisabled();
  await page.reload();
  await expect(trail.locator('.respiratory-lesson-kicker')).toContainText('Lesson 2');
  const actual=await page.evaluate(()=>{
    const saved=window.RPSGTStorage.load();
    return {trail:saved.guidedStudy.respiratoryStudyTrail,progress:saved.progress,mock:saved.mock,readiness:saved.readiness};
  });
  expect(actual).toEqual(expected);
});

test('dashboard PSG shortcut opens moving and frozen epochs and retains full Scoring Lab access',async({page})=>{
  await page.goto('index.html');
  const learningState=()=>page.evaluate(()=>{
    const saved=window.RPSGTStorage.load();
    return {progress:saved.progress,guidedStudy:saved.guidedStudy,labs:saved.labs,mock:saved.mock,readiness:saved.readiness};
  });
  const before=await learningState();
  await page.getByRole('link',{name:'PSG Skills Workstation',exact:true}).click();
  await expect(page).toHaveURL(/scoring-workstation\.html$/);
  const host=page.locator('[data-html5-psg-workstation]');
  await host.locator('[data-html5-start]').click();
  await expect(host.locator('[data-html5-a]')).toBeVisible();
  await expect.poll(async()=>parseFloat(await host.locator('[data-html5-time]').innerText())).toBeGreaterThan(0);
  await host.locator('[data-html5-freeze]').click();
  await expect(host).toContainText('Frozen 30-second epoch');
  await expect(host.locator('[data-html5-frozen]')).toBeVisible();
  await expect(host.locator('[data-html5-answer]')).toHaveCount(5);
  await expect(host.locator('[data-html5-check]')).toBeDisabled();
  await host.locator('[data-html5-answer="N2"]').click();
  await host.locator('[data-html5-check]').click();
  await expect(host.locator('.html5-psg-feedback')).toBeVisible();
  await host.locator('[data-html5-live]').click();
  await expect(host.locator('[data-html5-a]')).toBeVisible();
  await page.getByRole('link',{name:'Open full Scoring Lab',exact:true}).click();
  await expect(page).toHaveURL(/lab-scoring\.html$/);
  await expect(page.locator('[data-live-psg]')).toBeVisible();
  expect(await learningState()).toEqual(before);
});
