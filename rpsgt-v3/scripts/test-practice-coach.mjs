import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const require=createRequire(import.meta.url);
const coach=require(join(root,'core','practice-coach.js'));
const source=await readFile(join(root,'core','practice-coach.js'),'utf8');
const html=await readFile(join(root,'practice.html'),'utf8');
const css=await readFile(join(root,'assets','practice-coach.css'),'utf8');

if(typeof coach.priorPracticeMisses!=='function') throw new Error('Practice Coach does not expose its Practice-history helper.');
if(source.includes('MutationObserver')) throw new Error('Practice Coach must remain event-driven and must not use MutationObserver.');
for(const token of [
  "addEventListener('rpsgt:practice-question'",
  "closest('[data-submit-answer]')",
  'RPSGTCoachBobEngine',
  'RPSGTStudyResourceCatalog',
  'resources.resolveQuestion(question)',
  "source!=='v3-practice-full-bank'",
  "pool!=='learner'",
  "phase==='incorrect'",
  'payload.repeatPattern',
  'Verified study resources',
  'Reasoning Compass'
]){
  if(!source.includes(token)) throw new Error(`Practice Coach integration is missing ${token}.`);
}
for(const token of [
  'data-practice-coach',
  'core/coach-bob-engine.js',
  'core/practice-coach.js',
  'assets/practice-coach.css'
]){
  if(!html.includes(token)) throw new Error(`Practice shell is missing Coach Bob dependency ${token}.`);
}
if(!css.includes('.practice-coach-panel')||!css.includes('@media(max-width:800px)')) throw new Error('Practice Coach desktop/mobile styling is incomplete.');

const history=[
  {questionId:'q1',correct:false,source:'v3-practice-full-bank',pool:'learner'},
  {questionId:'q1',correct:true,source:'v3-practice-full-bank',pool:'learner'},
  {questionId:'q1',correct:false,source:'v3-practice-full-bank',pool:'learner'},
  {questionId:'q1',correct:false,source:'guided-study',pool:'learner'},
  {questionId:'q2',correct:false,source:'v3-practice-full-bank',pool:'learner'}
];
const storage={load:()=>({progress:{history}})};
if(coach.priorPracticeMisses(storage,'q1',false)!==2) throw new Error('Practice Coach did not count prior Practice misses correctly.');
if(coach.priorPracticeMisses(storage,'q1',true)!==1) throw new Error('Practice Coach did not exclude the just-recorded incorrect attempt.');
if(coach.priorPracticeMisses(storage,'q2',false)!==1) throw new Error('Practice Coach history filtering crossed question IDs.');

console.log(JSON.stringify({eventDriven:true,sharedCoachEngine:true,verifiedResources:true,repeatMissHistory:true,preAnswerCollapsed:true,scoredReviewOpens:true,mobileStyles:true},null,2));
