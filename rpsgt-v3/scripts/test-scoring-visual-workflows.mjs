import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const read=path=>readFile(join(root,path),'utf8');
const [html,eventJs,eventCss,contextJs,contextCss,multiJs,multiCss,stageJs,boundaryJs]=await Promise.all([
  read('lab-scoring.html'),
  read('core/scoring-event-workflow.js'),
  read('assets/scoring-event-modal.css'),
  read('core/lab-scoring-context.js'),
  read('assets/scoring-context.css'),
  read('core/lab-scoring-multi-epoch.js'),
  read('assets/scoring-multi-epoch.css'),
  read('core/scoring-stage-order.js'),
  read('core/lab-scoring-event-boundary.js')
]);

const controllers={eventJs,contextJs,multiJs,stageJs,boundaryJs};
for(const [name,source] of Object.entries(controllers)){
  if(source.includes('MutationObserver')) throw new Error(`${name} must remain event-driven and must not use MutationObserver.`);
  if(/addEventListener\(\s*['"]resize['"]/.test(source)) throw new Error(`${name} must not use a continuous resize redraw listener.`);
  if(/<iframe|createElement\(\s*['"]iframe['"]/.test(source)) throw new Error(`${name} must not use iframe-based visual workflows.`);
}
if(/<iframe/i.test(html)) throw new Error('Scoring Lab must not embed iframe-based visual workflows.');

for(const token of ['assets/shared-visual-display.css','assets/scoring-event-modal.css','core/shared-visual-display.js','core/scoring-event-workflow.js']){
  if(!html.includes(token)) throw new Error(`Scoring shell is missing shared visual asset ${token}.`);
}
if(html.indexOf('core/shared-visual-display.js')>html.indexOf('core/scoring-event-workflow.js')) throw new Error('Shared visual helper must load before the guided event workflow.');
if(html.indexOf('core/lab-scoring.js')>html.indexOf('core/scoring-event-workflow.js')) throw new Error('Guided event workflow must load after the base Scoring controller so capture-phase actions can protect it.');
for(const token of ['Phase 3 consecutive-epoch practice is currently tracked separately','Phase 3 event-boundary practice is also tracked separately','Neither is yet required for completion']) if(!html.includes(token)) throw new Error(`Scoring completion boundary changed unexpectedly: ${token}`);

for(const token of ['document.addEventListener(\'click\',handle,true)','firstAnswers','data-scoring-event-submit','Are you sure?','Review and try again.','data-scoring-event-prev','data-scoring-event-next','data-scoring-event-mode','Full question','Split view','data-scoring-event-hint','data-scoring-event-fullscreen','AI-generated teaching schematic · Not a patient recording','answers:state.firstAnswers']){
  if(!eventJs.includes(token)) throw new Error(`Guided event workflow is missing ${token}.`);
}
for(const token of ['body.scoring-event-modal-open','.scoring-event-nav.complete','.scoring-event-nav.current','.scoring-event-nav.recommended','.scoring-event-nav.retry','.scoring-event-confirmation','orientation:landscape','orientation:portrait','.scoring-event-rotate-prompt','.question-only']){
  if(!eventCss.includes(token)) throw new Error(`Event visual modal CSS is missing ${token}.`);
}

for(const token of ['firstAnswers','data-scoring-context-submit','Are you sure?','Review and try again.','data-scoring-context-prev','data-scoring-context-next','data-scoring-context-mode','Full question','Split view','data-scoring-context-hint','data-scoring-context-fullscreen','AI-generated teaching schematic · Not a patient recording','scheduleSummarySync','answers:state.run.firstAnswers']){
  if(!contextJs.includes(token)) throw new Error(`Scoring context workflow is missing ${token}.`);
}
for(const token of ['body.scoring-context-modal-open','.scoring-context-nav.complete','.scoring-context-nav.current','.scoring-context-nav.recommended','.scoring-context-nav.retry','.scoring-context-confirmation','orientation:landscape','orientation:portrait','.scoring-context-rotate-prompt','.question-only']){
  if(!contextCss.includes(token)) throw new Error(`Context visual modal CSS is missing ${token}.`);
}

for(const token of ['firstAnswers','data-scoring-multi-submit','Are you sure?','Review and try again.','data-scoring-multi-prev','data-scoring-multi-next','data-scoring-multi-hint','data-scoring-multi-fullscreen','AI-generated teaching schematics · Not patient recordings','scheduleSummarySync','answers:state.run.firstAnswers']){
  if(!multiJs.includes(token)) throw new Error(`Consecutive-epoch workflow is missing ${token}.`);
}
for(const token of ['body.scoring-multi-modal-open','.scoring-multi-nav.complete','.scoring-multi-nav.current','.scoring-multi-nav.recommended','.scoring-multi-nav.retry','.scoring-multi-confirmation','orientation:landscape','orientation:portrait','.scoring-multi-rotate-prompt','@media(min-width:1100px)','grid-template-columns:repeat(3,minmax(0,1fr))']){
  if(!multiCss.includes(token)) throw new Error(`Consecutive-epoch modal CSS is missing ${token}.`);
}

console.log('Scoring visual workflows passed: event evidence, scoring context, consecutive epochs, fixed staging, and boundary placement are observer-free, use event-driven mobile visual workspaces, preserve first-pass scoring with correction mastery, expose confirmation/hint/Previous/Next/fullscreen where applicable, and carry the teaching-schematic disclosure without changing the Scoring completion gate.');
