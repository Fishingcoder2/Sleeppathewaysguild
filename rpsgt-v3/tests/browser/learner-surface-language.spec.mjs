import {expect,test} from '@playwright/test';

const ROUTES=[
  'index.html',
  'study.html',
  'practice.html',
  'review.html?list=missed',
  'readiness.html',
  'labs.html',
  'reports.html',
  'flashcards.html',
  'notes.html',
  'math-coach.html',
  'sources-disclosures.html'
];

const FORBIDDEN=/\b(?:mapped|mapping|mappings)\b|\b(?:referenceKeys|studyRecommendationKeys)\b/i;

for(const route of ROUTES){
  test(`${route} keeps internal reference-workflow language off the learner surface`,async({page})=>{
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(50);
    const visibleText=await page.locator('body').innerText();
    expect(visibleText).not.toMatch(FORBIDDEN);
  });
}

test('Dashboard and Guided Study expose Flashcards & Notes',async({page})=>{
  await page.goto('index.html');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#flashcards-notes-tools')).toBeVisible();
  await expect(page.locator('#flashcards-notes-tools a[href="flashcards.html"]')).toContainText('Open Flashcards');
  await expect(page.locator('#flashcards-notes-tools a[href="notes.html"]')).toContainText('Open Notes');

  await page.goto('study.html');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#flashcards-notes-tools')).toBeVisible();
  await expect(page.locator('.sidebar a[href="notes.html"]')).toBeAttached();
});

test('Study Notes save and survive reload in the V3 learner record',async({page})=>{
  await page.goto('notes.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await page.locator('[data-notes-title]').fill('Respiratory review');
  await page.locator('[data-notes-body]').fill('Remember the signal relationships and explain why the finding fits.');
  await page.locator('[data-notes-save]').click();
  await expect(page.locator('[data-notes-status]')).toContainText('Saved in this browser');
  await page.reload();
  await expect(page.locator('[data-notes-title]')).toHaveValue('Respiratory review');
  await expect(page.locator('[data-notes-body]')).toHaveValue('Remember the signal relationships and explain why the finding fits.');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spg_rpsgt_v3')));
  expect(saved.notes.title).toBe('Respiratory review');
  expect(saved.notes.general).toContain('signal relationships');
});
