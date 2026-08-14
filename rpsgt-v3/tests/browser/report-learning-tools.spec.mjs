import {test,expect} from '@playwright/test';

test('report priorities route learners to the review tool that matches the weakness',async({page})=>{
  await page.goto('reports.html');
  const host=page.locator('[data-coach-plan]');
  await expect(host).toBeAttached();

  await host.evaluate(node=>{node.innerHTML='<article class="coach-plan-item"><div class="coach-plan-heading"><h3>Report calculations</h3></div><p>Review the denominator and calculate AHI using total sleep time in hours.</p><span class="topic-chip">Review topic: AHI calculation</span><div class="actions compact"><a class="btn primary" href="practice.html">Practice this area</a></div></article>';});
  await expect(host.locator('[data-study-tool="math"]')).toHaveText('Review in Math Coach');

  await host.evaluate(node=>{node.innerHTML='<article class="coach-plan-item"><div class="coach-plan-heading"><h3>Similar respiratory concepts</h3></div><p>Distinguish obstructive apnea from central apnea using the effort channels.</p><span class="topic-chip">Review topic: apnea types</span></article>';});
  await expect(host.locator('[data-study-tool="memory"]')).toHaveText('Practice in Memory Lab');

  await host.evaluate(node=>{node.innerHTML='<article class="coach-plan-item"><div class="coach-plan-heading"><h3>Technical terminology</h3></div><p>Review the definition and meaning of common signal terms.</p><span class="topic-chip">Review topic: signal terminology</span></article>';});
  await expect(host.locator('[data-study-tool="glossary"]')).toHaveText('Look up in Glossary');

  await host.evaluate(node=>{node.innerHTML='<article class="coach-plan-item"><div class="coach-plan-heading"><h3>PAP troubleshooting</h3></div><p>Review mask leak and humidification concepts.</p><span class="topic-chip">Review topic: PAP troubleshooting</span></article>';});
  await expect(host.locator('[data-study-tool="flashcards"]')).toHaveText('Review with Flashcards');
});
