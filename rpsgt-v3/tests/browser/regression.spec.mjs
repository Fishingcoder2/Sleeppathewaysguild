import { expect, test } from '@playwright/test';

const PRIMARY_ROUTES = [
  'index.html',
  'study.html',
  'practice.html',
  'readiness.html',
  'mock.html',
  'review.html?list=missed',
  'labs.html',
  'reports.html',
  'study-summary.html',
  'migration-export.html'
];

const LAB_ROUTES = [
  'lab-hookup.html',
  'lab-ekg.html',
  'lab-visual.html',
  'lab-artifact.html',
  'lab-scoring.html',
  'lab-respiratory.html',
  'lab-pap.html',
  'lab-instrumentation.html',
  'lab-pediatric.html',
  'lab-daytime-testing.html',
  'lab-troubleshooting.html'
];

const TOOL_ROUTES = [
  'math-coach.html',
  'lab-math-coach.html'
];

const LEGACY_KEY = 'spg_rpsgtv2_2026_evolved_v10_5_1';
const LEGACY_SENTINEL = JSON.stringify({ regressionSentinel: 'legacy-must-remain-unchanged' });

function attachRuntimeGuards(page) {
  const errors = [];
  const failedResponses = [];

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.hostname === '127.0.0.1' && response.status() >= 400) {
      failedResponses.push(`${response.status()} ${url.pathname}`);
    }
  });

  return { errors, failedResponses };
}

async function expectNoHorizontalPageOverflow(page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const clientWidth = Math.max(root.clientWidth, body?.clientWidth || 0);
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
    const offenders = [...document.querySelectorAll('body *')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > clientWidth + 2 || rect.left < -2;
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: String(element.className || '').slice(0, 120),
        right: Math.round(element.getBoundingClientRect().right),
        left: Math.round(element.getBoundingClientRect().left)
      }));

    return { clientWidth, scrollWidth, offenders };
  });

  expect(
    result.scrollWidth,
    `Horizontal page overflow detected: ${JSON.stringify(result)}`
  ).toBeLessThanOrEqual(result.clientWidth + 2);
}

async function waitForApplication(page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('h1').first()).toBeVisible();
}

for (const route of [...PRIMARY_ROUTES, ...LAB_ROUTES, ...TOOL_ROUTES]) {
  test(`${route} loads without runtime errors or body overflow`, async ({ page }) => {
    const guards = attachRuntimeGuards(page);
    await page.goto(route);
    await waitForApplication(page);
    await expectNoHorizontalPageOverflow(page);
    expect(guards.failedResponses, `Failed local responses on ${route}`).toEqual([]);
    expect(guards.errors, `Runtime errors on ${route}`).toEqual([]);
  });
}

test('main navigation, refresh, and back-button behavior remain usable', async ({ page }) => {
  await page.goto('index.html');
  await waitForApplication(page);

  const desktopStudy = page.locator('.sidebar a[data-nav="study"]');
  const mobileStudy = page.locator('.mobile-nav a[data-nav="study"]');
  const studyLink = (await desktopStudy.isVisible()) ? desktopStudy : mobileStudy;

  await studyLink.click();
  await expect(page).toHaveURL(/study\.html/);
  await waitForApplication(page);
  await page.reload();
  await expect(page).toHaveURL(/study\.html/);
  await waitForApplication(page);
  await page.goBack();
  await expect(page).toHaveURL(/index\.html/);
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', 'study.html');
});

test('ordinary v3 navigation never alters recognized legacy storage', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(
    ({ key, value }) => {
      localStorage.clear();
      localStorage.setItem(key, value);
    },
    { key: LEGACY_KEY, value: LEGACY_SENTINEL }
  );

  for (const route of ['index.html', 'study.html', 'practice.html', 'labs.html', 'reports.html']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
  }

  const storedLegacy = await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY);
  expect(storedLegacy).toBe(LEGACY_SENTINEL);
});

test('migration export remains read-only and does not create v3 storage', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(
    ({ key, value }) => {
      localStorage.clear();
      localStorage.setItem(key, value);
    },
    { key: LEGACY_KEY, value: LEGACY_SENTINEL }
  );

  await page.goto('migration-export.html');
  await waitForApplication(page);

  const state = await page.evaluate((key) => ({
    legacy: localStorage.getItem(key),
    v3: localStorage.getItem('spg_rpsgt_v3')
  }), LEGACY_KEY);

  expect(state.legacy).toBe(LEGACY_SENTINEL);
  expect(state.v3).toBeNull();
});

test('Practice uses Next to check an answer and supports Previous review', async ({ page }) => {
  await page.goto('practice.html');
  await expect(page.locator('[data-practice-setup]')).toBeVisible();
  await page.locator('[data-practice-size]').selectOption('5');
  await page.locator('[data-start-practice]').click();

  await expect(page.locator('[data-practice-shell]')).toBeVisible();
  await expect(page.locator('[data-question-prompt]')).not.toBeEmpty();
  await expect(page.locator('[data-previous-question]')).toBeDisabled();
  const options = page.locator('[data-question-choices] .practice-choice');
  await expect(options).toHaveCount(4);
  await options.first().click();
  const next=page.locator('[data-next-question]');
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.locator('[data-answer-feedback]')).toBeVisible();
  await expect(page.locator('[data-answer-feedback]')).toContainText('Answer & reasoning');
  await expect(next).toHaveText('Next question');
  await next.click();
  await expect(page.locator('[data-question-number]')).toContainText('Question 2 of 5');
  await expect(page.locator('[data-previous-question]')).toBeEnabled();
  await page.locator('[data-previous-question]').click();
  await expect(page.locator('[data-question-number]')).toContainText('Question 1 of 5');
  await expect(page.locator('[data-answer-feedback]')).toBeVisible();
});

test('Readiness starts at the requested size and can end without entering Practice history', async ({ page }) => {
  await page.goto('readiness.html');
  await expect(page.locator('[data-readiness-home]')).toBeVisible();
  await page.locator('[data-start-readiness="25"]').click();

  await expect(page.locator('[data-readiness-shell]')).toBeVisible();
  await expect(page.locator('[data-session-size]')).toHaveText('25');
  await expect(page.locator('[data-question-prompt]')).not.toBeEmpty();
  await page.locator('[data-quit-readiness]').click();
  await expect(page.locator('[data-readiness-results]')).toBeVisible();
});

test('Mock builds 175 questions, saves, reloads, and resumes', async ({ page }) => {
  await page.goto('mock.html');
  await expect(page.locator('[data-mock-home]')).toBeVisible();
  await page.locator('[data-start-mock]').click();

  await expect(page.locator('[data-mock-shell]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-mock-palette] button')).toHaveCount(175);

  const firstOption = page.locator('[data-question-choices] .practice-choice').first();
  await firstOption.click();
  await page.locator('[data-next-question]').click();
  await page.locator('[data-pause-mock]').click();
  await expect(page.locator('[data-resume-card]')).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-resume-card]')).toBeVisible();
  await page.locator('[data-resume-mock]').click();
  await expect(page.locator('[data-mock-shell]')).toBeVisible();
  await expect(page.locator('[data-question-number]')).toContainText('2');
});

test('Skills Lab catalog exposes exactly the eleven native v3 routes', async ({ page }) => {
  await page.goto('labs.html');
  await expect(page.locator('[data-lab-catalog]')).toBeVisible();
  await expect(page.locator('[data-lab-catalog] a[href^="lab-"]')).toHaveCount(11);

  const hrefs = await page.locator('[data-lab-catalog] a[href^="lab-"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')).sort()
  );
  expect(hrefs).toEqual([...LAB_ROUTES].sort());
});

test('Reports and Study Summary render from an empty learner record', async ({ page }) => {
  await page.goto('reports.html');
  await expect(page.locator('[data-reports-content]')).toBeVisible();
  await expect(page.locator('[data-report-practice-answered]')).toHaveText('0');

  await page.goto('study-summary.html');
  await expect(page.locator('[data-summary-content]')).toBeVisible();
  await expect(page.locator('[data-summary-snapshot]')).not.toBeEmpty();
  await expectNoHorizontalPageOverflow(page);
});

test('Study Summary triggers JSON and CSV downloads', async ({ page }) => {
  await page.goto('study-summary.html');
  await expect(page.locator('[data-summary-content]')).toBeVisible();

  const jsonDownloadPromise = page.waitForEvent('download');
  await page.locator('[data-summary-json]').click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/i);

  const csvDownloadPromise = page.waitForEvent('download');
  await page.locator('[data-summary-csv]').click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/i);
});

test('Study Summary print media produces a non-empty headless PDF', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'PDF generation is sampled once on desktop Chromium.');
  await page.goto('study-summary.html');
  await expect(page.locator('[data-summary-content]')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.no-print').first()).toBeHidden();
  const pdf = await page.pdf({ format: 'Letter', printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
});
