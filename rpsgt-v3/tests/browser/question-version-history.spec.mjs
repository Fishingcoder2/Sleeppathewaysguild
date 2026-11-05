import { test, expect } from '@playwright/test';

// Audit-only browser tests for Issue #30. The reviewed branch serves no revised
// question IDs. Only fictional browser-localStorage attempts are created.
test('Readiness restores an older question ID and its exact answer after reload', async ({ page }) => {
  await page.goto('readiness.html');
  await expect(page.locator('[data-readiness-home]')).toBeVisible({ timeout: 40000 });
  await page.locator('[data-start-readiness="25"]').click();
  await expect(page.locator('[data-readiness-shell]')).toBeVisible({ timeout: 40000 });

  const fixture = await page.evaluate(async () => {
    const originalId = 'RPSGT-B2-M057';
    const moduleData = await window.RPSGTOwnerQuestionRelease.loadJson('data/question-bank/d2b.json');
    const q = moduleData.questions.find(item => String(item.id) === originalId);
    if (!q) throw new Error('Historical MSLT question missing from the module.');
    const store = window.RPSGTStorage.load();
    const active = store.readiness.activeSession;
    if (!active || active.questionIds.length !== 25) throw new Error('Readiness session missing.');
    const collision = active.questionIds.findIndex(id => String(id) === originalId);
    if (collision > 0) active.questionIds.splice(collision, 1);
    active.questionIds[0] = originalId;
    if (collision > 0) active.questionIds.push(q.id === originalId ? '__fictional-extra-id__' : q.id);
    // Keep all 25 IDs resolvable even if the generated pool included the original.
    if (collision > 0) {
      const fallback = moduleData.questions.find(item => !active.questionIds.some(id => String(id) === String(item.id)));
      if (!fallback) throw new Error('No replacement fixture question available.');
      active.questionIds[active.questionIds.length - 1] = fallback.id;
    }
    active.index = 0;
    active.answers = { [originalId]: q.answer };
    active.drafts = {};
    window.RPSGTStorage.save(store);
    return { id: originalId, prompt: window.RPSGTReadinessEngine.displayPrompt(q), answer: q.answer };
  });
  await page.reload();
  await expect(page.locator('[data-readiness-shell]')).toBeVisible({ timeout: 40000 });
  await expect(page.locator('[data-question-number]')).toContainText('Question 1 of 25');
  await expect(page.locator('[data-question-prompt]')).toHaveText(fixture.prompt);
  const restored = await page.evaluate(id => {
    const s = window.RPSGTStorage.load().readiness.activeSession;
    return { ids: s.questionIds, answer: s.answers[id], index: s.index };
  }, fixture.id);
  expect(restored.ids).toHaveLength(25);
  expect(restored.ids[0]).toBe(fixture.id);
  expect(restored.answer).toBe(fixture.answer);
  expect(restored.index).toBe(0);
});

test('Mock resumes a historical pediatric CO2 question and saved selection', async ({ page }) => {
  await page.goto('mock.html');
  await expect(page.locator('[data-mock-home]')).toBeVisible({ timeout: 40000 });
  await page.locator('[data-start-mock]').click();
  await expect(page.locator('[data-mock-shell]')).toBeVisible({ timeout: 40000 });

  const fixture = await page.evaluate(async () => {
    const originalId = 'SPG-RPSGT-B003-074';
    const moduleData = await window.RPSGTOwnerQuestionRelease.loadJson('data/question-bank/d3b.json');
    const q = moduleData.questions.find(item => String(item.id) === originalId);
    if (!q) throw new Error('Historical CO2 item missing from the module.');
    const store = window.RPSGTStorage.load();
    const active = store.mock.activeSession;
    if (!active || active.items.length !== 175) throw new Error('Mock session missing.');
    let at = active.items.findIndex(item => String(item.id) === originalId);
    if (at < 0) {
      active.items[0] = { ...active.items[0], id: originalId };
      at = 0;
    }
    active.index = at;
    active.answers = { [originalId]: q.answer };
    active.flags = [originalId];
    window.RPSGTStorage.save(store);
    return { id: originalId, index: at, prompt: window.RPSGTMockEngine.displayPrompt(q), answer: q.answer };
  });

  await page.reload();
  await expect(page.locator('[data-resume-card]')).toBeVisible({ timeout: 40000 });
  await page.locator('[data-resume-mock]').click();
  await expect(page.locator('[data-mock-shell]')).toBeVisible();
  await expect(page.locator('[data-question-number]')).toContainText('Question ' + (fixture.index + 1) + ' of 175');
  await expect(page.locator('[data-question-prompt]')).toHaveText(fixture.prompt);
  const restored = await page.evaluate(id => {
    const s = window.RPSGTStorage.load().mock.activeSession;
    return { count: s.items.length, index: s.index, answer: s.answers[id], flags: s.flags };
  }, fixture.id);
  expect(restored.count).toBe(175);
  expect(restored.index).toBe(fixture.index);
  expect(restored.answer).toBe(fixture.answer);
  expect(restored.flags).toContain(fixture.id);
});

test('Held revision requests never alter selection or historical answer keys', async ({ page }) => {
  await page.goto('readiness.html');
  await expect(page.locator('[data-readiness-home]')).toBeVisible({ timeout: 40000 });
  const outcome = await page.evaluate(async () => {
    const q = (await window.RPSGTOwnerQuestionRelease.loadJson('data/question-bank/d2b.json'))
      .questions.find(item => String(item.id) === 'RPSGT-B2-M057');
    const view = window.RPSGTVersionedQuestionRegistry.buildView([q], [
      { status: 'held', supersedesId: q.id }
    ]);
    return {
      newIds: view.newSessionBank.map(item => item.id),
      historicalIds: view.historicalBank.map(item => item.id),
      key: view.resolveSavedIds([q.id])[0].answer,
      original: q.answer,
      revisions: view.publishedRevisions
    };
  });
  expect(outcome.newIds).toEqual(['RPSGT-B2-M057']);
  expect(outcome.historicalIds).toEqual(['RPSGT-B2-M057']);
  expect(outcome.key).toBe(outcome.original);
  expect(outcome.revisions).toBe(0);
});
