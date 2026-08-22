(function(){
'use strict';

const workspace=document.querySelector('[data-visual-workspace]');
if(!workspace)return;

const isDesktop=()=>window.matchMedia&&window.matchMedia('(min-width:901px)').matches;
const hasSelection=()=>Boolean(workspace.querySelector('.visual-choice.selected,.visual-region-button.selected,.visual-point-marker.selected,.visual-interval-selection'));
const epochButtons=()=>[...workspace.querySelectorAll('[data-visual-epoch]')];

function currentEpochIndex(){
  return epochButtons().findIndex(button=>button.classList.contains('current')||button.getAttribute('aria-current')==='true');
}

function currentEpochComplete(){
  const index=currentEpochIndex();
  const button=epochButtons()[index];
  return Boolean(button&&button.classList.contains('complete')&&!button.classList.contains('needs-review'));
}

function removeInlineSubmit(){
  workspace.querySelectorAll('[data-visual-desktop-inline-submit]').forEach(node=>node.remove());
}

function restoreOutcomePlacement(){
  const outcome=workspace.querySelector('.visual-outcome-backdrop[data-visual-desktop-inline-outcome]');
  if(!outcome)return;
  outcome.removeAttribute('data-visual-desktop-inline-outcome');
  outcome.classList.remove('visual-desktop-inline-outcome');
  workspace.appendChild(outcome);
}

function syncInlineSubmit(){
  if(!isDesktop()||workspace.hidden||workspace.querySelector('.visual-result')){
    removeInlineSubmit();
    if(!isDesktop())restoreOutcomePlacement();
    return;
  }
  const card=workspace.querySelector('.visual-question-card');
  const check=workspace.querySelector('[data-visual-check]');
  const outcome=workspace.querySelector('.visual-outcome-backdrop');
  if(!card||outcome||!check){
    removeInlineSubmit();
    return;
  }
  let host=card.querySelector('[data-visual-desktop-inline-submit]');
  if(!host){
    host=document.createElement('div');
    host.className='visual-desktop-inline-submit';
    host.dataset.visualDesktopInlineSubmit='true';
    host.setAttribute('role','group');
    host.setAttribute('aria-label','Current visual question navigation');
    card.appendChild(host);
  }
  const selected=hasSelection();
  const canPrevious=Boolean(workspace.querySelector('[data-visual-prev]'));
  host.innerHTML=`<div class="visual-desktop-inline-submit-copy"><strong>${selected?'Ready to submit':'Complete this item'}</strong><span data-visual-desktop-inline-submit-status>${selected?'Answer selected — ready to submit.':'Select an answer or mark the requested feature first.'}</span></div><div class="visual-desktop-inline-submit-actions"><button class="btn secondary" type="button" data-visual-desktop-action="prev" ${canPrevious?'':'disabled'}>← Previous</button><button class="btn primary" type="button" data-visual-desktop-action="submit" ${selected?'':'disabled'}>Submit answer</button></div>`;
  host.classList.toggle('ready',selected);
}

function simplifyOutcome(){
  if(!isDesktop()||workspace.hidden||workspace.querySelector('.visual-result'))return;
  const card=workspace.querySelector('.visual-question-card');
  const outcome=workspace.querySelector('.visual-outcome-backdrop');
  if(!card||!outcome)return;

  removeInlineSubmit();
  outcome.dataset.visualDesktopInlineOutcome='true';
  outcome.classList.add('visual-desktop-inline-outcome');
  const rail=card.querySelector('[data-visual-workstation-rail]');
  if(outcome.parentElement!==card){
    if(rail)rail.insertAdjacentElement('afterend',outcome);
    else card.prepend(outcome);
  }

  const correct=Boolean(outcome.querySelector('.visual-outcome-dialog.correct'));
  const incorrect=Boolean(outcome.querySelector('.visual-outcome-dialog.incorrect'));
  const next=outcome.querySelector('[data-visual-outcome-action="next"]');
  const retry=outcome.querySelector('[data-visual-outcome-action="retry"]');
  const review=outcome.querySelector('[data-visual-outcome-action="review"]');
  const hint=outcome.querySelector('[data-visual-outcome-action="hint"]');
  const title=outcome.querySelector('.visual-outcome-dialog h2');
  const paragraph=title&&title.nextElementSibling&&title.nextElementSibling.tagName==='P'?title.nextElementSibling:null;

  if(correct){
    workspace.classList.add('visual-desktop-answer-correct');
    workspace.classList.remove('visual-desktop-answer-retry');
    if(title&&!currentEpochComplete())title.textContent='Correct — continue to the next item.';
    if(paragraph&&!currentEpochComplete())paragraph.textContent='Your PSG stays in place. Continue directly to the next visual decision when ready.';
    if(next){
      const original=String(next.textContent||'').trim();
      const index=currentEpochIndex();
      if(/finish/i.test(original))next.textContent='Finish Pack 1';
      else if(currentEpochComplete()&&index>=0&&index<epochButtons().length-1)next.textContent=`Continue to Epoch ${index+2} →`;
      else next.textContent='Next item →';
    }
    if(review)review.hidden=true;
    if(hint)hint.hidden=true;
  }else if(incorrect){
    workspace.classList.add('visual-desktop-answer-retry');
    workspace.classList.remove('visual-desktop-answer-correct');
    if(title)title.textContent='Review this item and try again.';
    if(paragraph)paragraph.textContent='Stay on this same PSG and correct the item before continuing.';
    if(retry)retry.textContent='Try this item again';
    if(review)review.hidden=true;
  }
}

function clearDesktopOutcomeState(){
  if(workspace.querySelector('.visual-outcome-backdrop'))return;
  workspace.classList.remove('visual-desktop-answer-correct','visual-desktop-answer-retry');
}

function syncDesktopFlow(){
  clearDesktopOutcomeState();
  simplifyOutcome();
  syncInlineSubmit();
}

function scheduleSync(){
  queueMicrotask(syncDesktopFlow);
  setTimeout(syncDesktopFlow,0);
  requestAnimationFrame(syncDesktopFlow);
}

document.addEventListener('click',event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  if(target.closest('[data-visual-answer],[data-visual-region],[data-visual-point-surface],[data-visual-check],[data-visual-next],[data-visual-prev],[data-visual-epoch],[data-visual-outcome-action],[data-visual-restart],[data-visual-start],[data-visual-confirm-cancel],[data-visual-confirm-submit],[data-visual-open-question],[data-visual-desktop-action]'))scheduleSync();
});

document.addEventListener('pointerup',event=>{
  const target=event.target;
  if(target instanceof Element&&target.closest('[data-visual-interval-surface]'))scheduleSync();
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleSync);else scheduleSync();
})();
