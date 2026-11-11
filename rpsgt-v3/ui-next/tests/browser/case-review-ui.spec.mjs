import { test, expect } from '@playwright/test';

test('case notebook opens with real teaching artifact, grades once, and survives a deep-link refresh',async({page})=>{
  await page.goto('/case-review/');
  await expect(page.getByRole('heading',{name:'Choose a clinical teaching case'})).toBeVisible();
  await page.getByRole('button',{name:'Open Case'}).first().click();
  await expect(page).toHaveURL(/\/case-review\/case\/psg-report-intro$/);
  await expect(page.getByRole('heading',{name:'PSG report verification'})).toBeVisible();
  await expect(page.frameLocator('iframe[title="Sample PSG report"]').locator('body')).toBeVisible();
  await expect(page.locator('[aria-label="Case reasoning questions"]')).toContainText('apnea-hypopnea index');
  await page.locator('[aria-label="Select an answer"] button').first().click();
  await expect(page.locator('[aria-label="Case reasoning questions"] [role="status"]')).toContainText('Correct');
  await expect(page.locator('[aria-label="Case reasoning questions"] [role="status"]')).toContainText('total sleep time in hours');
  await expect(page.getByRole('button',{name:'Next question'})).toBeEnabled();
  await page.reload();
  await expect(page).toHaveURL(/\/case-review\/case\/psg-report-intro$/);
  await expect(page.getByRole('heading',{name:'PSG report verification'})).toBeVisible();
  await expect(page.locator('[aria-label="Case reasoning questions"]')).toContainText('apnea-hypopnea index');
  await expect(page.locator('[aria-label="Clinical teaching artifact"]')).toBeVisible();
});

test('keyboard search and contextual Coach Bob guidance are available without deep menus',async({page})=>{
  await page.goto('/case-review/');
  await page.keyboard.press('Control+k');
  const search=page.getByRole('combobox',{name:'Search cases and learning tools'});
  await expect(search).toBeFocused();
  await search.fill('PSG report verification');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/case-review\/case\/psg-report-intro$/);
  await page.getByRole('tab',{name:'Coach Bob'}).click();
  await expect(page.locator('[aria-label="Coach Bob guidance"]')).toContainText('Verified guide prompts');
  await expect(page.getByRole('textbox',{name:'Ask Coach Bob about the case'})).toBeDisabled();
  await page.getByRole('button',{name:'Verify the AHI'}).click();
  await expect(page.locator('[aria-label="Coach Bob guidance"]')).toContainText('Compute the index');
  await page.getByRole('button',{name:'Return to Case Overview'}).click();
  await expect(page.getByRole('heading',{name:'Choose a clinical teaching case'})).toBeVisible();
});

test('mobile/desktop navigation and missed-review dialog preserve old V3 review route',async({page})=>{
  await page.goto('/case-review/');
  const mobile=page.viewportSize().width<1024;
  if(mobile){
    await page.getByRole('button',{name:'Open navigation'}).click();
    await expect(page.getByRole('navigation',{name:'RPSGT sections'})).toBeVisible();
    await page.getByRole('button',{name:'Close menu'}).click();
  }else{
    const toggle=page.getByRole('button',{name:'Collapse navigation'});
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button',{name:'Expand navigation'})).toBeVisible();
  }
  await page.getByRole('button',{name:'Missed Review'}).click();
  await expect(page.getByRole('dialog',{name:'Review missed questions'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog',{name:'Review missed questions'})).toHaveCount(0);
  await page.getByRole('button',{name:'Missed Review'}).click();
  const start=page.getByRole('button',{name:'Start missed review'});
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page).toHaveURL(/\/review\.html\?list=missed$/);
  await expect(page.locator('body')).toContainText('Missed');
});

test('missing React assets remain 404 while existing Practice Center renders',async({page,request})=>{
  const absent=await request.get('/case-review/assets/missing-verified-404.js');
  expect(absent.status()).toBe(404);
  const practice=await request.get('/practice.html');
  expect(practice.status()).toBe(200);
  await page.goto('/case-review/case/pap-report-intro');
  await expect(page.getByRole('heading',{name:'PAP titration report review'})).toBeVisible();
});
