import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,controller,css,baseController]=await Promise.all([
  readFile(join(root,'lab-scoring.html'),'utf8'),
  readFile(join(root,'core','scoring-checkpoint-modal.js'),'utf8'),
  readFile(join(root,'assets','scoring-checkpoint-modal.css'),'utf8'),
  readFile(join(root,'core','lab-scoring.js'),'utf8')
]);

for(const token of ['data-scoring-start','data-scoring-workspace','core/lab-scoring.js','core/scoring-checkpoint-modal.js']){
  if(!html.includes(token)) throw new Error(`Scoring checkpoint shell is missing ${token}.`);
}
if(html.indexOf('core/scoring-checkpoint-modal.js')<html.indexOf('core/lab-scoring.js')) throw new Error('Focused checkpoint controller must load after the base Scoring controller so capture-phase interception replaces the old long-form session.');

for(const token of [
  "document.addEventListener('click',handleClick,true)",
  "event.target.closest('[data-scoring-start]')",
  'event.stopImmediatePropagation()',
  'currentQuestion()',
  'Question ${state.index+1} of ${state.questions.length}',
  'data-scoring-checkpoint-option',
  'state.answerIndices',
  'data-scoring-checkpoint-go',
  'data-scoring-checkpoint-prev',
  'data-scoring-checkpoint-next',
  "isLast?'Score checkpoint':'Next'",
  'Answers stay hidden until the full checkpoint is scored.',
  'Checkpoint not scored. Answer all ${state.questions.length} questions before submitting.',
  'engine.gradeSession',
  'engine.applySession',
  'Correct answer:',
  'Your answer:',
  'data-scoring-checkpoint-close',
  'data-scoring-checkpoint-continue',
  "document.addEventListener('keydown'",
  "event.key==='Escape'"
]) if(!controller.includes(token)) throw new Error(`Focused checkpoint controller is missing ${token}.`);

if(controller.includes('state.questions.map((question,index)=>`<fieldset')) throw new Error('Focused checkpoint must not render all ten questions as stacked fieldsets.');
if(controller.includes('MutationObserver')) throw new Error('Focused checkpoint must remain event-driven and must not use MutationObserver.');
if(/addEventListener\(\s*['"]resize['"]/.test(controller)) throw new Error('Focused checkpoint must not use a continuous resize listener.');
if(/<iframe|createElement\(\s*['"]iframe['"]/.test(controller)) throw new Error('Focused checkpoint must not use iframe-based presentation.');
if(/localStorage\.(?:setItem|removeItem|clear)/.test(controller)) throw new Error('Focused checkpoint must write only through versioned RPSGT storage.');

for(const token of [
  'body.scoring-checkpoint-modal-open',
  '.scoring-workspace.scoring-checkpoint-modal-active{position:fixed',
  'height:92dvh',
  '.scoring-checkpoint-close',
  '.scoring-checkpoint-nav.current',
  '.scoring-checkpoint-nav.complete',
  '.scoring-checkpoint-body{flex:1 1 auto;min-height:0;overflow-y:auto',
  '.scoring-checkpoint-choice.selected',
  '.scoring-checkpoint-footer',
  '.scoring-checkpoint-actions{display:grid',
  '@media(max-width:800px)',
  'height:100dvh',
  'env(safe-area-inset-bottom)',
  '.scoring-checkpoint-result-scroll'
]) if(!css.includes(token)) throw new Error(`Focused checkpoint CSS is missing ${token}.`);

for(const legacySafety of ['gradeSession','applySession','data-option-index','question.options[optionIndex]']){
  if(!baseController.includes(legacySafety)) throw new Error(`Base checkpoint safety contract changed unexpectedly: ${legacySafety}.`);
}

console.log('Scoring checkpoint modal passed: one question at a time, 1–10 navigator, Previous/Next, preserved selections, no correctness reveal until final scoring, final answer review, mobile full-viewport popout, close/escape behavior, and versioned persistence are present without stacked ten-question rendering.');
