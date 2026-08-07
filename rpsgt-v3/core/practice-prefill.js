(function(){
  'use strict';

  const requested=String(new URLSearchParams(location.search).get('task')||'').toUpperCase();
  if(!/^D[1-4][A-C]$/.test(requested)) return;

  const state={applied:false,observer:null};

  function apply(){
    if(state.applied) return true;
    const setup=document.querySelector('[data-practice-setup]');
    const mode=document.querySelector('[data-practice-mode]');
    const domain=document.querySelector('[data-practice-domain]');
    const task=document.querySelector('[data-practice-task]');
    const start=document.querySelector('[data-start-practice]');
    if(!setup||!mode||!domain||!task||!start||setup.classList.contains('hidden')) return false;
    if(![...domain.options].some(option=>option.value===requested.slice(0,2))) return false;

    mode.value='learner';
    mode.dispatchEvent(new Event('change',{bubbles:true}));
    domain.value=requested.slice(0,2);
    domain.dispatchEvent(new Event('change',{bubbles:true}));

    if(![...task.options].some(option=>option.value===requested)) return false;
    task.value=requested;
    task.dispatchEvent(new Event('change',{bubbles:true}));

    let notice=document.querySelector('[data-guided-practice-prefill]');
    if(!notice){
      notice=document.createElement('div');
      notice.className='notice';
      notice.dataset.guidedPracticePrefill='true';
      notice.setAttribute('role','status');
      setup.querySelector('.actions')?.insertAdjacentElement('beforebegin',notice);
    }
    notice.textContent='This learner-practice session is filtered to the Guided Study task you selected.';
    state.applied=true;
    if(state.observer) state.observer.disconnect();
    start.focus({preventScroll:true});
    return true;
  }

  function start(){
    if(apply()) return;
    const root=document.querySelector('[data-practice-setup]')||document.body;
    state.observer=new MutationObserver(apply);
    state.observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
