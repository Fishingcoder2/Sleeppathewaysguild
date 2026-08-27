import {test,expect} from '@playwright/test';

test('full Memory Games loads without the compressed learning-library browser API',async({page})=>{
  await page.addInitScript(()=>{
    try{Object.defineProperty(window,'DecompressionStream',{value:undefined,configurable:true});}catch(error){}
  });
  await page.goto('memory-games.html');
  await expect(page.locator('[data-memory-app]')).toBeVisible();
  await expect(page.locator('[data-memory-error]')).toBeHidden();
  await expect(page.locator('[data-memory-mode]')).toHaveCount(4);
  await expect(page.locator('[data-memory-arcade]')).toBeVisible();
  await expect(page.locator('[data-arcade-mode]')).toHaveCount(4);
  await expect(page.locator('[data-glossary-games]')).toBeVisible();
  await expect(page.locator('[data-glossary-mode]')).toHaveCount(4);
});
