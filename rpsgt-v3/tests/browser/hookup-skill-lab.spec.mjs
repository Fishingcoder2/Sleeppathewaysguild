import { expect, test } from '@playwright/test';

test('Hookup requires a learner decision before a station can earn skill credit', async ({ page }) => {
  await page.goto('lab-hookup.html');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.hookup-skill-card')).toHaveCount(6);
  await expect(page.locator('[data-hookup-summary]')).toContainText('0/6');
  await expect(page.locator('[data-hookup-stations] input[type="checkbox"]')).toHaveCount(0);

  const firstForm=page.locator('[data-hookup-skill="measurement-foundations"]');
  await firstForm.getByRole('button',{name:'Check this decision'}).click();
  await expect(firstForm).toContainText('Choose a response first');
  await expect(firstForm).not.toContainText('Best answer:');
  await expect(page.locator('[data-hookup-summary]')).toContainText('0/6');

  const station=await page.evaluate(() => {
    const item=window.RPSGTHookupLabEngine.STATIONS.find(row=>row.id==='measurement-foundations');
    return {answer:item.answer,wrong:item.options.find(option=>option!==item.answer)};
  });

  await firstForm.getByText(station.wrong,{exact:true}).click();
  await firstForm.getByRole('button',{name:'Check this decision'}).click();
  await expect(page.locator('[data-hookup-skill="measurement-foundations"]')).toContainText('Not yet — try the decision again');
  await expect(page.locator('[data-hookup-summary]')).toContainText('0/6');

  const refreshedForm=page.locator('[data-hookup-skill="measurement-foundations"]');
  await refreshedForm.getByText(station.answer,{exact:true}).click();
  await refreshedForm.getByRole('button',{name:'Check this decision'}).click();
  await expect(page.locator('#hookup-skill-measurement-foundations')).toContainText('Skill demonstrated');
  await expect(page.locator('[data-hookup-summary]')).toContainText('1/6');
});

test('Hookup legacy checklist completion cannot appear as demonstrated completion', async ({ page }) => {
  await page.goto('lab-hookup.html');
  await page.evaluate(() => {
    const saved=window.RPSGTStorage.load();
    saved.labs={
      completed:['hookup'],
      hookup:{
        completed:true,
        status:'completed',
        quizPassed:true,
        checklist:{
          'order-equipment':true,
          'patient-site':true,
          'landmark-plan':true,
          'application-impedance':true,
          calibrations:true,
          'signal-documentation':true
        }
      }
    };
    window.RPSGTStorage.save(saved);
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('[data-hookup-summary]')).toContainText('0/6');
  await expect(page.locator('[data-hookup-summary]')).not.toContainText('Completed');
  await expect(page.locator('.hookup-skill-card')).toHaveCount(6);
});
