import {test,expect} from '@playwright/test';

test('CPSGT Guided Trail keeps official task isolation and restores saved session after reload', async ({page}) => {
  // Runs against the standalone CPSGT page on the same static test server.
  await page.goto('../cpsgt-study-app.html');

  const expected = await page.evaluate(() => {
    const key = 'spg-cpsgt-launchpad-v2';
    // Seed harmless, disposable browser-context progress to detect accidental resets.
    state.stats.practiceAnswered = 7;
    state.stats.practiceCorrect = 5;
    save();
    const historyBefore = JSON.stringify({
      tasks:state.tasks, stats:state.stats, incorrect:state.incorrect,
      activeMock:state.activeMock
    });

    startPracticeSession({mode:'quick',taskId:'d2-1-2'});
    const session = state.activePractice;
    if (!session || session.items.length !== 5) throw new Error('D2B task session did not start with five items.');
    if (session.items.some(item => BY_ID[item.id]?.handbookAlignment?.taskCode !== 'D2B'))
      throw new Error('A Guided Trail question leaked outside official task D2B.');
    if (new Set(session.items.map(item=>item.id)).size !== 5)
      throw new Error('Guided Trail returned a duplicate question ID.');
    const historyAfter = JSON.stringify({
      tasks:state.tasks, stats:state.stats, incorrect:state.incorrect,
      activeMock:state.activeMock
    });
    if (historyBefore !== historyAfter) throw new Error('Starting task practice mutated unrelated learner history.');

    const saved = JSON.parse(localStorage.getItem(key));
    if (!saved?.activePractice) throw new Error('Task session was not persisted.');
    return {
      session:JSON.parse(JSON.stringify(saved.activePractice)),
      history:{tasks:saved.tasks, stats:saved.stats, incorrect:saved.incorrect, activeMock:saved.activeMock}
    };
  });

  await page.reload();
  const restored = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('spg-cpsgt-launchpad-v2'));
    if (!state.activePractice) throw new Error('Task session did not restore on reload.');
    return {
      session:JSON.parse(JSON.stringify(state.activePractice)),
      history:{tasks:state.tasks, stats:state.stats, incorrect:state.incorrect, activeMock:state.activeMock},
      persistedItems:saved?.activePractice?.items.map(item=>item.id)
    };
  });
  expect(restored.session).toEqual(expected.session);
  expect(restored.history).toEqual(expected.history);
  expect(restored.persistedItems).toEqual(expected.session.items.map(item=>item.id));
  const resume = page.locator('[data-resume-practice-pos]');
  await expect(resume.first()).toBeEnabled();
});
