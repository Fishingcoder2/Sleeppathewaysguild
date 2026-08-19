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

document.addEventListener('click',event=>{
  const control=event.target.closest('[data-spg-request-fullscreen]');
  if(!control)return;
  event.preventDefault();
  requestFullscreen(surfaceFor(control));
});

document.addEventListener('fullscreenchange',syncFullscreenControls);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncFullscreenControls);else syncFullscreenControls();

window.SPGVisualDisplay={syncFullscreenControls,fullscreenSupported};
})();