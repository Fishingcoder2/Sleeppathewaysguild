(function(){
  'use strict';
  const engine=window.RPSGTVisualLabEngine;
  const renderer=window.RPSGTVisualPSGRenderer;
  const workspace=document.querySelector('[data-visual-workspace]');
  const summaryHost=document.querySelector('[data-visual-summary]');
  const startButton=document.querySelector('[data-visual-start]');
  if(!workspace||!summaryHost||!startButton) return;
  const state={saved:null,pack:null,session:null,index:0,answers:{},locked:new Set(),finished:null,metrics:null};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>value?new Date(value).toLocaleString():'—';
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveLabs(nextLabs){state.saved.labs=nextLabs;state.saved=window.RPSGTStorage.save(state.saved);}
  function renderSummary(){
    const report=engine.summary(state.saved.labs);
    summaryHost.innerHTML=`<div><span>Status</span><strong>${report.startedAt?'Prototype started':'Not started'}</strong></div><div><span>Saved attempts</span><strong>${report.attempts}</strong></div><div><span>Best prototype score</span><strong>${report.attempts?report.bestPercent+'%':'—'}</strong></div><div><span>Last attempt</span><strong>${report.latestSession?formatDate(report.latestSession.completedAt):'—'}</strong></div>`;
    startButton.textContent=report.attempts?'Start another visual prototype':'Start visual prototype';
  }
  function currentQuestion(){return state.session&&state.session.questions[state.index]||null;}
  function currentStudy(){const question=currentQuestion();return question?state.session.studies.get(String(question.studyId)):null;}
  function allLocked(){return Boolean(state.session)&&state.locked.size===state.session.questions.length;}
  function renderOverlay(question){
    const layer=workspace.querySelector('[data-visual-region-layer]');
    if(!layer||!state.metrics){return;}
    layer.innerHTML='';
    if(!question||question.type!=='region-choice') return;
    const selected=state.answers[String(question.id)]||null,locked=state.locked.has(String(question.id));
    question.regions.forEach(region=>{
      const box=renderer.regionStyle(state.metrics,region),button=document.createElement('button');
      button.type='button';button.className='visual-region-button';button.dataset.visualRegion=region.id;button.style.left=box.left+'px';button.style.width=box.width+'px';button.setAttribute('aria-label','Select '+region.label+' time region');
      if(selected===region.id) button.classList.add('selected');
      if(locked){button.classList.add('locked');button.disabled=true;if(region.id===question.answer)button.classList.add('correct');if(selected===region.id&&selected!==question.answer)button.classList.add('incorrect');}
      layer.appendChild(button);
    });
  }
  function renderCanvas(){
    const canvas=workspace.querySelector('[data-visual-canvas]'),study=currentStudy(),question=currentQuestion();
    if(!canvas||!study)return;
    state.metrics=renderer.render(canvas,study);
    renderOverlay(question);
  }
  function choiceButton(value,label,question){
    const selected=state.answers[String(question.id)]===value,locked=state.locked.has(String(question.id));let classes='visual-choice';
    if(selected)classes+=' selected';
    if(locked&&value===question.answer)classes+=' correct';
    if(locked&&selected&&value!==question.answer)classes+=' incorrect';
    return `<button class="${classes}" type="button" data-visual-answer="${esc(value)}" ${locked?'disabled':''}>${esc(label)}</button>`;
  }
  function renderQuestionControls(question){
    if(question.type==='stage-choice') return `<div class="visual-stage-options" role="group" aria-label="Sleep stage choices">${question.options.map(option=>choiceButton(option,option,question)).join('')}</div>`;
    if(question.type==='region-choice') return `<div class="visual-region-options" role="group" aria-label="Time region choices">${question.regions.map(region=>choiceButton(region.id,region.label,question)).join('')}</div>`;
    return '';
  }
  function feedbackMarkup(question){
    if(!state.locked.has(String(question.id)))return '';
    const grade=engine.gradeAnswer(question,state.answers[String(question.id)]),answerLabel=question.type==='region-choice'?(question.regions.find(region=>region.id===question.answer)||{}).label||question.answer:question.answer;
    return `<div class="visual-feedback ${grade.correct?'correct':'retry'}"><strong>${grade.correct?'Correct':'Review this feature'} · Answer: ${esc(answerLabel)}</strong><span>${esc(question.rationale||'Review the complete signal context before continuing.')}</span></div>`;
  }
  function actionMarkup(question){
    const locked=state.locked.has(String(question.id)),last=state.index===state.session.questions.length-1;
    return `<div class="visual-question-actions">${state.index>0?'<button class="btn secondary" type="button" data-visual-prev>Previous question</button>':''}${!locked?'<button class="btn primary" type="button" data-visual-check>Check answer</button>':!last?'<button class="btn primary" type="button" data-visual-next>Next question</button>':allLocked()?'<button class="btn primary" type="button" data-visual-finish>Save prototype attempt</button>':''}<button class="btn secondary" type="button" data-visual-close>Close prototype</button></div>`;
  }
  function renderFinished(){
    const record=state.finished;
    workspace.hidden=false;
    workspace.innerHTML=`<div class="visual-result"><div class="eyebrow">Prototype attempt saved</div><h2>${record.correct}/${record.total} correct · ${record.percent}%</h2><p>This score is stored only in the Visual Skills Lab prototype record. It is not a readiness score, mock-exam score, or scoring-competency determination.</p><div class="actions"><button class="btn primary" type="button" data-visual-restart>Practice the prototype again</button><a class="btn secondary" href="labs.html">Return to Skills Labs</a></div></div>`;
  }
  function renderWorkspace(){
    if(state.finished){renderFinished();return;}
    const question=currentQuestion(),study=currentStudy();if(!question||!study)return;
    const interaction=question.type==='region-choice'?'Select a highlighted time band on the tracing or use the labeled buttons below.':'Choose the stage that this deliberately constructed teaching epoch represents.';
    workspace.hidden=false;
    workspace.innerHTML=`<div class="section-head"><div><div class="eyebrow">Mini PSG Viewer · ${esc(question.taskCode||'Visual')}</div><h2>${esc(study.title)}</h2></div><span class="status">Original schematic signal</span></div><div class="visual-study-meta"><span class="status">30-second display</span><span class="status">${study.channels.length} channels</span><span class="status">Question ${state.index+1} of ${state.session.questions.length}</span></div><div class="visual-viewer-shell"><div class="visual-viewer-head"><div><strong>PSG signal window</strong><small>Canvas-rendered from app-authored channel definitions</small></div><span class="status green">No patient data</span></div><div class="visual-scroll"><div class="visual-canvas-stage" data-visual-stage><canvas data-visual-canvas aria-label="Schematic polysomnography tracing"></canvas><div class="visual-region-layer" data-visual-region-layer aria-label="Selectable time regions"></div></div></div></div><section class="visual-question-card"><div class="visual-question-top"><div><h2>${esc(question.prompt)}</h2><p>${esc(interaction)}</p></div><span class="visual-counter">${state.index+1}/${state.session.questions.length}</span></div>${renderQuestionControls(question)}${feedbackMarkup(question)}${actionMarkup(question)}</section>`;
    requestAnimationFrame(renderCanvas);
  }
  function selectAnswer(value){const question=currentQuestion();if(!question||state.locked.has(String(question.id)))return;state.answers[String(question.id)]=String(value);renderWorkspace();}
  function checkAnswer(){const question=currentQuestion();if(!question)return;if(state.answers[String(question.id)]==null){const card=workspace.querySelector('.visual-question-card');if(card){const note=document.createElement('div');note.className='visual-feedback retry';note.innerHTML='<strong>Select an answer first.</strong><span>Use the tracing and the available choices before checking the item.</span>';card.appendChild(note);}return;}state.locked.add(String(question.id));renderWorkspace();}
  function finish(){if(!allLocked())return;const record=engine.gradeSession({questions:state.session.questions,answers:state.answers,completedAt:new Date().toISOString()});saveLabs(engine.applySession(state.saved.labs,record));state.finished=record;renderSummary();renderFinished();}
  function startSession(){
    saveLabs(engine.start(state.saved.labs,new Date().toISOString()));
    state.session=engine.buildSession(state.pack,new Date().toISOString());state.index=0;state.answers={};state.locked=new Set();state.finished=null;renderSummary();renderWorkspace();workspace.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function closeSession(){state.session=null;state.answers={};state.locked=new Set();state.finished=null;state.metrics=null;workspace.hidden=true;workspace.innerHTML='';}
  async function init(){
    try{
      if(!engine||!renderer||!window.RPSGTStorage)throw new Error('A required Visual Skills module is unavailable.');
      state.saved=window.RPSGTStorage.load();state.pack=await loadJson('data/visual/prototype-sleep-staging.json');const validation=engine.validatePack(state.pack);if(!validation.valid)throw new Error('Visual prototype pack failed validation: '+validation.issues.join(', '));renderSummary();
    }catch(error){workspace.hidden=false;workspace.innerHTML=`<div class="notice error"><strong>Visual prototype could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;startButton.disabled=true;}
  }
  startButton.addEventListener('click',startSession);
  document.addEventListener('click',event=>{
    const answer=event.target.closest('[data-visual-answer]');if(answer){selectAnswer(answer.dataset.visualAnswer);return;}
    const region=event.target.closest('[data-visual-region]');if(region){selectAnswer(region.dataset.visualRegion);return;}
    if(event.target.closest('[data-visual-check]')){checkAnswer();return;}
    if(event.target.closest('[data-visual-prev]')){state.index=Math.max(0,state.index-1);renderWorkspace();return;}
    if(event.target.closest('[data-visual-next]')){state.index=Math.min(state.session.questions.length-1,state.index+1);renderWorkspace();return;}
    if(event.target.closest('[data-visual-finish]')){finish();return;}
    if(event.target.closest('[data-visual-restart]')){startSession();return;}
    if(event.target.closest('[data-visual-close]'))closeSession();
  });
  let resizeTimer=null;window.addEventListener('resize',()=>{if(!state.session||workspace.hidden)return;clearTimeout(resizeTimer);resizeTimer=setTimeout(renderCanvas,100);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
