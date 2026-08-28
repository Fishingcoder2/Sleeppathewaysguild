import {test,expect} from '@playwright/test';

test('PSG workstation inspector proxies stage scoring and measures teaching waveform time',async({page})=>{
  await page.goto('lab-scoring.html');
  const inspector=page.locator('[data-scoring-workstation-inspector]');
  await expect(inspector).toBeVisible();
  await expect(inspector).toContainText('Scoring Inspector');
  await expect(inspector.locator('[data-ws-queue]')).toHaveCount(7);
  await expect(inspector.locator('[data-ws-inspector-active]')).toContainText('Station 1');

  await page.locator('[data-workstation-open-first]').click();
  const stageHost=page.locator('[data-scoring-stage-visual]');
  await stageHost.locator('[data-stage-start]').click();
  await expect(stageHost.locator('[data-live-canvas-a]')).toBeVisible();
  await stageHost.locator('[data-stage-freeze]').click();
  const canvas=stageHost.locator('[data-stage-score-canvas]');
  await expect(canvas).toBeVisible();

  await inspector.locator('[data-ws-stage="N2"]').click();
  await expect(stageHost.locator('[data-stage-answer="N2"]')).toHaveClass(/selected/);
  await inspector.locator('[data-ws-stage-commit]').click();
  await expect(stageHost.locator('.visual-feedback')).toBeVisible();

  const box=await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
  await expect(inspector.locator('[data-ws-cursor-time]')).toContainText('15.0 s');
  await expect(stageHost.locator('.ws-measure-cursor')).toBeVisible();

  await inspector.locator('[data-ws-cursor-toggle]').click();
  await expect(inspector.locator('[data-ws-cursor-toggle]')).toHaveText('Cursor OFF');
  await expect(stageHost.locator('.ws-measure-cursor')).toHaveCount(0);

  await inspector.locator('[data-ws-open="artifact-physiology"]').click();
  await expect(page.locator('[data-workstation-station="artifact-physiology"]')).toHaveClass(/active/);
  await expect(inspector.locator('[data-ws-inspector-active]')).toContainText('Station 6');
  await expect(inspector.locator('[data-ws-stage-pad]')).toBeHidden();
});

test('PSG workstation inspector docks into normal flow on tablet and phone widths',async({page})=>{
  await page.setViewportSize({width:740,height:900});
  await page.goto('lab-scoring.html');
  const inspector=page.locator('[data-scoring-workstation-inspector]');
  await expect(inspector).toBeVisible();
  const position=await inspector.evaluate(node=>getComputedStyle(node).position);
  expect(position).toBe('relative');
  await expect(inspector.locator('[data-ws-queue]')).toHaveCount(7);
});
