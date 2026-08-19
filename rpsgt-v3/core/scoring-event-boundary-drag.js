(function(){
'use strict';
const engine=window.RPSGTScoringLabEngine;
const renderer=window.RPSGTScoringEventBoundaryRenderer;
const storage=window.RPSGTStorage;
const display=window.SPGSharedVisualDisplay;
const workspace=document.querySelector('[data-scoring-boundary-workspace]');
const startButtons=[...document.querySelectorAll('[data-scoring-boundary-start]')];
const summaryHost=document.querySelector('[data-scoring-summary]');
if(!engine||!renderer||!storage||!workspace||!startButtons.length||!summaryHost)return;

function ensureStyle(href,marker){
  if(document.querySelector(`link[${marker}]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=href;link.setAttribute(marker,'');document.head.appendChild(link);
}
ensureStyle('assets/scoring-event-boundary-drag.css','data-scoring-boundary-drag-style');

const state={pack:null,cases:[],index:0,annotations:{},firstResponses:{},mastered:{},feedback:{},hints:{},channel:{},tool:'mark',confirming:false,drag:null,active:false,loading:null};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clone=value=>JSON.parse(JSON.stringify(value));
async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
function freshState(){return storage.load();}
function saveLabs(labs){const saved=freshState();saved.labs=labs;return storage.save(saved);}
function shuffle(items){const copy=items.slice();for(let i=copy.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function currentCase(){return state.cases[state.index]||null;}
function caseId(item){return String(item&&item.id||'');}
function annotationsFor(item){const id=caseId(item);if(!state.annotations[id])state.annotations[id]=[];return state.annotations[id];}
function selectedChannel(item){const id=caseId(item);if(!state.channel[id])state.channel[id]='nasal';return state.channel[id];}
function fullscreenSupported(target){return Boolean(target&&(target.requestFullscreen||target.webkitRequestFullscreen||target.msRequestFullscreen));}
function ensureSummaryTile(){
  const report=engine.summary(freshState().labs);let tile=summaryHost.querySelector('[data-scoring-boundary-summary]');
  if(!tile){tile=document.createElement('div');tile.dataset.scoringBoundarySummary='';summaryHost.appendChild(tile);}
  tile.innerHTML=`<span>Boundary events</span><strong>${report.eventBoundarySkillAttempts?report.eventBoundarySkillBestPercent+'%':'—'}</strong>`;
  startButtons.forEach(button=>{button.textContent=report.eventBoundarySkillPassed?'Practice event boundaries again':'Start boundary-event skill';});
}
function openModal(){
  state.active=true;workspace.hidden=false;workspace.classList.add('scoring-boundary-drag-active');workspace.setAttribute('role','dialog');workspace.setAttribute('aria-modal','true');workspace.setAttribute('aria-label','Event boundary drag-annotation practice');document.body.classList.add('scoring-boundary-modal-open');
}
function closeModal(){
  state.active=false;state.confirming=false;state.drag=null;document.body.classList.remove('scoring-boundary-modal-open');workspace.classList.remove('scoring-boundary-drag-active','tool-mark','tool-pan');workspace.hidden=true;workspace.removeAttribute('role');workspace.removeAttribute('aria-modal');workspace.removeAttribute('aria-label');workspace.innerHTML='';ensureSummaryTile();
}
function navMarkup(){
  const item=currentCase();return state.cases.map((candidate,index)=>{const id=caseId(candidate),done=state.mastered[id]===true,current=index===state.index,retry=current&&Boolean(state.feedback[id]&&state.feedback[id].correct===false),recommended=index===state.index+1&&item&&state.mastered[caseId(item)]===true;const cls=done?'complete':retry?'retry':current?'current':recommended?'recommended':'';const disabled=index>state.index&&!done&&!recommended;return `<button type="button" class="scoring-boundary-nav ${cls}" data-boundary-drag-go="${index}" ${disabled?'disabled':''} aria-current="${current?'step':'false'}">${done?'✓ ':''}${index+1}</button>`;}).join('');
}
function greedyGrade(item,selected){
  const truth=(item.events||[]).map(event=>({start:Number(event.start),end:Number(event.end)}));
  const tolerance=Number(state.pack&&state.pack.toleranceSeconds||4);const used=new Set();let matches=0;
  truth.forEach(target=>{let best=-1,bestDistance=Infinity;selected.forEach((span,index)=>{if(used.has(index))return;const ds=Math.abs(Number(span.start)-target.start),de=Math.abs(Number(span.end)-target.end);if(ds<=tolerance&&de<=tolerance&&Number(span.end)>Number(span.start)){const distance=ds+de;if(distance<bestDistance){best=index;bestDistance=distance;}}});if(best>=0){used.add(best);matches+=1;}});
  const extras=Math.max(0,selected.length-truth.length);const correctEvents=Math.max(0,matches-extras);const correct=selected.length===truth.length&&matches===truth.length;
  return {correct,correctEvents,totalEvents:truth.length,matches,extras,answerCount:truth.length,selectedCount:selected.length};
}
function annotationMarkup(item){
  const list=annotationsFor(item);if(!list.length)return '<span class="scoring-boundary-empty">No events marked yet.</span>';
  return list.map((span,index)=>`<button type="button" class="scoring-boundary-event-chip" data-boundary-drag-remove="${index}" ${state.mastered[caseId(item)]||state.confirming?'disabled':''}>Event ${index+1}: ${Math.round(span.start)}–${Math.round(span.end)} s · ${span.channel==='thermal'?'Thermistor':'Nasal pressure'} <span aria-hidden="true">×</span></button>`).join('');
}
function confirmationMarkup(item){
  if(!state.confirming)return '';const count=annotationsFor(item).length;
  return `<div class="scoring-boundary-confirmation" role="dialog" aria-modal="true" aria-label="Confirm respiratory event annotations"><strong>Are you sure?</strong><p>You marked <strong>${count} respiratory event${count===1?'':'s'}</strong>. The first submitted set of event bars is the score for this case.</p><div class="actions"><button class="btn primary" type="button" data-boundary-drag-submit>Submit annotations</button><button class="btn secondary" type="button" data-boundary-drag-change>Change annotations</button></div></div>`;
}
function feedbackMarkup(item){
  const feedback=state.feedback[caseId(item)];if(!feedback)return '';
  if(feedback.correct)return `<div class="notice success"><strong>All event spans matched.</strong> ${esc(item.rationale)}</div>`;
  return `<div class="notice error"><strong>Review and try again.</strong> Your first submission stays saved for scoring. The strip contains ${feedback.answerCount} physiologic event${feedback.answerCount===1?'':'s'}; follow each airflow reduction from onset through recovery and correct the event bars before Next unlocks.</div>`;
}
function hintMarkup(item){return state.hints[caseId(item)]?'<div class="notice"><strong>Hint:</strong> Follow the airflow signal continuously across the 0:30 and 1:00 display lines. Mark each reduction as one event from physiologic onset through recovery; an epoch divider alone does not start or end an event.</div>':'';}
function renderAnnotations(svg,item,preview){
  if(!svg||!item)return;svg.querySelectorAll('[data-boundary-drag-layer]').forEach(node=>node.remove());
  const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.dataset.boundaryDragLayer='';group.setAttribute('class','scoring-boundary-drag-layer');
  const spans=annotationsFor(item).map((span,index)=>({...span,index,preview:false}));if(preview)spans.push({...preview,index:-1,preview:true});
  spans.forEach(span=>{const row=renderer.ROWS[span.channel]||renderer.ROWS.nasal,x=renderer.xFor(span.start),endX=renderer.xFor(span.end),width=Math.max(3,endX-x);const rect=document.createElementNS(ns,'rect');rect.setAttribute('x',String(x));rect.setAttribute('y',String(row-27));rect.setAttribute('width',String(width));rect.setAttribute('height','54');rect.setAttribute('rx','8');rect.setAttribute('class',`scoring-boundary-event-bar${span.preview?' preview':''}`);if(span.index>=0)rect.dataset.boundaryDragBar=String(span.index);group.appendChild(rect);const text=document.createElementNS(ns,'text');text.setAttribute('x',String(x+Math.max(20,width/2)));text.setAttribute('y',String(row-34));text.setAttribute('text-anchor','middle');text.setAttribute('class','scoring-boundary-event-bar-label');text.textContent=span.preview?'Drag to event end':`Event ${span.index+1}`;group.appendChild(text);});svg.appendChild(group);
}
function renderCase(){
  const item=currentCase();if(!item){finishSkill();return;}const id=caseId(item),mastered=state.mastered[id]===true,channel=selectedChannel(item),count=annotationsFor(item).length;
  openModal();workspace.classList.toggle('tool-mark',state.tool==='mark');workspace.classList.toggle('tool-pan',state.tool==='pan');
  workspace.innerHTML=`<button class="scoring-boundary-modal-close" type="button" data-boundary-drag-close aria-label="Close event-boundary practice">×</button><div class="section-head"><div><div class="eyebrow">Phase 3 event annotation · Case ${state.index+1} of ${state.cases.length}</div><h3>${esc(item.title)}</h3></div><span class="status gold">First submission counts</span></div><div class="scoring-boundary-nav-row" aria-label="Boundary cases">${navMarkup()}</div><p class="report-intro"><strong>Mark every respiratory event you see.</strong> Drag from event onset to event end directly across either airflow row. If you see two events, place two bars; if you see three, place three.</p><div class="scoring-boundary-rule"><strong>Display rule:</strong> The vertical 0:30 and 1:00 lines are epoch boundaries only. Follow the physiology through the line before deciding where an event ends.</div><div class="scoring-boundary-drag-tools"><div class="scoring-boundary-tool-group" aria-label="Tracing interaction"><button class="btn secondary ${state.tool==='mark'?'selected':''}" type="button" data-boundary-drag-tool="mark">Mark events</button><button class="btn secondary ${state.tool==='pan'?'selected':''}" type="button" data-boundary-drag-tool="pan">Pan strip</button></div><div class="scoring-boundary-tool-group" aria-label="Airflow annotation row"><button class="btn secondary ${channel==='nasal'?'selected':''}" type="button" data-boundary-drag-channel="nasal">Nasal pressure</button><button class="btn secondary ${channel==='thermal'?'selected':''}" type="button" data-boundary-drag-channel="thermal">Thermistor</button></div><button class="btn secondary" type="button" data-boundary-drag-undo ${!count||mastered||state.confirming?'disabled':''}>Undo last</button><button class="btn secondary" type="button" data-boundary-drag-clear ${!count||mastered||state.confirming?'disabled':''}>Clear all</button></div><div class="spg-rotate-guidance">Rotate your phone sideways for the widest tracing. Use Pan strip to move through the 90 seconds, then Mark events to drag annotations.</div><div class="scoring-boundary-visual spg-visual-surface" data-scoring-boundary-visual><button class="spg-visual-fullscreen-btn ${fullscreenSupported(workspace)?'':'is-unsupported'}" type="button" data-scoring-boundary-fullscreen>Full screen</button><div class="scoring-boundary-scroll-guide">${state.tool==='mark'?`Drag left-to-right on the ${channel==='thermal'?'Thermistor':'Nasal pressure'} row to place each event bar.`:'Swipe or drag horizontally to move through the strip.'}</div><div class="scoring-boundary-scroll" data-boundary-drag-scroll><svg class="scoring-boundary-svg" data-boundary-drag-svg></svg></div></div><p class="spg-visual-disclosure"><strong>AI-generated teaching schematic · Not a patient recording.</strong> Real PSG tracings vary. Compare authentic tracings in current sleep-technology textbooks, peer-reviewed educational resources, and official guidance.</p><div class="scoring-boundary-event-list" aria-label="Marked respiratory events">${annotationMarkup(item)}</div><div class="scoring-boundary-toolbar"><button class="btn secondary" type="button" data-boundary-drag-prev ${state.index===0?'disabled':''}>Previous</button><button class="btn secondary" type="button" data-boundary-drag-hint>${state.hints[id]?'Hide hint':'Hint'}</button>${mastered?`<button class="btn primary" type="button" data-boundary-drag-next>${state.index===state.cases.length-1?'Finish boundary-event skill':'Next'}</button>`:`<button class="btn primary" type="button" data-boundary-drag-check ${!count||state.confirming?'disabled':''}>Check event annotations</button>`}</div><div class="scoring-boundary-feedback" aria-live="polite">${confirmationMarkup(item)}${hintMarkup(item)}${feedbackMarkup(item)}</div>`;
  const svg=workspace.querySelector('[data-boundary-drag-svg]');renderer.render(svg,item,{});renderAnnotations(svg,item,null);
}
function svgPoint(svg,event){const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return null;return {x:(event.clientX-rect.left)/rect.width*renderer.WIDTH,y:(event.clientY-rect.top)/rect.height*renderer.HEIGHT};}
function timeFromPoint(point){const left=renderer.PLOT.left,right=renderer.PLOT.right;if(!point||point.x<left||point.x>right)return null;return Math.max(0,Math.min(90,(point.x-left)/(right-left)*90));}
function pointerDown(event){
  if(!state.active||state.tool!=='mark'||state.confirming)return;const svg=event.target.closest('[data-boundary-drag-svg]');if(!svg)return;const item=currentCase(),id=caseId(item);if(state.mastered[id])return;const point=svgPoint(svg,event),channel=selectedChannel(item),row=renderer.ROWS[channel];if(!point||Math.abs(point.y-row)>34)return;const start=timeFromPoint(point);if(start==null)return;event.preventDefault();event.stopImmediatePropagation();state.drag={pointerId:event.pointerId,start,end:start,channel};if(svg.setPointerCapture)svg.setPointerCapture(event.pointerId);renderAnnotations(svg,item,state.drag);
}
function pointerMove(event){if(!state.drag||event.pointerId!==state.drag.pointerId)return;const svg=event.target.closest('[data-boundary-drag-svg]')||workspace.querySelector('[data-boundary-drag-svg]');if(!svg)return;const point=svgPoint(svg,event),time=timeFromPoint(point);if(time==null)return;event.preventDefault();state.drag.end=time;const preview={start:Math.min(state.drag.start,state.drag.end),end:Math.max(state.drag.start,state.drag.end),channel:state.drag.channel};renderAnnotations(svg,currentCase(),preview);}
function pointerEnd(event){
  if(!state.drag||event.pointerId!==state.drag.pointerId)return;const item=currentCase(),svg=workspace.querySelector('[data-boundary-drag-svg]'),span={start:Math.min(state.drag.start,state.drag.end),end:Math.max(state.drag.start,state.drag.end),channel:state.drag.channel};state.drag=null;if(span.end-span.start>=2){annotationsFor(item).push(span);state.feedback[caseId(item)]=null;renderCase();return;}if(svg)renderAnnotations(svg,item,null);
}
function removeAnnotation(index){const item=currentCase(),id=caseId(item);if(!item||state.mastered[id]||state.confirming)return;const list=annotationsFor(item),target=Number(index);if(target>=0&&target<list.length){list.splice(target,1);state.feedback[id]=null;renderCase();}}
function askToCheck(){const item=currentCase();if(!item||!annotationsFor(item).length||state.mastered[caseId(item)])return;state.confirming=true;renderCase();}
function submitCheck(){
  const item=currentCase();if(!item||!state.confirming)return;const id=caseId(item),selected=clone(annotationsFor(item));if(!state.firstResponses[id])state.firstResponses[id]=selected;const grade=greedyGrade(item,selected);state.confirming=false;state.mastered[id]=grade.correct;state.feedback[id]=grade;renderCase();
}
function moveTo(index){const item=currentCase(),target=Math.max(0,Math.min(state.cases.length-1,Number(index)));if(target>state.index&&item&&!state.mastered[caseId(item)])return;state.index=target;state.confirming=false;state.drag=null;renderCase();}
function finishSkill(){
  if(!state.cases.length||!state.cases.every(item=>state.mastered[caseId(item)]))return;const responses=state.cases.map(item=>{const selected=state.firstResponses[caseId(item)]||[],grade=greedyGrade(item,selected);return {id:item.id,selected:clone(selected),answerEvents:(item.events||[]).map(event=>({start:event.start,end:event.end})),correctEvents:grade.correctEvents,totalEvents:grade.totalEvents,selectedCount:grade.selectedCount,answerCount:grade.answerCount};});const correctParts=responses.reduce((sum,item)=>sum+item.correctEvents,0),totalParts=responses.reduce((sum,item)=>sum+item.totalEvents,0),percent=totalParts?Math.round(correctParts/totalParts*100):0,passPercent=Number(state.pack.passPercent||80),completedAt=new Date().toISOString();const record={id:'scoring-event-boundary-drag-'+completedAt,source:'v3-lab-scoring-event-boundary-drag-skill',labId:'scoring',taskCode:'D3B',correctParts,totalParts,percent,passed:state.cases.length===4&&totalParts===8&&percent>=passPercent,passPercent,toleranceSeconds:Number(state.pack.toleranceSeconds||4),completedAt,responses};saveLabs(engine.applyEventBoundarySkill(freshState().labs,record));state.active=false;document.body.classList.remove('scoring-boundary-modal-open');workspace.classList.remove('scoring-boundary-drag-active','tool-mark','tool-pan');workspace.removeAttribute('role');workspace.removeAttribute('aria-modal');workspace.hidden=false;workspace.innerHTML=`<div class="scoring-result ${record.passed?'pass':'retry'}"><h3>${record.passed?'Boundary-event annotation skill passed':'Boundary-event annotation skill saved—review and retry'}</h3><strong>${record.correctParts}/${record.totalParts} first-pass event bars correct · ${record.percent}%</strong><p>${record.passed?'Your Phase 3 event-annotation practice pass is saved.':'Seven of the eight first-pass event annotations are required for an 80% Phase 3 pass. Corrections were required for mastery but did not inflate the score.'} This Phase 3 practice remains separate and does not change the current Scoring Lab completion requirement.</p></div><div class="actions"><button class="btn primary" type="button" data-boundary-drag-retry>Practice event annotations again</button></div>`;ensureSummaryTile();
}
async function startSkill(){
  try{if(!state.pack){if(state.loading)await state.loading;else{state.loading=loadJson('data/scoring/event-boundary-cases.json').then(pack=>{const validation=engine.validateEventBoundaryPack(pack);if(!validation.valid)throw new Error(validation.errors.join(' '));state.pack=pack;return pack;}).finally(()=>{state.loading=null;});await state.loading;}}const saved=freshState();saveLabs(engine.start(saved.labs,new Date().toISOString()));state.cases=shuffle(state.pack.cases.map(item=>clone(item)));state.index=0;state.annotations={};state.firstResponses={};state.mastered={};state.feedback={};state.hints={};state.channel={};state.tool='mark';state.confirming=false;state.drag=null;state.active=true;renderCase();}
  catch(error){state.active=true;openModal();workspace.innerHTML=`<button class="scoring-boundary-modal-close" type="button" data-boundary-drag-close aria-label="Close event-boundary practice">×</button><div class="notice error"><strong>Boundary-event annotation skill could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;}
}
function requestFullscreen(){const target=workspace.querySelector('[data-scoring-boundary-visual]');if(!target)return;if(display&&typeof display.requestFullscreen==='function'){display.requestFullscreen(target);return;}const request=target.requestFullscreen||target.webkitRequestFullscreen;if(typeof request==='function'){try{const result=request.call(target);if(result&&typeof result.catch==='function')result.catch(()=>{});}catch(error){}}}
function handleClick(event){
  const start=event.target.closest('[data-scoring-boundary-start],[data-boundary-drag-retry]');if(start){event.preventDefault();event.stopImmediatePropagation();startSkill();return;}if(!state.active)return;
  if(event.target.closest('[data-boundary-drag-close]')){event.preventDefault();event.stopImmediatePropagation();closeModal();return;}
  const tool=event.target.closest('[data-boundary-drag-tool]');if(tool){event.preventDefault();event.stopImmediatePropagation();state.tool=tool.dataset.boundaryDragTool;renderCase();return;}
  const channel=event.target.closest('[data-boundary-drag-channel]');if(channel){event.preventDefault();event.stopImmediatePropagation();state.channel[caseId(currentCase())]=channel.dataset.boundaryDragChannel;state.tool='mark';renderCase();return;}
  const remove=event.target.closest('[data-boundary-drag-remove]');if(remove){event.preventDefault();event.stopImmediatePropagation();removeAnnotation(remove.dataset.boundaryDragRemove);return;}
  if(event.target.closest('[data-boundary-drag-undo]')){event.preventDefault();event.stopImmediatePropagation();const list=annotationsFor(currentCase());if(list.length)list.pop();renderCase();return;}
  if(event.target.closest('[data-boundary-drag-clear]')){event.preventDefault();event.stopImmediatePropagation();state.annotations[caseId(currentCase())]=[];renderCase();return;}
  if(event.target.closest('[data-boundary-drag-check]')){event.preventDefault();event.stopImmediatePropagation();askToCheck();return;}
  if(event.target.closest('[data-boundary-drag-submit]')){event.preventDefault();event.stopImmediatePropagation();submitCheck();return;}
  if(event.target.closest('[data-boundary-drag-change]')){event.preventDefault();event.stopImmediatePropagation();state.confirming=false;renderCase();return;}
  if(event.target.closest('[data-boundary-drag-prev]')){event.preventDefault();event.stopImmediatePropagation();moveTo(state.index-1);return;}
  if(event.target.closest('[data-boundary-drag-next]')){event.preventDefault();event.stopImmediatePropagation();if(state.index===state.cases.length-1)finishSkill();else moveTo(state.index+1);return;}
  const go=event.target.closest('[data-boundary-drag-go]');if(go){event.preventDefault();event.stopImmediatePropagation();moveTo(go.dataset.boundaryDragGo);return;}
  if(event.target.closest('[data-boundary-drag-hint]')){event.preventDefault();event.stopImmediatePropagation();const id=caseId(currentCase());state.hints[id]=!state.hints[id];renderCase();return;}
  if(event.target.closest('[data-scoring-boundary-fullscreen]')){event.preventDefault();event.stopImmediatePropagation();requestFullscreen();}
}
document.addEventListener('click',handleClick,true);
document.addEventListener('pointerdown',pointerDown,true);
document.addEventListener('pointermove',pointerMove,true);
document.addEventListener('pointerup',pointerEnd,true);
document.addEventListener('pointercancel',pointerEnd,true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.active){event.preventDefault();closeModal();}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureSummaryTile);else ensureSummaryTile();
})();
