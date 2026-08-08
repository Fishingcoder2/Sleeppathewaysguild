(function(){
  'use strict';

  function suppressLegacyOptionalShelf(){
    document.getElementById('rpsgt-book-shelf')?.remove();
    document.querySelectorAll('[data-rpsgt-settings-body] .rpsgt-settings-row').forEach(row=>{
      const text=(row.textContent||'').trim();
      if(/optional book suggestions|book preferences/i.test(text)) row.remove();
    });
  }

  function init(){
    suppressLegacyOptionalShelf();
    if(typeof MutationObserver!=='function') return;
    const observer=new MutationObserver(suppressLegacyOptionalShelf);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();