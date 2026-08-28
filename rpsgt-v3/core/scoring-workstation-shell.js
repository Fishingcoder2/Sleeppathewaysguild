(function(){
'use strict';
const firstVisual=document.querySelector('[data-scoring-stage-visual]');
const stationHost=document.querySelector('[data-scoring-stations]');
const checkpointButton=document.querySelector('[data-scoring-start]');
if(!firstVisual||!stationHost||!checkpointButton)return;

const stations=[
 {id:'stage-recognition',label:'Stages',selector:'[data-scoring-stage-visual]',key:'1'},
 {id:'stage-transitions',label:'Transitions',selector:'[data-scoring-transition-visual]',key:'2'},
 {id:'arousal-context',label:'Arousals',selector:'[data-scoring-arousal-visual]',key:'3'},
 {id:'respiratory-classification',label:'Respiratory',selector:'[data-scoring-respiratory-visual]',key:'4'},
 {id:'limb-movement-context',label:'Limb EMG',selector:'[data-scoring-limb-visual]',key:'5'},
 {id:'artifact-physiology',label:'Artifact',selector:'[data-scoring-artifact-visual]',key:'6'},
 {id:'population-boundaries',label:'Protocol',selector:'[data-scoring-population-visual]',key:'7'}
];
let activeId=stations[0].id;

const dock=document.createElement('section');
dock.className='scoring-workstation-dock';
dock.setAttribute('data-scoring-workstation-dock','');
dock.setAttribute('aria-label','PSG scoring workstation navigation');
dock.innerHTML=`<div class="scoring-workstation-ribbon">
  <div class="scoring-workstation-brand"><span class="lamp" aria-hidden="true"></span><span><strong>SPG PSG Workstation</strong><small>Training review console</small></span></div>
  <div class="scoring-workstation-tools" role="navigation" aria-label="Scoring stations">
    ${stations.map((item,index)=>`<button class="scoring-workstation-tool" type="button" data-workstation-station="${item.id}" title="Open Station ${index+1} · Alt+${item.key}"><strong>${index+1} · ${item.label}</strong><small>Alt+${item.key}</small></button>`).join('')}
  </div>
  <div class="scoring-workstation-checkpoint"><button class="btn" type="button" data-workstation-checkpoint title="Open checkpoint · Alt+C">10-Q Checkpoint</button></div>
 </div>
 <div class="scoring-workstation-status" aria-live="polite">
  <span>MODE <strong>Review / Score</strong></span>
  <span>ACTIVE <strong data-workstation-active>Station 1 · Stages</strong></span>
  <span>PROGRESS <strong data-workstation-progress>0 / 7 reviewed</strong></span>
  <span>DISPLAY <strong>Teaching PSG · no patient data</strong></span>
 </div>`;
firstVisual.parentNode.insertBefore(dock,firstVisual);

function targetFor(id){const item=stations.find(entry=>entry.id===id);return item?document.querySelector(item.selector):null;}
function setActive(id){
 if(!stations.some(item=>item.id===id))return;
 activeId=id;
 dock.querySelectorAll('[data-workstation-station]').forEach(button=>button.classList.toggle('active',button.dataset.workstationStation===id));
 const item=stations.find(entry=>entry.id===id);const index=stations.indexOf(item)+1;
 const active=dock.querySelector('[data-workstation-active]');if(active)active.textContent=`Station ${index} · ${item.label}`;
}
function syncCompletion(){
 let completed=0;
 stations.forEach(item=>{
  const box=document.querySelector(`[data-scoring-station="${item.id}"]`);
  const done=Boolean(box&&box.checked);if(done)completed+=1;
  const button=dock.querySelector(`[data-workstation-station="${item.id}"]`);if(button)button.classList.toggle('complete',done);
 });
 const progress=dock.querySelector('[data-workstation-progress]');if(progress)progress.textContent=`${completed} / 7 reviewed`;
}
function openStation(id){const target=targetFor(id);if(!target)return;setActive(id);target.scrollIntoView({behavior:'smooth',block:'start'});}

dock.addEventListener('click',event=>{
 const stationButton=event.target.closest('[data-workstation-station]');
 if(stationButton){openStation(stationButton.dataset.workstationStation);return;}
 if(event.target.closest('[data-workstation-checkpoint]'))checkpointButton.click();
});

document.addEventListener('change',event=>{if(event.target.closest('[data-scoring-station]'))setTimeout(syncCompletion,0);});
const stationObserver=new MutationObserver(syncCompletion);stationObserver.observe(stationHost,{childList:true,subtree:true,attributes:true,attributeFilter:['checked']});

if('IntersectionObserver' in window){
 const visible=new Map();
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>visible.set(entry.target,entry.intersectionRatio));
  let best=null,bestRatio=0;
  stations.forEach(item=>{const target=targetFor(item.id),ratio=target?visible.get(target)||0:0;if(ratio>bestRatio){best=item;bestRatio=ratio;}});
  if(best&&bestRatio>.10)setActive(best.id);
 },{root:null,rootMargin:'-135px 0px -45% 0px',threshold:[0,.1,.25,.5,.75]});
 stations.forEach(item=>{const target=targetFor(item.id);if(target)observer.observe(target);});
}

document.addEventListener('keydown',event=>{
 if(!event.altKey||event.ctrlKey||event.metaKey)return;
 const tag=(document.activeElement&&document.activeElement.tagName||'').toLowerCase();
 if(tag==='input'||tag==='textarea'||tag==='select')return;
 const item=stations.find(entry=>entry.key===event.key);
 if(item){event.preventDefault();openStation(item.id);return;}
 if(event.key.toLowerCase()==='c'){event.preventDefault();checkpointButton.click();}
});

syncCompletion();setActive(activeId);
})();
