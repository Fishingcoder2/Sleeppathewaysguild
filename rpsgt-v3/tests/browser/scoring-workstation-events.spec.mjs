import {test,expect} from '@playwright/test';

test('PSG workstation marks session-only teaching events on frozen tracings',async({page})=>{
  await page.goto('lab-scoring.html');
  const eventPanel=page.locator('[data-ws-event-section]');
  await expect(eventPanel).toBeVisible();
  await expect(eventPanel).toContainText('Session only');
  await expect(eventPanel.locator('[data-ws-event-type]')).toHaveCount(9);

  await page.locator('[data-workstation-open-first]').click();
  const stageHost=page.locator('[data-scoring-stage-visual]');
  await stageHost.locator('[data-stage-start]').click();
  await eventPanel.locator('[data-ws-event-type="oa"]').click();
  await expect(eventPanel.locator('[data-ws-event-mark]')).toHaveText('Mark events ON');

  const liveCanvas=stageHost.locator('[data-live-canvas-a]');
  const liveBox=await liveCanvas.boundingBox();
  expect(liveBox).not.toBeNull();
  await page.mouse.move(liveBox.x+liveBox.width*.35,liveBox.y+liveBox.height*.5);
  await page.mouse.down();
  await page.mouse.move(liveBox.x+liveBox.width*.5,liveBox.y+liveBox.height*.5);
  await page.mouse.up();
  await expect(eventPanel.locator('[data-ws-event-help]')).toContainText('Freeze the live page');
  await expect(eventPanel.locator('[data-ws-event-count]')).toHaveText('0 events');

  await stageHost.locator('[data-stage-freeze]').click();
  const canvas=stageHost.locator('[data-stage-score-canvas]');
  await expect(canvas).toBeVisible();
  const box=await canvas.boundingBox();
  expect(box).not.toBeNull();
  const plotLeft=box.x+112;
  const plotWidth=box.width-112-12;
  const y=box.y+box.height*.52;

  await page.mouse.move(plotLeft+plotWidth*.20,y);
  await page.mouse.down();
  await page.mouse.move(plotLeft+plotWidth*.40,y);
  await page.mouse.up();

  await expect(eventPanel.locator('[data-ws-event-count]')).toHaveText('1 event');
  await expect(eventPanel.locator('[data-ws-event-list]')).toContainText('Obstructive apnea');
  await expect(eventPanel.locator('[data-ws-event-list]')).toContainText('6.0 s–12.0 s');
  await expect(eventPanel.locator('[data-ws-event-timeline] span')).toHaveCount(1);
  await expect(stageHost.locator('.ws-event-marker')).toBeVisible();

  await eventPanel.locator('[data-ws-event-type="arousal"]').click();
  await page.mouse.move(plotLeft+plotWidth*.60,y);
  await page.mouse.down();
  await page.mouse.move(plotLeft+plotWidth*.70,y);
  await page.mouse.up();
  await expect(eventPanel.locator('[data-ws-event-count]')).toHaveText('2 events');
  await expect(eventPanel.locator('[data-ws-event-timeline] span')).toHaveCount(2);

  await eventPanel.locator('[data-ws-event-prev]').click();
  await expect(eventPanel.locator('[data-ws-event-list] li').first()).toHaveClass(/selected/);
  await eventPanel.locator('[data-ws-event-delete]').click();
  await expect(eventPanel.locator('[data-ws-event-count]')).toHaveText('1 event');
  await eventPanel.locator('[data-ws-event-clear]').click();
  await expect(eventPanel.locator('[data-ws-event-count]')).toHaveText('0 events');
});

test('Protocol station disables waveform event marking',async({page})=>{
  await page.goto('lab-scoring.html');
  const eventPanel=page.locator('[data-ws-event-section]');
  await page.locator('[data-workstation-station="population-boundaries"]').click();
  await expect(eventPanel.locator('[data-ws-event-mark]')).toBeDisabled();
  await expect(eventPanel.locator('[data-ws-event-mark]')).toHaveText('No waveform marking');
  await expect(eventPanel.locator('[data-ws-event-timeline]')).toBeHidden();
  await expect(eventPanel.locator('[data-ws-event-help]')).toContainText('no waveform canvas');
});
