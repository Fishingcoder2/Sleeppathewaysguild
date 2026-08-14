import { expect, test } from '@playwright/test';

test('routine respiratory visuals include an ECG-synchronized pulse pleth channel', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});

  await page.goto('lab-respiratory-visual.html');
  await page.waitForLoadState('networkidle');
  const pulse=page.locator('canvas[data-pulse-pleth]');
  await expect(pulse).toBeVisible();
  await expect(pulse).toHaveAttribute('aria-label',/Pulse plethysmography channel synchronized to the ECG heart rate/);

  const result=await page.evaluate(()=>{
    const renderer=window.RPSGTVisualPSGRenderer;
    const hr=68,phase=.2,delay=renderer.PULSE_PLETH.transitDelaySeconds;
    const cycle0=renderer.heartCyclesAt(10,hr,phase);
    const cycle1=renderer.heartCyclesAt(20,hr,phase);
    return {
      installed:Boolean(renderer&&renderer.__pulsePlethInstalled),
      source:renderer&&renderer.PULSE_PLETH&&renderer.PULSE_PLETH.source,
      delay,
      beats:(cycle1-cycle0),
      sampleA:renderer.pulsePlethValue(10,hr,phase,delay),
      sampleB:renderer.pulsePlethValue(10.25,hr,phase,delay)
    };
  });

  expect(result.installed).toBe(true);
  expect(result.source).toBe('ECG heart rate');
  expect(result.delay).toBeGreaterThan(0);
  expect(result.beats).toBeGreaterThan(10);
  expect(result.beats).toBeLessThan(13);
  expect(result.sampleA).not.toBe(result.sampleB);
  expect(errors).toEqual([]);
});
