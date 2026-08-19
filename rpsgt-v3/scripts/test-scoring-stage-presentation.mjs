import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,orderJs,multiCss,modalCss,sharedJs,sharedCss,stagePack,scoringJs]=await Promise.all([
  readFile(join(root,'lab-scoring.html'),'utf8'),
  readFile(join(root,'core','scoring-stage-order.js'),'utf8'),
  readFile(join(root,'assets','scoring-multi-epoch.css'),'utf8'),
  readFile(join(root,'assets','scoring-stage-modal.css'),'utf8'),
  readFile(join(root,'core','shared-visual-display.js'),'utf8'),
  readFile(join(root,'assets','shared-visual-display.css'),'utf8'),
  readFile(join(root,'data','visual','prototype-sleep-staging.json'),'utf8').then(JSON.parse),
  readFile(join(root,'core','lab-scoring.js'),'utf8')
]);

const stageAnswers=(stagePack.questions||[]).filter(item=>item.type==='stage-choice').map(item=>item.answer);
const expected=['W','N1','N2','N3','R'];
if(JSON.stringify(stageAnswers)!==JSON.stringify(expected)) throw new Error(`Staging source order must remain ${expected.join(' → ')}; found ${stageAnswers.join(' → ')}.`);
if(!scoringJs.includes('items:shuffle(state.stageItems)')) throw new Error('Base Scoring controller changed unexpectedly; review the dedicated fixed-order stage controller.');
for(const token of ["STAGE_ORDER=['W','N1','N2','N3','R']","document.addEventListener('click',handleStageAction,true)",'firstAnswer','data-scoring-stage-submit','Are you sure?','Progression stays blocked','data-scoring-stage-prev','data-scoring-stage-next','data-scoring-stage-hint','data-scoring-stage-fullscreen','AI-generated teaching schematic · Not a patient recording','assets/shared-visual-display.css',"role','dialog'","aria-modal","Rotate your phone sideways","data-scoring-stage-close","Escape"]){
  if(!orderJs.includes(token)) throw new Error(`Fixed staging controller is missing ${token}.`);
}
if(orderJs.includes('MutationObserver')) throw new Error('Staging controller must remain event-driven and must not use MutationObserver.');
if(/Math\.random\s*=/.test(orderJs)) throw new Error('Staging controller must not override Math.random to force sequence order.');
for(const token of ['height:94dvh','position:fixed','z-index:9999','body.scoring-stage-modal-open','orientation:landscape','height:100dvh','orientation:portrait','.scoring-stage-rotate-prompt','grid-template-columns:repeat(5,minmax(0,1fr))','.scoring-stage-nav.complete','.scoring-stage-nav.current','.scoring-stage-nav.recommended','.scoring-stage-nav.retry','.scoring-stage-confirmation']){
  if(!modalCss.includes(token)) throw new Error(`Near-full-screen staging modal CSS is missing ${token}.`);
}
for(const token of ['@media(orientation:landscape) and (max-height:600px)','grid-template-columns:minmax(0,1fr) minmax(300px,36vw)','grid-row:3/7','min-height:190px','grid-template-columns:repeat(3,minmax(0,1fr))']){
  if(!modalCss.includes(token)) throw new Error(`Short-landscape staging layout is missing ${token}.`);
}
for(const token of ["window.SPGSharedVisualDisplay=api","[data-spg-request-fullscreen],[data-scoring-stage-fullscreen]","active?'Exit full screen':'Full screen'",'fullscreenElement()===surface','document.addEventListener(\'fullscreenchange\',syncAll)']){
  if(!sharedJs.includes(token)) throw new Error(`Shared staging fullscreen controller is missing ${token}.`);
}
for(const token of ['.scoring-stage-confirmation{position:fixed!important','box-shadow:0 0 0 100vmax','.scoring-stage-confirmation .actions','grid-template-columns:1fr 1fr','.scoring-stage-trace:fullscreen [data-scoring-stage-fullscreen]','z-index:2147483647!important']){
  if(!sharedCss.includes(token)) throw new Error(`Staging popout/fullscreen CSS is missing ${token}.`);
}
if(!html.includes('Wake → N1 → N2 → N3 → R')) throw new Error('Learner-facing staging order is not visible.');
if(!html.includes('core/scoring-stage-order.js')) throw new Error('Scoring page does not load the fixed staging controller.');
if(html.indexOf('core/lab-scoring.js')>html.indexOf('core/scoring-stage-order.js')) throw new Error('Fixed staging controller must load after the base Scoring controller so capture-phase actions can protect the dedicated visual workflow.');
for(const token of ['@media(min-width:1100px)', 'grid-template-columns:repeat(3,minmax(0,1fr))', '.scoring-multi-epoch-card{min-width:0']){
  if(!multiCss.includes(token)) throw new Error(`Desktop consecutive-epoch layout is missing ${token}.`);
}
if(!html.includes('the three neighboring epoch cards appear side by side')) throw new Error('Desktop horizontal layout cue is not visible to learners.');

console.log('Scoring staging presentation passed: fixed W → N1 → N2 → N3 → R controller, first-pass scoring with correction mastery, popout answer confirmation, explicit Full screen / Exit full screen toggle, hint, Previous/Next, AI disclosure, compact short-landscape phone layout with a protected tracing area, phone landscape guidance, and three-column desktop consecutive-epoch layout are present without DOM observers or Math.random overrides.');
