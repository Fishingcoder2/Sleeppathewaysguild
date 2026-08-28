(function(){
'use strict';
const dock=document.querySelector('[data-scoring-workstation-dock]');
const inspector=document.querySelector('[data-scoring-workstation-inspector]');
if(!dock||!inspector)return;

const stationMeta={
 'stage-recognition':{selector:'[data-scoring-stage-visual]',duration:30},
 'stage-transitions':{selector:'[data-scoring-transition-visual]',duration:30},
 'arousal-context':{selector:'[data-scoring-arousal-visual]',duration:30},
 'respiratory-classification':{selector:'[data-scoring-respiratory-visual]',duration:30},
 'limb-movement-context':{selector:'[data-scoring-limb-visual]',duration:120},
 'artifact-physiology':{selector:'[data-scoring-artifact-visual]',duration:30},
 'population-boundaries':{selector:'[data-scoring-population-visual]',duration:null}
};
const eventTypes=[
 {id:'arousal',label:'Arousal'},
 {id:'oa',label:'Obstructive apnea'},
 {id:'ca',label:'Central apnea'},
 {id:'mixed',label:'Mixed apnea'},
 {id:'hypopnea',label:'Hypopnea'},
 {id:'rera',label:'RERA'},
 {id:'limb',label:'Limb movement'},
 {id:'artifact',label:'Artifact'},
 {id:'note',label:'Tech note'}
];
const events=[];
let activeType='arousal';
let markMode=false;
let selectedId=null;
let sequence=0;
let draft=null;
let draftNode=null;

const section=document.createElement('section');
section.className='ws-event-section';
section.setAttribute('data-ws-event-section','');
section.innerHTML=`<div class="ws-event-title"><div><strong>Teaching event markers</strong><small>Session only · not saved to learner progress</small></div><span data-ws-event-count>0 events</span></div>
<div class="ws-event-palette" role="group" aria-label="Teaching event type">${eventTypes.map((item,index)=>`<button type="button" data-ws-event-type="${item.id}" class="${index===0?'active':''}">${item.label}</button>`).join('')}</div>
<div class="ws-event-mode"><button type="button" data-ws-event-mark aria-pressed="false">Mark events OFF</button><button type="button" data-ws-event-clear>Clear station</button></div>
<p class="ws-event-help" data-ws-event-help><strong>Choose a type, turn marking on, then drag across a frozen teaching tracing.</strong> Live scrolling pages are intentionally not markable.</p>
<div class="ws-event-timeline" data-ws-event-timeline aria-label="Teaching event timeline"></div>
<div class="ws-event-nav"><button type="button" data-ws-event-prev>◀ Previous event</button><button type="button" data-ws-event-next>Next event ▶</button><button type="button" data-ws-event-delete>Delete</button></div>
<ol class="ws-event-list" data-ws-event-list></ol>`;
inspector.appendChild(section);

function activeStationId(){const button=dock.querySelector('[data-workstation-station].active');return button&&button.dataset.workstationStation||'stage-recognition';}
function activeMeta(){return stationMeta[activeStationId()]||stationMeta['stage-recognition'];}
function activeHost(){const meta=activeMeta();return meta&&document.querySelector(meta.selector);}
function activeDuration(){const meta=activeMeta();return meta?meta.duration:null;}
function typeFor(id){return eventTypes.find(item=>item.id===id)||eventTypes[0];}
function formatTime(value){const n=Math.max(0,Number(value)||0);return n.toFixed(1)+' s';}
function stationEvents(){const id=activeStationId();return events.filter(item=>item.stationId===id).sort((a,b)=>a.start-b.start||a.end-b.end);}
function visibleCanvasIndex(canvas){const host=activeHost();if(!host)return -1;return Array.from(host.querySelectorAll('canvas')).indexOf(canvas);}
function canvasForEvent(item){const host=document.querySelector(stationMeta[item.stationId]&&stationMeta[item.stationId].selector||'');if(!host)return null;return host.querySelectorAll('canvas')[item.canvasIndex]||null;}
function isLiveCanvas(canvas){return Boolean(canvas.closest('.scoring-live-strip')||canvas.hasAttribute('data-live-canvas-a')||canvas.hasAttribute('data-live-canvas-b'));}
function eligibleCanvas(canvas){const host=activeHost();const duration=activeDuration();return Boolean(canvas&&host&&host.contains(canvas)&&duration&&canvas.getClientRects().length&&!isLiveCanvas(canvas));}
function setHelp(message){const node=section.querySelector('[data-ws-event-help]');if(node)node.innerHTML=message;}
function clearDraft(){if(draftNode){draftNode.remove();draftNode=null;}draft=null;}
function geometry(canvas,start,end,duration){const parent=canvas.parentElement;if(!parent)return null;parent.classList.add('ws-event-surface');const parentRect=parent.getBoundingClientRect(),canvasRect=canvas.getBoundingClientRect();const left=canvasRect.left-parentRect.left+(start/duration)*canvasRect.width;const width=Math.max(2,((end-start)/duration)*canvasRect.width);return {parent,left,width,top:canvasRect.top-parentRect.top,height:canvasRect.height};}
function drawDraft(){if(!draft||!draft.canvas)return;const duration=activeDuration();if(!duration)return;const start=Math.min(draft.start,draft.current)*duration,end=Math.max(draft.start,draft.current)*duration;const g=geometry(draft.canvas,start,end,duration);if(!g)return;if(!draftNode){draftNode=document.createElement('div');draftNode.className='ws-event-draft';g.parent.appendChild(draftNode);}draftNode.style.left=g.left+'px';draftNode.style.width=g.width+'px';draftNode.style.top=g.top+'px';draftNode.style.height=g.height+'px';}
function removeRenderedMarkers(){document.querySelectorAll('.ws-event-marker').forEach(node=>node.remove());}
function renderMarkers(){
 removeRenderedMarkers();
 const id=activeStationId(),duration=activeDuration();if(!duration)return;
 stationEvents().forEach(item=>{
  if(item.stationId!==id)return;const canvas=canvasForEvent(item);if(!canvas||isLiveCanvas(canvas)||!canvas.getClientRects().length)return;const g=geometry(canvas,item.start,item.end,duration);if(!g)return;
  const marker=document.createElement('div');marker.className='ws-event-marker'+(item.id===selectedId?' selected':'');marker.dataset.eventId=item.id;marker.dataset.kind=item.kind;marker.dataset.label=typeFor(item.kind).label;marker.setAttribute('aria-label',`${typeFor(item.kind).label} ${formatTime(item.start)} to ${formatTime(item.end)}`);marker.style.left=g.left+'px';marker.style.width=g.width+'px';marker.style.top=g.top+'px';marker.style.height=g.height+'px';g.parent.appendChild(marker);
 });
}
function renderTimeline(){
 const timeline=section.querySelector('[data-ws-event-timeline]'),duration=activeDuration(),items=stationEvents();if(!timeline)return;
 if(!duration){timeline.hidden=true;timeline.innerHTML='';return;}timeline.hidden=false;
 timeline.innerHTML=items.map(item=>`<span data-kind="${item.kind}" data-event-id="${item.id}" class="${item.id===selectedId?'selected':''}" style="left:${Math.max(0,Math.min(100,item.start/duration*100))}%;width:${Math.max(.6,(item.end-item.start)/duration*100)}%" title="${typeFor(item.kind).label} · ${formatTime(item.start)}–${formatTime(item.end)}"></span>`).join('');
}
function renderList(){
 const list=section.querySelector('[data-ws-event-list]'),items=stationEvents(),count=section.querySelector('[data-ws-event-count]');if(count)count.textContent=`${items.length} event${items.length===1?'':'s'}`;
 if(!list)return;list.innerHTML=items.length?items.map(item=>`<li data-event-id="${item.id}" class="${item.id===selectedId?'selected':''}"><i class="kind" data-kind="${item.kind}" aria-hidden="true"></i><button type="button" data-ws-event-select="${item.id}">${typeFor(item.kind).label}</button><span class="time">${formatTime(item.start)}–${formatTime(item.end)}</span></li>`).join(''):'<li><span></span><small>No teaching marks in this station.</small><span></span></li>';
 const has=items.length>0;section.querySelector('[data-ws-event-prev]').disabled=!has;section.querySelector('[data-ws-event-next]').disabled=!has;section.querySelector('[data-ws-event-delete]').disabled=!selectedId||!items.some(item=>item.id===selectedId);
}
function render(){
 const duration=activeDuration();const mark=section.querySelector('[data-ws-event-mark]');if(mark){mark.disabled=!duration;mark.classList.toggle('active',markMode&&Boolean(duration));mark.setAttribute('aria-pressed',String(markMode&&Boolean(duration)));mark.textContent=duration?(markMode?'Mark events ON':'Mark events OFF'):'No waveform marking';}
 if(!duration){markMode=false;selectedId=null;setHelp('<strong>This station has no waveform canvas.</strong> Use the protocol decision controls rather than event marking.');}
 else if(markMode)setHelp(`<strong>${typeFor(activeType).label} marking is ON.</strong> Drag across a frozen teaching tracing to create a session-only event interval.`);
 else setHelp('<strong>Choose a type, turn marking on, then drag across a frozen teaching tracing.</strong> Live scrolling pages are intentionally not markable.');
 renderTimeline();renderList();renderMarkers();
}
function chooseEvent(id){const item=events.find(event=>event.id===id);if(!item)return;selectedId=id;render();const marker=document.querySelector(`.ws-event-marker[data-event-id="${CSS.escape(id)}"]`);if(marker)marker.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});}
function stepEvent(direction){const items=stationEvents();if(!items.length)return;let index=items.findIndex(item=>item.id===selectedId);if(index<0)index=direction>0?-1:0;index=(index+direction+items.length)%items.length;chooseEvent(items[index].id);}
function deleteSelected(){const index=events.findIndex(item=>item.id===selectedId);if(index<0)return;events.splice(index,1);selectedId=null;render();}
function clearStation(){const id=activeStationId();for(let i=events.length-1;i>=0;i-=1)if(events[i].stationId===id)events.splice(i,1);selectedId=null;render();}
function ratioForPointer(canvas,event){const rect=canvas.getBoundingClientRect();if(!rect.width)return 0;return Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));}
function beginMark(event){
 if(!markMode||event.button!==0)return;const canvas=event.target.closest('canvas');if(!canvas)return;const duration=activeDuration();if(!duration)return;
 if(isLiveCanvas(canvas)){setHelp('<strong>Freeze the live page before marking an event.</strong> Teaching marks are applied only to stable review views.');return;}
 if(!eligibleCanvas(canvas))return;event.preventDefault();const ratio=ratioForPointer(canvas,event);draft={pointerId:event.pointerId,canvas,start:ratio,current:ratio,canvasIndex:visibleCanvasIndex(canvas)};if(canvas.setPointerCapture)try{canvas.setPointerCapture(event.pointerId);}catch(error){}drawDraft();
}
function moveMark(event){if(!draft||event.pointerId!==draft.pointerId)return;draft.current=ratioForPointer(draft.canvas,event);drawDraft();}
function endMark(event){
 if(!draft||event.pointerId!==draft.pointerId)return;const duration=activeDuration();const local=draft;clearDraft();if(!duration)return;const start=Math.min(local.start,local.current)*duration,end=Math.max(local.start,local.current)*duration;if(end-start<.3){setHelp('<strong>Drag a wider interval.</strong> Teaching event marks must span at least 0.3 seconds.');return;}
 const item={id:'ws-event-'+Date.now()+'-'+(++sequence),stationId:activeStationId(),kind:activeType,start:Number(start.toFixed(2)),end:Number(end.toFixed(2)),canvasIndex:local.canvasIndex};events.push(item);selectedId=item.id;render();
}

section.addEventListener('click',event=>{
 const type=event.target.closest('[data-ws-event-type]');if(type){activeType=type.dataset.wsEventType;section.querySelectorAll('[data-ws-event-type]').forEach(button=>button.classList.toggle('active',button===type));markMode=true;render();return;}
 if(event.target.closest('[data-ws-event-mark]')){if(!activeDuration())return;markMode=!markMode;render();return;}
 if(event.target.closest('[data-ws-event-clear]')){clearStation();return;}
 if(event.target.closest('[data-ws-event-prev]')){stepEvent(-1);return;}
 if(event.target.closest('[data-ws-event-next]')){stepEvent(1);return;}
 if(event.target.closest('[data-ws-event-delete]')){deleteSelected();return;}
 const select=event.target.closest('[data-ws-event-select]');if(select){chooseEvent(select.dataset.wsEventSelect);}
});
section.addEventListener('click',event=>{const bar=event.target.closest('[data-event-id]');if(bar&&bar.closest('[data-ws-event-timeline]'))chooseEvent(bar.dataset.eventId);});
document.addEventListener('pointerdown',beginMark,true);document.addEventListener('pointermove',moveMark,true);document.addEventListener('pointerup',endMark,true);document.addEventListener('pointercancel',()=>clearDraft(),true);
document.addEventListener('click',event=>{const host=activeHost();if(host&&host.contains(event.target))setTimeout(renderMarkers,0);});
const dockObserver=new MutationObserver(()=>{selectedId=null;clearDraft();setTimeout(render,0);});dockObserver.observe(dock,{subtree:true,attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>setTimeout(renderMarkers,80));
render();
})();
