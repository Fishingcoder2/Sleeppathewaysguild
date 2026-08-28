(function(){
'use strict';
const dock=document.querySelector('[data-scoring-workstation-dock]');
const renderer=window.RPSGTVisualPSGRenderer;
if(!dock||!renderer)return;

const STAGE_Y={W:12,R:32,N1:52,N2:72,N3:92};
const STAGE_ORDER=['W','R','N1','N2','N3'];
const MINI_CHANNELS=['F3-M2','C3-M2','O1-M2','E1-M2','Chin EMG','ECG'];
const state={summary:null,studies:new Map(),selected:10,split:true};

const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
function stageCounts(){return state.summary.epochs.reduce((out,item)=>{out[item.stage]=(out[item.stage]||0)+1;return out;},{});}
function eventCounts(){return state.summary.epochs.reduce((out,item)=>{(item.events||[]).forEach(kind=>out[kind]=(out[kind]||0)+1);return out;},{});}
function blockMinutes(){return Number(state.summary.meta.displayBlockMinutes)||12;}
function totalMinutes(){return state.summary.epochs.length*blockMinutes();}
function timeLabel(index){const start=index*blockMinutes(),end=start+blockMinutes();return `+${start}–${end} min`;}
function stageStudy(stage){return state.studies.get(stage)||null;}
function miniStudy(stage){const source=stageStudy(stage);if(!source)return null;const channels=(source.channels||[]).filter(channel=>MINI_CHANNELS.includes(channel.label));return {...source,id:source.id+'-context',title:source.title+' context',channels};}
function contextIndex(offset){return Math.max(0,Math.min(state.summary.epochs.length-1,state.selected+offset));}
function sessionMarkText(){const count=document.querySelector('[data-ws-event-count]');return count?count.textContent.trim():'0 events';}

const host=document.createElement('section');
host.className='ws-context-console';
host.setAttribute('data-ws-context-console','');
const inspector=document.querySelector('[data-scoring-workstation-inspector]');
(inspector||dock).insertAdjacentElement('afterend',host);

function stepPath(){
 const epochs=state.summary.epochs,width=900,block=width/epochs.length;let d=`M 0 ${STAGE_Y[epochs[0].stage]}`;
 for(let i=0;i<epochs.length;i+=1){const x2=(i+1)*block,y=STAGE_Y[epochs[i].stage];d+=` L ${x2.toFixed(2)} ${y}`;if(i<epochs.length-1){const nextY=STAGE_Y[epochs[i+1].stage];d+=` L ${x2.toFixed(2)} ${nextY}`;}}
 return d;
}
function hypnogramSvg(){
 const epochs=state.summary.epochs,width=900,block=width/epochs.length;
 const grids=STAGE_ORDER.map(stage=>`<line class="grid" x1="0" y1="${STAGE_Y[stage]}" x2="${width}" y2="${STAGE_Y[stage]}"></line>`).join('');
 const hits=epochs.map((item,index)=>`<rect class="hit" data-ws-summary-block="${index}" x="${(index*block).toFixed(2)}" y="0" width="${block.toFixed(2)}" height="112"><title>Block ${index+1} · ${item.stage} · ${timeLabel(index)}</title></rect>`).join('');
 return `<svg class="ws-hypnogram-svg" viewBox="0 0 900 112" preserveAspectRatio="none" role="img" aria-label="Synthetic teaching-night hypnogram summary">${grids}<rect class="selected-block" x="${(state.selected*block).toFixed(2)}" y="0" width="${block.toFixed(2)}" height="112"></rect><path class="stage-line" d="${stepPath()}"></path>${hits}</svg>`;
}
function eventRows(){
 const kinds=[['arousal','Arousal'],['respiratory','Respiratory'],['limb','Limb'],['artifact','Artifact']],n=state.summary.epochs.length;
 return kinds.map(([kind,label])=>`<div class="ws-summary-events"><strong>${label}</strong><div class="ws-event-row-track">${state.summary.epochs.map((item,index)=>(item.events||[]).includes(kind)?`<button class="ws-event-tick" type="button" data-kind="${kind}" data-ws-summary-block="${index}" style="left:${((index+.5)/n*100).toFixed(3)}%" title="${label} teaching marker · block ${index+1}"></button>`:'').join('')}</div></div>`).join('');
}
function metrics(){
 const stages=stageCounts(),events=eventCounts();return `<div><span>W BLOCKS</span><strong>${stages.W||0}</strong></div><div><span>N1 BLOCKS</span><strong>${stages.N1||0}</strong></div><div><span>N2 BLOCKS</span><strong>${stages.N2||0}</strong></div><div><span>N3 BLOCKS</span><strong>${stages.N3||0}</strong></div><div><span>REM BLOCKS</span><strong>${stages.R||0}</strong></div><div><span>TEACHING EVENTS</span><strong>${Object.values(events).reduce((sum,value)=>sum+value,0)}</strong></div><div><span>SESSION MARKS</span><strong data-ws-session-marks>${esc(sessionMarkText())}</strong></div>`;}
function pane(offset,label){
 const index=contextIndex(offset),item=state.summary.epochs[index];return `<article class="ws-context-pane${offset===0?' current':''}" data-ws-context-pane="${offset}"><div class="ws-context-pane-head"><strong>${label} · Block ${index+1}</strong><span>${item.stage}</span></div><div class="ws-context-canvas-scroll"><canvas data-ws-context-canvas="${offset}" aria-label="${label} 30-second ${item.stage} teaching epoch"></canvas></div><div class="ws-context-pane-foot"><span>${esc(timeLabel(index))}</span><strong>${(item.events||[]).length?esc(item.events.join(' · ')):'No summary event marker'}</strong></div></article>`;}
function splitMarkup(){return `<div class="ws-split-context" data-ws-split-context ${state.split?'':'hidden'}><div class="ws-split-toolbar"><div><strong>Previous | Current | Next context</strong><span>30-second app-authored exemplars linked to the selected compressed block</span></div><div class="ws-split-nav"><button type="button" data-ws-summary-prev>◀ Block</button><button type="button" data-ws-summary-next>Block ▶</button></div></div><div class="ws-split-grid">${pane(-1,'Previous')}${pane(0,'Current')}${pane(1,'Next')}</div></div>`;}
function render(){
 if(!state.summary)return;const hours=(totalMinutes()/60).toFixed(1).replace('.0','');
 host.innerHTML=`<div class="ws-context-head"><div><strong>Teaching Night Overview</strong><small>Synthetic ${hours}-hour compressed summary · click any block for context</small></div><div class="ws-context-actions"><button type="button" class="${state.split?'active':''}" data-ws-split-toggle aria-pressed="${state.split}">${state.split?'Split Context ON':'Split Context OFF'}</button><button type="button" data-ws-summary-center>Current block ${state.selected+1}</button></div></div><div class="ws-context-metrics">${metrics()}</div><div class="ws-hypnogram-wrap"><div class="ws-hypnogram-layout"><div class="ws-stage-axis">${STAGE_ORDER.map(stage=>`<span style="top:${STAGE_Y[stage]}px">${stage}</span>`).join('')}</div>${hypnogramSvg()}</div><div class="ws-time-axis"><span>0 h</span><span>1 h</span><span>2 h</span><span>3 h</span><span>4 h</span><span>5 h</span><span>6 h</span></div>${eventRows()}</div><div class="ws-context-note"><span><strong>Educational boundary:</strong> Each overview block represents 12 compressed teaching minutes; the detail panes are separate 30-second schematic exemplars, not contiguous patient epochs.</span><span>Selected: <strong data-ws-summary-selected>Block ${state.selected+1} · ${state.summary.epochs[state.selected].stage} · ${esc(timeLabel(state.selected))}</strong></span></div>${splitMarkup()}`;
 if(state.split)requestAnimationFrame(renderCanvases);
}
function renderCanvases(){
 [-1,0,1].forEach(offset=>{const index=contextIndex(offset),stage=state.summary.epochs[index].stage,study=miniStudy(stage),canvas=host.querySelector(`[data-ws-context-canvas="${offset}"]`);if(canvas&&study)renderer.render(canvas,study,{width:580});});
}
function selectBlock(index){const value=Math.max(0,Math.min(state.summary.epochs.length-1,Number(index)||0));state.selected=value;render();}
function syncSessionMarks(){const source=document.querySelector('[data-ws-event-count]'),target=host.querySelector('[data-ws-session-marks]');if(source&&target)target.textContent=source.textContent.trim();}

host.addEventListener('click',event=>{
 const block=event.target.closest('[data-ws-summary-block]');if(block){selectBlock(block.dataset.wsSummaryBlock);return;}
 if(event.target.closest('[data-ws-split-toggle]')){state.split=!state.split;render();return;}
 if(event.target.closest('[data-ws-summary-prev]')){selectBlock(state.selected-1);return;}
 if(event.target.closest('[data-ws-summary-next]')){selectBlock(state.selected+1);return;}
 if(event.target.closest('[data-ws-summary-center]')){const current=host.querySelector('[data-ws-context-pane="0"]');if(current)current.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
});

async function init(){
 try{
  const [summary,staging]=await Promise.all([loadJson('data/visual/prototype-workstation-teaching-night.json'),loadJson('data/visual/prototype-sleep-staging.json')]);
  if(!summary.meta||summary.meta.appAuthored!==true||!Array.isArray(summary.epochs)||summary.epochs.length!==30)throw new Error('Teaching-night summary is incomplete.');
  if(!staging.meta||staging.meta.appAuthored!==true)throw new Error('Staging context pack is unavailable.');
  state.summary=summary;(staging.studies||[]).forEach(study=>state.studies.set(study.stage,study));
  if(STAGE_ORDER.some(stage=>!state.studies.has(stage)))throw new Error('One or more staging exemplars are missing.');
  render();
  const eventCount=document.querySelector('[data-ws-event-count]');if(eventCount)new MutationObserver(syncSessionMarks).observe(eventCount,{childList:true,characterData:true,subtree:true});
 }catch(error){host.innerHTML=`<div class="notice error"><strong>Teaching-night context view could not load.</strong> ${esc(error.message)}</div>`;}
}
init();
})();
