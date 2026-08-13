(function(){
  'use strict';
  const host=document.querySelector('[data-blueprint-map]');
  const summaryNode=document.querySelector('[data-blueprint-summary]');
  const trailHost=document.querySelector('[data-guided-trail-dashboard]');
  const checkpointOverlay=document.querySelector('[data-checkpoint-overlay]');
  const checkpointHost=document.querySelector('[data-checkpoint-workspace]');
  const achievementOverlay=document.querySelector('[data-achievement-overlay]');
  const achievementModal=document.querySelector('[data-achievement-modal]');
  const achievementContent=document.querySelector('[data-achievement-content]');
  const engine=window.RPSGTGuidedTrailEngine;
  const DOMAIN_MEDALS={D1:'Clinical Guide',D2:'Study Signal Scout',D3:'Scoring Pathfinder',D4:'Therapy Trail Guide'};
  if(!host) return;
  const state={blueprint:null,saved:null,trail:null,checkpoint:null,returnFocus:null,achievementOpen:false};
  function cleanText(value){
    return String(value??'')
      .replace(/Medication-associated\s+\?Prozac eyes\?\s*\/\s*SSRI-related NREM eye movements/gi,'Medication-associated “Prozac eyes” (SSRI-related NREM eye movements)')
      .replace(/\?Prozac eyes\?/gi,'“Prozac eyes”')
      .replace(/\uFFFD/g,'');
  }
  const esc=value=>cleanText(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date=value=>value?new Date(value).toLocaleString():'Not recorded';
  const taskFile=code=>'data/question-bank/'+String(code).toLowerCase()+'.json';
  const badgeQuestionCount=()=>Number(engine&&engine.BADGE_QUESTION_COUNT)||15;
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
      <div class="trail-actions"><button class="btn secondary" type="button" data-trail-mark="${esc(task.code)}" ${row.studyMarked?'disabled':''}>${row.studyMarked?'Study completed':'Mark study complete'}</button><button class="btn primary" type="button" data-checkpoint-start="${esc(task.code)}">Take ${badgeQuestionCount()}-question badge checkpoint</button></div>
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
  function coachHint(question){
    const topic=question.topic?`Focus on the ${cleanText(question.topic)} concept. `:'';
    const type=question.questionType?`Treat this as a ${cleanText(question.questionType).toLowerCase()} item. `:'';
    return `${topic}${type}Identify exactly what the stem asks, then eliminate choices that do not fit the current task.`;
  }
  function feedbackFor(question){
    if(!state.checkpoint||!state.checkpoint.record) return null;
    const response=(state.checkpoint.record.responses||[]).find(item=>String(item.id)===String(question.id));
    return response||null;
  }
  function renderCoachPanel(question){
    const submitted=Boolean(state.checkpoint.submitted);
    const response=feedbackFor(question);
    if(!submitted){
      return `<aside class="coach-question-panel" id="coach-question-panel"><span class="status gold">Coach Bob hint</span><h3>Slow down and match the task.</h3><p>${esc(coachHint(question))}</p><p class="coach-boundary">The hint guides your reasoning without revealing the answer.</p></aside>`;
    }
    const selected=state.checkpoint.answers[String(question.id)]??'No answer selected';
    return `<aside class="coach-question-panel" id="coach-question-panel"><span class="status gold">Coach Bob review</span><h3>${response&&response.correct?'Nice work—now lock in why.':'Use the miss to sharpen the pathway.'}</h3>
      <dl class="coach-review-list"><div><dt>Your answer</dt><dd>${esc(selected)}</dd></div><div><dt>Correct answer</dt><dd>${esc(question.answer)}</dd></div></dl>
      <p><strong>Rationale:</strong> ${esc(question.rationale||'Review the task target and compare each option with the question stem.')}</p>
      ${question.whyTricky?`<p><strong>Why it is tricky:</strong> ${esc(question.whyTricky)}</p>`:''}
      <p class="coach-note"><strong>Coach Bob:</strong> ${esc(question.coachBobNote||'Read the stem first, name the task being tested, and then choose the option that best fits that task.')}</p>
    </aside>`;
  }
  function renderCheckpoint(){
    if(!checkpointHost||!checkpointOverlay||!state.checkpoint) return;
    const checkpoint=state.checkpoint;
    const question=checkpoint.questions[checkpoint.currentIndex];
    const selected=checkpoint.answers[String(question.id)];
    const isFirst=checkpoint.currentIndex===0;
    const isLast=checkpoint.currentIndex===checkpoint.questions.length-1;
    const result=checkpoint.record;
    const response=feedbackFor(question);
    const resultBanner=checkpoint.submitted?`<div class="checkpoint-result ${result.passed?'pass':'retry'}" aria-live="polite"><h3>${result.passed?'Task award earned':'Checkpoint saved—review and retry'}</h3><strong>${result.correct}/${result.total} correct · ${result.score}%</strong><p>${result.passed?'This task award is now part of the Guided Trail report.':`Complete all ${badgeQuestionCount()} questions and score at least 80% to earn the task badge. Your attempt remains in checkpoint history.`}</p></div>`:'';
    const options=(question.options||[]).map((option,index)=>{
      const checked=selected===option;
      const correctClass=checkpoint.submitted&&option===question.answer?' correct-option':'';
      const selectedClass=checkpoint.submitted&&checked&&option!==question.answer?' incorrect-option':'';
      return `<label class="checkpoint-option${correctClass}${selectedClass}"><input type="radio" name="checkpoint-question" value="${index}" data-checkpoint-option="${index}" ${checked?'checked':''} ${checkpoint.submitted?'disabled':''}><span>${esc(option)}</span></label>`;
    }).join('');
    checkpointHost.innerHTML=`<header class="checkpoint-modal-head"><div><div class="eyebrow">${esc(checkpoint.domain)} · ${esc(checkpoint.domainName)}</div><p class="checkpoint-task-label"><strong>${esc(checkpoint.taskCode)}</strong> · ${esc(checkpoint.taskTitle)}</p></div><button class="icon-close" type="button" data-checkpoint-cancel aria-label="Close checkpoint">×</button></header>
      ${resultBanner}
      <div class="checkpoint-progress-wrap"><div class="checkpoint-progress-copy"><strong>Question ${checkpoint.currentIndex+1} of ${checkpoint.questions.length}</strong><span>${Math.round((checkpoint.currentIndex+1)/checkpoint.questions.length*100)}% through checkpoint</span></div><div class="checkpoint-progress" aria-hidden="true"><span style="width:${(checkpoint.currentIndex+1)/checkpoint.questions.length*100}%"></span></div></div>
      <div class="checkpoint-content ${checkpoint.coachOpen?'coach-visible':''}">
        <div class="checkpoint-question-pane">
          <fieldset class="checkpoint-question"><legend class="sr-only">Question ${checkpoint.currentIndex+1}</legend>
            <div class="checkpoint-question-meta"><span class="status">${esc(question.topic||checkpoint.taskCode)}</span><span>Exact task mapping: ${esc(question.taskCode||checkpoint.taskCode)}</span></div>
            <h2 id="checkpoint-title" tabindex="-1">${esc(question.prompt)}</h2>
            <div class="checkpoint-options">${options}</div>
            ${checkpoint.notice?`<div class="checkpoint-inline-notice" role="alert">${esc(checkpoint.notice)}</div>`:''}
            ${checkpoint.submitted?`<div class="answer-status ${response&&response.correct?'correct':'incorrect'}">${response&&response.correct?'Correct':'Review this item'}</div>`:''}
          </fieldset>
          <button class="btn coach-toggle" type="button" data-coach-toggle aria-expanded="${checkpoint.coachOpen?'true':'false'}" aria-controls="coach-question-panel">${checkpoint.coachOpen?'Hide Coach Bob':'Ask Coach Bob'}</button>
        </div>
        ${checkpoint.coachOpen?renderCoachPanel(question):''}
      </div>
      <footer class="checkpoint-actions"><button class="btn secondary" type="button" data-checkpoint-prev ${isFirst?'disabled':''}>Previous</button><span class="checkpoint-save-note">${checkpoint.submitted?'Use Previous and Next to review every answer.':'Your selections stay in this checkpoint until you score or close it.'}</span>${checkpoint.submitted||!isLast?`<button class="btn primary" type="button" data-checkpoint-next ${isLast?'disabled':''}>Next</button>`:`<button class="btn primary" type="button" data-checkpoint-score>Score checkpoint</button>`}</footer>`;
  }
  function showAchievement(record,taskTitle,domainName,domainEarned){
    if(!achievementOverlay||!achievementModal||!achievementContent) return;
    const domain=record.domain||String(record.task||'').slice(0,2);
    const medal=DOMAIN_MEDALS[domain]||domainName||'Domain medal';
    achievementContent.innerHTML=`<div class="achievement-burst" aria-hidden="true">🏅</div><div class="achievement-kicker">Sleep Pathways Guild achievement</div><h2 id="achievement-title">Task badge earned!</h2><p><strong>${esc(record.task)}</strong> · ${esc(taskTitle||'RPSGT task')}</p><div class="achievement-score">${esc(record.correct)} / ${esc(record.total)} correct · ${esc(record.score)}%</div><p>You completed the full ${badgeQuestionCount()}-question badge checkpoint and met the 80% badge standard.</p>${domainEarned?`<div class="achievement-domain"><strong>Domain medal unlocked: ${esc(medal)}</strong><span>${esc(domain)} · ${esc(domainName||'RPSGT domain')}</span></div>`:''}<div class="achievement-actions"><button class="btn primary" type="button" data-achievement-close>Continue review</button></div><p class="achievement-note">Guild badges and medals are educational achievements, not BRPT credentials or passing predictions.</p>`;
    state.achievementOpen=true;
    achievementOverlay.hidden=false;
    document.body.classList.add('achievement-open');
    requestAnimationFrame(()=>achievementModal.focus({preventScroll:true}));
  }
  function closeAchievement(){
    if(!state.achievementOpen) return;
    state.achievementOpen=false;
    if(achievementOverlay) achievementOverlay.hidden=true;
    if(achievementContent) achievementContent.innerHTML='';
    document.body.classList.remove('achievement-open');
    requestAnimationFrame(()=>{
      if(checkpointHost&&checkpointOverlay&&!checkpointOverlay.hidden) checkpointHost.focus({preventScroll:true});
      else if(state.returnFocus&&typeof state.returnFocus.focus==='function') state.returnFocus.focus({preventScroll:true});
    });
  }
  function openCheckpoint(){
    if(!checkpointOverlay||!checkpointHost) return;
    state.returnFocus=document.activeElement;
    checkpointOverlay.hidden=false;
    document.body.classList.add('checkpoint-open');
    requestAnimationFrame(()=>checkpointHost.focus({preventScroll:true}));
  }
  function closeCheckpoint(){
    if(state.achievementOpen) closeAchievement();
    state.checkpoint=null;
    if(checkpointOverlay) checkpointOverlay.hidden=true;
    if(checkpointHost) checkpointHost.innerHTML='';
    document.body.classList.remove('checkpoint-open');
    if(state.returnFocus&&typeof state.returnFocus.focus==='function') state.returnFocus.focus({preventScroll:true});
    state.returnFocus=null;
  }
  async function startCheckpoint(taskCode){
    const task=engine.taskMap(state.blueprint).get(taskCode);
    const required=badgeQuestionCount();
    openCheckpoint();
    checkpointHost.innerHTML='<div class="checkpoint-loading"><p>Loading a learner-practice badge checkpoint…</p></div>';
    try{
      const module=await loadJson(taskFile(taskCode));
      const questions=engine.selectQuestions(module.questions||[],taskCode,required,taskCode+'|'+new Date().toISOString());
      if(questions.length<required) throw new Error(`Fewer than ${required} eligible learner-practice questions are available for this task.`);
      state.checkpoint={
        taskCode,
        taskTitle:task&&task.title||taskCode,
        domain:task&&task.domain||String(taskCode).slice(0,2),
        domainName:task&&task.domainName||'RPSGT domain',
        questions,
        currentIndex:0,
        answers:{},
        coachOpen:false,
        submitted:false,
        record:null,
        notice:''
      };
      renderCheckpoint();
    }catch(error){
      checkpointHost.innerHTML=`<header class="checkpoint-modal-head"><div><div class="eyebrow">${esc(taskCode)} checkpoint</div><h2 id="checkpoint-title">Checkpoint unavailable</h2></div><button class="icon-close" type="button" data-checkpoint-cancel aria-label="Close checkpoint">×</button></header><div class="notice error"><strong>Checkpoint unavailable.</strong> ${esc(error.message)}</div>`;
    }
  }
  function moveCheckpoint(direction){
    if(!state.checkpoint||state.checkpoint.submitted&&direction>0&&state.checkpoint.currentIndex>=state.checkpoint.questions.length-1) return;
    const question=state.checkpoint.questions[state.checkpoint.currentIndex];
    if(direction>0&&!state.checkpoint.submitted&&!state.checkpoint.answers[String(question.id)]){
      state.checkpoint.notice='Choose an answer before moving to the next question.';
      renderCheckpoint();
      return;
    }
    state.checkpoint.notice='';
    state.checkpoint.currentIndex=Math.max(0,Math.min(state.checkpoint.questions.length-1,state.checkpoint.currentIndex+direction));
    state.checkpoint.coachOpen=false;
    renderCheckpoint();
    requestAnimationFrame(()=>checkpointHost.querySelector('#checkpoint-title')?.focus({preventScroll:true}));
  }
  function submitCheckpoint(){
    if(!state.checkpoint||state.checkpoint.submitted) return;
    const unansweredIndex=state.checkpoint.questions.findIndex(question=>!state.checkpoint.answers[String(question.id)]);
    if(unansweredIndex>=0){
      state.checkpoint.currentIndex=unansweredIndex;
      state.checkpoint.notice=`Answer all ${badgeQuestionCount()} questions before scoring the badge checkpoint.`;
      renderCheckpoint();
      return;
    }
    const before=engine.normalizeState(state.saved.guidedStudy);
    const record=engine.gradeCheckpoint({taskCode:state.checkpoint.taskCode,questions:state.checkpoint.questions,answers:state.checkpoint.answers,completedAt:new Date().toISOString()});
    const next=engine.applyCheckpoint(state.saved.guidedStudy,record,state.blueprint);
    const after=engine.normalizeState(next);
    const taskEarned=Boolean(record.passed&&!before.trailAwards.tasks[record.task]&&after.trailAwards.tasks[record.task]);
    const domainEarned=Boolean(record.domain&&!before.trailAwards.domains[record.domain]&&after.trailAwards.domains[record.domain]);
    saveTrail(next);
    state.checkpoint.record=record;
    state.checkpoint.submitted=true;
    state.checkpoint.currentIndex=0;
    state.checkpoint.coachOpen=true;
    state.checkpoint.notice='';
    const taskTitle=state.checkpoint.taskTitle;
    const domainName=state.checkpoint.domainName;
    renderMap();
    renderCheckpoint();
    if(taskEarned) requestAnimationFrame(()=>showAchievement(record,taskTitle,domainName,domainEarned));
  }
  async function load(){
    host.innerHTML='<div class="card"><p>Loading the canonical RPSGT learning map…</p></div>';
    try{
      if(!window.RPSGTStorage||!engine) throw new Error('A required Guided Trail module is unavailable.');
      state.blueprint=await loadJson('data/blueprint.json');state.saved=window.RPSGTStorage.load();state.trail=engine.summary(state.saved.guidedStudy,state.blueprint);renderMap();
    }catch(error){console.error(error);host.innerHTML='<div class="card notice"><h2>Learning map unavailable</h2><p>The development shell could not load its Guided Trail data. No learner progress was changed.</p></div>';}
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-achievement-close]')){closeAchievement();return;}
    if(event.target===achievementOverlay&&state.achievementOpen){closeAchievement();return;}
    if(state.achievementOpen) return;
    const mark=event.target.closest('[data-trail-mark]');if(mark){saveTrail(engine.markTaskStudy(state.saved.guidedStudy,mark.dataset.trailMark,new Date().toISOString()));renderMap();return;}
    const start=event.target.closest('[data-checkpoint-start]');if(start){startCheckpoint(start.dataset.checkpointStart);return;}
    if(event.target.closest('[data-checkpoint-cancel]')){closeCheckpoint();return;}
    if(event.target.closest('[data-checkpoint-prev]')){moveCheckpoint(-1);return;}
    if(event.target.closest('[data-checkpoint-next]')){moveCheckpoint(1);return;}
    if(event.target.closest('[data-checkpoint-score]')){submitCheckpoint();return;}
    if(event.target.closest('[data-coach-toggle]')&&state.checkpoint){state.checkpoint.coachOpen=!state.checkpoint.coachOpen;renderCheckpoint();return;}
    if(event.target===checkpointOverlay){closeCheckpoint();}
  });
  document.addEventListener('change',event=>{
    if(state.achievementOpen) return;
    const option=event.target.closest('[data-checkpoint-option]');
    if(!option||!state.checkpoint||state.checkpoint.submitted) return;
    const question=state.checkpoint.questions[state.checkpoint.currentIndex];
    const index=Number(option.dataset.checkpointOption);
    state.checkpoint.answers[String(question.id)]=question.options[index];
    state.checkpoint.notice='';
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape') return;
    if(state.achievementOpen){closeAchievement();return;}
    if(checkpointOverlay&&!checkpointOverlay.hidden) closeCheckpoint();
  });
  load();
})();