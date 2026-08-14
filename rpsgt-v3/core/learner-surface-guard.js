(function(){
  'use strict';

  const INTERNAL_KEYS=/\b(?:source keys?|resource keys?|referenceKeys|studyRecommendationKeys)\b/i;

  function suppressLegacyOptionalShelf(){
    document.getElementById('rpsgt-book-shelf')?.remove();
    document.querySelectorAll('[data-rpsgt-settings-body] .rpsgt-settings-row').forEach(row=>{
      const text=(row.textContent||'').trim();
      if(/optional book suggestions|book preferences/i.test(text)) row.remove();
    });
  }

  function ensureStudyToolNavigation(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar) return;
    const flash=sidebar.querySelector('a[href="flashcards.html"]');
    if(flash&&!sidebar.querySelector('a[href="notes.html"]')){
      const notes=document.createElement('a');
      notes.className='nav-link';
      notes.href='notes.html';
      notes.innerHTML='<span>📝</span>RPSGT Study Notes';
      flash.insertAdjacentElement('afterend',notes);
    }
  }

  function ensureFlashcardsNotesSection(){
    if(!/^(home|study)$/.test(document.body.getAttribute('data-module')||'')) return;
    if(document.getElementById('flashcards-notes-tools')) return;
    const section=document.createElement('section');
    section.id='flashcards-notes-tools';
    section.className='section card';
    section.innerHTML='<div class="section-head"><div><div class="eyebrow">Study tools</div><h2>Flashcards &amp; Notes</h2><p>Keep active-recall cards and your own study notes easy to reach while you work through RPSGT content.</p></div></div><div class="grid grid-2"><article class="card module-card study"><h3>RPSGT Flashcards</h3><p>Review saved question cards or create your own concise recall cards.</p><div class="actions"><a class="btn secondary" href="flashcards.html">Open Flashcards</a></div></article><article class="card module-card study"><h3>RPSGT Study Notes</h3><p>Save formulas, reasoning steps, signal clues, and reminders in your local V3 learner record.</p><div class="actions"><a class="btn secondary" href="notes.html">Open Notes</a></div></article></div>';
    const main=document.querySelector('main.main');
    if(!main) return;
    if(document.body.getAttribute('data-module')==='study'){
      const target=document.querySelector('[data-respiratory-study-trail]')||document.querySelector('[data-guided-trail-dashboard]');
      target?.insertAdjacentElement('beforebegin',section);
    }else{
      const target=document.querySelector('.disclosure-preview')||document.querySelector('.footer');
      target?.insertAdjacentElement('beforebegin',section);
    }
  }

  function sanitizeReferenceLanguage(){
    document.querySelectorAll('.feedback-references,.mapping-warning').forEach(node=>node.remove());

    document.querySelectorAll('details').forEach(details=>{
      const summary=details.querySelector('summary');
      const text=(details.textContent||'').trim();
      const hasVisibleTitles=Boolean(details.querySelector('.resource-title-chip'));
      if((INTERNAL_KEYS.test(text)||/show mapped resource keys/i.test(text))&&!hasVisibleTitles){
        details.hidden=true;
        return;
      }
      if(hasVisibleTitles){
        details.hidden=false;
        if(summary) summary.textContent='Related references';
      }
    });

    document.querySelectorAll('.checkpoint-question-meta>*').forEach(node=>{
      if(/exact task mapping/i.test(node.textContent||'')) node.remove();
    });

    document.querySelectorAll('a,button,summary,strong,span,p,small,h1,h2,h3,h4,div').forEach(node=>{
      if(node.children.length) return;
      let text=node.textContent||'';
      if(!text) return;
      if(INTERNAL_KEYS.test(text)){
        if(node.matches('a,button')) node.textContent='Open related references';
        else node.remove();
        return;
      }
      text=text
        .replace(/open mapped references/gi,'Open related references')
        .replace(/mapped references/gi,'related references')
        .replace(/mapped resources/gi,'related resources')
        .replace(/mapped learner questions/gi,'learner questions')
        .replace(/mapped records/gi,'learner records')
        .replace(/directly assigned questions/gi,'learner questions')
        .replace(/\bmappings\b/gi,'references')
        .replace(/\bmapping\b/gi,'reference')
        .replace(/\bmapped\b/gi,'related');
      if(text!==node.textContent) node.textContent=text;
    });
  }

  function sanitizeAll(){
    suppressLegacyOptionalShelf();
    ensureStudyToolNavigation();
    ensureFlashcardsNotesSection();
    sanitizeReferenceLanguage();
  }

  function init(){
    sanitizeAll();
    if(typeof MutationObserver!=='function') return;
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;sanitizeAll();});
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();