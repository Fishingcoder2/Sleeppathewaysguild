(function(){
  'use strict';

  const params=new URLSearchParams(location.search);
  const requestedTask=String(params.get('task')||'').toUpperCase();
  const requestedSubject=String(params.get('subject')||'').toLowerCase();
  const autoStart=params.get('start')==='1';
  const validTask=/^D[1-4][A-C]$/.test(requestedTask);
  const subjectEngine=window.RPSGTPracticeSubjects||null;
  const validSubject=Boolean(requestedSubject&&subjectEngine&&subjectEngine.definitions.some(item=>item.id===requestedSubject));
  if(!validTask&&!validSubject) return;

  const state={applied:false,observer:null};

  function apply(){
    if(state.applied) return true;
    const setup=document.querySelector('[data-practice-setup]');
    const mode=document.querySelector('[data-practice-mode]');
    const domain=document.querySelector('[data-practice-domain]');
    const task=document.querySelector('[data-practice-task]');
    const subject=document.querySelector('[data-practice-subject]');
    const start=document.querySelector('[data-start-practice]');
    if(!setup||!mode||!domain||!task||!subject||!start||setup.classList.contains('hidden')) return false;

    mode.value='learner';
    mode.dispatchEvent(new Event('change',{bubbles:true}));

    if(validTask){
      if(![...domain.options].some(option=>option.value===requestedTask.slice(0,2))) return false;
      domain.value=requestedTask.slice(0,2);
      domain.dispatchEvent(new Event('change',{bubbles:true}));
      if(![...task.options].some(option=>option.value===requestedTask)) return false;
      task.value=requestedTask;
      task.dispatchEvent(new Event('change',{bubbles:true}));
    }

    if(validSubject){
      if(![...subject.options].some(option=>option.value===requestedSubject)) return false;
      subject.value=requestedSubject;
      subject.dispatchEvent(new Event('change',{bubbles:true}));
    }

    let notice=document.querySelector('[data-guided-practice-prefill]');
    if(!notice){
      notice=document.createElement('div');
      notice.className='notice';
      notice.dataset.guidedPracticePrefill='true';
      notice.setAttribute('role','status');
      setup.querySelector('.actions')?.insertAdjacentElement('beforebegin',notice);
    }
    const filters=[];
    if(validSubject) filters.push(subjectEngine.label(requestedSubject));
    if(validTask) filters.push(requestedTask);
    notice.textContent='This learner-practice session is filtered to '+filters.join(' · ')+'.';

    state.applied=true;
    if(state.observer) state.observer.disconnect();
    if(autoStart){
      start.click();
    }else{
      start.focus({preventScroll:true});
    }
    return true;
  }

  function startPrefill(){
    if(apply()) return;
    const root=document.querySelector('[data-practice-setup]')||document.body;
    state.observer=new MutationObserver(apply);
    state.observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',startPrefill); else startPrefill();
})();