(function(){
'use strict';

function surfaceFor(control){
  const selector=control.getAttribute('data-spg-fullscreen-target');
  if(selector){
    try{return document.querySelector(selector);}catch(error){return null;}
  }
  return control.closest('[data-spg-visual-surface]');
}

function fullscreenSupported(){
  return Boolean(document.fullscreenEnabled&&document.documentElement.requestFullscreen);
}

async function requestFullscreen(surface){
  if(!surface||!fullscreenSupported())return;
  try{
    if(document.fullscreenElement===surface){await document.exitFullscreen();return;}
    if(document.fullscreenElement)await document.exitFullscreen();
    await surface.requestFullscreen({navigationUI:'hide'});
  }catch(error){
    /* Browser chrome may refuse fullscreen in embedded/custom-tab contexts. The visual remains usable without it. */
  }
}

function syncFullscreenControls(){
  const supported=fullscreenSupported();
  document.querySelectorAll('[data-spg-request-fullscreen]').forEach(control=>{
    control.hidden=!supported;
    if(!supported)return;
    const surface=surfaceFor(control);
    const active=Boolean(surface&&document.fullscreenElement===surface);
    control.textContent=active?'Exit full screen':'Full screen';
    control.setAttribute('aria-pressed',active?'true':'false');
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
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncAll);else syncAll();

window.SPGVisualDisplay={syncFullscreenControls,syncTeachingDisclosures,fullscreenSupported};
})();