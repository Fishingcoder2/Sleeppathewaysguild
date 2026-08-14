(function(){
  'use strict';

  function apply(){
    document.querySelectorAll('[data-nav="practice"]').forEach(link=>{
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });
    const mock=document.querySelector('.sidebar a[href="mock.html"]');
    if(mock){
      mock.setAttribute('data-nav','mock');
      mock.classList.add('active');
      mock.setAttribute('aria-current','page');
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
