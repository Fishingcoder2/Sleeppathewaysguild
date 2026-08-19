(function(){
'use strict';

function surfaceFor(control){
  const selector=control.getAttribute('data-spg-fullscreen-target');
  if(selector){
    try{return document.querySelector(selector);}catch(error){return null;}
  }
  return control.closest('[data-spg-visual-surface],.spg-visual-surface');
}

function fullscreenElement(){
  return document.fullscreenElement||document.webkitFullscreenElement||null;
}

function fullscreenSupported(){
  const root=document.documentElement;
  return Boolean(root&&(root.requestFullscreen||root.webkitRequestFullscreen));
}

async function exitFullscreen(){
  const exit=document.exitFullscreen||document.webkitExitFullscreen;
  if(typeof exit!=='function')return;
  try{
    const result=exit.call(document);
    if(result&&typeof result.then==='function')await result;
  }catch(error){
    /* A browser/custom tab may decline the exit request. */
  }
}

async function requestFullscreen(surface){
  if(!surface||!fullscreenSupported())return;
  try{
    const active=fullscreenElement();
    if(active===surface){await exitFullscreen();return;}
    if(active)await exitFullscreen();
    const request=surface.requestFullscreen||surface.webkitRequestFullscreen;
    if(typeof request!=='function')return;
    const result=surface.requestFullscreen
      ?surface.requestFullscreen({navigationUI:'hide'})
      :request.call(surface);
    if(result&&typeof result.then==='function')await result;
  }catch(error){
    /* Browser chrome may refuse fullscreen in embedded/custom-tab contexts. The visual remains usable without it. */
  }
}

function syncFullscreenControls(){
  const supported=fullscreenSupported();
  const selector='[data-spg-request-fullscreen],[data-scoring-stage-fullscreen],[data-scoring-event-fullscreen],[data-scoring-context-fullscreen],[data-scoring-multi-fullscreen],[data-scoring-boundary-fullscreen]';
  document.querySelectorAll(selector).forEach(control=>{
    control.hidden=!supported;
    if(!supported)return;
    const surface=surfaceFor(control);
    const active=Boolean(surface&&fullscreenElement()===surface);
    control.textContent=active?'Exit full screen':'Full screen';
    control.setAttribute('aria-pressed',active?'true':'false');
    control.setAttribute('aria-label',active?'Exit full screen':'Enter full screen');
  });
}

function teachingDisclosure(){
  const note=document.createElement('div');
  note.className='spg-ai-visual-disclosure';
  note.dataset.spgAiVisualDisclosure='true';
  note.setAttribute('role','note');
  note.innerHTML='<strong>AI-generated teaching schematic · Not a patient recording</strong><span>Use this visual to practice pattern recognition. Real PSG tracings vary. For deeper learning, compare with authentic tracings in current sleep-technology textbooks, peer-reviewed educational resources, and official guidance.</span>';
  return note;
}

function syncTeachingDisclosures(){
  const targets=[...document.querySelectorAll('.visual-viewer,.spg-trace-fullscreen-frame,.artifact-viewer')];
  targets.forEach(target=>{
    if(target.querySelector(':scope > [data-spg-ai-visual-disclosure]'))return;
    const hasVisual=Boolean(target.querySelector('canvas,svg,.respiratory-trace,.respiratory-timeline-trace'));
    if(!hasVisual)return;
    target.appendChild(teachingDisclosure());
  });
}

function loadRespiratoryStudyGuide(){
  if(!document.querySelector('[data-respiratory-stations]')||document.querySelector('script[data-respiratory-study-guide-loader]'))return;
  const script=document.createElement('script');
  script.src='core/respiratory-study-guide.js';
  script.defer=true;
  script.dataset.respiratoryStudyGuideLoader='true';
  document.body.appendChild(script);
}

function syncAll(){
  syncFullscreenControls();
  syncTeachingDisclosures();
  loadRespiratoryStudyGuide();
}

const scheduleSync=()=>setTimeout(syncAll,0);

document.addEventListener('click',event=>{
  const control=event.target.closest('[data-spg-request-fullscreen]');
  if(control){
    event.preventDefault();
    requestFullscreen(surfaceFor(control));
  }
  scheduleSync();
});

document.addEventListener('pointerup',scheduleSync);
document.addEventListener('fullscreenchange',syncAll);
document.addEventListener('webkitfullscreenchange',syncAll);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncAll);else syncAll();

const api={requestFullscreen,syncFullscreenControls,syncTeachingDisclosures,fullscreenSupported,fullscreenElement};
window.SPGVisualDisplay=api;
window.SPGSharedVisualDisplay=api;
})();
