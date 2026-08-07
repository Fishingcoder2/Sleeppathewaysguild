import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const html=await readFile(join(root,'practice.html'),'utf8');
const css=await readFile(join(root,'assets','practice.css'),'utf8');
const js=await readFile(join(root,'core','practice.js'),'utf8');
const repair=await readFile(join(root,'core','practice-learner-repair.js'),'utf8');
const actions=await readFile(join(root,'core','practice-question-actions.js'),'utf8');

const requiredAttributes=[
  'data-practice-load','data-practice-setup','data-practice-mode','data-practice-domain',
  'data-practice-task','data-practice-size','data-mode-notice','data-start-practice',
  'data-practice-shell','data-question-panel','data-question-number','data-question-task',
  'data-question-difficulty','data-question-review','data-question-prompt','data-question-choices','data-practice-question-actions',
  'data-answer-feedback','data-submit-answer','data-next-question','data-session-answered',
  'data-session-correct','data-session-accuracy','data-session-pool','data-active-mode',
  'data-progress-policy','data-session-complete','data-complete-score','data-complete-percent',
  'data-complete-policy','data-bank-total','data-module-total'
];
for(const attribute of requiredAttributes){if(!html.includes(attribute)) throw new Error(`practice.html is missing ${attribute}`);}
if(html.includes('value="quality"')) throw new Error('Learner Practice still exposes an internal review mode.');
for(const term of ['Quality-review pool','Manual review record','QA status','Review target','Source mapping']){
  if(html.includes(term)) throw new Error(`Learner Practice exposes internal terminology: ${term}`);
}
if(!html.includes('role="dialog"')||!html.includes('aria-modal="true"')) throw new Error('Practice session is missing dialog semantics.');
if(!html.includes('class="practice-close"')||!html.includes('aria-label="Close practice session"')) throw new Error('Practice modal close control is missing.');
if(!css.includes('.practice-session:not(.hidden){position:fixed')||!css.includes('min-height:100dvh')) throw new Error('Practice mobile full-screen modal styling is missing.');
if(!css.includes('touch-action:manipulation')) throw new Error('Practice touch-target optimization is missing.');
if(!html.includes('core/guided-trail-engine.js')||!html.includes('core/practice-learner-repair.js')) throw new Error('Shared eligibility repair scripts are missing.');
if(!html.includes('core/practice-question-actions.js')||!html.includes('core/study-resource-catalog.js')) throw new Error('Practice learner action/resource scripts are missing.');
if(!js.includes('data/question-bank/manifest.json')) throw new Error('Practice engine does not load the full-bank manifest.');
if(!repair.includes('eligibleQuestion(question,question&&question.taskCode)')) throw new Error('Practice repair does not reuse the pure learner eligibility helper.');
if(!repair.includes("heading.textContent='Recommended study resources'")) throw new Error('Verified resource-title heading is missing.');
if(!repair.includes("feedback.querySelectorAll('.feedback-references')")) throw new Error('Raw feedback reference removal is missing.');
for(const hook of ['flaggedIds','reviewLaterIds','addQuestion','aria-live']){if(!actions.includes(hook)) throw new Error(`Practice question actions are missing ${hook}.`);}

console.log(JSON.stringify({requiredSelectors:requiredAttributes.length,learnerOnly:true,rawSourceKeysHidden:true,questionActions:true,verifiedResourceTitles:true,mobileModal:true},null,2));
