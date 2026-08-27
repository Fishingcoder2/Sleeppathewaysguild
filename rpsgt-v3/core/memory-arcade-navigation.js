(function(){
'use strict';
const root=document.querySelector('[data-memory-arcade]');
const panel=root&&root.querySelector('[data-arcade-panel]');
if(!root||!panel)return;
function addActions(){
  const feedback=panel.querySelector('[data-arcade-feedback]');
  if(!feedback||feedback.querySelector('.arcade-next-actions'))return;
  const existing=panel.querySelector('[data-arcade-next]');
  if(!existing)return;
  const wrap=document.createElement('div');wrap.className='arcade-next-actions';
  existing.parentNode.insertBefore(wrap,existing);wrap.appendChild(existing);
}
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;addActions();});}
const observer=new MutationObserver(schedule);observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
addActions();
})();
