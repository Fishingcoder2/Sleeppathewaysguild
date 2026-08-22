(function(){
'use strict';

const workspace=document.querySelector('[data-artifact-workspace]');
if(!workspace)return;

const desktop=()=>Boolean(window.matchMedia&&window.matchMedia('(min-width:901px)').matches);
const questionLayer=()=>workspace.querySelector('[data-artifact-question-layer]');
const questionShell=()=>questionLayer()?.querySelector('.artifact-question-shell')||null;

function decisionNumber(){
  const eyebrow=workspace.querySelector('.artifact-question-header .eyebrow');
  const match=String(eyebrow?.textContent||'').match(/Decision\s+(\d+)/i);
  return match?Number(match[1]):1;
}

function ensurePreviousInRail(){
  if(!desktop())return;
  const shell=questionShell();
  const footer=shell?.querySelector('.artifact-question-footer');
  if(!shell||!footer)return;
  let button=footer.querySelector('[data-artifact-flow-prev]');
  const source=workspace.querySelector('.artifact-status-panel [data-artifact-prev]');
  if(!button){
    button=document.createElement('button');
    button.type='button';
    button.className='btn secondary artifact-flow-prev';
    button.dataset.artifactFlowPrev='true';
    button.textContent='← Previous decision';
    footer.prepend(button);
  }
  button.hidden=!source;
  button.disabled=!source;
}

function inlineConfirmation(){
  if(!desktop())return;
  const shell=questionShell();
  const confirmation=questionLayer()?.querySelector('.artifact-confirm-backdrop');
  if(!shell||!confirmation)return;
  workspace.classList.add('artifact-desktop-confirming');
  workspace.classList.remove('artifact-desktop-outcome');
  confirmation.classList.add('artifact-desktop-inline-confirmation');
  confirmation.dataset.artifactDesktopInlineConfirmation='true';
  const dialog=confirmation.querySelector('.artifact-dialog');
  if(dialog)dialog.setAttribute('aria-modal','false');
  const title=confirmation.querySelector('h2');
  const copy=confirmation.querySelector('p');
  if(title)title.textContent='Are you sure?';
  if(copy)copy.textContent='Submit this artifact decision for grading, or change the selected answer before continuing.';
  const footer=shell.querySelector('.artifact-question-footer');
  if(confirmation.parentElement!==shell)shell.insertBefore(confirmation,footer||null);
}

function inlineOutcome(){
  if(!desktop())return;
  const shell=questionShell();
  const outcome=questionLayer()?.querySelector('.artifact-outcome-backdrop');
  if(!shell||!outcome)return;
  workspace.classList.add('artifact-desktop-outcome');
  workspace.classList.remove('artifact-desktop-confirming');
  outcome.classList.add('artifact-desktop-inline-outcome');
  outcome.dataset.artifactDesktopInlineOutcome='true';
  const dialog=outcome.querySelector('.artifact-dialog');
  if(dialog)dialog.setAttribute('aria-modal','false');
  const footer=shell.querySelector('.artifact-question-footer');
  if(outcome.parentElement!==shell)shell.insertBefore(outcome,footer||null);

  const correct=Boolean(outcome.querySelector('.artifact-dialog.correct'));
  const incorrect=Boolean(outcome.querySelector('.artifact-dialog.incorrect'));
  const title=outcome.querySelector('h2');
  const copy=title?.nextElementSibling?.tagName==='P'?title.nextElementSibling:null;
  const next=outcome.querySelector('[data-artifact-outcome="next"]');
  const retry=outcome.querySelector('[data-artifact-outcome="retry"]');
  const review=outcome.querySelector('[data-artifact-outcome="review"]');
  const hint=outcome.querySelector('[data-artifact-outcome="hint"]');

  if(correct){
    workspace.classList.add('artifact-desktop-answer-correct');
    workspace.classList.remove('artifact-desktop-answer-retry');
    const decision=decisionNumber();
    const finishing=Boolean(next&&/finish/i.test(String(next.textContent||'')));
    if(title)title.textContent=decision===3?'Case complete — review the troubleshooting sequence.':'Correct — continue to the next decision.';
    if(copy)copy.textContent=decision===3?'You identified the problem, found the supporting evidence, and chose the response. Continue without leaving the PSG workstation.':'Keep the PSG in view and move directly to the next troubleshooting decision.';
    if(next){
      if(finishing)next.textContent='Finish Artifact Pack';
      else if(decision===3)next.textContent='Continue to next case →';
      else next.textContent='Next decision →';
    }
    if(review)review.hidden=true;
    if(hint)hint.hidden=true;
  }else if(incorrect){
    workspace.classList.add('artifact-desktop-answer-retry');
    workspace.classList.remove('artifact-desktop-answer-correct');
    if(title)title.textContent='Review this decision and try again.';
    if(copy)copy.textContent='Stay on this same PSG and correct the decision before moving forward.';
    if(retry)retry.textContent='Try this decision again';
  }
}

function clearStateClasses(){
  if(questionLayer()?.querySelector('.artifact-confirm-backdrop,.artifact-outcome-backdrop'))return;
  workspace.classList.remove('artifact-desktop-confirming','artifact-desktop-outcome','artifact-desktop-answer-correct','artifact-desktop-answer-retry');
}

function syncFlow(){
  if(!desktop()||workspace.hidden||workspace.querySelector('.artifact-result')){
    workspace.classList.remove('artifact-desktop-confirming','artifact-desktop-outcome','artifact-desktop-answer-correct','artifact-desktop-answer-retry');
    return;
  }
  clearStateClasses();
  ensurePreviousInRail();
  inlineConfirmation();
  inlineOutcome();
}

function scheduleSync(){
  queueMicrotask(syncFlow);
  setTimeout(syncFlow,0);
  requestAnimationFrame(syncFlow);
}

document.addEventListener('click',event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  if(target.closest('[data-artifact-flow-prev]')){
    event.preventDefault();
    workspace.querySelector('.artifact-status-panel [data-artifact-prev]')?.click();
    scheduleSync();
    return;
  }
  if(target.closest('[data-artifact-answer],[data-artifact-confirm-submit],[data-artifact-confirm-cancel],[data-artifact-outcome],[data-artifact-question-hint],[data-artifact-case],[data-artifact-prev],[data-artifact-start],[data-artifact-restart],[data-artifact-desktop-view-toggle],[data-artifact-review-psg]'))scheduleSync();
});

const media=window.matchMedia&&window.matchMedia('(min-width:901px)');
if(media&&typeof media.addEventListener==='function')media.addEventListener('change',scheduleSync);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleSync);else scheduleSync();

})();
