import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [visualHtml,visualNav,visualNavCss,visualFullEpochCss,practiceHtml,reviewHtml,reviewJs]=await Promise.all([
  readFile(join(root,'lab-visual.html'),'utf8'),
  readFile(join(root,'core','visual-navigation.js'),'utf8'),
  readFile(join(root,'assets','visual-navigation.css'),'utf8'),
  readFile(join(root,'assets','visual-full-epoch.css'),'utf8'),
  readFile(join(root,'practice.html'),'utf8'),
  readFile(join(root,'review.html'),'utf8'),
  readFile(join(root,'core','review.js'),'utf8')
]);

for(const token of ['core/visual-navigation.js','assets/visual-navigation.css','assets/visual-full-epoch.css','data-visual-workspace']) if(!visualHtml.includes(token)) throw new Error(`Visual page is missing ${token}.`);
for(const token of ['visual-modal-open','visual-modal-active','visual-modal-footer','Rotate your phone sideways','Previous visual','Previous epoch','Next epoch','Check answer','Next visual','data-visual-modal-close','aria-modal','View full epoch','Back to question','data-visual-full-epoch','visual-epoch-fullscreen']) if(!visualNav.includes(token)) throw new Error(`Visual modal navigation is missing ${token}.`);
for(const token of ['position:fixed','height:95dvh','grid-template-areas:"head head"','"viewer question"','orientation:landscape','height:100dvh','orientation:portrait','.visual-modal-rotate','.visual-modal-footer','.visual-question-actions']) if(!visualNavCss.includes(token)) throw new Error(`Visual modal CSS is missing ${token}.`);
for(const token of ['orientation:landscape','.visual-full-epoch-toggle','.visual-epoch-fullscreen','height:100dvh','grid-template-areas:"viewer"','display:none!important','overflow:auto']) if(!visualFullEpochCss.includes(token)) throw new Error(`Full-epoch mobile viewer CSS is missing ${token}.`);
if(visualNavCss.includes('.visual-flow-nav{display:flex')) throw new Error('Legacy duplicate visual flow navigation must not return.');

// Visual navigation is intentionally event-driven. Continuous DOM observation caused repeated mobile freezes.
if(visualNav.includes('MutationObserver')) throw new Error('Visual modal navigation must remain event-driven; do not restore MutationObserver-based synchronization.');
for(const token of [
  "const scheduleActivate=()=>queueMicrotask(activate)",
  "startButton.addEventListener('click',scheduleActivate)",
  "document.addEventListener('pointerup'",
  "if(control.textContent!==label)control.textContent=label",
  "requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))"
]) if(!visualNav.includes(token)) throw new Error(`Visual event-driven navigation guard is missing ${token}.`);
for(const token of ["if(workspace.classList.contains('visual-modal-active'))workspace.classList.remove('visual-modal-active')","if(!workspace.classList.contains('visual-modal-active'))workspace.classList.add('visual-modal-active')"]){
  if(!visualNav.includes(token)) throw new Error(`Visual modal class mutation guard is missing ${token}.`);
}

for(const token of ['role="dialog"','aria-modal="true"','data-previous-question','data-next-question','practice-modal-footer']) if(!practiceHtml.includes(token)) throw new Error(`Practice modal contract is missing ${token}.`);
for(const token of ['role="dialog"','aria-modal="true"','data-previous-question','data-review-forward','data-review-close','practice-modal-footer','assets/practice-navigation.css']) if(!reviewHtml.includes(token)) throw new Error(`Review modal contract is missing ${token}.`);
for(const token of ['selections:new Map()','responses:new Map()','function previousQuestion()','function forward()','"Check answer"','"Next question"','renderFeedback(question,response)','practice-answer-review']) if(!reviewJs.includes(token)) throw new Error(`Review navigation state is missing ${token}.`);
for(const forbidden of ['Mapped source keys','referenceKeys']) if(reviewJs.includes(forbidden)||reviewHtml.includes(forbidden)) throw new Error(`Learner-facing Review must not expose ${forbidden}.`);
if(!reviewJs.includes('state.responses.has(key)')) throw new Error('Review must preserve answered state when navigating backward.');

console.log('Visual and regular-question modal UX passed: near-full-screen Visual viewer, phone landscape guidance, full-epoch landscape toggle, event-driven freeze protection, one persistent navigation bar, Practice modal continuity, Review backward navigation, single Check/Next action, and learner-safe feedback are present.');
