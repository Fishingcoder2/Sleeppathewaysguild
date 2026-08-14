(function(){
  'use strict';

  const dialog=document.querySelector('[data-card-dialog]');
  const categoryNode=document.querySelector('[data-card-front-topic]');
  const chipHost=document.querySelector('[data-card-review-chips]');
  const domainNode=document.querySelector('[data-card-front-domain]');
  const taskNode=document.querySelector('[data-card-front-task]');
  const areaNode=document.querySelector('[data-card-front-study-area]');
  if(!dialog||!categoryNode||!domainNode||!taskNode||!areaNode) return;

  function themeIndex(value){
    const name=String(value||'').trim().toLowerCase();
    const preserved={
      'cardiac & ecg recognition':0,
      'ekg & cardiac terms':0,
      'circadian rhythm sleep-wake disorders':1,
      'core sleep terms':2
    };
    if(Object.prototype.hasOwnProperty.call(preserved,name)) return preserved[name];
    return [...name].reduce((sum,char)=>sum+char.charCodeAt(0),0)%5;
  }

  function chipValues(){
    if(!chipHost) return [];
    return [...chipHost.querySelectorAll('.flashcard-review-chip')].map(node=>String(node.textContent||'').trim()).filter(Boolean);
  }

  function refresh(){
    const category=String(categoryNode.textContent||'RPSGT review').trim()||'RPSGT review';
    for(let index=0;index<5;index+=1) dialog.classList.remove('flashcard-theme-'+index);
    dialog.classList.add('flashcard-theme-'+themeIndex(category));
    areaNode.textContent=category;

    const values=chipValues();
    const task=values.find(value=>/^D\d+[A-Z](?:\b|\s|:|-)/i.test(value))||'';
    const domain=values.find(value=>value!==task)||'';
    domainNode.textContent=domain||'Broad RPSGT review';
    taskNode.textContent=task||'Cross-task concept';
  }

  const observer=new MutationObserver(refresh);
  observer.observe(categoryNode,{childList:true,characterData:true,subtree:true});
  if(chipHost) observer.observe(chipHost,{childList:true,characterData:true,subtree:true});
  refresh();
})();
