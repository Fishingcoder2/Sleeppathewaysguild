(function(){
'use strict';
const STAGE_ORDER=['W','N1','N2','N3','R'];
const workspace=document.querySelector('[data-scoring-stage-workspace]');
let originalRandom=null;
let modalWasOpen=false;
function ensureModalStyles(){
  if(document.querySelector('link[data-scoring-stage-modal-style]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='assets/scoring-stage-modal.css';
  link.dataset.scoringStageModalStyle='';
  document.head.appendChild(link);
}
function preservePackOrderForStageStart(event){
  if(!event.target.closest('[data-scoring-stage-start]')||originalRandom)return;
  originalRandom=Math.random;
  Math.random=()=>0.999999999;
  queueMicrotask(()=>{
    if(originalRandom){Math.random=originalRandom;originalRandom=null;}
  });
}
function decorateStageModal(){
  if(!workspace)return;
  const open=!workspace.hidden&&Boolean(workspace.innerHTML.trim());
  if(!open){
    document.body.classList.remove('scoring-stage-modal-open');
    workspace.classList.remove('stage-modal-active');
    workspace.removeAttribute('role');
    workspace.removeAttribute('aria-modal');
    modalWasOpen=false;
    return;
  }
  document.body.classList.add('scoring-stage-modal-open');
  workspace.classList.add('stage-modal-active');
  workspace.setAttribute('role','dialog');
  workspace.setAttribute('aria-modal','true');
  workspace.setAttribute('aria-label','Sleep staging skill');
  if(!workspace.querySelector('.scoring-stage-rotate-prompt')){
    workspace.insertAdjacentHTML('afterbegin','<div class="scoring-stage-rotate-prompt" role="status"><div class="scoring-stage-rotate-icon" aria-hidden="true">↻</div><strong>Rotate your phone sideways</strong><span>This staging view uses landscape mode so the 30-second epoch and stage choices can fit together on screen.</span></div>');
  }
  if(!workspace.querySelector('[data-scoring-stage-modal-close]')){
    workspace.insertAdjacentHTML('beforeend','<button class="scoring-stage-modal-close" type="button" data-scoring-stage-modal-close aria-label="Close staging skill">×</button>');
  }
  if(!modalWasOpen){
    modalWasOpen=true;
    requestAnimationFrame(()=>workspace.querySelector('[data-scoring-stage-modal-close]')?.focus({preventScroll:true}));
  }
}
function closeStageModal(){
  if(!workspace)return;
  workspace.hidden=true;
  decorateStageModal();
}
ensureModalStyles();
document.addEventListener('click',preservePackOrderForStageStart,true);
document.addEventListener('click',event=>{
  if(event.target.closest('[data-scoring-stage-modal-close]')){closeStageModal();}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&workspace&&!workspace.hidden)closeStageModal();
});
if(workspace){
  const observer=new MutationObserver(()=>queueMicrotask(decorateStageModal));
  observer.observe(workspace,{childList:true,subtree:false,attributes:true,attributeFilter:['hidden']});
  decorateStageModal();
}
window.RPSGTScoringStageOrder={STAGE_ORDER:STAGE_ORDER.slice()};
})();
