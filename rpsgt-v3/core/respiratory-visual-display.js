(function(){
'use strict';

const visualWorkspace=document.querySelector('[data-respiratory-visual-workspace]');
if(!visualWorkspace)return;
let hintOpen=false;

const later=fn=>setTimeout(fn,0);

function makeTraceFullscreenButton(){
  const button=document.createElement('button');
  button.type='button';
  button.className='btn secondary spg-trace-fullscreen-button';
  button.dataset.spgRequestFullscreen='true';
  button.textContent='Full screen';
  button.setAttribute('aria-label','View this tracing full screen');
  return button;
}

function ensureTraceFrame(surface,traceSelector){
  if(!surface)return;
  const trace=surface.querySelector(traceSelector);
  if(!trace)return;
  const existingFrame=trace.closest('.spg-trace-fullscreen-frame');
  if(existingFrame){window.SPGVisualDisplay?.syncFullscreenControls();return;}
  const frame=document.createElement('div');
  frame.className='spg-trace-fullscreen-frame';
  frame.dataset.spgVisualSurface='true';
  trace.before(frame);
  frame.appendChild(trace);
  frame.appendChild(makeTraceFullscreenButton());
  window.SPGVisualDisplay?.syncFullscreenControls();
}

function ensureEmbeddedTraceControls(){
  ensureTraceFrame(document.querySelector('[data-respiratory-timeline-workspace]'),'.respiratory-timeline-trace');
  ensureTraceFrame(document.querySelector('[data-respiratory-pattern-detail]'),'.respiratory-trace');
  ensureTraceFrame(visualWorkspace,'.respiratory-trace');
}

function removeConfirmation(){
  visualWorkspace.querySelector('[data-respiratory-visual-confirm]')?.remove();
}

function showConfirmation(){
  if(visualWorkspace.hidden||visualWorkspace.querySelector('[data-respiratory-visual-confirm]'))return;
  const check=visualWorkspace.querySelector('[data-respiratory-visual-check]');
  const selected=visualWorkspace.querySelector('.respiratory-visual-choice.selected');
  if(!check||!selected)return;
  const layer=document.createElement('div');
  layer.className='respiratory-visual-confirm';
  layer.dataset.respiratoryVisualConfirm='true';
  layer.innerHTML='<section class="respiratory-visual-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="respiratory-visual-confirm-title"><div class="eyebrow">Confirm answer</div><h3 id="respiratory-visual-confirm-title">Are you sure?</h3><p>Submit this respiratory pattern for grading? Choose Change answer if you want to compare the tracing again first.</p><div class="respiratory-visual-confirm-actions"><button class="btn primary" type="button" data-respiratory-visual-confirm-submit>Submit answer</button><button class="btn secondary" type="button" data-respiratory-visual-confirm-cancel>Change answer</button></div></section>';
  visualWorkspace.appendChild(layer);
}

function ensureHint(){
  visualWorkspace.querySelector('[data-respiratory-visual-hint]')?.remove();
  if(!hintOpen)return;
  const options=visualWorkspace.querySelector('.respiratory-visual-options');
  if(!options)return;
  const hint=document.createElement('div');
  hint.className='respiratory-visual-hint';
  hint.dataset.respiratoryVisualHint='true';
  hint.innerHTML='<strong>Hint</strong><span>Compare airflow with thoracic and abdominal effort first. Then use the timing of EEG arousal and the SpO₂ trend as supporting context rather than naming the pattern from one channel alone.</span>';
  options.before(hint);
}

function ensureRotate(){
  if(visualWorkspace.querySelector('.respiratory-visual-rotate'))return;
  const rotate=document.createElement('div');
  rotate.className='respiratory-visual-rotate';
  rotate.setAttribute('role','status');
  rotate.innerHTML='<b aria-hidden="true">↻</b><strong>Rotate your phone sideways</strong><span>The respiratory visual challenge uses landscape mode so the tracing and answer choices can stay visible together.</span>';
  visualWorkspace.prepend(rotate);
}

function ensureToolbar(){
  visualWorkspace.querySelector('.respiratory-visual-toolbar')?.remove();
  if(!visualWorkspace.querySelector('.respiratory-visual-case'))return;
  const toolbar=document.createElement('div');
  toolbar.className='respiratory-visual-toolbar';
  const fullQuestion=visualWorkspace.classList.contains('respiratory-full-question');
  toolbar.innerHTML=`<button class="btn secondary" type="button" data-respiratory-visual-layout>${fullQuestion?'Split view':'Full question'}</button><button class="btn secondary" type="button" data-respiratory-visual-hint-toggle>${hintOpen?'Hide hint':'Hint'}</button>`;
  visualWorkspace.prepend(toolbar);
}

function syncChallenge(){
  const active=!visualWorkspace.hidden&&Boolean(visualWorkspace.innerHTML.trim());
  if(!active){
    visualWorkspace.classList.remove('respiratory-visual-modal-active','respiratory-full-question');
    document.body.classList.remove('respiratory-visual-modal-open');
    hintOpen=false;
    return;
  }
  visualWorkspace.classList.add('respiratory-visual-modal-active');
  document.body.classList.add('respiratory-visual-modal-open');
  ensureRotate();
  ensureToolbar();
  ensureHint();
  ensureEmbeddedTraceControls();
}

function resetQuestionTools(){
  hintOpen=false;
  removeConfirmation();
  visualWorkspace.classList.remove('respiratory-full-question');
}

document.addEventListener('click',event=>{
  if(event.target.closest('[data-respiratory-timeline-mode],[data-respiratory-timeline-workspace],[data-respiratory-pattern]'))later(ensureEmbeddedTraceControls);

  if(event.target.closest('[data-respiratory-visual-start]')){
    resetQuestionTools();
    later(syncChallenge);
    return;
  }
  if(event.target.closest('[data-respiratory-visual-answer]')){
    hintOpen=false;
    later(()=>{syncChallenge();showConfirmation();});
    return;
  }
  if(event.target.closest('[data-respiratory-visual-confirm-submit]')){
    const check=visualWorkspace.querySelector('[data-respiratory-visual-check]');
    removeConfirmation();
    if(check)check.click();
    later(syncChallenge);
    return;
  }
  if(event.target.closest('[data-respiratory-visual-confirm-cancel]')){
    removeConfirmation();
    return;
  }
  if(event.target.closest('[data-respiratory-visual-layout]')){
    visualWorkspace.classList.toggle('respiratory-full-question');
    ensureToolbar();
    return;
  }
  if(event.target.closest('[data-respiratory-visual-hint-toggle]')){
    hintOpen=!hintOpen;
    ensureToolbar();
    ensureHint();
    return;
  }
  if(event.target.closest('[data-respiratory-visual-next],[data-respiratory-visual-finish],[data-respiratory-visual-restart]')){
    resetQuestionTools();
    later(syncChallenge);
    return;
  }
  if(event.target.closest('[data-respiratory-visual-close]')){
    resetQuestionTools();
    later(syncChallenge);
  }
});

document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||visualWorkspace.hidden)return;
  const confirm=visualWorkspace.querySelector('[data-respiratory-visual-confirm]');
  if(confirm){confirm.remove();return;}
  if(visualWorkspace.classList.contains('respiratory-full-question')){
    visualWorkspace.classList.remove('respiratory-full-question');
    ensureToolbar();
  }
});

function initialSync(){
  ensureEmbeddedTraceControls();
  syncChallenge();
  setTimeout(ensureEmbeddedTraceControls,300);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialSync);else initialSync();
window.addEventListener('load',()=>later(ensureEmbeddedTraceControls),{once:true});
})();
