(function(){
'use strict';
const workspace=document.querySelector('[data-math-workspace]');
if(!workspace)return;

const activeByKind=new Map();
let scheduled=false;

function questionFields(form){return [...form.querySelectorAll('.math-set-question')];}
function focusCurrent(fields,index){
  requestAnimationFrame(()=>{
    const field=fields[index];
    const input=field&&field.querySelector('input,button,select,textarea');
    if(input&&typeof input.focus==='function')input.focus({preventScroll:true});
  });
}
function sync(form,index,shouldFocus){
  const fields=questionFields(form);if(!fields.length)return;
  const kind=form.dataset.mathSetForm||'set';
  const safe=Math.max(0,Math.min(fields.length-1,index));
  activeByKind.set(kind,safe);
  fields.forEach((field,i)=>{field.hidden=i!==safe;field.setAttribute('aria-hidden',i===safe?'false':'true');});
  const nav=form.querySelector('[data-math-set-navigation]');
  if(!nav)return;
  const count=nav.querySelector('[data-math-set-count]');if(count)count.textContent=`Question ${safe+1} of ${fields.length}`;
  const progress=nav.querySelector('[data-math-set-progress]');if(progress){progress.max=fields.length;progress.value=safe+1;progress.setAttribute('aria-valuetext',`Question ${safe+1} of ${fields.length}`);}
  const previous=nav.querySelector('[data-math-set-prev]');if(previous)previous.disabled=safe===0;
  const next=nav.querySelector('[data-math-set-next]');if(next)next.hidden=safe===fields.length-1;
  const submit=nav.querySelector('button[type="submit"]');if(submit)submit.hidden=safe!==fields.length-1;
  if(shouldFocus)focusCurrent(fields,safe);
}
function enhance(form){
  if(!form||form.dataset.mathPaginationReady==='true')return;
  const fields=questionFields(form);if(fields.length<2)return;
  form.dataset.mathPaginationReady='true';
  const kind=form.dataset.mathSetForm||'set';
  const submit=form.querySelector(':scope > button[type="submit"]');
  const nav=document.createElement('div');
  nav.className='math-set-navigation';nav.dataset.mathSetNavigation='true';
  nav.innerHTML=`<div class="math-set-navigation-progress"><strong data-math-set-count>Question 1 of ${fields.length}</strong><progress data-math-set-progress max="${fields.length}" value="1" aria-label="Math question progress"></progress></div><div class="math-set-navigation-actions"><button class="btn secondary" type="button" data-math-set-prev>← Previous</button><button class="btn primary" type="button" data-math-set-next>Next →</button></div>`;
  if(submit)nav.querySelector('.math-set-navigation-actions').appendChild(submit);
  form.appendChild(nav);
  nav.addEventListener('click',event=>{
    const current=activeByKind.get(kind)||0;
    if(event.target.closest('[data-math-set-prev]')){sync(form,current-1,true);return;}
    if(event.target.closest('[data-math-set-next]')){sync(form,current+1,true);}
  });
  sync(form,activeByKind.get(kind)||0,false);
}
function scan(){
  scheduled=false;
  workspace.querySelectorAll('[data-math-set-form]').forEach(enhance);
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan);}
const observer=new MutationObserver(schedule);observer.observe(workspace,{childList:true,subtree:true});
scan();
})();