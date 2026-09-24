(function(){
  'use strict';

  function loadLearnerFlowNavigation(){
    if(window.RPSGTLearnerFlowNavigation||document.querySelector('script[data-rpsgt-learner-flow-navigation]')) return;
    const script=document.createElement('script');
    script.src='core/learner-flow-navigation.js';
    script.dataset.rpsgtLearnerFlowNavigation='true';
    document.head.appendChild(script);
  }

  function normalizeAchievementCopy(){
    const host=document.getElementById('guild-achievements');
    if(!host) return;
    const heading=host.querySelector('.section-head h2');
    if(heading&&heading.textContent.trim()==='Merit badges and domain medals') heading.textContent='Task badges and domain medals';
    host.querySelectorAll('.guild-achievement-card p').forEach(node=>{
      if(node.textContent.trim()==='Task merit badges earned in this domain.') node.textContent='Task badges earned in this domain.';
    });
    host.querySelectorAll('.guild-achievement-line span').forEach(node=>{
      if(node.textContent.trim()==='Merit badges') node.textContent='Task badges';
    });
  }

  function suppressOptionalBookShelf(){
    const removeLearnerShelf=()=>{
      document.getElementById('rpsgt-book-shelf')?.remove();
      document.querySelectorAll('[data-rpsgt-settings-body] .rpsgt-settings-row').forEach(row=>{
        if(/optional book suggestions|book preferences/i.test((row.textContent||'').trim())) row.remove();
      });
    };
    removeLearnerShelf();
    if(typeof MutationObserver!=='function') return;
    const observer=new MutationObserver(removeLearnerShelf);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function init(){
    loadLearnerFlowNavigation();
    normalizeAchievementCopy();
    suppressOptionalBookShelf();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
