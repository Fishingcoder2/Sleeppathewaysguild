(function(){
  'use strict';
  function bridge(selector){
    const buttons=[...document.querySelectorAll(selector)];
    const primary=buttons[0];
    if(!primary||buttons.length<2)return;
    buttons.slice(1).forEach(button=>button.addEventListener('click',event=>{
      event.preventDefault();
      primary.click();
    }));
  }
  bridge('[data-start-matching]');
  bridge('[data-start-memory-recall]');
})();
