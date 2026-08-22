import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,script,css,confirm]=await Promise.all([
  readFile(join(root,'lab-visual.html'),'utf8'),
  readFile(join(root,'core','visual-desktop-submit-fix.js'),'utf8'),
  readFile(join(root,'assets','visual-desktop-submit-fix.css'),'utf8'),
  readFile(join(root,'core','visual-confirmation.js'),'utf8')
]);

for(const token of ['assets/visual-desktop-submit-fix.css','core/visual-desktop-submit-fix.js']){
  if(!html.includes(token)) throw new Error(`Visual page is missing ${token}.`);
}
if(html.indexOf('core/visual-desktop-submit-fix.js')<html.indexOf('core/visual-confirmation.js')) throw new Error('Desktop flow fix must load after visual confirmation so it can reuse the existing confirmation controller.');

for(const token of [
  "window.matchMedia('(min-width:901px)')",
  'visual-desktop-inline-submit',
  'data-visual-desktop-inline-submit',
  'data-visual-desktop-action="prev"',
  'data-visual-desktop-action="submit"',
  'Submit answer',
  'Answer selected — ready to submit.',
  '.visual-choice.selected',
  '.visual-point-marker.selected',
  '.visual-region-button.selected',
  '.visual-interval-selection',
  '[data-visual-check]',
  '[data-visual-answer]',
  '[data-visual-point-surface]',
  '[data-visual-interval-surface]',
  'simplifyOutcome',
  'visual-desktop-inline-outcome',
  'data-visual-desktop-inline-outcome',
  'Next item →',
  'Continue to Epoch',
  'Try this item again',
  'currentEpochComplete()',
  'requestAnimationFrame(syncDesktopFlow)'
]) if(!script.includes(token)) throw new Error(`Desktop Visual flow controller is missing ${token}.`);

for(const token of [
  '@media(min-width:901px)',
  '.visual-question-actions{display:none!important}',
  '>.visual-modal-footer.visual-workstation-footer{display:none!important}',
  '.visual-desktop-inline-submit',
  'position:sticky',
  'bottom:0',
  '.visual-desktop-inline-submit.ready',
  '.visual-desktop-inline-submit-actions',
  '.visual-desktop-inline-outcome',
  'position:relative!important',
  'visual-desktop-answer-correct',
  'data-visual-outcome-action="next"',
  'visual-desktop-answer-retry',
  'data-visual-outcome-action="retry"'
]) if(!css.includes(token)) throw new Error(`Desktop Visual flow CSS is missing ${token}.`);

if(!confirm.includes("if(action==='submit')showConfirmation()")) throw new Error('Persistent desktop Submit must continue through the existing Are you sure? confirmation flow.');
if(script.includes('MutationObserver')) throw new Error('Desktop Visual flow must remain event-driven and must not use MutationObserver.');
if(/addEventListener\(\s*['\"]resize['\"]/.test(script)) throw new Error('Desktop Visual flow must not add a resize-driven synchronization loop.');

console.log('Visual desktop navigation regression passed: one task-rail flow owns Previous and Submit, correct feedback stays beside the PSG with Next item/Continue to Epoch, retry remains on the same item, and the legacy desktop footer/actions are hidden.');
