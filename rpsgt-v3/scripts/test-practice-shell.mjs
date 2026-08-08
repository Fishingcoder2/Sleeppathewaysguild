import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const html=await readFile(join(root,'practice.html'),'utf8');
const css=await readFile(join(root,'assets','practice.css'),'utf8');
const coachCss=await readFile(join(root,'assets','practice-coach.css'),'utf8');
const js=await readFile(join(root,'core','practice.js'),'utf8');
const shell=await readFile(join(root,'core','app-shell.js'),'utf8');
const repair=await readFile(join(root,'core','practice-learner-repair.js'),'utf8');
const actions=await readFile(join(root,'core','practice-question-actions.js'),'utf8');
const practiceCoach=await readFile(join(root,'core','practice-coach.js'),'utf8');

const requiredAttributes=[
  'data-practice-load','data-practice-setup','data-practice-mode','data-practice-domain',
  'data-practice-task','data-practice-difficulty','data-practice-size','data-mode-notice','data-start-practice',
  'data-practice-shell','data-question-panel','data-question-number','data-question-task',
  'data-question-difficulty','data-question-review','data-question-prompt','data-question-choices','data-practice-question-actions',
  'data-practice-coach','data-answer-feedback','data-submit-answer','data-next-question','data-session-answered',
  'data-session-correct','data-session-accuracy','data-session-pool','data-active-mode',
  'data-progress-policy','data-session-complete','data-complete-score','data-complete-percent',
  'data-complete-policy','data-bank-total','data-module-total'
];
for(const attribute of requiredAttributes){if(!html.includes(attribute)) throw new Error(`practice.html is missing ${attribute}`);}
if(html.includes('value="quality"')) throw new Error('Learner Practice still exposes an internal review mode.');
for(const term of ['Quality-review pool','Manual review record','QA status','Review target','Source mapping']){
  if(html.includes(term)) throw new Error(`Learner Practice exposes internal terminology: ${term}`);
}
for(const developerTerm of ['Development boundary','complete question-bank manifest','Total preserved records','Overall v3 learner record','Development branch only']){
  if(html.includes(developerTerm)) throw new Error(`Practice Center exposes development-era wording: ${developerTerm}`);
}
for(const learnerMarker of ['Practice Center · Focused sessions','Practice boundary:','Available bank records','Overall learner record']){
  if(!html.includes(learnerMarker)) throw new Error(`Practice Center learner presentation is missing ${learnerMarker}.`);
}
for(const difficulty of ['Easy','Intermediate','Hard']){
  if(!html.includes(`value="${difficulty}"`)) throw new Error(`Practice difficulty option ${difficulty} is missing.`);
}
if(!js.includes('selectedDifficulty()')||!js.includes('matchesDifficulty(question,difficulty)')) throw new Error('Practice difficulty filtering is not wired into the learner pool.');
if(!html.includes('role="dialog"')||!html.includes('aria-modal="true"')) throw new Error('Practice session is missing dialog semantics.');
if(!html.includes('class="practice-close"')||!html.includes('aria-label="Close practice session"')) throw new Error('Practice modal close control is missing.');
if(!css.includes('.practice-session:not(.hidden){position:fixed')||!css.includes('min-height:100dvh')) throw new Error('Practice mobile full-screen modal styling is missing.');
if(!css.includes('touch-action:manipulation')) throw new Error('Practice touch-target optimization is missing.');
if(!html.includes('core/guided-trail-engine.js')||!html.includes('core/practice-learner-repair.js')) throw new Error('Shared eligibility repair scripts are missing.');
if(!html.includes('core/practice-question-actions.js')||!html.includes('core/study-resource-catalog.js')) throw new Error('Practice learner action/resource scripts are missing.');
if(!html.includes('core/coach-bob-engine.js')||!html.includes('core/practice-coach.js')||!html.includes('assets/practice-coach.css')) throw new Error('Practice Coach Bob dependencies are missing.');
if(!js.includes('data/question-bank/manifest.json')) throw new Error('Practice engine does not load the full-bank manifest.');
if(!repair.includes('eligibleQuestion(question,question&&question.taskCode)')) throw new Error('Practice repair does not reuse the pure learner eligibility helper.');
if(!repair.includes("heading.textContent='Recommended study resources'")) throw new Error('Verified resource-title heading is missing.');
if(!repair.includes("feedback.querySelectorAll('.feedback-references')")) throw new Error('Raw feedback reference removal is missing.');
for(const hook of ['flaggedIds','reviewLaterIds','addQuestion','aria-live']){if(!actions.includes(hook)) throw new Error(`Practice question actions are missing ${hook}.`);}

// Coach Bob Practice regression contract.
if(practiceCoach.includes('MutationObserver')) throw new Error('Practice Coach Bob regressed to MutationObserver rendering.');
for(const token of ["rpsgt:practice-question","[data-submit-answer]","RPSGTCoachBobEngine","RPSGTStudyResourceCatalog","priorPracticeMisses","Verified study resources","Reasoning Compass"]){
  if(!practiceCoach.includes(token)) throw new Error(`Practice Coach Bob is missing ${token}.`);
}
if(!coachCss.includes('.practice-coach-panel')||!coachCss.includes('@media(max-width:800px)')) throw new Error('Practice Coach Bob responsive styling is missing.');

// Optional sound stays user-controlled and defaults off.
if(!shell.includes('soundEffects:false')||!shell.includes('playFeedbackSound')) throw new Error('Shared optional sound controls are missing.');
if(!js.includes('RPSGTApp.playFeedbackSound')) throw new Error('Practice does not honor the shared optional feedback sound setting.');

// Practice completion regression contract.
if(!js.includes('?"Submit Practice":"Next question"')) throw new Error('The final answered Practice question does not expose a clear Submit Practice action.');
if(js.includes('View session result')) throw new Error('The ambiguous final Practice label "View session result" returned.');
if(!/function nextQuestion\(\)[\s\S]*?state\.index\+=1;[\s\S]*?renderComplete\(\)/.test(js)) throw new Error('Practice final navigation no longer reaches the completion state.');
if(!html.includes('<h2>Practice Complete</h2>')||!html.includes('aria-label="Practice complete"')) throw new Error('Focused Practice completion state is missing.');
for(const destination of ['review.html?list=missed','study.html','index.html']){
  if(!html.includes(`href="${destination}"`)) throw new Error(`Practice completion is missing next-action destination ${destination}.`);
}
if(!html.includes('not an official BRPT score')) throw new Error('Practice completion score disclaimer is missing.');
if(!css.includes('.question-actions .btn.primary')||!css.includes('.practice-question-action-row .btn.secondary')) throw new Error('Practice primary/secondary action hierarchy styling is missing.');
if(!css.includes('.practice-session:not(.hidden) .question-actions{grid-template-columns:1fr}')) throw new Error('Practice mobile primary action no longer occupies a clear single-column control area.');

console.log(JSON.stringify({requiredSelectors:requiredAttributes.length,learnerOnly:true,learnerPresentation:true,difficultyFilter:true,rawSourceKeysHidden:true,questionActions:true,verifiedResourceTitles:true,coachBobPractice:true,coachBobEventDriven:true,optionalSound:true,mobileModal:true,submitPractice:true,focusedCompletion:true,nextActions:true},null,2));
