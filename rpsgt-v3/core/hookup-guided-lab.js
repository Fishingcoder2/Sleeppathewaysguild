(function(){
'use strict';
const engine=window.RPSGTHookupLabEngine;
const storage=window.RPSGTStorage;
const workspace=document.querySelector('[data-hookup-workspace]');
const summaryHost=document.querySelector('[data-hookup-summary]');
const stationHost=document.querySelector('[data-hookup-stations]');
const startButtons=[...document.querySelectorAll('[data-hookup-start]')];
if(!engine||!storage||!workspace||!summaryHost||!stationHost||!startButtons.length)return;

const state={saved:null,bank:[],pack:null,mode:null,stationIndex:0,stationStep:'study',applySelected:null,applyFeedback:null,showHint:false,confirming:null,questions:[],checkpointIndex:0,answers:{},checkpointNotice:'',record:null};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatDate=value=>value?new Date(value).toLocaleString():'Not recorded';
async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
function saveLabs(nextLabs){state.saved.labs=nextLabs;state.saved=storage.save(state.saved);}
function currentStation(){return state.pack&&state.pack.stations&&state.pack.stations[state.stationIndex]||null;}
function report(){return engine.summary(state.saved.labs);}

function renderSummary(){
  const data=report();
  summaryHost.innerHTML=`<div><span>Status</span><strong>${data.completed?'Completed':data.status==='in-progress'?'In progress':'Not started'}</strong></div><div><span>Guided stations</span><strong>${data.stationsComplete}/${data.stationCount}</strong></div><div><span>Best checkpoint</span><strong>${data.attempts?data.bestPercent+'%':'—'}</strong></div><div><span>Attempts</span><strong>${data.attempts}</strong></div><div><span>Last checkpoint</span><strong>${data.latestSession?formatDate(data.latestSession.completedAt):'—'}</strong></div>`;
  startButtons.forEach(button=>{button.textContent=data.completed?'Practice another 10-question checkpoint':data.attempts?'Start another 10-question checkpoint':'Start 10-question checkpoint';});
}
function recommendedStationIndex(){const data=report();const stations=state.pack&&state.pack.stations||[];const found=stations.findIndex(item=>!data.checklist[item.id]);return found<0?0:found;}
function renderStations(){
  const data=report();const stations=state.pack&&state.pack.stations||[];const recommended=recommendedStationIndex();
  stationHost.classList.add('guided');
  stationHost.innerHTML=stations.map((station,index)=>{const complete=data.checklist[station.id]===true;const cls=complete?'complete':index===recommended?'recommended':'';return `<button class="hookup-station-card ${cls}" type="button" data-hookup-open-station="${index}"><span class="number">${complete?'✓':index+1}</span><span><strong>${esc(station.title)}</strong><small>${complete?'Guided station completed':'Study → Apply → Recap'}</small></span><span class="state">${complete?'Completed':index===recommended?'Recommended next':'Open station'}</span></button>`;}).join('');
}
function openModal(){workspace.hidden=false;workspace.classList.add('hookup-modal-active');workspace.setAttribute('role','dialog');workspace.setAttribute('aria-modal','true');document.body.classList.add('hookup-modal-open');}
function closeModal(){state.mode=null;state.confirming=null;workspace.classList.remove('hookup-modal-active');workspace.hidden=true;workspace.innerHTML='';workspace.removeAttribute('role');workspace.removeAttribute('aria-modal');document.body.classList.remove('hookup-modal-open');}
function stationNavMarkup(){const data=report();return (state.pack.stations||[]).map((station,index)=>{const complete=data.checklist[station.id]===true,current=index===state.stationIndex,recommended=!complete&&index===recommendedStationIndex();const cls=complete?'complete':current?'current':recommended?'recommended':'';return `<button type="button" class="${cls}" data-hookup-station-nav="${index}" aria-label="${esc(station.title)}" aria-current="${current?'step':'false'}">${complete?'✓':index+1}</button>`;}).join('');}
function stepperMarkup(){return `<div class="hookup-stepper"><span class="${state.stationStep==='study'?'active':''}">1 · Study</span><span class="${state.stationStep==='apply'?'active':''}">2 · Apply</span><span class="${state.stationStep==='recap'?'active':''}">3 · Recap</span></div>`;}
function schematicMarkup(station){
  const id=station.id;
  if(id==='landmark-plan')return `<div class="hookup-schematic"><div class="hookup-schematic-title">Measured landmark plan</div><div class="hookup-head"><span class="hookup-landmark nasion">Nasion</span><span class="hookup-landmark inion">Inion</span><span class="hookup-landmark left">L preauricular</span><span class="hookup-landmark right">R preauricular</span></div><p>Measure from reproducible landmarks; do not place cephalic sites by eye alone.</p><p class="hookup-disclosure"><strong>AI-generated teaching schematic · Not a patient recording.</strong> Real head shapes and clinical setups vary.</p></div>`;
  if(id==='application-impedance')return `<div class="hookup-schematic"><div class="hookup-schematic-title">Troubleshoot the patient circuit</div><div class="hookup-pathway"><span>Electrode ↔ skin</span><b>→</b><span>Lead wire</span><b>→</b><span>Input board</span><b>→</b><span>Amplifier</span><b>→</b><span>Display</span></div><p>Start with the most likely local cause, then follow the pathway until the signal is restored.</p><p class="hookup-disclosure"><strong>AI-generated teaching schematic · Not a patient recording.</strong> Equipment layouts differ by system and facility.</p></div>`;
  if(id==='calibrations')return `<div class="hookup-schematic"><div class="hookup-schematic-title">Calibration workflow</div><div class="hookup-cal-flow"><span>Equipment / montage checks</span><span>Patient connected</span><span>Physiologic calibration commands</span><span>Baseline established before lights out</span><span>Post-study calibration / documentation as required</span></div><p class="hookup-disclosure"><strong>AI-generated teaching schematic · Not a patient recording.</strong> Follow current facility and manufacturer procedures.</p></div>`;
  if(id==='signal-documentation')return `<div class="hookup-schematic"><div class="hookup-schematic-title">Use the pattern of failure</div><div class="hookup-branch-grid"><div><strong>One channel changes</strong><p>Think local electrode, lead, connector, or channel pathway.</p></div><div><strong>Many related channels change together</strong><p>Think shared reference, board, connection, amplifier, or system pathway.</p></div></div><p class="hookup-disclosure"><strong>AI-generated teaching schematic · Not a patient recording.</strong> Real acquisition systems may respond differently to disconnections.</p></div>`;
  if(id==='patient-site')return `<div class="hookup-schematic"><div class="hookup-schematic-title">Site-quality sequence</div><div class="hookup-pathway"><span>Explain</span><b>→</b><span>Inspect</span><b>→</b><span>Prepare</span><b>→</b><span>Apply</span><b>→</b><span>Recheck</span></div><p>Reliable contact is the goal; more abrasive or conductive material is not automatically better.</p></div>`;
  return `<div class="hookup-schematic"><div class="hookup-schematic-title">Pre-application sequence</div><div class="hookup-pathway"><span>Order</span><b>→</b><span>Patient</span><b>→</b><span>Study type</span><b>→</b><span>Montage</span><b>→</b><span>Equipment</span></div><p>A repeatable sequence catches preventable setup errors before application.</p></div>`;
}
function studyMarkup(station){return `<div class="hookup-study-grid"><div class="hookup-teaching-card"><h3>${esc(station.title)}</h3><p>${esc(station.study.intro)}</p><ul class="hookup-points">${station.study.points.map(point=>`<li>${esc(point)}</li>`).join('')}</ul></div>${schematicMarkup(station)}</div>`;}
function applyMarkup(station){
  const selected=state.applySelected,feedback=state.applyFeedback;
  return `<div class="hookup-apply-card"><h3>Apply it</h3><p>${esc(station.apply.prompt)}</p><div class="hookup-options">${station.apply.options.map(option=>`<label class="hookup-option ${selected===option?'selected':''}"><input type="radio" name="hookup-station-answer" value="${esc(option)}" ${selected===option?'checked':''}><span>${esc(option)}</span></label>`).join('')}</div><div class="hookup-feedback" aria-live="polite">${state.showHint?`<div class="notice"><strong>Hint:</strong> ${esc(station.apply.hint)}</div>`:''}${feedback?`<div class="notice ${feedback.correct?'success':'error'}"><strong>${feedback.correct?'Correct.':'Review and try again.'}</strong> ${esc(feedback.correct?station.apply.rationale:'Use the hint or reconsider the signal/setup pathway before continuing.')}</div>`:''}</div></div>`;
}
function recapMarkup(station){return `<div class="hookup-recap-card"><h3>Recap</h3><div class="hookup-recap-columns"><div><strong>What you reviewed</strong><p>${esc(station.recap.reviewed)}</p></div><div><strong>You should now be able to…</strong><p>${esc(station.recap.canDo)}</p></div></div><div class="hookup-reference"><strong>Further study:</strong> ${esc(state.pack.reference)}</div></div>`;}
function stationConfirmMarkup(station){if(state.confirming!=='station')return '';return `<div class="hookup-confirm" role="dialog" aria-modal="true" aria-label="Confirm station answer"><strong>Are you sure?</strong><p>${state.applySelected?`You selected <strong>${esc(state.applySelected)}</strong>.`:''}</p><div class="actions"><button class="btn primary" type="button" data-hookup-station-submit>Submit answer</button><button class="btn secondary" type="button" data-hookup-station-change>Change answer</button></div></div>`;}
function renderStation(){
  const station=currentStation();if(!station)return;state.mode='station';openModal();workspace.setAttribute('aria-label',station.title+' guided station');
  let content=state.stationStep==='study'?studyMarkup(station):state.stationStep==='apply'?applyMarkup(station):recapMarkup(station);
  let primary='';if(state.stationStep==='study')primary='<button class="btn primary" type="button" data-hookup-station-step="apply">Apply this skill</button>';else if(state.stationStep==='apply'&&state.applyFeedback&&state.applyFeedback.correct)primary='<button class="btn primary" type="button" data-hookup-station-step="recap">Continue to recap</button>';else if(state.stationStep==='apply')primary=`<button class="btn primary" type="button" data-hookup-station-check ${state.applySelected?'':'disabled'}>Check answer</button>`;else primary=`<button class="btn primary" type="button" data-hookup-station-complete>${state.stationIndex===state.pack.stations.length-1?'Complete station':'Complete & next station'}</button>`;
  workspace.innerHTML=`<div class="hookup-modal-top"><div><div class="eyebrow">Hookup guided station · ${state.stationIndex+1} of ${state.pack.stations.length}</div><h2>${esc(station.title)}</h2></div><button class="hookup-modal-close" type="button" data-hookup-close aria-label="Close Hookup station">×</button></div><div class="hookup-modal-nav">${stationNavMarkup()}</div><div class="hookup-modal-body">${stepperMarkup()}${content}<div class="hookup-modal-actions"><button class="btn secondary" type="button" data-hookup-station-prev ${state.stationIndex===0?'disabled':''}>Previous station</button><div class="right">${state.stationStep==='apply'?`<button class="btn secondary" type="button" data-hookup-station-hint>${state.showHint?'Hide hint':'Hint'}</button>`:''}${primary}</div></div></div>${stationConfirmMarkup(station)}`;
}
function resetStationInteraction(){state.stationStep='study';state.applySelected=null;state.applyFeedback=null;state.showHint=false;state.confirming=null;}
function openStation(index){state.stationIndex=Math.max(0,Math.min((state.pack.stations||[]).length-1,Number(index)));resetStationInteraction();renderStation();}
function gradeStationAnswer(){const station=currentStation();const correct=state.applySelected===station.apply.answer;state.applyFeedback={correct};state.confirming=null;if(!correct)state.showHint=true;renderStation();}
function completeStation(){const station=currentStation();if(!station||state.stationStep!=='recap')return;saveLabs(engine.setStation(state.saved.labs,station.id,true,new Date().toISOString()));renderSummary();renderStations();if(state.stationIndex<state.pack.stations.length-1){state.stationIndex+=1;resetStationInteraction();renderStation();}else closeModal();}

function checkpointNavMarkup(){return state.questions.map((question,index)=>{const answered=Object.prototype.hasOwnProperty.call(state.answers,String(question.id)),current=index===state.checkpointIndex;return `<button type="button" class="${current?'current':answered?'answered':''}" data-hookup-checkpoint-go="${index}" aria-current="${current?'step':'false'}">${answered?'✓':index+1}</button>`;}).join('');}
function checkpointConfirmMarkup(){if(state.confirming!=='checkpoint')return '';return `<div class="hookup-confirm" role="dialog" aria-modal="true" aria-label="Confirm checkpoint submission"><strong>Are you sure?</strong><p>All 10 answers will be scored together. Correctness has not been shown while you moved through the checkpoint.</p><div class="actions"><button class="btn primary" type="button" data-hookup-checkpoint-submit>Score checkpoint</button><button class="btn secondary" type="button" data-hookup-checkpoint-change>Keep reviewing</button></div></div>`;}
function renderCheckpoint(){
  state.mode='checkpoint';openModal();workspace.setAttribute('aria-label','Hookup 10-question checkpoint');
  if(state.record){renderCheckpointResult();return;}
  const question=state.questions[state.checkpointIndex];if(!question)return;const selected=state.answers[String(question.id)]??null;
  workspace.innerHTML=`<div class="hookup-modal-top"><div><div class="eyebrow">D2A · D2B Hookup checkpoint</div><h2>Question ${state.checkpointIndex+1} of ${state.questions.length}</h2></div><button class="hookup-modal-close" type="button" data-hookup-close aria-label="Close checkpoint">×</button></div><div class="hookup-modal-body"><div class="hookup-checkpoint-shell"><div class="hookup-checkpoint-progress" aria-label="Checkpoint questions">${checkpointNavMarkup()}</div>${state.checkpointNotice?`<div class="notice">${esc(state.checkpointNotice)}</div>`:''}<div class="hookup-checkpoint-question"><div class="qnum">Question ${state.checkpointIndex+1}</div><h3>${esc(question.prompt)}</h3><div class="hookup-options">${question.options.map(option=>`<label class="hookup-option ${selected===option?'selected':''}"><input type="radio" name="hookup-checkpoint-answer" value="${esc(option)}" ${selected===option?'checked':''}><span>${esc(option)}</span></label>`).join('')}</div></div><div class="hookup-modal-actions"><button class="btn secondary" type="button" data-hookup-checkpoint-prev ${state.checkpointIndex===0?'disabled':''}>Previous</button><div class="right"><button class="btn primary" type="button" data-hookup-checkpoint-next>${state.checkpointIndex===state.questions.length-1?'Finish checkpoint':'Next'}</button></div></div></div></div>${checkpointConfirmMarkup()}`;
}
function startCheckpoint(){
  saveLabs(engine.start(state.saved.labs,new Date().toISOString()));state.questions=engine.selectQuestions(state.bank,engine.SESSION_SIZE,'hookup|'+new Date().toISOString());
  if(state.questions.length<engine.SESSION_SIZE){openModal();workspace.innerHTML='<div class="hookup-modal-body"><div class="notice error"><strong>Hookup checkpoint unavailable.</strong> Fewer than ten eligible learner-practice questions were found.</div></div>';return;}
  state.checkpointIndex=0;state.answers={};state.checkpointNotice='';state.record=null;state.confirming=null;renderSummary();renderCheckpoint();
}
function checkpointNext(){
  state.checkpointNotice='';if(state.checkpointIndex<state.questions.length-1){state.checkpointIndex+=1;renderCheckpoint();return;}
  const firstUnanswered=state.questions.findIndex(question=>!Object.prototype.hasOwnProperty.call(state.answers,String(question.id)));if(firstUnanswered>=0){state.checkpointIndex=firstUnanswered;state.checkpointNotice='Answer every question before scoring the checkpoint.';renderCheckpoint();return;}state.confirming='checkpoint';renderCheckpoint();
}
function scoreCheckpoint(){const record=engine.gradeSession({questions:state.questions,answers:state.answers,completedAt:new Date().toISOString()});saveLabs(engine.applySession(state.saved.labs,record));state.record=record;state.confirming=null;renderSummary();renderStations();renderCheckpointResult();}
function renderCheckpointResult(){
  const record=state.record,data=report(),byId=new Map(state.questions.map(question=>[String(question.id),question]));const review=record.responses.map((response,index)=>{const question=byId.get(String(response.id));return `<details class="hookup-review ${response.correct?'correct':'retry'}"><summary>${index+1}. ${response.correct?'Correct':'Review'} · ${esc(question&&question.topic||response.taskCode||'Hookup')}</summary><p><strong>Answer:</strong> ${esc(question&&question.answer)}</p><p>${esc(question&&question.rationale||'Review the setup decision and try another checkpoint.')}</p></details>`;}).join('');
  workspace.innerHTML=`<div class="hookup-modal-top"><div><div class="eyebrow">Hookup checkpoint result</div><h2>${data.completed?'Hookup Lab completed':record.passed?'Checkpoint passed':'Review and retry'}</h2></div><button class="hookup-modal-close" type="button" data-hookup-close aria-label="Close checkpoint result">×</button></div><div class="hookup-modal-body"><div class="hookup-checkpoint-result ${record.passed?'pass':'retry'}"><strong>${record.correct}/${record.total} correct · ${record.percent}%</strong><p>${data.completed?'All six guided stations and the checkpoint requirement are complete.':record.passed?'The checkpoint requirement is complete. Finish any remaining guided stations to complete the lab.':'An 80% score is required. Your best score and attempt history remain preserved.'}</p></div><h3>Answer review</h3>${review}<div class="hookup-modal-actions"><button class="btn secondary" type="button" data-hookup-close>Close</button><div class="right"><button class="btn primary" type="button" data-hookup-checkpoint-retry>Practice another checkpoint</button></div></div></div>`;
}

function handleClick(event){
  const stationCard=event.target.closest('[data-hookup-open-station]');if(stationCard){event.preventDefault();openStation(stationCard.dataset.hookupOpenStation);return;}
  if(event.target.closest('[data-hookup-start],[data-hookup-checkpoint-retry]')){event.preventDefault();startCheckpoint();return;}
  if(event.target.closest('[data-hookup-close]')){event.preventDefault();closeModal();return;}
  if(state.mode==='station'){
    const nav=event.target.closest('[data-hookup-station-nav]');if(nav){event.preventDefault();openStation(nav.dataset.hookupStationNav);return;}
    if(event.target.closest('[data-hookup-station-prev]')){event.preventDefault();if(state.stationIndex>0)openStation(state.stationIndex-1);return;}
    const step=event.target.closest('[data-hookup-station-step]');if(step){event.preventDefault();state.stationStep=step.dataset.hookupStationStep;state.confirming=null;renderStation();return;}
    if(event.target.closest('[data-hookup-station-hint]')){event.preventDefault();state.showHint=!state.showHint;renderStation();return;}
    if(event.target.closest('[data-hookup-station-check]')){event.preventDefault();if(state.applySelected){state.confirming='station';renderStation();}return;}
    if(event.target.closest('[data-hookup-station-submit]')){event.preventDefault();gradeStationAnswer();return;}
    if(event.target.closest('[data-hookup-station-change]')){event.preventDefault();state.confirming=null;renderStation();return;}
    if(event.target.closest('[data-hookup-station-complete]')){event.preventDefault();completeStation();return;}
  }
  if(state.mode==='checkpoint'){
    const go=event.target.closest('[data-hookup-checkpoint-go]');if(go){event.preventDefault();state.checkpointIndex=Number(go.dataset.hookupCheckpointGo);state.checkpointNotice='';renderCheckpoint();return;}
    if(event.target.closest('[data-hookup-checkpoint-prev]')){event.preventDefault();if(state.checkpointIndex>0){state.checkpointIndex-=1;state.checkpointNotice='';renderCheckpoint();}return;}
    if(event.target.closest('[data-hookup-checkpoint-next]')){event.preventDefault();checkpointNext();return;}
    if(event.target.closest('[data-hookup-checkpoint-submit]')){event.preventDefault();scoreCheckpoint();return;}
    if(event.target.closest('[data-hookup-checkpoint-change]')){event.preventDefault();state.confirming=null;renderCheckpoint();return;}
  }
}
function handleChange(event){
  if(state.mode==='station'&&event.target.matches('[name="hookup-station-answer"]')){state.applySelected=event.target.value;state.applyFeedback=null;state.confirming=null;renderStation();return;}
  if(state.mode==='checkpoint'&&event.target.matches('[name="hookup-checkpoint-answer"]')){const question=state.questions[state.checkpointIndex];state.answers[String(question.id)]=event.target.value;state.checkpointNotice='';renderCheckpoint();}
}
async function init(){
  try{state.saved=storage.load();const [pack,d2a,d2b]=await Promise.all([loadJson('data/hookup/guided-stations.json'),loadJson('data/question-bank/d2a.json'),loadJson('data/question-bank/d2b.json')]);state.pack=pack;state.bank=[...(d2a.questions||[]),...(d2b.questions||[])];if(!Array.isArray(pack.stations)||pack.stations.length!==engine.STATIONS.length)throw new Error('Guided station content is incomplete.');if(engine.eligibleQuestions(state.bank).length<engine.SESSION_SIZE)throw new Error('The validated D2A/D2B banks do not contain enough eligible hookup questions.');renderSummary();renderStations();}
  catch(error){workspace.hidden=false;workspace.innerHTML=`<div class="notice error"><strong>Hookup Lab could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;startButtons.forEach(button=>button.disabled=true);}
}
document.addEventListener('click',handleClick,true);document.addEventListener('change',handleChange,true);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.mode){event.preventDefault();closeModal();}});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
