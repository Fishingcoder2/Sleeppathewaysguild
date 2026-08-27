import {test,expect} from '@playwright/test';

test('Station 7 teaches pediatric and protocol boundaries before checkpoint',async({page})=>{
  await page.goto('lab-scoring.html');
  const host=page.locator('[data-scoring-population-visual]');
  await expect(host).toBeVisible();
  await expect(host).toContainText('Station 7');
  await host.locator('[data-population-start]').click();

  const cases=[
    ['Protocol boundary — routine pediatric MSLT conditions are not met; notify the sleep clinician and consider rescheduling.','The preceding PSG provided less than 7 hours of total sleep time, so the minimum pediatric PSG–MSLT preparation condition was not met.'],
    ['Protocol boundary — do not perform the MSLT as a routine next-day study after a split-night or initial PAP titration night.','PAP pressures were adjusted during the preceding night, which the pediatric protocol identifies as an inappropriate lead-in night for routine MSLT testing.'],
    ['Population boundary — routine normative interpretation is limited under age 5; proceed only through clinician-directed special-circumstance planning.','Normative pediatric MSLT data are limited below age 5, so the case requires special clinician-directed consideration rather than routine interpretation.'],
    ['Evidence boundary — do not present pediatric MWT as a standardized validated protocol; involve the sleep clinician and document the limitation.','The current pediatric AASM paper identifies no normative MWT values for patients under 18 and does not provide a recommended pediatric MWT protocol.'],
    ['Protocol modification — tailor instructions to developmental age and document clinician-approved accommodations rather than forcing adult wording.','Developmental-age tailoring and documented protocol modifications are explicitly contemplated in the pediatric guidance.'],
    ['Source-hierarchy boundary — stop, verify current official guidance and the facility’s current approved protocol, then document the resolution.','The safe response is to verify the current authoritative rule and current facility protocol rather than relying on a dated local worksheet from memory.']
  ];

  for(let index=0;index<cases.length;index+=1){
    const [decision,evidence]=cases[index];
    await host.locator('[data-population-decision]').filter({hasText:decision}).click();
    await host.locator('[data-population-check-decision]').click();
    await expect(host.locator('.visual-feedback').first()).toContainText('Correct boundary');
    await host.locator('[data-population-evidence]').filter({hasText:evidence}).click();
    await host.locator('[data-population-check-evidence]').click();
    await expect(host.locator('.visual-feedback').last()).toContainText('Evidence matched');
    if(index<cases.length-1)await host.locator('[data-population-next]').click();
  }

  await host.locator('[data-population-finish]').click();
  await expect(host).toContainText('Station 7 complete');
  await expect(host).toContainText('Maski');
  await expect(page.locator('[data-scoring-station="population-boundaries"]')).toBeChecked();
});
