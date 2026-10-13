import {expect,test} from '@playwright/test';

// Tests two deployments: /rpsgt-v3/ under Guild site and / at standalone Worker.
// Never resets, imports, or mutates existing question-bank source and legacy progress.
const pages=[
  ['Dashboard','index.html'],
  ['Guided Study','study.html'],
  ['Practice Center','practice.html'],
  ['Skills Labs','labs.html'],
  ['Reports','reports.html'],
  ['Reference Center','sources-disclosures.html']
];
test('every primary route renders with no same-origin 404 or page error',async({page})=>{
 const failures=[],errors=[];
 page.on('response',r=>{if(r.url().startsWith(new URL(test.info().project.use.baseURL).origin) && r.status()>=400)failures.push(r.status()+' '+r.url());});
 page.on('pageerror',e=>errors.push(e.message));
 for(const [name,href] of pages){
  const r=await page.goto(href);
  expect(r?.status(),name+' should return 200').toBe(200);
  await expect(page.locator('h1').first(),name+' should render').toBeVisible();
  await page.waitForLoadState('networkidle');
 }
 expect(failures,'Missing resources for one of the main destinations').toEqual([]);
 expect(errors,'Page scripts should initialize without exceptions').toEqual([]);
});

test('dashboard navigation buttons lead to real routes and load the approved question overlay',async({page})=>{
 const failed=[],jsonResponses=[];
 page.on('response',r=>{
  if(r.url().includes('owner-approved-question-release.json'))jsonResponses.push({status:r.status(),url:r.url()});
  if(r.status()===404 && r.url().startsWith(new URL(test.info().project.use.baseURL).origin))failed.push(r.url());
 });
 await page.goto('index.html');
 await page.locator('.sidebar a[data-nav="study"]').click();
 await expect(page).toHaveURL(/study\.html/);
 await expect(page.locator('[data-blueprint-map]')).toBeVisible();
 await page.locator('.sidebar a[data-nav="practice"]').click();
 await expect(page).toHaveURL(/practice\.html/);
 await expect(page.locator('[data-practice-setup]')).toBeVisible();
 await expect.poll(()=>jsonResponses.length).toBeGreaterThan(0);
 expect(jsonResponses.every(x=>x.status===200),'approved questions must load successfully').toBe(true);
 await page.locator('.sidebar a[data-nav="reports"]').click();
 await expect(page).toHaveURL(/reports\.html/);
 await expect(page.locator('h1').first()).toBeVisible();
 await page.locator('.sidebar a[data-nav="labs"]').click();
 await expect(page).toHaveURL(/labs\.html/);
 await expect(page.locator('h1').first()).toBeVisible();
 expect(failed).toEqual([]);
});

test('Settings works as a button and References loads the local shared registry',async({page})=>{
 const failed=[];
 page.on('response',r=>{if(r.status()===404 && r.url().startsWith(new URL(test.info().project.use.baseURL).origin))failed.push(r.url());});
 await page.goto('index.html');
 await page.locator('[data-open-settings]').click();
 await expect(page.locator('[role="dialog"]')).toBeVisible();
 await page.locator('.rpsgt-settings-close').click();
 await page.goto('sources-disclosures.html');
 await expect(page.locator('h1').first()).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>Boolean(document.querySelector('script[src="assets/guild-resource-commerce-registry.js"]')))).toBe(true);
 expect(failed).toEqual([]);
});
