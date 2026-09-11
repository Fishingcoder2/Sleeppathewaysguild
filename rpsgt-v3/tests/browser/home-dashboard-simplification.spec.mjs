import {expect,test} from '@playwright/test';

test('dashboard prioritizes continuation and five primary destinations',async({page})=>{
  await page.goto('index.html');
  await expect(page.getByRole('heading',{name:'Pick up where you left off.'})).toBeVisible();
  await expect(page.locator('[data-continue]')).toBeVisible();
  for(const name of ['Study','Practice','Skills Labs','Mock Exam','Reports']){
    await expect(page.getByRole('heading',{name})).toBeVisible();
  }
});

test('dashboard keeps reference and explanatory material behind help links',async({page})=>{
  await page.goto('index.html');
  await expect(page.getByRole('link',{name:'Learner Guide'})).toHaveAttribute('href','learner-guide.html');
  await expect(page.getByRole('link',{name:'Exam blueprint'})).toHaveAttribute('href','study.html#rpsgt-domain-map');
  await expect(page.getByRole('link',{name:'References & disclosures'})).toHaveAttribute('href','sources-disclosures.html');
  await expect(page.getByText('How to use RPSGT V3')).toHaveCount(0);
  await expect(page.getByText('Official BRPT RPSGT resources')).toHaveCount(0);
  await expect(page.getByText('Four checks before you commit to the answer')).toHaveCount(0);
});

test('dashboard primary content fits the viewport without horizontal overflow',async({page})=>{
  await page.goto('index.html');
  const geometry=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width+2);
  await expect(page.locator('.home-destination-grid')).toBeVisible();
});
