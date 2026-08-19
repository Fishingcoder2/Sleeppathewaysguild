(function(){
'use strict';

const visualWorkspace=document.querySelector('[data-respiratory-visual-workspace]');
const patternHost=document.querySelector('[data-respiratory-patterns]');
const patternDetail=document.querySelector('[data-respiratory-pattern-detail]');
const timelineHost=document.querySelector('[data-respiratory-timeline-workspace]');
const patternEngine=window.RPSGTRespiratoryLabEngine;
const timelineEngine=window.RPSGTRespiratoryTimelineEngine;
if(!visualWorkspace)return;
let hintOpen=false;
let suppressWalkthroughOpen=false;
let lastWalkthroughLauncher=null;
const walkthrough={kind:null,primaryId:null,compareId:null,compareMode:false};

const later=fn=>setTimeout(fn,0);
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

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
  ensureTraceFrame(timelineHost,'.respiratory-timeline-trace');
  ensureTraceFrame(patternDetail,'.respiratory-trace');
  ensureTraceFrame(visualWorkspace,'.respiratory-trace');
}

function walkthroughItems(kind){
  if(kind==='timeline')return Array.isArray(timelineEngine?.LONG_CASES)?timelineEngine.LONG_CASES:[];
  return Array.isArray(patternEngine?.PATTERNS)?patternEngine.PATTERNS:[];
}

function currentSourceId(kind){
  if(kind==='timeline')return timelineHost?.querySelector('[data-resp-long-case].active')?.dataset.respLongCase||null;
  return patternHost?.querySelector('[data-respiratory-pattern].active')?.dataset.respiratoryPattern||null;
}

function sourceButton(kind,id){
  const selector=kind==='timeline'?'[data-resp-long-case]':'[data-respiratory-pattern]';
  const key=kind==='timeline'?'respLongCase':'respiratoryPattern';
  const root=kind==='timeline'?timelineHost:patternHost;
  return [...(root?.querySelectorAll(selector)||[])].find(button=>button.dataset[key]===String(id))||null;
}

function activateSource(kind,id){
  const button=sourceButton(kind,id);
  if(!button)return false;
  suppressWalkthroughOpen=true;
  button.click();
  suppressWalkthroughOpen=false;
  ensureEmbeddedTraceControls();
  return true;
}

function currentVisualHtml(kind){
  ensureEmbeddedTraceControls();
  const source=kind==='timeline'?timelineHost?.querySelector('.resp-timeline-panel'):patternDetail;
  if(!source)return '';
  const frame=source.querySelector('.spg-trace-fullscreen-frame');
  if(frame)return frame.outerHTML;
  const trace=source.querySelector(kind==='timeline'?'.respiratory-timeline-trace':'.respiratory-trace');
  return trace?`<div class="spg-trace-fullscreen-frame" data-spg-visual-surface>${trace.outerHTML}${makeTraceFullscreenButton().outerHTML}</div>`:'';
}

function visualHtmlFor(kind,id){
  const before=currentSourceId(kind);
  if(before!==id)activateSource(kind,id);
  const html=currentVisualHtml(kind);
  if(before&&before!==id)activateSource(kind,before);
  return html;
}

function itemById(kind,id){return walkthroughItems(kind).find(item=>item.id===String(id))||walkthroughItems(kind)[0]||null;}
function itemIndex(kind,id){return walkthroughItems(kind).findIndex(item=>item.id===String(id));}

function chooseCompareId(kind,primaryId,preferred){
  const items=walkthroughItems(kind);
  if(preferred&&preferred!==primaryId&&items.some(item=>item.id===preferred))return preferred;
  const index=Math.max(0,itemIndex(kind,primaryId));
  return items.find((item,itemIndexValue)=>item.id!==primaryId&&itemIndexValue>index)?.id||items.find(item=>item.id!==primaryId)?.id||null;
}

function paneHtml(kind,id){
  const item=itemById(kind,id);
  if(!item)return '<div class="notice error">This teaching visual is unavailable.</div>';
  const visual=visualHtmlFor(kind,id);
  const label=kind==='timeline'?'5-minute pattern':'Respiratory pattern';
  return `<article class="respiratory-walkthrough-pane"><div class="respiratory-walkthrough-definition"><span class="status gold">${label}</span><h3>${esc(item.title)}</h3><div class="respiratory-walkthrough-definition-row"><div><strong>Definition & key relationship</strong><p>${esc(item.cue||'')}</p></div><div><strong>What to notice</strong><p>${esc(item.teaching||'')}</p></div></div></div><div class="respiratory-walkthrough-visual">${visual}</div></article>`;
}

function ensureWalkthroughRoot(){
  let root=document.querySelector('[data-respiratory-pattern-walkthrough]');
  if(root)return root;
  root=document.createElement('div');
  root.className='respiratory-walkthrough-backdrop';
  root.dataset.respiratoryPatternWalkthrough='true';
  root.hidden=true;
  document.body.appendChild(root);
  return root;
}

function renderWalkthrough(){
  if(!walkthrough.kind||!walkthrough.primaryId)return;
  const root=ensureWalkthroughRoot();
  const items=walkthroughItems(walkthrough.kind);
  const current=itemById(walkthrough.kind,walkthrough.primaryId);
  if(!current)return;
  const index=Math.max(0,itemIndex(walkthrough.kind,walkthrough.primaryId));
  walkthrough.compareId=chooseCompareId(walkthrough.kind,walkthrough.primaryId,walkthrough.compareId);
  const tabs=items.map((item,itemIndexValue)=>`<button class="respiratory-walkthrough-tab ${item.id===walkthrough.primaryId?'active':''}" type="button" data-respiratory-walkthrough-tab="${esc(item.id)}" aria-current="${item.id===walkthrough.primaryId?'true':'false'}"><span>${itemIndexValue+1}</span>${esc(item.title)}</button>`).join('');
  const compareOptions=items.filter(item=>item.id!==walkthrough.primaryId).map(item=>`<option value="${esc(item.id)}" ${item.id===walkthrough.compareId?'selected':''}>${esc(item.title)}</option>`).join('');
  const body=walkthrough.compareMode&&walkthrough.compareId
    ?`<div class="respiratory-walkthrough-compare-grid">${paneHtml(walkthrough.kind,walkthrough.primaryId)}${paneHtml(walkthrough.kind,walkthrough.compareId)}</div>`
    :paneHtml(walkthrough.kind,walkthrough.primaryId);
  root.innerHTML=`<section class="respiratory-walkthrough-modal" role="dialog" aria-modal="true" aria-labelledby="respiratory-walkthrough-title"><header class="respiratory-walkthrough-head"><div><span class="eyebrow">Guided respiratory visual walkthrough</span><h2 id="respiratory-walkthrough-title">${esc(current.title)}</h2></div><div class="respiratory-walkthrough-head-actions"><span class="status">${index+1} of ${items.length}</span><button class="visual-modal-close" type="button" data-respiratory-walkthrough-close aria-label="Close respiratory walkthrough">×</button></div></header><nav class="respiratory-walkthrough-tabs" aria-label="Respiratory visual choices">${tabs}</nav><div class="respiratory-walkthrough-tools"><button class="btn secondary" type="button" data-respiratory-walkthrough-compare>${walkthrough.compareMode?'Single view':'Compare side by side'}</button>${walkthrough.compareMode?`<label>Compare with <select data-respiratory-walkthrough-compare-select>${compareOptions}</select></label>`:''}<span>Choose any pattern above, or move through them with Previous and Next.</span></div><div class="respiratory-walkthrough-main">${body}</div><footer class="respiratory-walkthrough-footer"><button class="btn secondary" type="button" data-respiratory-walkthrough-prev ${index<=0?'disabled':''}>← Previous</button><button class="btn secondary" type="button" data-respiratory-walkthrough-compare>${walkthrough.compareMode?'Single view':'Compare side by side'}</button><button class="btn primary" type="button" data-respiratory-walkthrough-next ${index>=items.length-1?'disabled':''}>Next →</button></footer></section>`;
  root.hidden=false;
  document.body.classList.add('respiratory-walkthrough-open');
  window.SPGVisualDisplay?.syncFullscreenControls();
  requestAnimationFrame(()=>root.querySelector('.respiratory-walkthrough-tab.active')?.scrollIntoView({block:'nearest',inline:'center'}));
}

function openWalkthrough(kind,id,launcher){
  if(!id)return;
  lastWalkthroughLauncher=launcher||document.activeElement;
  walkthrough.kind=kind;
  walkthrough.primaryId=id;
  walkthrough.compareId=chooseCompareId(kind,id,null);
  walkthrough.compareMode=false;
  renderWalkthrough();
  requestAnimationFrame(()=>document.querySelector('[data-respiratory-pattern-walkthrough] [data-respiratory-walkthrough-close]')?.focus());
}

function closeWalkthrough(){
  const root=document.querySelector('[data-respiratory-pattern-walkthrough]');
  if(root)root.hidden=true;
  document.body.classList.remove('respiratory-walkthrough-open');
  if(lastWalkthroughLauncher&&typeof lastWalkthroughLauncher.focus==='function')requestAnimationFrame(()=>lastWalkthroughLauncher.focus());
}

function moveWalkthrough(direction){
  const items=walkthroughItems(walkthrough.kind);
  const index=itemIndex(walkthrough.kind,walkthrough.primaryId);
  const next=items[index+direction];
  if(!next)return;
  walkthrough.primaryId=next.id;
  walkthrough.compareId=chooseCompareId(walkthrough.kind,next.id,walkthrough.compareId);
  activateSource(walkthrough.kind,next.id);
  renderWalkthrough();
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

patternHost?.addEventListener('click',event=>{
  const button=event.target.closest('[data-respiratory-pattern]');
  if(!button||suppressWalkthroughOpen)return;
  later(()=>openWalkthrough('pattern',button.dataset.respiratoryPattern,button));
});

timelineHost?.addEventListener('click',event=>{
  const button=event.target.closest('[data-resp-long-case]');
  if(!button||suppressWalkthroughOpen)return;
  later(()=>openWalkthrough('timeline',button.dataset.respLongCase,button));
});

document.addEventListener('change',event=>{
  const select=event.target.closest('[data-respiratory-walkthrough-compare-select]');
  if(!select)return;
  walkthrough.compareId=select.value;
  renderWalkthrough();
});

document.addEventListener('click',event=>{
  const patternLaunch=event.target.closest('a[href="#pattern-lab"]');
  if(patternLaunch&&patternHost){
    event.preventDefault();
    const id=currentSourceId('pattern')||walkthroughItems('pattern')[0]?.id;
    openWalkthrough('pattern',id,patternLaunch);
    return;
  }
  const tab=event.target.closest('[data-respiratory-walkthrough-tab]');
  if(tab){
    walkthrough.primaryId=tab.dataset.respiratoryWalkthroughTab;
    walkthrough.compareId=chooseCompareId(walkthrough.kind,walkthrough.primaryId,walkthrough.compareId);
    activateSource(walkthrough.kind,walkthrough.primaryId);
    renderWalkthrough();
    return;
  }
  if(event.target.closest('[data-respiratory-walkthrough-close]')){closeWalkthrough();return;}
  if(event.target.closest('[data-respiratory-walkthrough-prev]')){moveWalkthrough(-1);return;}
  if(event.target.closest('[data-respiratory-walkthrough-next]')){moveWalkthrough(1);return;}
  if(event.target.closest('[data-respiratory-walkthrough-compare]')){
    walkthrough.compareMode=!walkthrough.compareMode;
    walkthrough.compareId=chooseCompareId(walkthrough.kind,walkthrough.primaryId,walkthrough.compareId);
    renderWalkthrough();
    return;
  }

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
  if(event.key!=='Escape')return;
  const walkthroughRoot=document.querySelector('[data-respiratory-pattern-walkthrough]');
  if(walkthroughRoot&&!walkthroughRoot.hidden){event.stopImmediatePropagation();closeWalkthrough();return;}
  if(visualWorkspace.hidden)return;
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
