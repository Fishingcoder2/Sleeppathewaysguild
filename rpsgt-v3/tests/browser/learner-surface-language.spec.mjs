import { expect, test } from '@playwright/test';

const LEARNER_ROUTES = [
  'index.html',
  'study.html',
  'practice.html',
  'readiness.html',
  'mock.html',
  'review.html?list=missed',
  'labs.html',
  'reports.html',
  'flashcards.html',
  'memory-games.html',
  'notes.html',
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
  'lab-troubleshooting.html',
  'math-coach.html'
];

const REVIEW_STAGE_ROUTES = [
  'lab-ekg.html',
  'lab-scoring.html',
  'lab-respiratory.html',
  'lab-pap.html',
  'lab-instrumentation.html',
  'lab-pediatric.html',
  'lab-daytime-testing.html',
  'lab-troubleshooting.html'
];

const FORBIDDEN_LEARNER_LANGUAGE = [
  { label: 'mapped', pattern: /\bmapped\b/i },
  { label: 'provenance', pattern: /\bprovenance\b/i },
  { label: 'registry', pattern: /\bregistry\b/i },
  { label: 'migration', pattern: /\bmigration\b/i },
  { label: 'manual review', pattern: /manual[- ]review/i },
  { label: 'v3-ready', pattern: /v3[- ]ready/i },
  { label: 'development branch', pattern: /development branch/i },
  { label: 'development boundary', pattern: /development boundary/i },
  { label: 'release process', pattern: /release process/i },
  { label: 'source keys', pattern: /source keys?/i },
  { label: 'registry keys', pattern: /registry keys?/i },
  { label: 'study keys', pattern: /study keys?/i },
  { label: 'source bank', pattern: /source bank/i },
  { label: 'validated learner bank', pattern: /validated learner bank/i },
  { label: 'app-authored', pattern: /app-authored/i },
  { label: 'exact task mapping', pattern: /exact task mapping/i },
  { label: 'raw v3 storage key', pattern: /spg_rpsgt_v3/i },
  { label: 'stored only in v3', pattern: /stored only in v3/i },
  { label: 'mapped progress', pattern: /mapped progress/i },
  { label: 'mapped resources', pattern: /mapped resources?/i },
  { label: 'mapped references', pattern: /mapped references?/i }
];

for (const route of LEARNER_ROUTES) {
  test(`${route} keeps internal development language off the learner surface`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    const visibleText = await page.locator('body').innerText();
    for (const rule of FORBIDDEN_LEARNER_LANGUAGE) {
      expect(visibleText, `${route} exposed internal learner-facing term: ${rule.label}`).not.toMatch(rule.pattern);
    }
  });
}

for (const route of REVIEW_STAGE_ROUTES) {
  test(`${route} identifies checklist activity as review-stage rather than demonstrated skill completion`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const boundary=page.locator('[data-review-stage-boundary]');
    await expect(boundary).toBeVisible();
    await expect(boundary).toContainText('study review and checkpoint practice');
    await expect(boundary).toContainText('does not count as demonstrated Skills Lab completion');
  });
}

test('Skills Labs separates demonstrated completion from review-stage labs', async ({ page }) => {
  await page.goto('labs.html');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-lab-summary]')).toContainText('Demonstrated labs');
  await expect(page.locator('[data-lab-summary]')).toContainText('Review-stage labs');
  await expect(page.locator('[data-lab-catalog] .lab-evidence-note')).toHaveCount(8);
});
