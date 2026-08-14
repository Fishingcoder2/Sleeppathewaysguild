import {test,expect} from '@playwright/test';

test('learner front door does not expose the developer migration utility',async({page})=>{
  await page.goto('index.html');
  await expect(page.locator('a[href="migration-export.html"]')).toHaveCount(0);
  await expect(page.getByText('Data & migration tools',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Open private browser export utility',{exact:true})).toHaveCount(0);
});
