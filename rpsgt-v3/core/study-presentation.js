(function(){
  'use strict';

  const DOMAIN_MEDALS={D1:'Clinical Guide',D2:'Study Signal Scout',D3:'Scoring Pathfinder',D4:'Therapy Trail Guide'};

  function replaceExact(node,from,to){
    if(node&&node.textContent.trim()===from) node.textContent=to;
  }

  function normalizeSummary(){
    const dashboard=document.querySelector('[data-guided-trail-dashboard]');
    if(!dashboard) return;
    replaceExact(dashboard.querySelector('.section-head h2'),'Study, check, and earn awards','Study, check, and earn Guild achievements');
    replaceExact(dashboard.querySelector('.section-head .status'),'Stored only in v3','Saved in this browser');
    dashboard.querySelectorAll('.trail-summary-grid span').forEach(node=>{
      replaceExact(node,'Task awards','Task badges');
      replaceExact(node,'Domain awards','Domain medals');
    });
  }

  function normalizeBlueprint(){
    const map=document.querySelector('[data-blueprint-map]');
    if(!map) return;

    document.querySelectorAll('[data-blueprint-summary] span').forEach(node=>{
      if(node.textContent.includes('directly assigned questions')) node.innerHTML=node.innerHTML.replace('directly assigned questions','mapped learner questions');
      if(node.textContent.includes('review-only cross-task records')) node.remove();
    });

    map.querySelectorAll('.trail-status-row .status').forEach(node=>replaceExact(node,'Task award earned','Task badge earned'));
    map.querySelectorAll('.domain-map-head').forEach(head=>{
      const status=head.querySelector('.status');
      if(status&&/^[D][1-4]\s*·\s*domain award$/i.test(status.textContent.trim())){
        const code=status.textContent.trim().split('·')[0].trim().toUpperCase();
        status.textContent=`${code} · ${DOMAIN_MEDALS[code]||'Domain'} medal earned`;
      }
      const detail=head.querySelector('small');
      if(detail) detail.textContent=detail.textContent.replace(/task awards/gi,'task badges');
      const weight=head.querySelector('.domain-weight span');
      replaceExact(weight,'app blueprint weight','RPSGT study weight');
    });

    map.querySelectorAll('.task-map-card details').forEach(details=>{
      const summary=details.querySelector('summary');
      if(summary&&summary.textContent.trim()==='Show mapped resource keys') details.remove();
    });
    map.querySelectorAll('.mapping-warning').forEach(node=>node.remove());
  }

  function normalizeCheckpoint(){
    const checkpoint=document.querySelector('[data-checkpoint-workspace]');
    if(!checkpoint) return;
    checkpoint.querySelectorAll('.checkpoint-result h3').forEach(node=>replaceExact(node,'Task award earned','Task badge earned'));
    checkpoint.querySelectorAll('.checkpoint-result p').forEach(node=>{
      replaceExact(node,'This task award is now part of the Guided Trail report.','This task badge is now part of your Guided Study achievements.');
      replaceExact(node,'An 80% score is required for the task award. Your attempt remains in checkpoint history.','An 80% score is required for the task badge. Your attempt remains in checkpoint history.');
    });
  }

  function normalize(){
    normalizeSummary();
    normalizeBlueprint();
    normalizeCheckpoint();
  }

  function observe(selector){
    const node=document.querySelector(selector);
    if(!node||typeof MutationObserver!=='function') return;
    const observer=new MutationObserver(normalize);
    observer.observe(node,{childList:true,subtree:true});
  }

  function init(){
    normalize();
    observe('[data-guided-trail-dashboard]');
    observe('[data-blueprint-map]');
    observe('[data-checkpoint-workspace]');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();