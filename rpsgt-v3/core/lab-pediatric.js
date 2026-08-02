(function(){
  'use strict';
  const engine=window.RPSGTPediatricLabEngine;
  const workspace=document.querySelector('[data-pediatric-workspace]');
  const summaryHost=document.querySelector('[data-pediatric-summary]');
  const stationHost=document.querySelector('[data-pediatric-stations]');
  const startButton=document.querySelector('[data-pediatric-start]');
  if(!workspace||!summaryHost||!stationHost||!startButton) return;
  const state={saved:null,questions:[],bank:[]};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>value?new Date(value).toLocaleString():'Not recorded';
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveLabs(nextLabs){state.saved.labs=nextLabs;state.saved=window.RPSGTStorage.save(state.saved);}
  function renderSummary(){
    const report=engine.summary(state.saved.labs);
    summaryHost.innerHTML=`<div><span>Status</span><strong>${report.completed?'Completed':report.status==='in-progress'?'In progress':'Not started'}</strong></div><div><span>Review stations</span><strong>${report.stationsComplete}/${report.stationCount}</strong></div><div><span>Best checkpoint</span><strong>${report.attempts?report.bestPercent+'%':'—'}</strong></div><div><span>Attempts</span><strong>${report.attempts}</strong></div><div><span>Last checkpoint</span><strong>${report.latestSession?formatDate(report.latestSession.completedAt):'—'}</strong></div>`;
    startButton.textContent=report.attempts?'Start another 10-question checkpoint':'Start 10-question checkpoint';
    if(report.completed) startButton.textContent='Practice another 10-question checkpoint';
  }
  function renderStations(){
    const report=engine.summary(state.saved.labs);
    stationHost.innerHTML=engine.STATIONS.map((station,index)=>`<label class="pediatric-station ${report.checklist[station.id]?'complete':''}"><input type="checkbox" data-pediatric-station="${esc(station.id)}" ${report.checklist[station.id]?'checked':''} ${report.completed?'disabled':''}><span class="pediatric-station-number">${index+1}</span><span><strong>${esc(station.title)}</strong><small>${esc(station.focus)}</small></span></label>`).join('');
  }
  function renderSession(){
    workspace.hidden=false;
    workspace.innerHTML=`<div class="section-head"><div><div class="eyebrow">D1A · D1C · D3A · D3B · D4A pediatric checkpoint</div><h2>Ten learner-practice questions</h2></div><button class="btn secondary" type="button" data-pediatric-cancel>Close checkpoint</button></div><p class="report-intro">This checkpoint draws pediatric-relevant learner questions from the validated assessment, safety, staging, respiratory, and treatment banks.</p><form data-pediatric-form>${state.questions.map((question,index)=>`<fieldset class="pediatric-question"><legend><span>${index+1}</span>${esc(question.prompt)}</legend>${question.options.map(option=>`<label><input type="radio" name="pediatric-${esc(question.id)}" value="${esc(option)}"> <span>${esc(option)}</span></label>`).join('')}</fieldset>`).join('')}<div class="actions"><button class="btn primary" type="submit">Score pediatric checkpoint</button></div></form><div data-pediatric-result></div>`;
    workspace.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderResult(record){
    const host=workspace.querySelector('[data-pediatric-result]');const byId=new Map(state.questions.map(question=>[String(question.id),question]));
    const review=record.responses.map((response,index)=>{const question=byId.get(String(response.id));return `<details class="pediatric-review ${response.correct?'correct':'retry'}"><summary>${index+1}. ${response.correct?'Correct':'Review'} · ${esc(question&&question.topic||response.taskCode||'Pediatric sleep')}</summary><p><strong>Answer:</strong> ${esc(question&&question.answer)}</p><p>${esc(question&&question.rationale||'Review the pediatric sleep-study pathway and try another checkpoint.')}</p></details>`;}).join('');
    const report=engine.summary(state.saved.labs);
    host.innerHTML=`<div class="pediatric-result ${record.passed?'pass':'retry'}"><h3>${report.completed?'Pediatric and Infant Sleep lab completed':record.passed?'Checkpoint passed—finish the review stations':'Checkpoint saved—review and retry'}</h3><strong>${record.correct}/${record.total} correct · ${record.percent}%</strong><p>${report.completed?'All seven review stations and the checkpoint requirement are complete.':record.passed?'The 80% checkpoint requirement is complete. Finish every review station to complete the lab.':'An 80% score is required. Your best score and attempt history remain preserved.'}</p></div><h3>Answer review</h3>${review}`;
  }
  function startSession(){
    saveLabs(engine.start(state.saved.labs,new Date().toISOString()));
    state.questions=engine.selectQuestions(state.bank,engine.SESSION_SIZE,'pediatric|'+new Date().toISOString());
    if(state.questions.length<engine.SESSION_SIZE){workspace.hidden=false;workspace.innerHTML='<div class="notice error"><strong>Pediatric checkpoint unavailable.</strong> Fewer than ten eligible pediatric learner-practice questions were found.</div>';return;}
    renderSummary();renderStations();renderSession();
  }
  function submit(form){
    const answers={};state.questions.forEach(question=>{const selected=form.querySelector(`[name="pediatric-${CSS.escape(String(question.id))}"]:checked`);if(selected) answers[String(question.id)]=selected.value;});
    const record=engine.gradeSession({questions:state.questions,answers,completedAt:new Date().toISOString()});saveLabs(engine.applySession(state.saved.labs,record));form.querySelectorAll('input,button').forEach(node=>node.disabled=true);renderResult(record);renderSummary();renderStations();
  }
  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error('A required Pediatric lab module is unavailable.');
      state.saved=window.RPSGTStorage.load();const modules=await Promise.all(['data/question-bank/d1a.json','data/question-bank/d1c.json','data/question-bank/d3a.json','data/question-bank/d3b.json','data/question-bank/d4a.json'].map(loadJson));state.bank=modules.flatMap(module=>module.questions||[]);
      if(engine.eligibleQuestions(state.bank).length<engine.SESSION_SIZE) throw new Error('The validated pediatric task banks do not contain enough eligible questions.');
      renderSummary();renderStations();
    }catch(error){workspace.hidden=false;workspace.innerHTML=`<div class="notice error"><strong>Pediatric lab could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;startButton.disabled=true;}
  }
  startButton.addEventListener('click',startSession);
  document.addEventListener('change',event=>{const station=event.target.closest('[data-pediatric-station]');if(!station)return;saveLabs(engine.setStation(state.saved.labs,station.dataset.pediatricStation,station.checked,new Date().toISOString()));renderSummary();renderStations();});
  document.addEventListener('click',event=>{if(event.target.closest('[data-pediatric-cancel]')){state.questions=[];workspace.hidden=true;workspace.innerHTML='';}});
  document.addEventListener('submit',event=>{if(event.target.matches('[data-pediatric-form]')){event.preventDefault();submit(event.target);}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
