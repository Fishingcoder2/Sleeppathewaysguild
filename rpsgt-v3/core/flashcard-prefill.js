(function(){
  'use strict';

  // Flashcards keep the current V3 1.2 engine/store/UI. This parser-blocking
  // bridge only swaps the fragile compressed flashcard data source for the
  // reviewed 332-card JSON catalog before core/flashcards.js initializes.
  if(!window.RPSGTV2ForwardCatalog&&document.readyState==='loading'){
    document.write('<script src="core/flashcard-v2-forward-catalog.js"><\/script>');
  }

  const search=document.querySelector('[data-card-search]');
  if(!search) return;
  const params=new URLSearchParams(window.location.search);
  const value=String(params.get('search')||'').trim();
  if(value) search.value=value;
})();
