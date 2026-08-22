(function(){
'use strict';
const engine=window.RPSGTEkgLabEngine;
const storage=window.RPSGTStorage;
const workspace=document.querySelector('[data-ekg-workspace]');
const summaryHost=document.querySelector('[data-ekg-summary]');
const stationHost=document.querySelector('[data-ekg-stations]');
const checkpointButtons=[...document.querySelectorAll('[data-ekg-start]')];
if(!engine||!storage||!workspace||!summaryHost||!stationHost||!checkpointButtons.length)return;

const state={saved:null,bank:[],pack:null,mode:null,stationIndex:0,stationStep:'study',applySelected:null,applyFeedback:null,showHint:false,confirming:null,questions:[],checkpointIndex:0,answers:{},checkpointNotice:'',record:null};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatDate=value=>value?new Date(value).toLocaleString():'Not recorded';
async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
function saveLabs(nextLabs){state.saved.labs=nextLabs;state.saved=storage.save(state.saved);}
function report(){return engine.summary(state.saved.labs);}
function currentStation(){return state.pack&&state.pack.stations&&state.pack.stations[state.stationIndex]||null;}

function renderSummary(){
  const data=report();
  summaryHost.innerHTML=`<div><span>Status</span><strong>${data.completed?'Completed':data.status==='in-progress'?'In progress':'Not started'}</strong></div><div><span>Guided stations</span><strong>${data.stationsComplete}/${data.stationCount}</strong></div><div><span>Best checkpoint</span><strong>${data.attempts?data.bestPercent+'%':'—'}</strong></div><div><span>Attempts</span><strong>${data.attempts}</strong></div><div><span>Last checkpoint</span><strong>${data.latestSession?formatDate(data.latestSession.completedAt):'—'}</strong></div>`;
  checkpointButtons.forEach(button=>{button.textContent=data.completed?'Practice another 10-question checkpoint':data.attempts?'Start another 10-question checkpoint':'Start 10-question checkpoint';});
}
function recommendedStationIndex(){const data=report();const stations=state.pack&&state.pack.stations||[];const found=stations.findIndex(item=>!data.checklist[item.id]);return found<0?0:found;}
function renderStations(){
  const data=report();const stations=state.pack&&state.pack.stations||[];const recommended=recommendedStationIndex();
  stationHost.classList.add('guided');
  stationHost.innerHTML=stations.map((station,index)=>{const complete=data.checklist[station.id]===true;const cls=complete?'complete':index===recommended?'recommended':'';return `<button class="ekg-station-card ${cls}" type="button" data-ekg-open-station="${index}"><span class="number">${complete?'✓':index+1}</span><span><strong>${esc(station.title)}</strong><small>${complete?'Guided station completed':'Study → Apply → Recap'}</small></span><span class="state">${complete?'Completed':index===recommended?'Recommended next':'Open station'}</span></button>`;}).join('');
}
function openWorkspace(label){workspace.hidden=false;workspace.classList.add('ekg-guided-active');workspace.setAttribute('aria-label',label);workspace.scrollIntoView({behavior:'smooth',block:'start'});}
function closeWorkspace(){state.mode=null;state.confirming=null;state.questions=[];state.record=null;workspace.hidden=true;workspace.classList.remove('ekg-guided-active');workspace.innerHTML='';workspace.removeAttribute('aria-label');}
function stationNavMarkup(){const data=report();return (state.pack.stations||[]).map((station,index)=>{const complete=data.checklist[station.id]===true,current=index===state.stationIndex,recommended=!complete&&index===recommendedStationIndex();const cls=complete?'complete':current?'current':recommended?'recommended':'';return `<button type="button" class="${cls}" data-ekg-station-nav="${index}" aria-label="${esc(station.title)}" aria-current="${current?'step':'false'}">${complete?'✓':index+1}</button>`;}).join('');}
function stepperMarkup(){return `<div class="ekg-stepper"><span class="${state.stationStep==='study'?'active':''}">1 · Study</span><span class="${state.stationStep==='apply'?'active':''}">2 · Apply</span><span class="${state.stationStep==='recap'?'active':''}">3 · Recap</span></div>`;}

function normalBeatPath(x,wide){
  if(wide)return `L ${x-34} 118 L ${x-22} 116 L ${x-12} 134 L ${x} 62 L ${x+18} 152 L ${x+30} 112 L ${x+46} 110 L ${x+62} 96 L ${x+78} 118`;
  return `L ${x-34} 118 L ${x-28} 114 L ${x-22} 108 L ${x-15} 114 L ${x-8} 118 L ${x-4} 128 L ${x} 72 L ${x+7} 144 L ${x+12} 118 L ${x+30} 118 L ${x+38} 104 L ${x+49} 101 L ${x+61} 118`;
}
function stripPath(kind){
  let beats=[90,190,290,390,490,590,690,790];let wideAt=-1;let path='M 20 118';
  if(kind==='regular-60')beats=[65,150,235,320,405,490,575,660,745,830];
  if(kind==='slow-48')beats=[80,185,290,395,500,605,710,815];
  if(kind==='p-before-qrs')beats=[90,205,320,435,550,665,780];
  if(kind==='isolated-ectopy'){beats=[90,210,330,430,585,705,825];wideAt=3;}
  if(kind==='concerning-run')beats=[90,210,360,410,460,510,560,720,835];
  if(kind==='event-marker')beats=[90,210,330,450,555,670,790];
  beats.forEach((x,index)=>{const wide=index===wideAt||(kind==='concerning-run'&&index>=2&&index<=6);path+=normalBeatPath(x,wide);});
  path+=' L 875 118';return path;
}
function artifactOverlay(){return `<path d="M 355 118 L 366 76 L 374 151 L 384 82 L 394 146 L 405 69 L 416 154 L 427 91 L 438 142 L 450 73 L 461 149 L 474 94 L 486 133 L 500 118" class="ekg-artifact-line"/>`;}
function pulseRow(kind){if(kind!=='artifact-burst')return '';const xs=[90,190,290,390,490,590,690,790];return `<g class="ekg-pulse-row"><text x="24" y="205">Pulse trend</text><line x1="120" y1="200" x2="865" y2="200"/>${xs.map(x=>`<circle cx="${x}" cy="200" r="5"/>`).join('')}</g>`;}
function stripMarkup(station){
  const kind=station.visual&&station.visual.kind||'regular-60';const pathKind=kind==='artifact-burst'?'regular-60':kind;
  const pLabels=kind==='p-before-qrs'?`<g class="ekg-p-labels"><text x="60" y="99">P</text><text x="175" y="99">P</text><text x="290" y="99">P</text></g>`:'';
  const marker=kind==='event-marker'?`<g class="ekg-event-marker"><line x1="450" y1="24" x2="450" y2="170"/><text x="462" y="40">Event noted 02:14</text></g>`:'';
  return `<div class="ekg-schematic"><div class="ekg-schematic-head"><div><strong>Sleep Pathways Guild ECG teaching strip</strong><span>${esc(station.visual&&station.visual.label||'Synthetic recognition practice')}</span></div><span class="ekg-timebase">10-second teaching view</span></div><svg viewBox="0 0 900 235" role="img" aria-label="${esc(station.visual&&station.visual.label||station.title)}"><defs><pattern id="ekg-grid-small" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18"/></pattern><pattern id="ekg-grid-large" width="90" height="90" patternUnits="userSpaceOnUse"><rect width="90" height="90" fill="url(#ekg-grid-small)"/><path d="M 90 0 L 0 0 0 90"/></pattern></defs><rect width="900" height="235" fill="url(#ekg-grid-large)"/><text x="24" y="28" class="ekg-channel-label">ECG</text><path d="${stripPath(pathKind)}" class="ekg-signal-line"/>${kind==='artifact-burst'?artifactOverlay():''}${pulseRow(kind)}${pLabels}${marker}</svg><p class="ekg-disclosure"><strong>AI-generated teaching schematic · Not a patient recording.</strong> Real PSG ECG morphology varies with patient, lead placement, equipment, filtering, movement, and clinical context.</p></div>`;
}
function studyMarkup(station){return `<div class="ekg-task-panel"><h3>${esc(station.title)}</h3><p>${esc(station.study.intro)}</p><ul class="ekg-points">${station.study.points.map(point=>`<li>${esc(point)}</li>`).join('')}</ul></div>`;}
function applyMarkup(station){const selected=state.applySelected,feedback=state.applyFeedback;return `<div class="ekg-task-panel"><h3>Apply it</h3><p>${esc(station.apply.prompt)}</p><div class="ekg-options">${station.apply.options.map(option=>`<label class="ekg-option ${selected===option?'selected':''}"><input type="radio" name="ekg-station-answer" value="${esc(option)}" ${selected===option?'checked':''}><span>${esc(option)}</span></label>`).join('')}</div><div class="ekg-feedback" aria-live="polite">${state.showHint?`<div class="notice"><strong>Hint:</strong> ${esc(station.apply.hint)}</div>`:''}${feedback?`<div class="notice ${feedback.correct?'success':'error'}"><strong>${feedback.correct?'Correct.':'Review and try again.'}</strong> ${esc(feedback.correct?station.apply.rationale:'Use the hint, the strip, and the patient-first sequence before trying again.')}</div>`:''}</div></div>`;}
function recapMarkup(station){return `<div class="ekg-task-panel"><h3>Recap</h3><div class="ekg-recap-grid"><div><strong>What you reviewed</strong><p>${esc(station.recap.reviewed)}</p></div><div><strong>You should now be able to…</strong><p>${esc(station.recap.canDo)}</p></div></div><div class="ekg-reference"><strong>Further study:</strong> ${esc(state.pack.reference)}</div></div>`;}
function stationConfirmMarkup(){if(state.confirming!=='station')return '';return `<div class="ekg-confirm" role="dialog" aria-modal="true" aria-label="Confirm station answer"><strong>Are you sure?</strong><p>${state.applySelected?`You selected <strong>${esc(state.applySelected)}</strong>.`:''}</p><div class="actions"><button class="btn primary" type="button" data-ekg-station-submit>Submit answer</button><button class="btn secondary" type="button" data-ekg-station-change>Change answer</button></div></div>`;}
function renderStation(){
  const station=currentStation();if(!station)return;state.mode='station';openWorkspace(station.title+' guided station');
  const task=state.stationStep==='study'?studyMarkup(station):state.stationStep==='apply'?applyMarkup(station):recapMarkup(station);
  let primary='';if(state.stationStep==='study')primary='<button class="btn primary" type="button" data-ekg-station-step="apply">Apply this skill</button>';else if(state.stationStep==='apply'&&state.applyFeedback&&state.applyFeedback.correct)primary='<button class="btn primary" type="button" data-ekg-station-step="recap">Continue to recap</button>';else if(state.stationStep==='apply')primary=`<button class="btn primary" type="button" data-ekg-station-check ${state.applySelected?'':'disabled'}>Check answer</button>`;else primary='<button class="btn primary" type="button" data-ekg-station-complete>Complete & continue</button>';
  workspace.innerHTML=`<div class="ekg-workspace-top"><div><div class="eyebrow">EKG guided station · ${state.stationIndex+1} of ${state.pack.stations.length}</div><h2>${esc(station.title)}</h2></div><div class="ekg-display-actions"><button class="btn secondary" type="button" data-ekg-fullscreen>Full screen</button><button class="btn secondary" type="button" data-ekg-exit-fullscreen>Exit full screen</button><button class="btn secondary" type="button" data-ekg-close>Close</button></div></div><div class="ekg-rotate-note">For the clearest strip view on a phone, rotate to landscape.</div><div class="ekg-station-nav">${stationNavMarkup()}</div>${stepperMarkup()}<div class="ekg-visual-workstation"><div class="ekg-visual-pane">${stripMarkup(station)}</div><aside class="ekg-task-rail">${task}<div class="ekg-workspace-actions"><button class="btn secondary" type="button" data-ekg-station-prev ${state.stationIndex===0?'disabled':''}>Previous station</button><div class="right">${state.stationStep==='apply'?`<button class="btn secondary" type="button" data-ekg-station-hint>${state.showHint?'Hide hint':'Hint'}</button>`:''}${primary}</div></div></aside></div>${stationConfirmMarkup()}`;
}
function resetStationInteraction(){state.stationStep='study';state.applySelected=null;state.applyFeedback=null;state.showHint=false;state.confirming=null;}
function openStation(index){state.stationIndex=Math.max(0,Math.min((state.pack.stations||[]).length-1,Number(index)));resetStationInteraction();renderStation();}
function gradeStationAnswer(){const station=currentStation();const correct=state.applySelected===station.apply.answer;state.applyFeedback={correct};state.confirming=null;if(!correct)state.showHint=true;renderStation();}
function completeStation(){const station=currentStation();if(!station||state.stationStep!=='recap')return;saveLabs(engine.setStation(state.saved.labs,station.id,true,new Date().toISOString()));renderSummary();renderStations();if(state.stationIndex<state.pack.stations.length-1){state.stationIndex+=1;resetStationInteraction();renderStation();}else closeWorkspace();}

function checkpointNavMarkup(){return state.questions.map((question,index)=>{const answered=Object.prototype.hasOwnProperty.call(state.answers,String(question.id)),current=index===state.checkpointIndex;return `<button type="button" class="${current?'current':answered?'answered':''}" data-ekg-checkpoint-go="${index}" aria-current="${current?'step':'false'}">${answered?'✓':index+1}</button>`;}).join('');}
function checkpointConfirmMarkup(){if(state.confirming!=='checkpoint')return '';return `<div class="ekg-confirm" role="dialog" aria-modal="true" aria-label="Confirm checkpoint submission"><strong>Are you sure?</strong><p>All 10 answers will be scored together. Correctness has not been shown while you moved through the checkpoint.</p><div class="actions"><button class="btn primary" type="button" data-ekg-checkpoint-submit>Score checkpoint</button><button class="btn secondary" type="button" data-ekg-checkpoint-change>Keep reviewing</button></div></div>`;}
function renderCheckpoint(){
  state.mode='checkpoint';openWorkspace('EKG 10-question checkpoint');if(state.record){renderCheckpointResult();return;}
  const question=state.questions[state.checkpointIndex];if(!question)return;const selected=state.answers[String(question.id)]??null;
  workspace.innerHTML=`<div class="ekg-workspace-top"><div><div class="eyebrow">D2B · D3C EKG checkpoint</div><h2>Question ${state.checkpointIndex+1} of ${state.questions.length}</h2></div><button class="btn secondary" type="button" data-ekg-close>Close checkpoint</button></div><div class="ekg-checkpoint-shell"><div class="ekg-checkpoint-progress" aria-label="Checkpoint questions">${checkpointNavMarkup()}</div>${state.checkpointNotice?`<div class="notice">${esc(state.checkpointNotice)}</div>`:''}<div class="ekg-question-focused"><div class="qnum">Question ${state.checkpointIndex+1}</div><h3>${esc(question.prompt)}</h3><div class="ekg-options">${question.options.map(option=>`<label class="ekg-option ${selected===option?'selected':''}"><input type="radio" name="ekg-checkpoint-answer" value="${esc(option)}" ${selected===option?'checked':''}><span>${esc(option)}</span></label>`).join('')}</div></div><div class="ekg-workspace-actions"><button class="btn secondary" type="button" data-ekg-checkpoint-prev ${state.checkpointIndex===0?'disabled':''}>Previous</button><div class="right"><button class="btn primary" type="button" data-ekg-checkpoint-next>${state.checkpointIndex===state.questions.length-1?'Finish checkpoint':'Next'}</button></div></div></div>${checkpointConfirmMarkup()}`;
}
function startCheckpoint(){
  saveLabs(engine.start(state.saved.labs,new Date().toISOString()));state.questions=engine.selectQuestions(state.bank,engine.SESSION_SIZE,'ekg|'+new Date().toISOString());
  if(state.questions.length<engine.SESSION_SIZE){openWorkspace('EKG checkpoint unavailable');workspace.innerHTML='<div class="notice error"><strong>EKG checkpoint unavailable.</strong> Fewer than ten eligible combined EKG checkpoint questions were found.</div>';return;}
  state.checkpointIndex=0;state.answers={};state.checkpointNotice='';state.record=null;state.confirming=null;renderSummary();renderCheckpoint();
}
function checkpointNext(){
  const question=state.questions[state.checkpointIndex];if(!Object.prototype.hasOwnProperty.call(state.answers,String(question.id))){state.checkpointNotice='Choose an answer before continuing.';renderCheckpoint();return;}
  state.checkpointNotice='';if(state.checkpointIndex<state.questions.length-1){state.checkpointIndex+=1;renderCheckpoint();return;}
  const missing=state.questions.some(item=>!Object.prototype.hasOwnProperty.call(state.answers,String(item.id)));if(missing){state.checkpointNotice='Answer every question before scoring the checkpoint.';renderCheckpoint();return;}state.confirming='checkpoint';renderCheckpoint();
}
function scoreCheckpoint(){const record=engine.gradeSession({questions:state.questions,answers:state.answers,completedAt:new Date().toISOString()});saveLabs(engine.applySession(state.saved.labs,record));state.record=record;state.confirming=null;renderSummary();renderStations();renderCheckpointResult();}
function renderCheckpointResult(){
  const record=state.record;const data=report();const byId=new Map(state.questions.map(question=>[String(question.id),question]));const review=record.responses.map((response,index)=>{const question=byId.get(String(response.id));return `<details class="ekg-review ${response.correct?'correct':'retry'}"><summary>${index+1}. ${response.correct?'Correct':'Review'} · ${esc(question&&question.topic||response.taskCode||'EKG')}</summary><p><strong>Answer:</strong> ${esc(question&&question.answer)}</p><p>${esc(question&&question.rationale||'Review signal validity, the patient, the rate-to-relationship sequence, escalation boundaries, and documentation before another attempt.')}</p></details>`;}).join('');
  workspace.innerHTML=`<div class="ekg-workspace-top"><div><div class="eyebrow">EKG checkpoint result</div><h2>${record.percent}% · ${record.correct}/${record.total} correct</h2></div><button class="btn secondary" type="button" data-ekg-close>Close</button></div><div class="ekg-result ${record.passed?'pass':'retry'}"><h3>${data.completed?'EKG lab completed':record.passed?'Checkpoint passed—finish the guided stations':'Checkpoint saved—review and retry'}</h3><p>${data.completed?'All seven guided stations and the checkpoint requirement are complete.':record.passed?'The 80% checkpoint requirement is complete. Finish every guided station to complete the lab.':'An 80% score is required. Your best score and attempt history remain preserved.'}</p></div><h3>Answer review</h3>${review}`;
}

function enterFullscreen(){if(workspace.requestFullscreen)workspace.requestFullscreen().catch(()=>{});}
function exitFullscreen(){if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});}

async function init(){
  try{
    state.saved=storage.load();
    const [d2b,d3c,supplement,pack]=await Promise.all(['data/question-bank/d2b.json','data/question-bank/d3c.json','data/labs/ekg-checkpoint-supplement.json','data/ekg/guided-stations.json'].map(loadJson));
    if(!supplement||!supplement.meta||supplement.meta.appAuthored!==true||!Array.isArray(supplement.questions)||supplement.meta.questionCount!==supplement.questions.length)throw new Error('The app-authored EKG supplement failed its metadata contract.');
    if(!pack||pack.version!=='1.0.0'||!Array.isArray(pack.stations)||pack.stations.length!==engine.STATIONS.length)throw new Error('The guided EKG station pack failed its metadata contract.');
    const engineIds=engine.STATIONS.map(item=>item.id);const packIds=pack.stations.map(item=>item.id);if(JSON.stringify(engineIds)!==JSON.stringify(packIds))throw new Error('The guided EKG station order does not match the durable progress record.');
    state.pack=pack;state.bank=[...(d2b.questions||[]),...(d3c.questions||[]),...supplement.questions];
    if(engine.eligibleQuestions(state.bank).length<engine.SESSION_SIZE)throw new Error('The validated bank and app-authored EKG supplement do not contain enough eligible questions.');
    renderSummary();renderStations();
  }catch(error){workspace.hidden=false;workspace.innerHTML=`<div class="notice error"><strong>EKG lab could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;checkpointButtons.forEach(button=>button.disabled=true);}
}

checkpointButtons.forEach(button=>button.addEventListener('click',startCheckpoint));
document.addEventListener('change',event=>{const stationAnswer=event.target.closest('[name="ekg-station-answer"]');if(stationAnswer){state.applySelected=stationAnswer.value;state.applyFeedback=null;state.confirming=null;renderStation();return;}const checkpointAnswer=event.target.closest('[name="ekg-checkpoint-answer"]');if(checkpointAnswer){const question=state.questions[state.checkpointIndex];if(question)state.answers[String(question.id)]=checkpointAnswer.value;state.checkpointNotice='';renderCheckpoint();}});
document.addEventListener('click',event=>{
  const open=event.target.closest('[data-ekg-open-station]');if(open){openStation(open.dataset.ekgOpenStation);return;}
  const nav=event.target.closest('[data-ekg-station-nav]');if(nav){openStation(nav.dataset.ekgStationNav);return;}
  if(event.target.closest('[data-ekg-close]')){closeWorkspace();return;}
  if(event.target.closest('[data-ekg-fullscreen]')){enterFullscreen();return;}
  if(event.target.closest('[data-ekg-exit-fullscreen]')){exitFullscreen();return;}
  const step=event.target.closest('[data-ekg-station-step]');if(step){state.stationStep=step.dataset.ekgStationStep;state.confirming=null;renderStation();return;}
  if(event.target.closest('[data-ekg-station-check]')){if(state.applySelected){state.confirming='station';renderStation();}return;}
  if(event.target.closest('[data-ekg-station-submit]')){gradeStationAnswer();return;}
  if(event.target.closest('[data-ekg-station-change]')){state.confirming=null;renderStation();return;}
  if(event.target.closest('[data-ekg-station-hint]')){state.showHint=!state.showHint;renderStation();return;}
  if(event.target.closest('[data-ekg-station-complete]')){completeStation();return;}
  if(event.target.closest('[data-ekg-station-prev]')){if(state.stationIndex>0)openStation(state.stationIndex-1);return;}
  const go=event.target.closest('[data-ekg-checkpoint-go]');if(go){state.checkpointIndex=Number(go.dataset.ekgCheckpointGo);state.checkpointNotice='';state.confirming=null;renderCheckpoint();return;}
  if(event.target.closest('[data-ekg-checkpoint-prev]')){if(state.checkpointIndex>0)state.checkpointIndex-=1;state.checkpointNotice='';state.confirming=null;renderCheckpoint();return;}
  if(event.target.closest('[data-ekg-checkpoint-next]')){checkpointNext();return;}
  if(event.target.closest('[data-ekg-checkpoint-submit]')){scoreCheckpoint();return;}
  if(event.target.closest('[data-ekg-checkpoint-change]')){state.confirming=null;renderCheckpoint();}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
