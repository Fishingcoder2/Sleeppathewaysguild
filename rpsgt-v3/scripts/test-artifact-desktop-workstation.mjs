import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,controls,css,modalCss,lab]=await Promise.all([
  readFile(join(root,'lab-artifact.html'),'utf8'),
  readFile(join(root,'core','artifact-display-controls.js'),'utf8'),
  readFile(join(root,'assets','artifact-display-controls.css'),'utf8'),
  readFile(join(root,'assets','artifact-modal.css'),'utf8'),
  readFile(join(root,'core','lab-artifact.js'),'utf8')
]);

for(const token of ['assets/artifact-display-controls.css','core/artifact-display-controls.js','data-artifact-workspace']){
  if(!html.includes(token))throw new Error(`Artifact page missing ${token}.`);
}
if(html.includes('<iframe'))throw new Error('Artifact workstation must remain native; iframe is forbidden.');

for(const token of [
  "const desktopWorkstation=()=>",
  'artifact-desktop-workstation',
  'artifact-desktop-split',
  'data-artifact-desktop-view-toggle',
  'PSG only',
  'Split view',
  'autoOpenDesktopQuestion',
  'rememberViewerScroll',
  'restoreViewerScroll',
  'scrollMemory=new Map()',
  'data-artifact-workflow-steps',
  'Identify artifact',
  'Find the evidence',
  'Choose next response',
  'Case complete',
  'Troubleshooting sequence complete.',
  'Continue to next case',
  "shell.setAttribute('role','region')",
  "shell.removeAttribute('aria-modal')"
]) if(!controls.includes(token))throw new Error(`Artifact desktop controller missing ${token}.`);

for(const token of [
  '@media(min-width:901px)',
  'grid-template-columns:minmax(0,1.72fr) minmax(340px,.72fr)',
  'grid-template-areas:"head head" "cases cases" "viewer question"',
  '.artifact-desktop-split>.artifact-question-layer',
  'position:relative',
  '.artifact-workflow-steps',
  'grid-template-columns:repeat(3,minmax(0,1fr))',
  '.artifact-confirm-backdrop',
  '.artifact-outcome-backdrop',
  'scrollbar-gutter:stable both-edges'
]) if(!css.includes(token))throw new Error(`Artifact desktop styling missing ${token}.`);

for(const token of ['artifact-question-layer{position:absolute','artifact-confirm-backdrop,.artifact-outcome-backdrop']){
  if(!modalCss.includes(token))throw new Error(`Existing Artifact modal contract missing ${token}.`);
}

for(const token of [
  'firstAnswers',
  'retryRequired',
  'Are you sure?',
  'Submit answer',
  'Change answer',
  'Proceed to next',
  'Review and try again',
  'if(state.firstAnswers[key]==null)',
  'state.retryRequired=correct?null:key',
  'if(!allLocked()||state.retryRequired)return'
]) if(!lab.includes(token))throw new Error(`Artifact mastery/first-pass behavior missing ${token}.`);

for(const forbidden of ['MutationObserver','setInterval(','<iframe']){
  if(controls.includes(forbidden))throw new Error(`Artifact desktop controller must not use ${forbidden}.`);
}

console.log('Artifact desktop workstation passed: persistent PSG + troubleshooting rail, simplified viewing modes, scroll preservation, case workflow, and mastery behavior are protected.');
