import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,orderJs,multiCss,modalCss,stagePack,scoringJs]=await Promise.all([
  readFile(join(root,'lab-scoring.html'),'utf8'),
  readFile(join(root,'core','scoring-stage-order.js'),'utf8'),
  readFile(join(root,'assets','scoring-multi-epoch.css'),'utf8'),
  readFile(join(root,'assets','scoring-stage-modal.css'),'utf8'),
  readFile(join(root,'data','visual','prototype-sleep-staging.json'),'utf8').then(JSON.parse),
  readFile(join(root,'core','lab-scoring.js'),'utf8')
]);

const stageAnswers=(stagePack.questions||[]).filter(item=>item.type==='stage-choice').map(item=>item.answer);
const expected=['W','N1','N2','N3','R'];
if(JSON.stringify(stageAnswers)!==JSON.stringify(expected)) throw new Error(`Staging source order must remain ${expected.join(' → ')}; found ${stageAnswers.join(' → ')}.`);
if(!scoringJs.includes('items:shuffle(state.stageItems)')) throw new Error('Expected staging controller shuffle hook changed; review the fixed-order adapter.');
for(const token of ["STAGE_ORDER=['W','N1','N2','N3','R']","Math.random=()=>0.999999999","document.addEventListener('click',preservePackOrderForStageStart,true)","queueMicrotask","role','dialog","aria-modal","Rotate your phone sideways","data-scoring-stage-modal-close","Escape"]){
  if(!orderJs.includes(token)) throw new Error(`Fixed staging-order/modal adapter is missing ${token}.`);
}
for(const token of ['height:94dvh','position:fixed','z-index:9999','body.scoring-stage-modal-open','orientation:landscape','height:100dvh','orientation:portrait','.scoring-stage-rotate-prompt','grid-template-columns:repeat(5,minmax(0,1fr))']){
  if(!modalCss.includes(token)) throw new Error(`Near-full-screen staging modal CSS is missing ${token}.`);
}
if(!html.includes('Wake → N1 → N2 → N3 → R')) throw new Error('Learner-facing staging order is not visible.');
if(!html.includes('core/scoring-stage-order.js')) throw new Error('Scoring page does not load the fixed staging-order/modal adapter.');
if(html.indexOf('core/lab-scoring.js')>html.indexOf('core/scoring-stage-order.js')) throw new Error('Fixed staging-order/modal adapter must load after the Scoring controller.');
for(const token of ['@media(min-width:1100px)', 'grid-template-columns:repeat(3,minmax(0,1fr))', '.scoring-multi-epoch-card{min-width:0']){
  if(!multiCss.includes(token)) throw new Error(`Desktop consecutive-epoch layout is missing ${token}.`);
}
if(!html.includes('the three neighboring epoch cards appear side by side')) throw new Error('Desktop horizontal layout cue is not visible to learners.');

console.log('Scoring staging presentation passed: fixed W → N1 → N2 → N3 → R order, near-full-screen modal, phone landscape guidance, and three-column desktop consecutive-epoch layout are present.');
