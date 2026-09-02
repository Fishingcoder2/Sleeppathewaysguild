import {expect,test} from '@playwright/test';

test('Skills Labs routes scoring learners through the PSG Skills Workstation',async({page})=>{
  await page.goto('labs.html');
  const scoring=page.locator('#lab-scoring');
  await expect(scoring).toBeVisible();
  const link=scoring.locator('a.btn.primary');
  await expect(link).toHaveAttribute('href','scoring-workstation.html');
  await expect(link).toContainText('PSG Workstation');
});

test('PSG Skills Workstation exposes a clear visual-practice progression',async({page})=>{
  await page.goto('scoring-workstation.html');
  await expect(page.getByRole('heading',{name:'One workstation. One scoring task at a time.'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Live Sleep Staging'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Mini PSG Viewer'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Respiratory Signals'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Full Scoring Lab'})).toBeVisible();
});

test('live staging keeps 30-second timing and scoring controls usable',async({page})=>{
  await page.goto('scoring-workstation.html#live-staging');
  const host=page.locator('[data-html5-psg-workstation]');
  await expect(host.getByText('Live 30-second scrolling epoch')).toBeVisible({timeout:15_000});
  await host.getByRole('button',{name:'Start scrolling PSG'}).click();
  await expect(host.getByText('30.0 s/page')).toBeVisible();
  await expect(host.locator('canvas').first()).toBeVisible();
  await host.getByRole('button',{name:'Pause and score epoch'}).click();
  const options=host.locator('[data-html5-answer]');
  await expect(options).toHaveCount(5);
  await expect(host.getByRole('button',{name:'Check answer'})).toBeVisible();

  const geometry=await page.evaluate(()=>{
    const host=document.querySelector('[data-html5-psg-workstation]');
    const rect=host.getBoundingClientRect();
    return {left:rect.left,right:rect.right,width:innerWidth};
  });
  expect(geometry.left).toBeGreaterThanOrEqual(-2);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width+2);
});
