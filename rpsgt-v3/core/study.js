(function(){
  'use strict';
  const host=document.querySelector('[data-blueprint-map]');
  const summaryNode=document.querySelector('[data-blueprint-summary]');
  const trailHost=document.querySelector('[data-guided-trail-dashboard]');
  const checkpointHost=document.querySelector('[data-checkpoint-workspace]');
  const engine=window.RPSGTGuidedTrailEngine;
  if(!host) return;
  const state={blueprint:null,saved:null,trail:null,checkpoint:null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date=value=>value?new Date(value).toLocaleString():'Not recorded';
  const taskFile=code=>'data/question-bank/'+String(code).toLowerCase()+'.json';
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveTrail(next){state.saved.guidedStudy=next;state.saved=window.RPSGTStorage.save(state.saved);state.trail=engine.summary(state.saved.guidedStudy,state.blueprint);}
  function taskCard(task){
    const row=state.trail.rows.find(item=>item.code===task.code)||{};
    const targets=(task.studyTargets||[]).map((target,index)=>`<li><span>${index+1}</span><p>${esc(target)}</p></li>`).join('');
    const resources=(task.recommendedResourceKeys||[]).map(key=>`<span class="data-chip">${esc(key)}</span>`).join('');
    const latest=row.latestCheckpoint;
    return `<article class="task-map-card" id="${esc(task.code)}">
      <div class="task-map-head"><div><span class="task-code">${esc(task.code)}</span><h3>${esc(task.title)}</h3></div><strong class="question-count">${Number(task.questionCount||0).toLocaleString()} questions</strong></div>
      <div class="trail-status-row"><span class="status ${row.award?'green':''}">${row.award?'Task award earned':row.studyMarked?'Study marked complete':'Not started'}</span>${latest?`<small>Latest checkpoint: ${esc(latest.score)}%</small>`:'<small>No checkpoint yet</small>'}</div>
      <p class="task-focus">${esc(task.focus)}</p>
      <div class="task-next"><strong>Next study action</strong><span>${esc(task.nextAction||'')}</span></div>
      <details><summary>Show five study targets</summary><ol class="study-target-list">${targets}</ol></details>
      <details><summary>Show mapped resource keys</summary><div class="data-chip-list">${resources||'<span class="muted">No mapped keys.</span>'}</div></details>
      <div class="trail-actions"><button class="btn secondary" type="button" data-trail-mark="${esc(task.code)}" ${row.studyMarked?'disabled':''}>${row.studyMarked?'Study completed':'Mark study complete'}</button><button class="btn primary" type="button" data-checkpoint-start="${esc(task.code)}">Take 5-question checkpoint</button></div>
      ${task.crossTaskQuestionCount?`<div class="mapping-warning"><strong>Mapping review:</strong> ${task.crossTaskQuestionCount} records also carry a cross-task code and are excluded from learner checkpoints.</div>`:''}
    </article>`;
  }
  function domainCard(domain){
    const progress=state.trail.domains.find(item=>item.id===domain.id)||{};
    return `<section class="domain-map-card domain-${esc(domain.id.toLowerCase())}"><header class="domain-map-head"><div><span class="status ${progress.award?'green':''}">${esc(domain.id)}${progress.award?' · domain award':''}</span><h2>${esc(domain.fullName)}</h2><small>${progress.studyMarked||0}/${progress.taskCount||3} study marks · ${progress.taskAwards||0}/${progress.taskCount||3} task awards</small></div><div class="domain-weight"><strong>${esc(domain.weight)}%</strong><span>app blueprint weight</span></div></header><div class="domain-task-grid">${(domain.tasks||[]).map(taskCard).join('')}</div></section>`;
  }
  function renderTrailSummary(){
    if(!trailHost) return;
    const counts=state.trail.counts;const focus=state.trail.currentFocus;const latest=state.trail.latestCheckpoint;
    trailHost.innerHTML=`<div class="section-head"><div><div class="eyebrow">Guided Trail progress</div><h2>Study, check, and earn awards</h2></div><span class="status green">Stored only in v3</span></div><div class="trail-summary-grid"><div><span>Study marks</span><strong>${counts.studyMarks}/12</strong></div><div><span>Task awards</span><strong>${counts.taskAwards}/12</strong></div><div><span>Domain awards</span><strong>${counts.domainAwards}/4</strong></div><div><span>Checkpoints</span><strong>${counts.checkpoints}</strong></div></div><p class="report-intro">${focus?`Current focus: <strong>${esc(focus.task||focus.domain)}</strong>.`: 'Choose a task below to begin.'} ${latest?`Latest checkpoint: ${esc(latest.task)} · ${esc(latest.score)}% on ${esc(date(latest.completedAt))}.`:''}</p>`;
  }
  function renderMap(){
    const domains=state.blueprint.domains||[];const tasks=domains.flatMap(domain=>domain.tasks||[]);const questionCount=tasks.reduce((sum,task)=>sum+Number(task.questionCount||0),0);const crossTaskCount=Math.max(...tasks.map(task=>Number(task.crossTaskQuestionCount||0)),0);
    if(summaryNode) summaryNode.innerHTML=`<span><strong>${domains.length}</strong> domains</span><span><strong>${tasks.length}</strong> tasks</span><span><strong>${questionCount.toLocaleString()}</strong> directly assigned questions</span><span><strong>${crossTaskCount}</strong> review-only cross-task records</span>`;
    renderTrailSummary();host.innerHTML=domains.map(domainCard).join('');
  }
  function renderCheckpoint(){
    if(!checkpointHost||!state.checkpoint) return;
    const {taskCode,questions}=state.checkpoint;
    checkpointHost.hidden=false;
    checkpointHost.innerHTML=`<div class="section-head"><div><div class="eyebrow">${esc(taskCode)} task checkpoint</div><h2>Five learner-practice questions</h2></div><button class="btn secondary" type="button" data-checkpoint-cancel>Close</button></div><p class="report-intro">Score 80% or higher to earn the task award. Manual-review and D2A/D2C records are excluded.</p><form data-checkpoint-form>${questions.map((question,index)=>`<fieldset class="checkpoint-question"><legend><span>${index+1}</span>${esc(question.prompt)}</legend>${question.options.map(option=>`<label><input type="radio" name="q-${esc(question.id)}" value="${esc(option)}"> <span>${esc(option)}</span></label>`).join('')}</fieldset>`).join('')}<div class="actions"><button class="btn primary" type="submit">Score checkpoint</button></div></form><div data-checkpoint-result></div>`;
    checkpointHost.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function startCheckpoint(taskCode){
    checkpointHost.hidden=false;checkpointHost.innerHTML='<p>Loading a learner-practice checkpoint…</p>';
    try{
      const module=await loadJson(taskFile(taskCode));
      const questions=engine.selectQuestions(module.questions||[],taskCode,5,taskCode+'|'+new Date().toISOString());
      if(questions.length<5) throw new Error('Fewer than five eligible learner-practice questions are available for this task.');
      state.checkpoint={taskCode,questions};renderCheckpoint();
    }catch(error){checkpointHost.innerHTML=`<div class="notice error"><strong>Checkpoint unavailable.</strong> ${esc(error.message)}</div>`;}
  }
  function submitCheckpoint(form){
    const answers={};state.checkpoint.questions.forEach(question=>{const selected=form.querySelector(`[name="q-${CSS.escape(String(question.id))}"]:checked`);if(selected) answers[String(question.id)]=selected.value;});
    const record=engine.gradeCheckpoint({taskCode:state.checkpoint.taskCode,questions:state.checkpoint.questions,answers,completedAt:new Date().toISOString()});
    saveTrail(engine.applyCheckpoint(state.saved.guidedStudy,record,state.blueprint));
    const result=checkpointHost.querySelector('[data-checkpoint-result]');
    result.innerHTML=`<div class="checkpoint-result ${record.passed?'pass':'retry'}"><h3>${record.passed?'Task award earned':'Checkpoint saved—review and retry'}</h3><strong>${record.correct}/${record.total} correct · ${record.score}%</strong><p>${record.passed?'This task award is now part of the Guided Trail report.':'An 80% score is required for the task award. Your attempt remains in checkpoint history.'}</p></div>`;
    form.querySelectorAll('input,button').forEach(node=>node.disabled=true);renderMap();
  }
  async function load(){
    host.innerHTML='<div class="card"><p>Loading the canonical RPSGT learning map…</p></div>';
    try{
      if(!window.RPSGTStorage||!engine) throw new Error('A required Guided Trail module is unavailable.');
      state.blueprint=await loadJson('data/blueprint.json');state.saved=window.RPSGTStorage.load();state.trail=engine.summary(state.saved.guidedStudy,state.blueprint);renderMap();
    }catch(error){console.error(error);host.innerHTML='<div class="card notice"><h2>Learning map unavailable</h2><p>The development shell could not load its Guided Trail data. No learner progress was changed.</p></div>';}
  }
  document.addEventListener('click',event=>{
    const mark=event.target.closest('[data-trail-mark]');if(mark){saveTrail(engine.markTaskStudy(state.saved.guidedStudy,mark.dataset.trailMark,new Date().toISOString()));renderMap();return;}
    const start=event.target.closest('[data-checkpoint-start]');if(start){startCheckpoint(start.dataset.checkpointStart);return;}
    if(event.target.closest('[data-checkpoint-cancel]')){state.checkpoint=null;checkpointHost.hidden=true;checkpointHost.innerHTML='';}
  });
  document.addEventListener('submit',event=>{if(event.target.matches('[data-checkpoint-form]')){event.preventDefault();submitCheckpoint(event.target);}});
  load();
})();