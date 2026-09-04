import {test,expect} from '@playwright/test';

test('live PSG uses a 30-second real-time right-to-left window with frozen review and no learner-progress writes',async({page})=>{
  await page.goto('lab-scoring.html');
  const host=page.locator('[data-live-psg]');
  const canvas=host.locator('[data-live-psg-canvas]');
  await expect(host).toBeVisible();
  await expect(host).toContainText('One full screen = exactly 30 real-time seconds');
  await expect(host).toContainText('right to left');
  await expect(canvas).toHaveAttribute('data-seconds-per-screen','30');
  await expect(canvas).toHaveAttribute('data-scroll-direction','right-to-left');
  await expect(canvas).toHaveAttribute('data-boundary-cycle-seconds','30');
  await expect(host.locator('[data-live-psg-channel-key] span')).toHaveCount(12);
  await expect(host.locator('[data-live-psg-mode]')).toHaveText('Paused');
  await expect(host.locator('[data-live-psg-fullscreen]')).toBeVisible();
  await expect(host.locator('[data-live-psg-workstation-link]')).toHaveAttribute('href','scoring-workstation.html');
  await expect(host.locator('[data-live-psg-cursor-toggle]')).toBeDisabled();

  const initialRange=await canvas.evaluate(node=>Number(node.dataset.windowEnd)-Number(node.dataset.windowStart));
  expect(initialRange).toBeCloseTo(30,2);
  const storageBefore=await page.evaluate(()=>localStorage.getItem('spg_rpsgt_v3'));

  await host.locator('[data-live-psg-start]').click();
  await expect(host.locator('[data-live-psg-mode]')).toHaveText('Running');
  await page.waitForTimeout(1100);
  const elapsed=Number((await host.locator('[data-live-psg-elapsed]').textContent()).replace(' s',''));
  expect(elapsed).toBeGreaterThan(.8);
  expect(elapsed).toBeLessThan(1.8);
  const runningRange=await canvas.evaluate(node=>Number(node.dataset.windowEnd)-Number(node.dataset.windowStart));
  expect(runningRange).toBeCloseTo(30,2);

  await host.locator('[data-live-psg-pause]').click();
  await expect(host.locator('[data-live-psg-mode]')).toHaveText('Frozen review');
  await expect(host).toHaveAttribute('data-review-mode','true');
  await expect(host.locator('[data-live-psg-start]')).toHaveText('Resume');
  await expect(host.locator('[data-live-psg-cursor-toggle]')).toBeEnabled();
  await expect(host.locator('[data-live-psg-review-window]')).toContainText('page span = 30.0 s');
  const pausedAt=Number((await host.locator('[data-live-psg-elapsed]').textContent()).replace(' s',''));
  await page.waitForTimeout(500);
  const stillPaused=Number((await host.locator('[data-live-psg-elapsed]').textContent()).replace(' s',''));
  expect(Math.abs(stillPaused-pausedAt)).toBeLessThan(.11);

  await host.locator('[data-live-psg-cursor-toggle]').click();
  await expect(host.locator('[data-live-psg-cursor-toggle]')).toHaveAttribute('aria-pressed','true');
  const box=await canvas.boundingBox();
  expect(box).not.toBeNull();
  const labelWidth=box.width<520?74:104;
  const plotRightPad=10;
  const signalCenterX=box.x+labelWidth+(box.width-labelWidth-plotRightPad)/2;
  await page.mouse.move(signalCenterX,box.y+Math.min(120,box.height/2));
  const cursorSeconds=Number(await canvas.getAttribute('data-review-cursor-seconds'));
  expect(cursorSeconds).toBeGreaterThan(14.6);
  expect(cursorSeconds).toBeLessThan(15.4);
  await expect(host.locator('[data-live-psg-review-cursor]')).toContainText('15.0 s into page');
  await expect(host.locator('[data-live-psg-review-cursor]')).toContainText('15.0 s before NOW');

  await host.locator('[data-live-psg-start]').click();
  await expect(host.locator('[data-live-psg-mode]')).toHaveText('Running');
  await expect(host.locator('[data-live-psg-cursor-toggle]')).toBeDisabled();
  await host.locator('[data-live-psg-pause]').click();
  await expect(host.locator('[data-live-psg-mode]')).toHaveText('Frozen review');

  await host.locator('[data-live-psg-restart]').click();
  await expect(host.locator('[data-live-psg-elapsed]')).toHaveText('0.0 s');
  await expect(host.locator('[data-live-psg-epoch]')).toHaveText('Epoch 1');
  await expect(host.locator('[data-live-psg-mode]')).toHaveText('Paused');
  await expect(host).toHaveAttribute('data-review-mode','false');
  await expect(host.locator('[data-live-psg-cursor-toggle]')).toHaveAttribute('aria-pressed','false');
  const storageAfter=await page.evaluate(()=>localStorage.getItem('spg_rpsgt_v3'));
  expect(storageAfter).toBe(storageBefore);
});
