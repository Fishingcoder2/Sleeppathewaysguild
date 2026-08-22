(function(){
'use strict';

const workspace=document.querySelector('[data-artifact-workspace]');
if(!workspace)return;

let phoneQuestionMode='split';
let desktopPsgOnly=false;
const scrollMemory=new Map();
const landscapePhone=()=>window.matchMedia&&window.matchMedia('(max-width:900px) and (orientation:landscape)').matches;
const desktopWorkstation=()=>window.matchMedia&&window.matchMedia('(min-width:901px)').matches;
const fullscreenSupported=()=>Boolean(workspace.requestFullscreen||workspace.webkitRequestFullscreen);
const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;

function currentCaseKey(){
  const current=workspace.querySelector('[data-artifact-case].current,[data-artifact-case][aria-current="true"]');
  return current?String(current.dataset.artifactCase||''):'';
}

function rememberViewerScroll(){
  const scroll=workspace.querySelector('.artifact-scroll');
  const key=currentCaseKey();
  if(!scroll||!key)return;
  scrollMemory.set(key,{left:scroll.scrollLeft,top:scroll.scrollTop});
}

function restoreViewerScroll(){
  const scroll=workspace.querySelector('.artifact-scroll');
  const key=currentCaseKey();
  const saved=key&&scrollMemory.get(key);
  if(!scroll||!saved)return;
  requestAnimationFrame(()=>{
    scroll.scrollLeft=saved.left;
    scroll.scrollTop=saved.top;
  });
}

function setSplitView(enabled){
  const allow=Boolean(enabled&&landscapePhone());
  workspace.classList.toggle('artifact-split-view',allow);
  if(!allow&&enabled)phoneQuestionMode='full';
  syncControls();
}

async function toggleFullscreen(){
  try{
    if(fullscreenElement()){
      const exit=document.exitFullscreen||document.webkitExitFullscreen;
      if(exit)await exit.call(document);
      return;
    }
    const request=workspace.requestFullscreen||workspace.webkitRequestFullscreen;
    if(!request)return;
    const result=request.call(workspace,{navigationUI:'hide'});
    if(result&&typeof result.then==='function')await result;
  }catch(_error){
    workspace.classList.add('artifact-fullscreen-unavailable');
    window.setTimeout(()=>workspace.classList.remove('artifact-fullscreen-unavailable'),1600);
  }
}

function controlButton(label,attribute){
  const button=document.createElement('button');
  button.type='button';
  button.className='btn secondary artifact-display-control';
  button.setAttribute(attribute,'');
  button.textContent=label;
  return button;
}

function ensureTeachingDisclosure(){
  const viewer=workspace.querySelector('.artifact-viewer');
  if(!viewer||viewer.querySelector('[data-artifact-ai-disclosure]'))return;
  const note=document.createElement('div');
  note.className='artifact-ai-visual-disclosure';
  note.dataset.artifactAiDisclosure='true';
  note.setAttribute('role','note');
  note.innerHTML='<strong>AI-generated teaching schematic · Not a patient recording</strong><span>Use this visual to practice pattern recognition and troubleshooting. Real PSG tracings vary. For deeper learning, compare with authentic tracings in current sleep-technology textbooks, peer-reviewed educational resources, and official guidance.</span>';
  viewer.appendChild(note);
}

function ensureStatusControls(){
  const panel=workspace.querySelector('.artifact-status-panel');
  if(!panel)return;
  if(fullscreenSupported()&&!panel.querySelector('[data-artifact-fullscreen]')){
    const answer=panel.querySelector('[data-artifact-open-question]');
    panel.insertBefore(controlButton(fullscreenElement()?'Exit full screen':'Full screen','data-artifact-fullscreen'),answer||null);
  }
  const fullButton=panel.querySelector('[data-artifact-fullscreen]');
  if(fullButton)fullButton.textContent=fullscreenElement()?'Exit full screen':'Full screen';

  let desktopToggle=panel.querySelector('[data-artifact-desktop-view-toggle]');
  if(desktopWorkstation()){
    if(!desktopToggle){
      desktopToggle=controlButton('PSG only','data-artifact-desktop-view-toggle');
      panel.appendChild(desktopToggle);
    }
    const questionOpen=Boolean(workspace.querySelector('[data-artifact-question-layer]'));
    desktopToggle.textContent=questionOpen?'PSG only':'Split view';
    const legacyAnswer=panel.querySelector('[data-artifact-open-question]');
    if(legacyAnswer)legacyAnswer.hidden=true;
  }else if(desktopToggle){
    desktopToggle.remove();
    const legacyAnswer=panel.querySelector('[data-artifact-open-question]');
    if(legacyAnswer)legacyAnswer.hidden=false;
  }
}

function ensureQuestionControls(){
  const header=workspace.querySelector('.artifact-question-header');
  if(!header)return;
  let controls=header.querySelector('.artifact-question-view-controls');
  if(!controls){
    controls=document.createElement('div');
    controls.className='artifact-question-view-controls';
    header.appendChild(controls);
  }
  let split=controls.querySelector('[data-artifact-split-toggle]');
  if(!split){
    split=controlButton('Split view','data-artifact-split-toggle');
    controls.appendChild(split);
  }
  split.hidden=!landscapePhone();
  split.textContent=workspace.classList.contains('artifact-split-view')?'Full question':'Split view';
  if(fullscreenSupported()&&!controls.querySelector('[data-artifact-fullscreen]')){
    controls.appendChild(controlButton(fullscreenElement()?'Exit full screen':'Full screen','data-artifact-fullscreen'));
  }
  const fullButton=controls.querySelector('[data-artifact-fullscreen]');
  if(fullButton)fullButton.textContent=fullscreenElement()?'Exit full screen':'Full screen';
}

function decisionNumber(){
  const eyebrow=workspace.querySelector('.artifact-question-header .eyebrow');
  const match=String(eyebrow&&eyebrow.textContent||'').match(/Decision\s+(\d+)/i);
  return match?Number(match[1]):1;
}

function ensureDesktopWorkflowRail(){
  const layer=workspace.querySelector('[data-artifact-question-layer]');
  workspace.classList.toggle('artifact-desktop-workstation',Boolean(desktopWorkstation()&&!workspace.hidden));
  workspace.classList.toggle('artifact-desktop-split',Boolean(desktopWorkstation()&&layer));
  if(!desktopWorkstation()||!layer)return;

  const shell=layer.querySelector('.artifact-question-shell');
  const header=layer.querySelector('.artifact-question-header');
  if(!shell||!header)return;
  shell.setAttribute('role','region');
  shell.removeAttribute('aria-modal');
  layer.setAttribute('aria-label','Artifact troubleshooting task rail');

  let steps=layer.querySelector('[data-artifact-workflow-steps]');
  if(!steps){
    steps=document.createElement('div');
    steps.className='artifact-workflow-steps';
    steps.dataset.artifactWorkflowSteps='true';
    header.insertAdjacentElement('afterend',steps);
  }
  const active=Math.max(1,Math.min(3,decisionNumber()));
  const labels=['Identify artifact','Find the evidence','Choose next response'];
  steps.innerHTML=labels.map((label,index)=>`<span class="${index+1<active?'complete':index+1===active?'current':''}"><small>${index+1}</small><strong>${label}</strong></span>`).join('');

  const review=layer.querySelector('[data-artifact-review-psg]');
  if(review)review.textContent='PSG only';

  const outcome=layer.querySelector('.artifact-outcome-backdrop .artifact-dialog.correct');
  if(outcome&&active===3){
    const eyebrow=outcome.querySelector('.eyebrow');
    const title=outcome.querySelector('h2');
    const copy=outcome.querySelector('p');
    const next=outcome.querySelector('[data-artifact-outcome="next"]');
    if(eyebrow)eyebrow.textContent='Case complete';
    if(title)title.textContent='Troubleshooting sequence complete.';
    if(copy)copy.textContent='You identified the signal problem, selected the strongest supporting evidence, and chose the next technologist response. Review the PSG once more or continue to the next case.';
    if(next&&!/Finish pack/i.test(next.textContent))next.textContent='Continue to next case';
  }
}

function autoOpenDesktopQuestion(){
  if(!desktopWorkstation()||desktopPsgOnly||workspace.hidden||workspace.querySelector('.artifact-result'))return;
  if(workspace.querySelector('[data-artifact-question-layer]'))return;
  const answer=workspace.querySelector('[data-artifact-open-question]');
  if(answer&&!answer.disabled)answer.click();
}

function syncControls(){
  ensureStatusControls();
  ensureQuestionControls();
  ensureTeachingDisclosure();
  ensureDesktopWorkflowRail();
  restoreViewerScroll();
}

function afterArtifactAction(target){
  window.setTimeout(()=>{
    if(target.closest('[data-artifact-open-question]')&&landscapePhone()){
      setSplitView(phoneQuestionMode==='split');
    }
    if(target.closest('[data-artifact-review-psg],[data-artifact-close],[data-artifact-outcome="review"]')){
      if(desktopWorkstation())desktopPsgOnly=true;
      workspace.classList.remove('artifact-split-view');
    }
    if(target.closest('[data-artifact-start],[data-artifact-prev],[data-artifact-case],[data-artifact-outcome="next"],[data-artifact-outcome="retry"],[data-artifact-restart]')){
      if(desktopWorkstation())desktopPsgOnly=false;
      workspace.classList.remove('artifact-split-view');
    }
    syncControls();
    autoOpenDesktopQuestion();
    window.setTimeout(syncControls,0);
  },0);
}

document.addEventListener('click',event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  if(target.closest('[data-artifact-outcome="next"],[data-artifact-outcome="review"],[data-artifact-outcome="retry"],[data-artifact-prev],[data-artifact-case],[data-artifact-review-psg]'))rememberViewerScroll();
},true);

document.addEventListener('click',event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  if(target.closest('[data-artifact-fullscreen]')){
    event.preventDefault();
    toggleFullscreen();
    return;
  }
  if(target.closest('[data-artifact-desktop-view-toggle]')){
    event.preventDefault();
    rememberViewerScroll();
    const layer=workspace.querySelector('[data-artifact-question-layer]');
    if(layer){
      desktopPsgOnly=true;
      const review=layer.querySelector('[data-artifact-review-psg]');
      if(review)review.click();
    }else{
      desktopPsgOnly=false;
      const answer=workspace.querySelector('[data-artifact-open-question]');
      if(answer)answer.click();
    }
    window.setTimeout(syncControls,0);
    return;
  }
  if(target.closest('[data-artifact-split-toggle]')){
    event.preventDefault();
    const enable=!workspace.classList.contains('artifact-split-view');
    phoneQuestionMode=enable?'split':'full';
    setSplitView(enable);
    return;
  }
  if(target.closest('[data-artifact-start],[data-artifact-open-question],[data-artifact-review-psg],[data-artifact-prev],[data-artifact-case],[data-artifact-confirm-submit],[data-artifact-confirm-cancel],[data-artifact-question-hint],[data-artifact-answer],[data-artifact-outcome],[data-artifact-close],[data-artifact-restart]'))afterArtifactAction(target);
});

document.addEventListener('fullscreenchange',syncControls);
document.addEventListener('webkitfullscreenchange',syncControls);
window.addEventListener('orientationchange',()=>window.setTimeout(()=>{
  if(!landscapePhone())workspace.classList.remove('artifact-split-view');
  syncControls();
},260));
window.addEventListener('resize',()=>{
  if(!desktopWorkstation())workspace.classList.remove('artifact-desktop-workstation','artifact-desktop-split');
  syncControls();
},{passive:true});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.setTimeout(()=>{syncControls();autoOpenDesktopQuestion();},0));
else window.setTimeout(()=>{syncControls();autoOpenDesktopQuestion();},0);

})();