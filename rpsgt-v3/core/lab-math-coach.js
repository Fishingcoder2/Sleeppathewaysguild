(function(){
  'use strict';
  const engine=window.RPSGTMathCoachEngine;
  const workspace=document.querySelector('[data-math-workspace]');
  const summaryHost=document.querySelector('[data-math-summary]');
  const legacyHost=document.querySelector('[data-math-legacy]');
  const startButton=document.querySelector('[data-math-start]');
  if(!workspace||!summaryHost||!startButton) return;
  const state={saved:null,module:null,questions:[]};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>value?new Date(value).toLocaleString():'Not recorded';
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveLabs(nextLabs){state.saved.labs=nextLabs;state.saved=window.RPSGTStorage.save(state.saved);}
  function renderSummary(){
    const report=engine.summary(state.saved.labs);summaryHost.innerHTML=`<div><span>Status</span><strong>${report.completed?'Completed':report.status==='in-progress'?'In progress':'Not started'}</strong></div><div><span>Best score</span><strong>${report.attempts?report.bestPercent+'%':'—'}</strong></div><div><span>Attempts</span><strong>${report.attempts}</strong></div><div><span>Last session</span><strong>${report.latestSession?formatDate(report.latestSession.completedAt):'—'}</strong></div>`;
    startButton.textContent=report.attempts?'Start another 10-question set':'Start 10-question Math Coach set';
  }
  function renderLegacy(){
    if(!legacyHost) return;const notes=state.saved.notes||{};const lesson=engine.legacyLessonSummary(notes.mathCoachLesson);const mathNotes=notes.math&&typeof notes.math==='object'?Object.entries(notes.math):[];
    const lessonText=!lesson.present?'No migrated lesson state is present in the v3 record.':lesson.type==='object'?Object.entries(lesson.known).map(([key,value])=>`${esc(key)}: ${esc(value)}`).join(' · ')||'A legacy lesson object is present, but its fields are unresolved.':`Legacy value type: ${esc(lesson.type)}`;
    legacyHost.innerHTML=`<div class="legacy-math-row"><strong>Lesson state</strong><span>${lessonText}</span></div><div class="legacy-math-row"><strong>Math notes</strong><span>${mathNotes.length?mathNotes.map(([key,value])=>`${esc(key)}: ${esc(value)}`).join('<br>'):'No migrated Math Coach notes are present.'}</span></div>`;
  }
  function renderSession(){
    workspace.hidden=false;workspace.innerHTML=`<div class="section-head"><div><div class="eyebrow">D3C calculation practice</div><h2>Ten-question Math Coach set</h2></div><button class="btn secondary" type="button" data-math-cancel>Close set</button></div><p class="report-intro">These questions come from the validated learner-practice bank. Results stay in Skills Lab progress and do not change ordinary Practice, Readiness, Mock, or Guided Trail history.</p><form data-math-form>${state.questions.map((question,index)=>`<fieldset class="math-question"><legend><span>${index+1}</span>${esc(question.prompt)}</legend>${question.options.map(option=>`<label><input type="radio" name="math-${esc(question.id)}" value="${esc(option)}"> <span>${esc(option)}</span></label>`).join('')}</fieldset>`).join('')}<div class="actions"><button class="btn primary" type="submit">Score Math Coach set</button></div></form><div data-math-result></div>`;workspace.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderResult(record){
    const host=workspace.querySelector('[data-math-result]');const byId=new Map(state.questions.map(question=>[String(question.id),question]));
    const review=record.responses.map((response,index)=>{const question=byId.get(String(response.id));return `<details class="math-review ${response.correct?'correct':'retry'}"><summary>${index+1}. ${response.correct?'Correct':'Review'} · ${esc(question&&question.topic||'Calculation')}</summary><p><strong>Answer:</strong> ${esc(question&&question.answer)}</p><p>${esc(question&&question.rationale||'Review the calculation and try a new set.')}</p></details>`;}).join('');
    host.innerHTML=`<div class="math-result ${record.passed?'pass':'retry'}"><h3>${record.passed?'Math Coach lab completed':'Set saved—review and retry'}</h3><strong>${record.correct}/${record.total} correct · ${record.percent}%</strong><p>${record.passed?'An 80% or higher result marks Math Coach complete in the laboratory catalog.':'Your best result and attempt history are preserved. Completion requires 80% or higher.'}</p></div><h3>Answer review</h3>${review}`;
  }
  async function startSession(){
    if(!state.module) return;saveLabs(engine.start(state.saved.labs,new Date().toISOString()));state.questions=engine.selectQuestions(state.module.questions||[],engine.SESSION_SIZE,'math-coach|'+new Date().toISOString());
    if(state.questions.length<engine.SESSION_SIZE){workspace.hidden=false;workspace.innerHTML='<div class="notice error"><strong>Math Coach unavailable.</strong> Fewer than ten eligible learner-practice calculation questions were found.</div>';return;}
    renderSummary();renderSession();
  }
  function submit(form){
    const answers={};state.questions.forEach(question=>{const selected=form.querySelector(`[name="math-${CSS.escape(String(question.id))}"]:checked`);if(selected) answers[String(question.id)]=selected.value;});
    const record=engine.gradeSession({questions:state.questions,answers,completedAt:new Date().toISOString()});saveLabs(engine.applySession(state.saved.labs,record));form.querySelectorAll('input,button').forEach(node=>node.disabled=true);renderResult(record);renderSummary();
  }
  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error('A required Math Coach module is unavailable.');state.saved=window.RPSGTStorage.load();state.module=await loadJson('data/question-bank/d3c.json');
      if(engine.eligibleQuestions(state.module.questions||[]).length<engine.SESSION_SIZE) throw new Error('The validated D3C bank does not contain enough eligible calculation questions.');renderSummary();renderLegacy();
    }catch(error){workspace.hidden=false;workspace.innerHTML=`<div class="notice error"><strong>Math Coach could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;startButton.disabled=true;}
  }
  startButton.addEventListener('click',startSession);
  document.addEventListener('click',event=>{if(event.target.closest('[data-math-cancel]')){state.questions=[];workspace.hidden=true;workspace.innerHTML='';}});
  document.addEventListener('submit',event=>{if(event.target.matches('[data-math-form]')){event.preventDefault();submit(event.target);}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
