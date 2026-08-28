(function(){
'use strict';
const dock=document.querySelector('[data-scoring-workstation-dock]');
if(!dock)return;
const stations={
 'stage-recognition':{number:1,label:'Stage Recognition',window:'30 s / page',mode:'Stage score',selector:'[data-scoring-stage-visual]'},
 'stage-transitions':{number:2,label:'Stage Transitions',window:'3-epoch context',mode:'Transition review',selector:'[data-scoring-transition-visual]'},
 'arousal-context':{number:3,label:'Arousal Recognition',window:'30 s epoch',mode:'Arousal review',selector:'[data-scoring-arousal-visual]'},
 'respiratory-classification':{number:4,label:'Respiratory Events',window:'30 s epoch',mode:'Event class',selector:'[data-scoring-respiratory-visual]'},
 'limb-movement-context':{number:5,label:'Limb Movement',window:'120 s / 4 epochs',mode:'Series context',selector:'[data-scoring-limb-visual]'},
 'artifact-physiology':{number:6,label:'Artifact vs Physiology',window:'30 s epoch',mode:'Signal quality',selector:'[data-scoring-artifact-visual]'},
 'population-boundaries':{number:7,label:'Protocol Boundaries',window:'Scenario view',mode:'Protocol decision',selector:'[data-scoring-population-visual]'}
};
let cursorEnabled=true;
let activeId='stage-recognition';
let cursorNode=null;

const panel=document.createElement('aside');
panel.className='scoring-workstation-inspector';
panel.setAttribute('data-scoring-workstation-inspector','');
panel.innerHTML=`<div class="ws-inspector-head"><span class="lamp"></span><div><strong>Scoring Inspector</strong><small>Teaching review controls</small></div></div>
<div class="ws-inspector-grid">
 <div><span>ACTIVE</span><strong data-ws-inspector-active>Station 1</strong></div>
 <div><span>WINDOW</span><strong data-ws-inspector-window>30 s / page</strong></div>
 <div><span>MODE</span><strong data-ws-inspector-mode>Stage score</strong></div>
 <div><span>STATUS</span><strong data-ws-inspector-status>Not reviewed</strong></div>
</div>
<div class="ws-inspector-section">
 <div class="ws-inspector-title"><strong>Measurement cursor</strong><span data-ws-cursor-time>—</span></div>
 <button class="ws-inspector-toggle active" type="button" data-ws-cursor-toggle aria-pressed="true">Cursor ON</button>
 <div class="ws-time-ruler" aria-label="Teaching waveform time ruler"><span>0</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30 s</span></div>
 <p>Move across a waveform to read approximate elapsed time within the displayed teaching window.</p>
</div>
<div class="ws-inspector-section" data-ws-stage-pad>
 <div class="ws-inspector-title"><strong>Stage keypad</strong><span>Station 1</span></div>
 <div class="ws-stage-pad">${['W','N1','N2','N3','R'].map(stage=>`<button type="button" data-ws-stage="${stage}">${stage}</button>`).join('')}</div>
 <button class="ws-inspector-commit" type="button" data-ws-stage-commit>Check stage</button>
 <p>These buttons mirror the Stage 1 scoring controls when the frozen scoring view is open.</p>
</div>
<div class="ws-inspector-section ws-review-queue">
 <div class="ws-inspector-title"><strong>Review queue</strong><span>7 stations</span></div>
 <ol>${Object.entries(stations).map(([id,item])=>`<li data-ws-queue="${id}"><button type="button" data-ws-open="${id}"><span>${item.number}</span>${item.label}</button><i aria-hidden="true"></i></li>`).join('')}</ol>
</div>`;
dock.insertAdjacentElement('afterend',panel);

function activeStationId(){const button=dock.querySelector('[data-workstation-station].active');return button&&button.dataset.workstationStation||activeId;}
function activeHost(){const item=stations[activeId];return item?document.querySelector(item.selector):null;}
function isComplete(id){const box=document.querySelector(`[data-scoring-station="${id}"]`);return Boolean(box&&box.checked);}
function sync(){
 activeId=activeStationId();const item=stations[activeId]||stations['stage-recognition'];
 panel.querySelector('[data-ws-inspector-active]').textContent=`Station ${item.number} · ${item.label}`;
 panel.querySelector('[data-ws-inspector-window]').textContent=item.window;
 panel.querySelector('[data-ws-inspector-mode]').textContent=item.mode;
 panel.querySelector('[data-ws-inspector-status]').textContent=isComplete(activeId)?'Reviewed':'Not reviewed';
 panel.querySelector('[data-ws-stage-pad]').hidden=activeId!=='stage-recognition';
 panel.querySelectorAll('[data-ws-queue]').forEach(row=>{const id=row.dataset.wsQueue;row.classList.toggle('active',id===activeId);row.classList.toggle('complete',isComplete(id));});
 const ruler=panel.querySelector('.ws-time-ruler');if(ruler)ruler.hidden=item.window.startsWith('Scenario');
 clearCursor();
}
function openStation(id){const button=dock.querySelector(`[data-workstation-station="${id}"]`);if(button){button.click();return;}const item=stations[id],target=item&&document.querySelector(item.selector);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});}
function durationForActive(){if(activeId==='limb-movement-context')return 120;if(activeId==='population-boundaries')return null;return 30;}
function clearCursor(){if(cursorNode){cursorNode.remove();cursorNode=null;}const readout=panel.querySelector('[data-ws-cursor-time]');if(readout)readout.textContent='—';}
function positionCursor(event){
 if(!cursorEnabled)return;const canvas=event.target.closest('canvas');if(!canvas)return;const host=activeHost();if(!host||!host.contains(canvas))return;const duration=durationForActive();if(!duration)return;
 const rect=canvas.getBoundingClientRect();if(!rect.width)return;const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));const seconds=ratio*duration;
 const parent=canvas.parentElement;if(!parent)return;const parentRect=parent.getBoundingClientRect();
 if(!cursorNode){cursorNode=document.createElement('div');cursorNode.className='ws-measure-cursor';cursorNode.innerHTML='<span></span>';parent.appendChild(cursorNode);}
 cursorNode.style.left=(rect.left-parentRect.left+ratio*rect.width)+'px';cursorNode.style.top=(rect.top-parentRect.top)+'px';cursorNode.style.height=rect.height+'px';cursorNode.querySelector('span').textContent=seconds.toFixed(1)+' s';
 const readout=panel.querySelector('[data-ws-cursor-time]');if(readout)readout.textContent=seconds.toFixed(1)+' s';
}
function proxyStage(stage){const host=document.querySelector('[data-scoring-stage-visual]');const button=host&&host.querySelector(`[data-stage-answer="${stage}"]`);if(button&&!button.disabled){button.click();return true;}return false;}
function proxyStageCommit(){const host=document.querySelector('[data-scoring-stage-visual]');if(!host)return false;const button=host.querySelector('[data-stage-check], [data-stage-next], [data-stage-finish]');if(button&&!button.disabled){button.click();return true;}return false;}

panel.addEventListener('click',event=>{
 const open=event.target.closest('[data-ws-open]');if(open){openStation(open.dataset.wsOpen);return;}
 const stage=event.target.closest('[data-ws-stage]');if(stage){proxyStage(stage.dataset.wsStage);return;}
 if(event.target.closest('[data-ws-stage-commit]')){proxyStageCommit();return;}
 const toggle=event.target.closest('[data-ws-cursor-toggle]');if(toggle){cursorEnabled=!cursorEnabled;toggle.classList.toggle('active',cursorEnabled);toggle.setAttribute('aria-pressed',String(cursorEnabled));toggle.textContent=cursorEnabled?'Cursor ON':'Cursor OFF';if(!cursorEnabled)clearCursor();}
});
document.addEventListener('pointermove',positionCursor,{passive:true});
document.addEventListener('pointerleave',clearCursor);
document.addEventListener('change',event=>{if(event.target.closest('[data-scoring-station]'))setTimeout(sync,0);});
const observer=new MutationObserver(sync);observer.observe(dock,{subtree:true,attributes:true,attributeFilter:['class']});
const stationList=document.querySelector('[data-scoring-stations]');if(stationList)new MutationObserver(sync).observe(stationList,{subtree:true,childList:true,attributes:true,attributeFilter:['checked','class']});
sync();
})();
