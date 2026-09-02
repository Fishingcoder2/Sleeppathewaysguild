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

(function(){
'use strict';
if(!document.querySelector('[data-scoring-summary]')||document.querySelector('[data-live-psg]'))return;
const css=document.createElement('link');css.rel='stylesheet';css.href='assets/scoring-live-psg.css';css.dataset.livePsgStyle='';document.head.appendChild(css);
const section=document.createElement('section');section.className='section card live-psg-panel';section.id='live-psg-simulator';section.setAttribute('data-live-psg','');section.innerHTML=`
<div class="live-psg-head"><div><div class="eyebrow">Live PSG Simulator · Continuous review</div><h2>One full screen = exactly 30 real-time seconds</h2><p>This synthetic polysomnogram scrolls continuously from right to left. A signal sample entering at the right edge takes exactly thirty seconds to travel across the full signal plot, preserving a standard 30-second teaching epoch timebase.</p></div><span class="live-psg-badge">30.0 s / screen · real time</span></div>
<div class="live-psg-toolbar" role="group" aria-label="Live PSG controls"><button class="btn primary" type="button" data-live-psg-start>Start</button><button class="btn secondary" type="button" data-live-psg-pause disabled>Pause / Freeze</button><button class="btn secondary" type="button" data-live-psg-restart>Restart</button></div>
<div class="live-psg-status" aria-live="polite"><div><span>Mode</span><strong data-live-psg-mode>Paused</strong></div><div><span>Elapsed</span><strong data-live-psg-elapsed>0.0 s</strong></div><div><span>Epoch</span><strong data-live-psg-epoch>Epoch 1</strong></div><div><span>Timebase</span><strong data-live-psg-window-readout>30.0 s / screen</strong></div><div><span>Teaching context</span><strong data-live-psg-event>N2 teaching background</strong></div></div>
<div class="live-psg-screen"><canvas class="scoring-live-strip" data-live-psg-canvas></canvas></div>
<div class="live-psg-key" data-live-psg-channel-key aria-label="Live PSG channel list"></div>
<div class="live-psg-event-legend" aria-label="Synthetic event shading legend"><span><i></i>Background</span><span><i></i>Obstructive event</span><span><i></i>Hypopnea</span><span><i></i>Leg movement</span></div>
<div class="live-psg-note"><strong>Teaching-only signal:</strong> The tracing is app-authored and synthetic. It includes synchronized EEG, EOG, chin EMG, ECG, airflow, thoracic and abdominal effort, SpO₂, and bilateral leg channels with scheduled teaching events. It is not patient data and does not change the Scoring Lab completion record.</div>`;
const notices=[...document.querySelectorAll('main > .section.notice')];const authority=notices[0];const summary=document.querySelector('[data-scoring-summary]')&&document.querySelector('[data-scoring-summary]').closest('.section');if(authority)authority.insertAdjacentElement('afterend',section);else if(summary)summary.insertAdjacentElement('beforebegin',section);else document.querySelector('main').appendChild(section);
const heroActions=document.querySelector('.hero .actions');if(heroActions&&!heroActions.querySelector('a[href="#live-psg-simulator"]')){const link=document.createElement('a');link.className='btn secondary';link.href='#live-psg-simulator';link.textContent='Live 30-second PSG';heroActions.insertBefore(link,heroActions.children[1]||null);}
const script=document.createElement('script');script.src='core/scoring-live-psg.js';script.dataset.livePsgScript='';document.body.appendChild(script);
})();
