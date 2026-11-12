import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,logic,css,displayLogic,displayCss,renderer]=await Promise.all([
  readFile(join(root,'lab-artifact.html'),'utf8'),
  readFile(join(root,'core','lab-artifact.js'),'utf8'),
  readFile(join(root,'assets','artifact-modal.css'),'utf8'),
  readFile(join(root,'core','artifact-display-controls.js'),'utf8'),
  readFile(join(root,'assets','artifact-display-controls.css'),'utf8'),
  readFile(join(root,'core','artifact-psg-renderer.js'),'utf8')
]);

for(const token of ['assets/artifact-modal.css','assets/artifact-display-controls.css','data-artifact-workspace','core/lab-artifact.js','core/artifact-display-controls.js','class="section card artifact-workspace"']) if(!html.includes(token)) throw new Error(`Artifact page missing ${token}`);
if(!css.includes('.artifact-workspace.artifact-modal-active')) throw new Error('Artifact modal CSS must target the same artifact-workspace class used by the HTML shell.');
for(const forbidden of ['<iframe','MutationObserver']) if(html.includes(forbidden)||logic.includes(forbidden)||css.includes(forbidden)||displayLogic.includes(forbidden)||displayCss.includes(forbidden)) throw new Error(`Artifact modal UX must not use ${forbidden}`);
if(logic.includes("window.addEventListener('resize'")) throw new Error('Artifact mobile viewer must not restore continuous resize-driven PSG redraws.');

for(const token of [
  'artifact-modal-open','artifact-modal-active','artifact-rotate','Rotate your phone sideways',
  'artifact-question-layer','Answer question','Review PSG','artifact-case-nav','artifact-case-button',
  'Are you sure?','Submit answer','Change answer','Ask for a hint','Correct','Incorrect',
  'Review and try again','There is no Next option yet','firstAnswers:{}','answers:{...state.firstAnswers}',
  'retryRequired','data-artifact-prev','data-artifact-outcome="next"','data-artifact-outcome="retry"',
  'function renderQuestionLayer()','function removeQuestionLayer()','insertAdjacentHTML',
  'function settledOrientationRedraw()','orientationchange','220'
]) if(!logic.includes(token)) throw new Error(`Artifact modal logic missing ${token}`);

for(const token of [
  'position:fixed','height:95dvh','orientation:landscape','orientation:portrait','height:100dvh',
  '.artifact-question-layer','.artifact-confirm-backdrop','.artifact-outcome-backdrop',
  '.artifact-case-button.current','.artifact-case-button.complete:not(.needs-review)','content:"✓"',
  '.artifact-case-button.next-step','content:"Next"','.artifact-case-button.needs-review'
]) if(!css.includes(token)) throw new Error(`Artifact modal CSS missing ${token}`);

for(const token of [
  'requestFullscreen','navigationUI','hide','data-artifact-fullscreen','artifact-split-view',
  'data-artifact-split-toggle','phoneQuestionMode','Split view','Full question','fullscreenchange'
]) if(!displayLogic.includes(token)) throw new Error(`Artifact display controls missing ${token}`);

for(const token of [
  '.artifact-workspace:fullscreen','.artifact-question-view-controls','artifact-split-view',
  'grid-template-areas:"head head" "cases cases" "viewer question"','minmax(0,58fr)','minmax(300px,42fr)'
]) if(!displayCss.includes(token)) throw new Error(`Artifact display-control CSS missing ${token}`);

for(const token of [
  "if(type==='eeg'||type==='eog')return '#17202a'",
  "if(type==='ecg')return '#b3261e'",
  "if(type==='spo2')return '#2e7d4f'",
  "if(type==='emg')return '#6c4778'",
  'traceColor(ch)'
]) if(!renderer.includes(token)) throw new Error(`Artifact PSG palette missing ${token}`);

// Keep long teaching/source notices outside the modal's PSG image viewport.
if(displayLogic.includes('ensureTeachingDisclosure')||displayLogic.includes('viewer.appendChild(note)')||displayCss.includes('.artifact-ai-visual-disclosure'))
  throw new Error('The duplicate teaching notice must not be inserted inside the PSG viewer.');
if(!html.includes('<strong>Visual learning boundary:</strong>')||!logic.includes('artifact-atlas-caption')||!logic.includes('Not a patient recording.'))
  throw new Error('Keep disclosure on the page and a short non-overlay image caption.');
if(!css.includes('.artifact-workspace.artifact-modal-active .artifact-scroll{flex:1 1 auto;min-height:0;overflow:auto'))
  throw new Error('The PSG strip must retain its own scrollable viewport.');

// The small landscape-phone viewport must present all eight channels, not
// only the first two above a caption or notice. Zoom is a deliberate option.
for(const token of [
  "artifact-epoch-focus","artifact-epoch-zoom","data-artifact-epoch-focus",
  "data-artifact-epoch-zoom","data-artifact-focus-answer",
  "workspace.classList.toggle('artifact-epoch-focus'",
  "workspace.classList.remove('artifact-epoch-focus','artifact-epoch-zoom')",
  "zoomButton.setAttribute('aria-pressed'",
  "workspace.classList.remove('artifact-epoch-zoom')"
])if(!logic.includes(token))throw new Error('Epoch-first mobile controls missing '+token);
for(const token of [
  '@media(max-width:900px) and (orientation:landscape)',
  '.artifact-workspace.artifact-modal-active .artifact-atlas-caption{display:none!important}',
  '.artifact-workspace.artifact-modal-active .artifact-scroll{flex:1 1 auto;display:flex;',
  'object-fit:contain',
  'min-width:0!important',
  '.artifact-workspace.artifact-modal-active.artifact-epoch-zoom .artifact-scroll{display:block;overflow:auto',
  '.artifact-workspace.artifact-modal-active.artifact-epoch-focus{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);grid-template-areas:"viewer"',
  '.artifact-workspace.artifact-modal-active.artifact-epoch-focus>.artifact-case-nav',
  '.artifact-workspace.artifact-modal-active.artifact-epoch-focus .artifact-viewer-actions .artifact-focus-answer{display:inline-flex}'
])if(!displayCss.includes(token))throw new Error('Mobile whole-epoch CSS missing '+token);
if(!logic.includes('Every new case opens with all eight channels'))
  throw new Error('Each case must reset to an all-channel overview on phones.');

if(!logic.includes('state.retryRequired=correct?null:key')) throw new Error('Incorrect Artifact answers must block progression until corrected.');
if(!logic.includes('if(!allLocked()||state.retryRequired)return')) throw new Error('Artifact pack must not save before all required corrections are complete.');
if((logic.match(/requestAnimationFrame\(renderCanvas\)/g)||[]).length>2) throw new Error('Artifact PSG redraws must remain limited to viewer render and one settled orientation redraw path.');

console.log('Artifact modal UX passed: landscape full-epoch overview, focus/zoom controls and image navigation, no image-blocking notice, preserved phone/desktop questions and first-pass scoring.');
