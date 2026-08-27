(function(){
'use strict';
const root=document.querySelector('[data-memory-arcade]');
const panel=root&&root.querySelector('[data-arcade-panel]');
if(!root||!panel)return;
let scheduled=false;
function activeModeButton(){return root.querySelector('[data-arcade-mode].active');}
function addActions(){
  scheduled=false;
  const finish=panel.querySelector('.arcade-finish');
  if(finish&&!finish.querySelector('[data-arcade-choose-game]')){
    const actions=document.createElement('div');actions.className='arcade-next-actions';
    actions.innerHTML='<button class="btn secondary" type="button" data-arcade-choose-game>Choose another game</button>';
    finish.appendChild(actions);
  }
  const question=panel.querySelector('.arcade-question:not(.sprint)');
  const feedback=question&&question.querySelector('.arcade-feedback:not([hidden])');
  if(!feedback||question.querySelector('[data-arcade-next-actions]'))return;
  const actions=document.createElement('div');actions.className='arcade-next-actions';actions.dataset.arcadeNextActions='true';
  actions.innerHTML='<button class="btn primary" type="button" data-arcade-next-challenge>Next challenge →</button><button class="btn secondary" type="button" data-arcade-choose-game>Choose another game</button>';
  feedback.insertAdjacentElement('afterend',actions);
  requestAnimationFrame(()=>actions.querySelector('[data-arcade-next-challenge]')?.focus({preventScroll:true}));
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(addActions);}
panel.addEventListener('click',event=>{
  if(event.target.closest('[data-arcade-next-challenge]')){root.querySelector('[data-arcade-start]')?.click();return;}
  if(event.target.closest('[data-arcade-choose-game]')){
    activeModeButton()?.click();
    requestAnimationFrame(()=>activeModeButton()?.focus({preventScroll:true}));
  }
});
const observer=new MutationObserver(schedule);observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
addActions();
})();