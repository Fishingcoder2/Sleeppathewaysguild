import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,logic,css,renderer]=await Promise.all([
  readFile(join(root,'lab-artifact.html'),'utf8'),
  readFile(join(root,'core','lab-artifact.js'),'utf8'),
  readFile(join(root,'assets','artifact-modal.css'),'utf8'),
  readFile(join(root,'core','artifact-psg-renderer.js'),'utf8')
]);

for(const token of ['assets/artifact-modal.css','data-artifact-workspace','core/lab-artifact.js']) if(!html.includes(token)) throw new Error(`Artifact page missing ${token}`);
for(const forbidden of ['<iframe','MutationObserver']) if(html.includes(forbidden)||logic.includes(forbidden)||css.includes(forbidden)) throw new Error(`Artifact modal UX must not use ${forbidden}`);

for(const token of [
  'artifact-modal-open','artifact-modal-active','artifact-rotate','Rotate your phone sideways',
  'artifact-question-layer','Answer question','Review PSG','artifact-case-nav','artifact-case-button',
  'Are you sure?','Submit answer','Change answer','Ask for a hint','Correct','Incorrect',
  'Review and try again','There is no Next option yet','firstAnswers:{}','answers:{...state.firstAnswers}',
  'retryRequired','data-artifact-prev','data-artifact-outcome="next"','data-artifact-outcome="retry"'
]) if(!logic.includes(token)) throw new Error(`Artifact modal logic missing ${token}`);

for(const token of [
  'position:fixed','height:95dvh','orientation:landscape','orientation:portrait','height:100dvh',
  '.artifact-question-layer','.artifact-confirm-backdrop','.artifact-outcome-backdrop',
  '.artifact-case-button.current','.artifact-case-button.complete:not(.needs-review)','content:"✓"',
  '.artifact-case-button.next-step','content:"Next"','.artifact-case-button.needs-review'
]) if(!css.includes(token)) throw new Error(`Artifact modal CSS missing ${token}`);

for(const token of [
  "if(type==='eeg'||type==='eog')return '#17202a'",
  "if(type==='ecg')return '#b3261e'",
  "if(type==='spo2')return '#2e7d4f'",
  "if(type==='emg')return '#6c4778'",
  'traceColor(ch)'
]) if(!renderer.includes(token)) throw new Error(`Artifact PSG palette missing ${token}`);

if(!logic.includes('state.retryRequired=correct?null:key')) throw new Error('Incorrect Artifact answers must block progression until corrected.');
if(!logic.includes('if(!allLocked()||state.retryRequired)return')) throw new Error('Artifact pack must not save before all required corrections are complete.');

console.log('Artifact modal UX passed: landscape phone viewer, full-screen native questions, case navigation, confirmation, hint/retry mastery flow, first-pass score preservation, and PSG-style signal colors are present.');
