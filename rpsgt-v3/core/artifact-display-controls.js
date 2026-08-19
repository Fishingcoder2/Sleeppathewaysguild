(function(){
'use strict';

const workspace=document.querySelector('[data-artifact-workspace]');
if(!workspace)return;

let phoneQuestionMode='split';
const landscapePhone=()=>window.matchMedia&&window.matchMedia('(max-width:900px) and (orientation:landscape)').matches;
const fullscreenSupported=()=>Boolean(workspace.requestFullscreen||workspace.webkitRequestFullscreen);
const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;

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

function syncControls(){
  ensureStatusControls();
  ensureQuestionControls();
  ensureTeachingDisclosure();
}

function afterArtifactAction(target){
  window.setTimeout(()=>{
    if(target.closest('[data-artifact-open-question]')&&landscapePhone()){
      setSplitView(phoneQuestionMode==='split');
    }
    if(target.closest('[data-artifact-review-psg],[data-artifact-prev],[data-artifact-case],[data-artifact-close],[data-artifact-outcome="next"],[data-artifact-outcome="review"],[data-artifact-outcome="retry"],[data-artifact-restart]')){
      workspace.classList.remove('artifact-split-view');
    }
    syncControls();
  },0);
}

document.addEventListener('click',event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  if(target.closest('[data-artifact-fullscreen]')){
    event.preventDefault();
    toggleFullscreen();
    return;
  }
  if(target.closest('[data-artifact-split-toggle]')){
    event.preventDefault();
    const enable=!workspace.classList.contains('artifact-split-view');
    phoneQuestionMode=enable?'split':'full';
    setSplitView(enable);
    return;
  }
  if(target.closest('[data-artifact-start],[data-artifact-open-question],[data-artifact-review-psg],[data-artifact-prev],[data-artifact-case],[data-artifact-confirm-submit],[data-artifact-confirm-cancel],[data-artifact-question-hint],[data-artifact-outcome],[data-artifact-close],[data-artifact-restart]'))afterArtifactAction(target);
});

document.addEventListener('fullscreenchange',syncControls);
document.addEventListener('webkitfullscreenchange',syncControls);
window.addEventListener('orientationchange',()=>window.setTimeout(()=>{
  if(!landscapePhone())workspace.classList.remove('artifact-split-view');
  syncControls();
},260));

})();