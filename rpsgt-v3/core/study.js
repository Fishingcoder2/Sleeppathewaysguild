(function(){
  'use strict';
  const host=document.querySelector('[data-blueprint-map]');
  const summaryNode=document.querySelector('[data-blueprint-summary]');
  const trailHost=document.querySelector('[data-guided-trail-dashboard]');
  const checkpointOverlay=document.querySelector('[data-checkpoint-overlay]');
  const checkpointHost=document.querySelector('[data-checkpoint-workspace]');
  const engine=window.RPSGTGuidedTrailEngine;
  if(!host) return;

  const CHECKPOINT_SIZE=10;
  const state={blueprint:null,saved:null,trail:null,checkpoint:null,returnFocus:null};

  function cleanText(value){
    return String(value??'')
      .replace(/Medication-associated\s+\?Prozac eyes\?\s*\/\s*SSRI-related NREM eye movements/gi,'Medication-associated “Prozac eyes” (SSRI-related NREM eye movements)')
      .replace(/\?Prozac eyes\?/gi,'“Prozac eyes”')
      .replace(/\uFFFD/g,'');
  }
  const esc=value=>cleanText(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date=value=>value?new Date(value).toLocaleString():'Not recorded';
  const taskFile=code=>'data/question-bank/'+String(code).toLowerCase()+'.json';
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveTrail(next){state.saved.guidedStudy=next;state.saved=window.RPSGTStorage.save(state.saved);state.trail=engine.summary(state.saved.guidedStudy,state.blueprint);}

  function taskCard(task){
    const row=state.trail.rows.find(item=>item.code===task.code)||{};
    const targets=(task.studyTargets||[]).map((target,index)=>`<li><span>${index+1}</span><p>${esc(target)}</p></li>`).join('');
    const latest=row.latestCheckpoint;
    return `<article class="task-map-card" id="${esc(task.code)}">
      <div class="task-map-head"><div><span class="task-code">${esc(task.code)}</span><h3>${esc(task.title)}</h3></div><strong class="question-count">${Number(task.questionCount||0).toLocaleString()} questions</strong></div>
      <div class="trail-status-row"><span class="status ${row.award?'green':''}">${row.award?'Task badge earned':row.studyMarked?'Study marked complete':'Not started'}</span>${latest?`<small>Latest checkpoint: ${esc(latest.score)}%</small>`:'<small>No checkpoint yet</small>'}</div>
      <p class="task-focus">${esc(task.focus)}</p>
      <div class="task-next"><strong>Next study action</strong><span>${esc(task.nextAction||'')}</span></div>
      <details><summary>Show five study targets</summary><ol class="study-target-list">${targets}</ol></details>
      <div class="trail-actions"><button class="btn secondary" type="button" data-trail-mark="${esc(task.code)}" ${row.studyMarked?'disabled':''}>${row.studyMarked?'Study completed':'Mark study complete'}</button><button class="btn primary" type="button" data-checkpoint-start="${esc(task.code)}">Take 10-question checkpoint</button><a class="btn secondary" href="sources-disclosures.html">Open related references</a></div>
    </article>`;
  }

  function domainCard(domain){
    const progress=state.trail.domains.find(item=>item.id===domain.id)||{};
    return `<section class="domain-map-card domain-${esc(domain.id.toLowerCase())}"><header class="domain-map-head"><div><span class="status ${progress.award?'green':''}">${esc(domain.id)}${progress.award?' · domain medal earned':''}</span><h2>${esc(domain.fullName)}</h2><small>${progress.studyMarked||0}/${progress.taskCount||3} study marks · ${progress.taskAwards||0}/${progress.taskCount||3} task badges</small></div><div class="domain-weight"><strong>${esc(domain.weight)}%</strong><span>app blueprint weight</span></div></header><div class="domain-task-grid">${(domain.tasks||[]).map(taskCard).join('')}</div></section>`;
  }

  function renderTrailSummary(){
    if(!trailHost) return;
    const counts=state.trail.counts;const focus=state.trail.currentFocus;const latest=state.trail.latestCheckpoint;
    trailHost.innerHTML=`<div class="section-head"><div><div class="eyebrow">Guided Trail progress</div><h2>Study, check, and earn Guild achievements</h2></div><span class="status green">Stored only in v3</span></div><div class="trail-summary-grid"><div><span>Study marks</span><strong>${counts.studyMarks}/12</strong></div><div><span>Task badges</span><strong>${counts.taskAwards}/12</strong></div><div><span>Domain medals</span><strong>${counts.domainAwards}/4</strong></div><div><span>Checkpoints</span><strong>${counts.checkpoints}</strong></div></div><p class="report-intro">${focus?`Current focus: <strong>${esc(focus.task||focus.domain)}</strong>.`: 'Choose a task below to begin.'} ${latest?`Latest checkpoint: ${esc(latest.task)} · ${esc(latest.score)}% on ${esc(date(latest.completedAt))}.`:''}</p>`;
  }

  function renderMap(){
    const domains=state.blueprint.domains||[];const tasks=domains.flatMap(domain=>domain.tasks||[]);const questionCount=tasks.reduce((sum,task)=>sum+Number(task.questionCount||0),0);
    if(summaryNode) summaryNode.innerHTML=`<span><strong>${domains.length}</strong> domains</span><span><strong>${tasks.length}</strong> tasks</span><span><strong>${questionCount.toLocaleString()}</strong> learner questions</span><span><strong>10</strong> questions per badge checkpoint</span>`;
    renderTrailSummary();host.innerHTML=domains.map(domainCard).join('');
  }

  function coachHint(question){
    const topic=question.topic?`Focus on the ${cleanText(question.topic)} concept. `:'';
    const type=question.questionType?`Treat this as a ${cleanText(question.questionType).toLowerCase()} item. `:'';
    return `${topic}${type}Identify exactly what the stem asks, then eliminate choices that do not fit the current task.`;
  }

  function questionChecked(question){
    return Boolean(state.checkpoint&&state.checkpoint.checked&&state.checkpoint.checked[String(question.id)]);
  }

  function responseFor(question){
    if(!state.checkpoint||!questionChecked(question)) return null;
    const selected=state.checkpoint.answers[String(question.id)]??null;
    return {id:question.id,selected,correct:selected===question.answer};
  }

  function renderCoachPanel(question){
    const checked=questionChecked(question);
    const response=responseFor(question);
    if(!checked){
      return `<aside class="coach-question-panel" id="coach-question-panel"><span class="status gold">Coach Bob hint</span><h3>Slow down and match the task.</h3><p>${esc(coachHint(question))}</p><p class="coach-boundary">The hint guides your reasoning without revealing the answer.</p></aside>`;
    }
    const selected=state.checkpoint.answers[String(question.id)]??'No answer selected';
    return `<aside class="coach-question-panel" id="coach-question-panel"><span class="status gold">Coach Bob review</span><h3>${response&&response.correct?'Nice work—now lock in why.':'Use the miss to sharpen the pathway.'}</h3>
      <dl class="coach-review-list"><div><dt>Your answer</dt><dd>${esc(selected)}</dd></div><div><dt>Correct answer</dt><dd>${esc(question.answer)}</dd></div></dl>
      <p><strong>Reasoning:</strong> ${esc(question.rationale||'Review the task target and compare each option with the question stem.')}</p>
      ${question.whyTricky?`<p><strong>Why it is tricky:</strong> ${esc(question.whyTricky)}</p>`:''}
      <p class="coach-note"><strong>Coach Bob:</strong> ${esc(question.coachBobNote||'Read the stem first, name the task being tested, and then choose the option that best fits that task.')}</p>
    </aside>`;
  }

  function renderAnswerReview(question){
    if(!questionChecked(question)) return '';
    const response=responseFor(question);
    const selected=state.checkpoint.answers[String(question.id)]??'No answer selected';
    return `<section class="checkpoint-answer-review ${response&&response.correct?'correct':'incorrect'}" aria-live="polite">
      <div class="answer-status ${response&&response.correct?'correct':'incorrect'}">${response&&response.correct?'Correct':'Review this answer'}</div>
      <dl class="coach-review-list"><div><dt>Your answer</dt><dd>${esc(selected)}</dd></div><div><dt>Correct answer</dt><dd>${esc(question.answer)}</dd></div></dl>
      <p><strong>Reasoning:</strong> ${esc(question.rationale||'Review the task target and compare each choice with the question stem.')}</p>
      ${question.whyTricky?`<p><strong>Why it is tricky:</strong> ${esc(question.whyTricky)}</p>`:''}
    </section>`;
  }

  function renderCheckpoint(){
    if(!checkpointHost||!checkpointOverlay||!state.checkpoint) return;
    const checkpoint=state.checkpoint;
    const question=checkpoint.questions[checkpoint.currentIndex];
    const selected=checkpoint.answers[String(question.id)];
    const checked=questionChecked(question);
    const isFirst=checkpoint.currentIndex===0;
    const isLast=checkpoint.currentIndex===checkpoint.questions.length-1;
    const result=checkpoint.record;
    const resultBanner=checkpoint.completed&&result?`<div class="checkpoint-result ${result.passed?'pass':'retry'}" aria-live="polite"><h3>${result.passed?'Task badge earned':'Checkpoint saved—review and retry'}</h3><strong>${result.correct}/${result.total} correct · ${result.score}%</strong><p>${result.passed?'You earned this task badge with at least 8 correct answers out of 10.':'A task badge requires at least 8 correct answers out of 10. Your attempt remains in checkpoint history.'}</p></div>`:'';
    const options=(question.options||[]).map((option,index)=>{
      const chosen=selected===option;
      const correctClass=checked&&option===question.answer?' correct-option':'';
      const selectedClass=checked&&chosen&&option!==question.answer?' incorrect-option':'';
      return `<label class="checkpoint-option${correctClass}${selectedClass}"><input type="radio" name="checkpoint-question" value="${index}" data-checkpoint-option="${index}" ${chosen?'checked':''} ${checked?'disabled':''}><span>${esc(option)}</span></label>`;
    }).join('');
    const nextLabel=checked?(isLast&&checkpoint.completed?'Finish checkpoint':'Next question'):'Next question';
    const saveNote=checked?(isLast&&checkpoint.completed?'Checkpoint complete. Review the result or finish to return to Guided Study.':'Answer checked. Review the reasoning, then press Next question again to continue.'):'Choose an answer, then press Next question to check it.';

    checkpointHost.innerHTML=`<header class="checkpoint-modal-head"><div><div class="eyebrow">${esc(checkpoint.domain)} · ${esc(checkpoint.domainName)}</div><p class="checkpoint-task-label"><strong>${esc(checkpoint.taskCode)}</strong> · ${esc(checkpoint.taskTitle)}</p></div><button class="icon-close" type="button" data-checkpoint-cancel aria-label="Close checkpoint">×</button></header>
      ${resultBanner}
      <div class="checkpoint-progress-wrap"><div class="checkpoint-progress-copy"><strong>Question ${checkpoint.currentIndex+1} of ${checkpoint.questions.length}</strong><span>${Math.round((checkpoint.currentIndex+1)/checkpoint.questions.length*100)}% through checkpoint</span></div><div class="checkpoint-progress" aria-hidden="true"><span style="width:${(checkpoint.currentIndex+1)/checkpoint.questions.length*100}%"></span></div></div>
      <div class="checkpoint-content ${checkpoint.coachOpen?'coach-visible':''}">
        <div class="checkpoint-question-pane">
          <fieldset class="checkpoint-question"><legend class="sr-only">Question ${checkpoint.currentIndex+1}</legend>
            <div class="checkpoint-question-meta"><span class="status">${esc(question.topic||checkpoint.taskCode)}</span></div>
            <h2 id="checkpoint-title" tabindex="-1">${esc(question.prompt)}</h2>
            <div class="checkpoint-options">${options}</div>
            ${checkpoint.notice?`<div class="checkpoint-inline-notice" role="alert">${esc(checkpoint.notice)}</div>`:''}
            ${renderAnswerReview(question)}
          </fieldset>
          <button class="btn coach-toggle" type="button" data-coach-toggle aria-expanded="${checkpoint.coachOpen?'true':'false'}" aria-controls="coach-question-panel">${checkpoint.coachOpen?'Hide Coach Bob':'Ask Coach Bob'}</button>
        </div>
        ${checkpoint.coachOpen?renderCoachPanel(question):''}
      </div>
      <footer class="checkpoint-actions"><button class="btn secondary" type="button" data-checkpoint-prev ${isFirst?'disabled':''}>Previous</button><span class="checkpoint-save-note">${saveNote}</span><button class="btn primary" type="button" data-checkpoint-next>${nextLabel}</button></footer>`;
  }

  function openCheckpoint(){
    if(!checkpointOverlay||!checkpointHost) return;
    state.returnFocus=document.activeElement;
    checkpointOverlay.hidden=false;
    document.body.classList.add('checkpoint-open');
    requestAnimationFrame(()=>checkpointHost.focus({preventScroll:true}));
  }

  function closeCheckpoint(){
    state.checkpoint=null;
    if(checkpointOverlay) checkpointOverlay.hidden=true;
    if(checkpointHost) checkpointHost.innerHTML='';
    document.body.classList.remove('checkpoint-open');
    if(state.returnFocus&&typeof state.returnFocus.focus==='function') state.returnFocus.focus({preventScroll:true});
    state.returnFocus=null;
  }

  async function startCheckpoint(taskCode){
    const task=engine.taskMap(state.blueprint).get(taskCode);
    openCheckpoint();
    checkpointHost.innerHTML='<div class="checkpoint-loading"><p>Loading a 10-question learner checkpoint…</p></div>';
    try{
      const module=await loadJson(taskFile(taskCode));
      const questions=engine.selectQuestions(module.questions||[],taskCode,CHECKPOINT_SIZE,taskCode+'|'+new Date().toISOString());
      if(questions.length<CHECKPOINT_SIZE) throw new Error('Fewer than 10 eligible learner-practice questions are available for this task.');
      state.checkpoint={
        taskCode,
        taskTitle:task&&task.title||taskCode,
        domain:task&&task.domain||String(taskCode).slice(0,2),
        domainName:task&&task.domainName||'RPSGT domain',
        questions,
        currentIndex:0,
        answers:{},
        checked:{},
        coachOpen:false,
        completed:false,
        record:null,
        notice:''
      };
      renderCheckpoint();
    }catch(error){
      checkpointHost.innerHTML=`<header class="checkpoint-modal-head"><div><div class="eyebrow">${esc(taskCode)} checkpoint</div><h2 id="checkpoint-title">Checkpoint unavailable</h2></div><button class="icon-close" type="button" data-checkpoint-cancel aria-label="Close checkpoint">×</button></header><div class="notice error"><strong>Checkpoint unavailable.</strong> ${esc(error.message)}</div>`;
    }
  }

  function finalizeCheckpoint(){
    if(!state.checkpoint||state.checkpoint.completed) return;
    const checkpoint=state.checkpoint;
    document.dispatchEvent(new CustomEvent('rpsgt:guided-checkpoint-finalizing',{detail:{taskCode:checkpoint.taskCode}}));
    const record=engine.gradeCheckpoint({taskCode:checkpoint.taskCode,questions:checkpoint.questions,answers:checkpoint.answers,completedAt:new Date().toISOString()});
    saveTrail(engine.applyCheckpoint(state.saved.guidedStudy,record,state.blueprint));
    checkpoint.record=record;
    checkpoint.completed=true;
    checkpoint.notice='';
    renderMap();
    renderCheckpoint();
    document.dispatchEvent(new CustomEvent('rpsgt:guided-checkpoint-complete',{detail:{taskCode:checkpoint.taskCode,record}}));
  }

  function checkOrAdvance(){
    if(!state.checkpoint) return;
    const checkpoint=state.checkpoint;
    const question=checkpoint.questions[checkpoint.currentIndex];
    const id=String(question.id);
    const isLast=checkpoint.currentIndex===checkpoint.questions.length-1;

    if(!checkpoint.checked[id]){
      if(!checkpoint.answers[id]){
        checkpoint.notice='Choose an answer, then press Next question to check it.';
        renderCheckpoint();
        return;
      }
      checkpoint.checked[id]=true;
      checkpoint.notice='';
      checkpoint.coachOpen=true;
      if(isLast) finalizeCheckpoint(); else renderCheckpoint();
      return;
    }

    if(isLast){
      if(checkpoint.completed) closeCheckpoint();
      return;
    }
    checkpoint.currentIndex+=1;
    checkpoint.coachOpen=false;
    checkpoint.notice='';
    renderCheckpoint();
    requestAnimationFrame(()=>checkpointHost.querySelector('#checkpoint-title')?.focus({preventScroll:true}));
  }

  function movePrevious(){
    if(!state.checkpoint||state.checkpoint.currentIndex<=0) return;
    state.checkpoint.currentIndex-=1;
    state.checkpoint.coachOpen=questionChecked(state.checkpoint.questions[state.checkpoint.currentIndex]);
    state.checkpoint.notice='';
    renderCheckpoint();
    requestAnimationFrame(()=>checkpointHost.querySelector('#checkpoint-title')?.focus({preventScroll:true}));
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
    if(event.target.closest('[data-checkpoint-cancel]')){closeCheckpoint();return;}
    if(event.target.closest('[data-checkpoint-prev]')){movePrevious();return;}
    if(event.target.closest('[data-checkpoint-next]')){checkOrAdvance();return;}
    if(event.target.closest('[data-coach-toggle]')&&state.checkpoint){state.checkpoint.coachOpen=!state.checkpoint.coachOpen;renderCheckpoint();return;}
    if(event.target===checkpointOverlay){closeCheckpoint();}
  });

  document.addEventListener('change',event=>{
    const option=event.target.closest('[data-checkpoint-option]');
    if(!option||!state.checkpoint) return;
    const question=state.checkpoint.questions[state.checkpoint.currentIndex];
    if(questionChecked(question)) return;
    const index=Number(option.dataset.checkpointOption);
    state.checkpoint.answers[String(question.id)]=question.options[index];
    state.checkpoint.notice='';
  });

  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&checkpointOverlay&&!checkpointOverlay.hidden) closeCheckpoint();});
  load();
})();