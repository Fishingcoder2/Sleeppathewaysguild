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

const FORBIDDEN_LEARNER_LANGUAGE = [
  { label: 'mapped', pattern: /\bmapped\b/i },
  { label: 'provenance', pattern: /\bprovenance\b/i },
  { label: 'registry', pattern: /\bregistry\b/i },
  { label: 'migration', pattern: /\bmigration\b/i },
  { label: 'manual review', pattern: /manual[- ]review/i },
  { label: 'v3-ready', pattern: /v3[- ]ready/i },
  { label: 'development branch', pattern: /development branch/i },
  { label: 'release process', pattern: /release process/i },
  { label: 'source keys', pattern: /source keys?/i },
  { label: 'registry keys', pattern: /registry keys?/i },
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
