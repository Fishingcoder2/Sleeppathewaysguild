import { test, expect } from '@playwright/test';

// Isolated navigation checks: no learner-storage writes and no production requests.
test('compact menu toggles and navigates without trapping the learner', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'Compact menu applies to tablet/phone layouts.');
  await page.goto('study.html');
  const toggle = page.locator('[data-toggle-menu]');
  const sidebar = page.locator('.sidebar');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('body')).toHaveClass(/rpsgt-menu-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(sidebar).toBeVisible();

  // Toggling again must dismiss the menu and restore the collapsed state.
  await toggle.click();
  await expect(page.locator('body')).not.toHaveClass(/rpsgt-menu-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  // A second open should remain usable, including navigation to another module.
  await toggle.click();
  await expect(sidebar).toBeVisible();
  await sidebar.locator('a[href="practice.html"]').first().click();
  await expect(page).toHaveURL(/practice\.html(?:[?#]|$)/);
  await expect(page.locator('body')).not.toHaveClass(/rpsgt-menu-open/);

  await page.goBack();
  await expect(page).toHaveURL(/study\.html(?:[?#]|$)/);
  await expect(toggle).toBeVisible();
});

test('compact menu button exposes keyboard focus and an accessible expanded state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'Compact menu applies to tablet/phone layouts.');
  await page.goto('study.html');
  const toggle = page.locator('[data-toggle-menu]');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  // Escape-to-dismiss is an accessibility acceptance criterion; a failure here
  // is evidence for a focused UI repair, not permission to modify production.
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
