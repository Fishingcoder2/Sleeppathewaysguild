import {test,expect} from '@playwright/test';

test('25-question readiness finish opens visible results and a saved result can be reopened',async({page})=>{
  await page.goto('readiness.html');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-readiness-home]')).toBeVisible();
  await page.locator('[data-start-readiness="25"]').click();
  const next=page.locator('[data-next-question]');
  const choice=page.locator('[data-question-choices] [data-choice-index="0"]');
  await expect(page.locator('[data-session-size]')).toHaveText('25');

  for(let number=1;number<=25;number++){
    await expect(page.locator('[data-question-number]')).toHaveText('Question '+number+' of 25');
    await choice.click();
    await next.click(); // Grade the chosen answer.
    await expect(page.locator('[data-session-answered]')).toHaveText(String(number));
    if(number<25){
      await next.click(); // Move to the next question.
    }else{
      await expect(next).toBeEnabled();
      await expect(next).toHaveText('View readiness result');
    }
  }

  await next.click();
  const results=page.locator('[data-readiness-results]');
  await expect(results).toBeVisible();
  await expect(page.locator('[data-readiness-shell]')).toBeHidden();
  await expect(page.locator('[data-result-answered]')).toHaveText('25 / 25');
  const heading=page.locator('[data-readiness-result-heading]');
  await expect(heading).toBeFocused();
  await expect.poll(async()=>heading.evaluate(node=>{
    const rect=node.getBoundingClientRect();
    return rect.top>=0&&rect.top<window.innerHeight&&rect.bottom<=window.innerHeight;
  })).toBeTruthy();

  const firstPercent=await page.locator('[data-result-score]').innerText();
  const recordCount=await page.evaluate(()=>window.RPSGTStorage.load().readiness.history.length);
  expect(recordCount).toBe(1);
  const hasActive=await page.evaluate(()=>window.RPSGTStorage.load().readiness.activeSession);
  expect(hasActive).toBeNull();

  // A result is still accessible after leaving/reloading the check.
  await page.reload();
  await expect(page.locator('[data-readiness-home]')).toBeVisible();
  const saved=page.locator('[data-view-readiness-history="0"]');
  await expect(saved).toBeVisible();
  await saved.click();
  await expect(results).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.locator('[data-result-answered]')).toHaveText('25 / 25');
  await expect(page.locator('[data-result-score]')).toHaveText(firstPercent);
  expect(await page.evaluate(()=>window.RPSGTStorage.load().readiness.history.length)).toBe(1);
});
