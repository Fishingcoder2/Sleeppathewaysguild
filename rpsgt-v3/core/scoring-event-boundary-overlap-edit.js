(function(){
'use strict';
const workspace=document.querySelector('[data-scoring-boundary-workspace]');
if(!workspace)return;
let replacement=null;

function isActive(){return !workspace.hidden&&workspace.classList.contains('scoring-boundary-drag-active');}
function labelControls(){
  if(!isActive())return;
  const clear=workspace.querySelector('[data-boundary-drag-clear]');
  if(clear){clear.textContent='Clear all marks';clear.setAttribute('aria-label','Clear all respiratory event marks');clear.classList.add('scoring-boundary-clear-prominent');}
  workspace.querySelectorAll('[data-boundary-drag-bar]').forEach(bar=>{bar.setAttribute('aria-label','Existing respiratory event annotation. Drag across it again to replace the mark, or use the round edge handles for fine adjustment.');});
}
function eventCount(){return workspace.querySelectorAll('[data-boundary-drag-remove]').length;}
function clearReplacementClass(){workspace.querySelectorAll('.scoring-boundary-event-bar.replacing').forEach(bar=>bar.classList.remove('replacing'));}

const style=document.createElement('style');
style.dataset.boundaryOverlapEditStyle='';
style.textContent=`
.scoring-boundary-drag-active .scoring-boundary-drag-layer{pointer-events:none}
.scoring-boundary-drag-active .scoring-boundary-event-bar[data-boundary-drag-bar]{pointer-events:all;cursor:ew-resize}
.scoring-boundary-drag-active .scoring-boundary-event-bar.replacing{fill:rgba(215,173,82,.24);stroke:#9f6c0c;stroke-dasharray:7 4}
.scoring-boundary-drag-active .scoring-boundary-clear-prominent{border-color:#b96f37!important;background:#fff3e8!important;color:#7b431d!important;font-weight:900!important;box-shadow:inset 0 0 0 1px rgba(185,111,55,.25)}
@media(max-width:950px) and (orientation:landscape){.scoring-boundary-drag-active .scoring-boundary-clear-prominent{min-width:112px!important}}
`;
document.head.appendChild(style);

window.addEventListener('pointerdown',event=>{
  if(!isActive())return;
  const bar=event.target.closest&&event.target.closest('[data-boundary-drag-bar]');
  if(!bar)return;
  const index=Number(bar.dataset.boundaryDragBar);
  if(!Number.isInteger(index)||index<0)return;
  replacement={pointerId:event.pointerId,index,countBefore:eventCount()};
  clearReplacementClass();bar.classList.add('replacing');
},true);

window.addEventListener('pointerup',event=>{
  if(!replacement||replacement.pointerId!==event.pointerId)return;
  const pending=replacement;replacement=null;
  setTimeout(()=>{
    if(!isActive()){clearReplacementClass();return;}
    const countAfter=eventCount();
    if(countAfter>pending.countBefore){
      const oldChip=workspace.querySelector(`[data-boundary-drag-remove="${pending.index}"]`);
      if(oldChip)oldChip.click();
    }
    clearReplacementClass();labelControls();
  },0);
},true);
window.addEventListener('pointercancel',event=>{if(replacement&&replacement.pointerId===event.pointerId){replacement=null;clearReplacementClass();}},true);

window.addEventListener('click',event=>{
  if(event.target.closest&&event.target.closest('[data-scoring-boundary-start],[data-scoring-boundary-workspace]'))setTimeout(labelControls,0);
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',labelControls);else labelControls();
})();
