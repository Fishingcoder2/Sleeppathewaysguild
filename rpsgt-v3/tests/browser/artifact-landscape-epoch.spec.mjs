import {test,expect} from '@playwright/test';

// Regression for the phone landscape screenshot where a caption and stacked
// controls left only the first two of eight channels visible.
test('landscape Artifact Lab fits every PSG channel and permits deliberate zoom',async({page})=>{
  await page.setViewportSize({width:780,height:355});
  await page.goto('lab-artifact.html');
  await expect(page.locator('[data-artifact-start]')).toBeEnabled();
  await page.locator('[data-artifact-start]').click();

  const workspace=page.locator('[data-artifact-workspace]');
  const image=page.locator('[data-artifact-atlas-image]');
  await expect(workspace).toHaveClass(/artifact-epoch-focus/);
  await expect(image).toBeVisible();
  await expect(page.locator('.artifact-atlas-caption')).toBeHidden();
  await expect(page.locator('.artifact-case-nav')).toBeHidden();
  await expect(page.locator('[data-artifact-focus-answer]')).toBeVisible();

  const fitted=await page.evaluate(()=>{
    const scroll=document.querySelector('.artifact-scroll');
    const img=document.querySelector('[data-artifact-atlas-image]');
    if(!scroll||!img||!img.complete||!img.naturalWidth||!img.naturalHeight)return null;
    const css=getComputedStyle(img);
    const available=scroll.getBoundingClientRect();
    const frame=img.getBoundingClientRect();
    const scale=Math.min(frame.width/img.naturalWidth,frame.height/img.naturalHeight);
    return {
      fit:css.objectFit,
      drawnHeight:img.naturalHeight*scale,
      availableHeight:available.height,
      drawnWidth:img.naturalWidth*scale,
      availableWidth:available.width,
      scrollHeight:scroll.scrollHeight,
      clientHeight:scroll.clientHeight
    };
  });
  expect(fitted,'Synthetic eight-channel image must load').not.toBeNull();
  expect(fitted.fit).toBe('contain');
  expect(fitted.drawnHeight).toBeLessThanOrEqual(fitted.availableHeight+2);
  expect(fitted.drawnWidth).toBeLessThanOrEqual(fitted.availableWidth+2);

  await page.locator('[data-artifact-epoch-zoom]').click();
  await expect(workspace).toHaveClass(/artifact-epoch-zoom/);
  await expect(page.locator('[data-artifact-epoch-zoom]')).toHaveText('Fit all channels');
  const zoom=await page.locator('.artifact-scroll').evaluate(node=>({
    x:node.scrollWidth>node.clientWidth,
    y:node.scrollHeight>node.clientHeight
  }));
  expect(zoom.x||zoom.y).toBeTruthy();

  await page.locator('[data-artifact-epoch-zoom]').click();
  await expect(workspace).not.toHaveClass(/artifact-epoch-zoom/);
  await page.locator('[data-artifact-epoch-focus]').click();
  await expect(workspace).not.toHaveClass(/artifact-epoch-focus/);
  await expect(page.locator('.artifact-case-nav')).toBeVisible();
  await page.locator('[data-artifact-epoch-focus]').click();
  await expect(workspace).toHaveClass(/artifact-epoch-focus/);

  await page.locator('[data-artifact-focus-answer]').click();
  await expect(page.locator('[data-artifact-question-layer]')).toBeVisible();
  await expect(page.locator('.artifact-question-shell')).toBeVisible();
});
