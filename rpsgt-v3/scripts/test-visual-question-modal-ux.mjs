import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [visualHtml,visualNav,visualNavCss,visualFullEpochCss,visualConfirm,visualConfirmCss,labVisual,practiceHtml,reviewHtml,reviewJs]=await Promise.all([
  readFile(join(root,'lab-visual.html'),'utf8'),
  readFile(join(root,'core','visual-navigation.js'),'utf8'),
  readFile(join(root,'assets','visual-navigation.css'),'utf8'),
  readFile(join(root,'assets','visual-full-epoch.css'),'utf8'),
  readFile(join(root,'core','visual-confirmation.js'),'utf8'),
  readFile(join(root,'assets','visual-confirmation.css'),'utf8'),
  readFile(join(root,'core','lab-visual.js'),'utf8'),
  readFile(join(root,'practice.html'),'utf8'),
  readFile(join(root,'review.html'),'utf8'),
  readFile(join(root,'core','review.js'),'utf8')
]);

for(const token of ['core/visual-navigation.js','assets/visual-navigation.css','assets/visual-full-epoch.css','core/visual-confirmation.js','assets/visual-confirmation.css','data-visual-workspace']) if(!visualHtml.includes(token)) throw new Error(`Visual page is missing ${token}.`);
for(const token of ['visual-modal-open','visual-modal-active','visual-modal-footer','Rotate your phone sideways','Previous visual','Previous epoch','Next epoch','Check answer','Next visual','data-visual-modal-close','aria-modal','View full epoch','Back to question','data-visual-full-epoch','visual-epoch-fullscreen']) if(!visualNav.includes(token)) throw new Error(`Visual modal navigation is missing ${token}.`);
for(const token of ['position:fixed','height:95dvh','grid-template-areas:"head head"','"viewer question"','orientation:landscape','height:100dvh','orientation:portrait','.visual-modal-rotate','.visual-modal-footer','.visual-question-actions']) if(!visualNavCss.includes(token)) throw new Error(`Visual modal CSS is missing ${token}.`);
for(const token of ['orientation:landscape','.visual-full-epoch-toggle','.visual-epoch-fullscreen','height:100dvh','grid-template-areas:"viewer"','display:none!important','overflow:auto','.visual-outcome-backdrop','.visual-outcome-dialog','.visual-retry-notice']) if(!visualFullEpochCss.includes(token)) throw new Error(`Visual mobile/outcome CSS is missing ${token}.`);
if(visualNavCss.includes('.visual-flow-nav{display:flex')) throw new Error('Legacy duplicate visual flow navigation must not return.');

// Visual navigation is intentionally event-driven. Continuous DOM observation caused repeated mobile freezes.
if(visualNav.includes('MutationObserver')||visualConfirm.includes('MutationObserver')) throw new Error('Visual modal navigation must remain event-driven; do not restore MutationObserver-based synchronization.');
for(const token of [
  "const scheduleActivate=()=>queueMicrotask(activate)",
  "startButton.addEventListener('click',scheduleActivate)",
  "document.addEventListener('pointerup'",
  "if(control.textContent!==label)control.textContent=label",
  "requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))" ,
  '[data-visual-outcome-action]'
]) if(!visualNav.includes(token)) throw new Error(`Visual event-driven navigation guard is missing ${token}.`);
for(const token of ["if(workspace.classList.contains('visual-modal-active'))workspace.classList.remove('visual-modal-active')","if(!workspace.classList.contains('visual-modal-active'))workspace.classList.add('visual-modal-active')"]){
  if(!visualNav.includes(token)) throw new Error(`Visual modal class mutation guard is missing ${token}.`);
}

// Answer selection now confirms submission instead of exposing a second Check Answer control.
for(const token of [
  'Are you sure?',
  'Submit answer',
  'Change answer',
  'data-visual-confirm-submit',
  'data-visual-confirm-cancel',
  "existing('[data-visual-check]')",
  'Answer selected — confirm submission',
  'Choose an answer to submit',
  'visual-item-status',
  'Epoch navigator',
  'Choose the next epoch',
  'Completed epochs are green',
  'Tap any epoch tab to open it',
  'next-step',
  'needs-review'
]) if(!visualConfirm.includes(token)) throw new Error(`Visual confirmation / epoch guidance is missing ${token}.`);
for(const token of [
  '[data-visual-modal-action="check"]{display:none!important}',
  '.visual-submit-backdrop',
  '.visual-submit-dialog',
  '.visual-item-status',
  '.visual-epoch-button.complete:not(.needs-review)',
  'content:"✓"',
  '.visual-epoch-button.next-step',
  'content:"Next"'
]) if(!visualConfirmCss.includes(token)) throw new Error(`Visual confirmation / epoch styling is missing ${token}.`);

// Mastery-gated answer flow: first response is preserved for scoring, while incorrect items reopen until corrected.
for(const token of [
  'firstAnswers:{}',
  'retryRequired:null',
  'outcome:null',
  'Correct',
  'Incorrect',
  'Proceed to next',
  'Review this question / epoch again',
  'Review and try again',
  'Ask for a hint',
  'There is no Next option yet',
  'A correct response is required before you can proceed.',
  'data-visual-outcome-action="next"',
  'data-visual-outcome-action="retry"',
  'data-visual-outcome-action="hint"',
  'state.firstAnswers[key]==null',
  'state.locked.delete(key)',
  'delete state.answers[key]',
  'if(!allLocked()||state.retryRequired)return',
  'const scoreAnswers={...state.firstAnswers}',
  'First-pass score'
]) if(!labVisual.includes(token)) throw new Error(`Visual mastery-gated outcome flow is missing ${token}.`);
if(!labVisual.includes("state.retryRequired=grade.correct?null:key")) throw new Error('Incorrect answers must block progression until corrected.');
if(!labVisual.includes("if(state.retryRequired&&state.retryRequired===currentQuestionKey())return")) throw new Error('Epoch/question navigation must be blocked while the current item requires correction.');

for(const token of ['role="dialog"','aria-modal="true"','data-previous-question','data-next-question','practice-modal-footer']) if(!practiceHtml.includes(token)) throw new Error(`Practice modal contract is missing ${token}.`);
for(const token of ['role="dialog"','aria-modal="true"','data-previous-question','data-review-forward','data-review-close','practice-modal-footer','assets/practice-navigation.css']) if(!reviewHtml.includes(token)) throw new Error(`Review modal contract is missing ${token}.`);
for(const token of ['selections:new Map()','responses:new Map()','function previousQuestion()','function forward()','"Check answer"','"Next question"','renderFeedback(question,response)','practice-answer-review']) if(!reviewJs.includes(token)) throw new Error(`Review navigation state is missing ${token}.`);
for(const forbidden of ['Mapped source keys','referenceKeys']) if(reviewJs.includes(forbidden)||reviewHtml.includes(forbidden)) throw new Error(`Learner-facing Review must not expose ${forbidden}.`);
if(!reviewJs.includes('state.responses.has(key)')) throw new Error('Review must preserve answered state when navigating backward.');

console.log('Visual and regular-question modal UX passed: near-full-screen Visual viewer, phone landscape guidance, full-epoch toggle, event-driven freeze protection, tap-to-confirm answer submission, green completed epoch tabs with next-step guidance, correct/incorrect mastery-gated outcomes, first-pass score preservation, Practice modal continuity, Review backward navigation, and learner-safe feedback are present.');
