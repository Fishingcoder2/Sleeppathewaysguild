import {test,expect} from '@playwright/test';

test('Station 5 teaches limb-movement series, respiratory association, and wake context',async({page})=>{
  await page.goto('lab-scoring.html');
  const host=page.locator('[data-scoring-limb-visual]');
  await expect(host).toBeVisible();
  await expect(host).toContainText('Station 5');
  await expect(host).toContainText('120-second view');
  await host.locator('[data-limb-start]').click();
  await expect(host.locator('[data-limb-canvas]')).toBeVisible();

  const cases=[
    {
      answer:'Qualifying PLM series',
      evidence:'Four movement events remain after the closely paired bilateral bursts are treated as one movement; their onsets remain within the series interval.'
    },
    {
      answer:'Too few movements for a PLM series',
      evidence:'Only three candidate leg movements are present, so the minimum series count is not reached.'
    },
    {
      answer:'Respiratory-associated movements — exclude from PLM scoring',
      evidence:'Each leg movement falls during or within 0.5 seconds of a respiratory-event boundary.'
    },
    {
      answer:'Wake leg movements — do not score as PLMs',
      evidence:'The stage context is wake, so these leg movements are not scored as PLMs even though they look periodic.'
    }
  ];

  for(let index=0;index<cases.length;index+=1){
    const item=cases[index];
    await host.locator('[data-limb-class]').filter({hasText:item.answer}).click();
    await host.locator('[data-limb-check-class]').click();
    await expect(host.locator('.visual-feedback').first()).toContainText('Correct interpretation');
    await host.locator('[data-limb-evidence]').filter({hasText:item.evidence}).click();
    await host.locator('[data-limb-check-evidence]').click();
    await expect(host.locator('.visual-feedback').last()).toContainText('Evidence matched');
    if(index<cases.length-1)await host.locator('[data-limb-next]').click();
  }

  await host.locator('[data-limb-finish]').click();
  await expect(host).toContainText('Station 5 complete');
  await expect(page.locator('[data-scoring-station="limb-movement-context"]')).toBeChecked();
});
