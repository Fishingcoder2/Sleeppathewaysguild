import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,confirm,css,nav,lab]=await Promise.all([
  readFile(join(root,'lab-visual.html'),'utf8'),
  readFile(join(root,'core','visual-confirmation.js'),'utf8'),
  readFile(join(root,'assets','visual-desktop-workstation.css'),'utf8'),
  readFile(join(root,'core','visual-navigation.js'),'utf8'),
  readFile(join(root,'core','lab-visual.js'),'utf8')
]);

if(!html.includes('assets/visual-desktop-workstation.css')) throw new Error('Visual Skills page must load the desktop PSG workstation stylesheet.');
if(html.includes('<iframe')) throw new Error('Desktop PSG workstation must remain native and iframe-free.');

for(const token of [
  "const isDesktop=()=>window.matchMedia('(min-width:901px)').matches",
  'visual-desktop-workstation',
  'captureViewport',
  'restoreViewport',
  'viewportSnapshot.epoch!==currentEpochIndex()',
  'currentTaskLabel',
  "return 'Stage the epoch'",
  "return 'Find the evidence'",
  "return 'Mark the feature'",
  'data-visual-workstation-rail',
  'PSG scoring workflow',
  'Stage',
  'Prove it',
  'Mark / measure',
  'Review',
  'data-visual-desktop-action="prev"',
  'Submit answer',
  'data-visual-desktop-hint',
  'data-visual-desktop-tools',
  'EEG frequency anchors',
  '0.5–2 Hz',
  '4–7 Hz',
  '8–13 Hz',
  '11–16 Hz',
  '2–6 Hz',
  "?'Split view':'PSG only'",
  'DESKTOP_RECAPS',
  'visual-workstation-recap',
  'review the evidence',
  'Continue to Epoch',
  "if(!isDesktop())showConfirmation()"
]) if(!confirm.includes(token)) throw new Error(`Desktop PSG workstation controller is missing ${token}.`);

for(const token of [
  '@media(min-width:901px)',
  'grid-template-columns:minmax(0,2.45fr) minmax(360px,.9fr)',
  'grid-template-areas:"head head" "epochs epochs" "viewer question" "footer footer"',
  '.visual-workstation-task-rail',
  '.visual-workstation-steps',
  '.visual-workstation-footer',
  '.visual-workstation-footer-progress',
  '.visual-workstation-recap',
  '.visual-desktop-workstation.visual-epoch-fullscreen',
  '>.visual-question-card{display:none!important}'
]) if(!css.includes(token)) throw new Error(`Desktop PSG workstation CSS is missing ${token}.`);

if(confirm.includes('MutationObserver')||nav.includes('MutationObserver')) throw new Error('Visual desktop workflow must remain event-driven and must not use MutationObserver.');
if(/addEventListener\(\s*['"]resize['"]/.test(confirm)) throw new Error('Visual desktop workflow must not add a continuous resize-driven synchronization loop.');
for(const token of ['firstAnswers:{}','retryRequired:null','const scoreAnswers={...state.firstAnswers}','First-pass score']) if(!lab.includes(token)) throw new Error(`Desktop workflow must preserve Visual Skills first-pass scoring contract: ${token}`);

console.log('Visual Skills desktop PSG workstation passed: stable 70/30 PSG-plus-task-rail layout, simplified Previous/Submit/Next navigation, preserved within-epoch viewport, PSG-only/Split-view mode, EEG tools, mastery confirmation, and epoch recap transitions are present without changing first-pass scoring.');
