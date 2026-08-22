import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,script,css]=await Promise.all([
  readFile(join(root,'lab-artifact.html'),'utf8'),
  readFile(join(root,'core','artifact-navigation-flow.js'),'utf8'),
  readFile(join(root,'assets','artifact-navigation-flow.css'),'utf8')
]);

for(const token of ['assets/artifact-navigation-flow.css','core/artifact-navigation-flow.js']){
  if(!html.includes(token))throw new Error(`Artifact page is missing ${token}.`);
}
if(html.indexOf('core/artifact-navigation-flow.js')<html.indexOf('core/artifact-display-controls.js'))throw new Error('Artifact navigation flow must load after display controls.');
if(!html.includes('shared-reference disturbance'))throw new Error('Artifact page copy must describe the corrected shared-reference case.');
if(/broad movement artifact/i.test(html))throw new Error('Artifact page copy must not describe the corrected case as broad movement artifact.');

for(const token of [
  "window.matchMedia('(min-width:901px)')",
  'data-artifact-flow-prev',
  'artifact-desktop-inline-confirmation',
  'artifact-desktop-inline-outcome',
  'Are you sure?',
  'Submit this artifact decision for grading',
  'Next decision →',
  'Continue to next case →',
  'Try this decision again',
  '[data-artifact-outcome="next"]',
  '[data-artifact-outcome="retry"]',
  '[data-artifact-confirm-submit]',
  '[data-artifact-confirm-cancel]',
  'requestAnimationFrame(syncFlow)'
]) if(!script.includes(token))throw new Error(`Artifact navigation controller is missing ${token}.`);

for(const token of [
  '@media(min-width:901px)',
  '[data-artifact-prev]{display:none!important}',
  '[data-artifact-review-psg]{display:none!important}',
  '.artifact-desktop-inline-confirmation',
  '.artifact-desktop-inline-outcome',
  'position:relative!important',
  '.artifact-desktop-answer-correct',
  '[data-artifact-outcome="next"]',
  '.artifact-desktop-answer-retry',
  '[data-artifact-outcome="retry"]'
]) if(!css.includes(token))throw new Error(`Artifact navigation CSS is missing ${token}.`);

if(script.includes('MutationObserver'))throw new Error('Artifact navigation flow must remain event-driven and not use MutationObserver.');
if(/addEventListener\(\s*['\"]resize['\"]/.test(script))throw new Error('Artifact navigation flow must not add a resize-driven synchronization loop.');

console.log('Artifact desktop navigation regression passed: confirmation and feedback remain inline in the troubleshooting rail, the PSG stays visible, and one primary action advances each decision or case.');
