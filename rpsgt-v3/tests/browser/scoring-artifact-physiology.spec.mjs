import {test,expect} from '@playwright/test';

test('Station 6 distinguishes artifact from corroborated physiology',async({page})=>{
  await page.goto('lab-scoring.html');
  const host=page.locator('[data-scoring-artifact-visual]');
  await expect(host).toBeVisible();
  await expect(host).toContainText('Station 6');
  await host.locator('[data-artifact-start]').click();
  await expect(host.locator('[data-artifact-canvas]')).toBeVisible();

  const cases=[
    {
      answer:'Artifact — line-frequency / electrical interference',
      evidence:'The same uniform high-frequency pattern appears simultaneously across multiple bioelectric channels.'
    },
    {
      answer:'Artifact — ECG contamination',
      evidence:'Suspicious deflections in the EEG/EOG channels are time-locked to the QRS complexes on ECG.'
    },
    {
      answer:'Artifact — slow-frequency / sweat pattern',
      evidence:'Broad slow baseline shifts affect scalp/face channels while ECG and chin EMG do not show the same slow waveform.'
    },
    {
      answer:'Artifact — nasal pressure signal dropout',
      evidence:'Nasal pressure is lost while thermal airflow, thoracic effort, abdominal effort, and SpO₂ remain physiologically consistent.'
    },
    {
      answer:'Physiologic event — corroborated obstructive respiratory pattern',
      evidence:'Both airflow channels change together while respiratory effort persists, followed by recovery and a delayed SpO₂ response.'
    }
  ];

  for(let index=0;index<cases.length;index+=1){
    const item=cases[index];
    await host.locator('[data-artifact-class]').filter({hasText:item.answer}).click();
    await host.locator('[data-artifact-check-class]').click();
    await expect(host.locator('.visual-feedback').first()).toContainText('Correct interpretation');
    await host.locator('[data-artifact-evidence]').filter({hasText:item.evidence}).click();
    await host.locator('[data-artifact-check-evidence]').click();
    await expect(host.locator('.visual-feedback').last()).toContainText('Evidence matched');
    await expect(host).toContainText('Robertson, B., Marshall, B., & Carno, M.-A. (2014)');
    if(index<cases.length-1)await host.locator('[data-artifact-next]').click();
  }

  await host.locator('[data-artifact-finish]').click();
  await expect(host).toContainText('Station 6 complete');
  await expect(page.locator('[data-scoring-station="artifact-physiology"]')).toBeChecked();
});
