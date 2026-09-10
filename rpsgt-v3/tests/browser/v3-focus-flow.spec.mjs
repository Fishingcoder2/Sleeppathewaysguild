import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

async function expectInsideViewport(page, locator, label) {
  await expect(locator, label).toBeVisible();
  const result = await locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(result.top, `${label} top`).toBeGreaterThanOrEqual(-1);
  expect(result.left, `${label} left`).toBeGreaterThanOrEqual(-1);
  expect(result.right, `${label} right`).toBeLessThanOrEqual(result.viewportWidth + 1);
  expect(result.bottom, `${label} bottom`).toBeLessThanOrEqual(result.viewportHeight + 1);
}

test('Practice stays inside the browser window with persistent question controls', async ({ page }) => {
  await page.goto('practice.html');
  await expect(page.locator('[data-practice-setup]')).toBeVisible();
  await page.locator('[data-practice-size]').selectOption('5');
  await page.locator('[data-start-practice]').click();

  const shell = page.locator('[data-practice-shell]');
  const panel = page.locator('[data-question-panel]');
  const footer = page.locator('.practice-modal-footer');
  const next = page.locator('[data-next-question]');

  await expect(shell).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/practice-focus-open/);
  await expectInsideViewport(page, panel, 'practice panel');
  await expectInsideViewport(page, footer, 'practice footer');
  await expectInsideViewport(page, next, 'practice Next button');

  await page.locator('[data-choice-index]').first().click();
  await next.click();
  await expect(page.locator('[data-answer-feedback]')).toBeVisible();
  await expect(page.locator('[data-answer-feedback]')).toContainText('Answer & reasoning');
  await expectInsideViewport(page, footer, 'practice footer after answer reveal');
  await expectInsideViewport(page, next, 'practice Next button after answer reveal');
});

test('Guided Study checkpoint is a fit-to-window workspace with visible navigation', async ({ page }) => {
  await page.goto('study.html');
  const cards = page.locator('.task-map-card');
  await expect(cards).toHaveCount(12);
  await cards.first().locator('[data-checkpoint-start]').click();

  const overlay = page.locator('[data-checkpoint-overlay]');
  const modal = page.locator('[data-checkpoint-workspace]');
  const footer = modal.locator('.checkpoint-actions');
  const next = modal.locator('[data-checkpoint-next]');

  await expect(overlay).toBeVisible();
  await expect(modal).toContainText('Question 1 of 15');
  await expectInsideViewport(page, modal, 'Guided Study checkpoint');
  await expectInsideViewport(page, footer, 'checkpoint controls');
  await expectInsideViewport(page, next, 'checkpoint Next button');
});

test('Checkpoint completion routing becomes a focused next-action pop-up', async ({ page }) => {
  await page.goto('study.html');
  await page.locator('.task-map-card').first().locator('[data-checkpoint-start]').click();
  await expect(page.locator('[data-checkpoint-workspace]')).toBeVisible();

  await page.evaluate(() => {
    const host = document.querySelector('[data-checkpoint-workspace]');
    const panel = document.createElement('section');
    panel.className = 'checkpoint-route-panel';
    panel.dataset.checkpointRoutes = 'true';
    panel.innerHTML = `
      <h3>Checkpoint complete</h3>
      <p>Choose your next learning action.</p>
      <div class="checkpoint-route-actions">
        <button class="btn secondary" data-checkpoint-retake>Retake with new questions</button>
        <button class="btn secondary" data-checkpoint-continue>Continue to next task</button>
        <button class="btn secondary" data-checkpoint-return-map>Return to Guided Study map</button>
      </div>`;
    host.appendChild(panel);
  });

  const overlay = page.locator('[data-guided-route-overlay]');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('What do you want to do next?');
  await expect(overlay.getByText('Continue to next task', { exact: true })).toHaveClass(/primary/);
  await expect(overlay.getByText('Review my answers', { exact: true })).toBeVisible();
  await expectInsideViewport(page, overlay.locator('.checkpoint-route-panel'), 'next-action pop-up');
});
