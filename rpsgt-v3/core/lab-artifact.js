(function(){
'use strict';

const engine=window.RPSGTArtifactLabEngine;
const renderer=window.RPSGTArtifactPSGRenderer;
const workspace=document.querySelector('[data-artifact-workspace]');
const summaryHost=document.querySelector('[data-artifact-summary]');
const startButton=document.querySelector('[data-artifact-start]');
if(!engine||!renderer||!workspace||!summaryHost||!startButton)return;

const state={
  saved:null,
  pack:null,
  session:null,
  index:0,
  answers:{},
  firstAnswers:{},
  locked:new Set(),
  retryRequired:null,
  outcome:null,
  questionOpen:false,
  confirming:false,
  questionHint:false,
  finished:null
};

let orientationTimer=null;
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt=value=>value?new Date(value).toLocaleString():'—';

async function loadJson(path){
  const response=await fetch(path,{cache:'no-store'});
  if(!response.ok)throw new Error(path+' HTTP '+response.status);
  return response.json();
}

function saveLabs(labs){
  state.saved.labs=labs;
  state.saved=window.RPSGTStorage.save(state.saved);
}

function renderSummary(){
  const report=engine.summary(state.saved.labs);
  summaryHost.innerHTML=`<div><span>Status</span><strong>${report.completed?'Completed':report.startedAt?'In progress':'Not started'}</strong></div><div><span>Best visual pack</span><strong>${report.attempts?report.bestPercent+'%':'—'}</strong></div><div><span>Attempts</span><strong>${report.attempts}</strong></div><div><span>Last attempt</span><strong>${report.latestSession?fmt(report.latestSession.completedAt):'—'}</strong></div>`;
  startButton.textContent=report.attempts?'Practice Artifact Pack 1 again':'Start Artifact Pack 1';
}

function currentQuestion(){return state.session&&state.session.questions[state.index]||null;}
function currentStudy(){const question=currentQuestion();return question&&state.session.studies.get(String(question.studyId));}
function currentKey(){const question=currentQuestion();return question?String(question.id):'';}
function selected(question){return question?state.answers[String(question.id)]??null:null;}
function locked(question){return Boolean(question)&&state.locked.has(String(question.id));}
function allLocked(){return Boolean(state.session)&&state.locked.size===state.session.questions.length;}
function caseQuestions(studyId){return state.session?state.session.questions.filter(question=>String(question.studyId)===String(studyId)):[];}
function caseProgress(studyId){const questions=caseQuestions(studyId);return {locked:questions.filter(question=>state.locked.has(String(question.id))).length,total:questions.length};}
function casePosition(question){
  const order=state.session.studyOrder;
  const caseIndex=order.indexOf(String(question.studyId));
  const within=caseQuestions(question.studyId);
  const partIndex=within.findIndex(item=>item.id===question.id);
  return {caseIndex,caseTotal:order.length,partIndex,partTotal:within.length};
}
function firstQuestionIndexForStudy(studyId){return state.session?state.session.questions.findIndex(question=>String(question.studyId)===String(studyId)):-1;}
function nextUnfinishedIndex(){
  if(!state.session)return -1;
  for(let offset=1;offset<=state.session.questions.length;offset+=1){
    const index=(state.index+offset)%state.session.questions.length;
    if(!state.locked.has(String(state.session.questions[index].id)))return index;
  }
  return -1;
}

function renderCanvas(){
  const canvas=workspace.querySelector('[data-artifact-canvas]');
  const study=currentStudy();
  if(canvas&&study)renderer.render(canvas,study);
}

function optionMarkup(question){
  return question.options.map(option=>{
    let classes='artifact-choice';
    const isSelected=selected(question)===option;
    if(isSelected)classes+=' selected';
    if(locked(question)&&option===question.answer)classes+=' correct';
    if(locked(question)&&isSelected&&option!==question.answer)classes+=' incorrect';
    return `<button class="${classes}" type="button" data-artifact-answer="${esc(option)}" ${locked(question)?'disabled':''}>${esc(option)}</button>`;
  }).join('');
}

function hintFor(question){
  const id=String(question&&question.id||'');
  if(id.includes('channel'))return 'Compare the affected derivation with neighboring channels. Artifact isolated to one pathway should make you inspect that pathway before interpreting it as physiology.';
  if(id.includes('evidence'))return 'Look for timing and distribution clues across channels. Correlation with ECG, video, EMG, or neighboring signals can reveal the source.';
  if(id.includes('action'))return 'Work from the patient and sensor back through electrode contact, lead, reference or ground, cable, amplifier, and nearby environment before using filters to hide a problem.';
  return 'Ask whether the pattern is physiologic: compare its morphology, timing, distribution, and relationship to neighboring channels before naming the artifact.';
}

function caseNavMarkup(){
  if(!state.session)return '';
  const current=currentQuestion();
  const currentStudyId=current?String(current.studyId):'';
  const currentCaseIndex=state.session.studyOrder.indexOf(currentStudyId);
  const currentProgress=caseProgress(currentStudyId);
  const currentComplete=Boolean(currentProgress.total&&currentProgress.locked===currentProgress.total&&!state.retryRequired);
  let recommended=-1;
  if(currentComplete){
    for(let offset=1;offset<=state.session.studyOrder.length;offset+=1){
      const index=(currentCaseIndex+offset)%state.session.studyOrder.length;
      const progress=caseProgress(state.session.studyOrder[index]);
      if(progress.locked<progress.total){recommended=index;break;}
    }
  }
  const retry=Boolean(state.retryRequired&&state.retryRequired===currentKey());
  const buttons=state.session.studyOrder.map((studyId,index)=>{
    const progress=caseProgress(studyId);
    const isCurrent=String(studyId)===currentStudyId;
    const complete=Boolean(progress.total&&progress.locked===progress.total);
    const classes=['artifact-case-button'];
    if(isCurrent)classes.push('current');
    if(complete)classes.push('complete');
    if(isCurrent&&retry)classes.push('needs-review');
    if(index===recommended)classes.push('next-step');
    const disabled=retry&&!isCurrent?' disabled':'';
    const label=complete&&!isCurrent?`Case ${index+1}, complete, tap to review`:`Open Case ${index+1}`;
    return `<button class="${classes.join(' ')}" type="button" data-artifact-case="${esc(studyId)}"${disabled} aria-current="${isCurrent?'true':'false'}" aria-label="${label}"><strong>Case ${index+1}</strong><small>${progress.locked}/${progress.total} decisions</small></button>`;
  }).join('');
  return `<nav class="artifact-case-nav" aria-label="Artifact case navigator">${buttons}</nav>`;
}

function statusPanelMarkup(question,pos){
  const retry=state.retryRequired===String(question.id);
  const answered=locked(question);
  return `<aside class="artifact-status-panel" aria-label="Current artifact progress"><span class="artifact-status-chip"><small>Case</small><strong>${pos.caseIndex+1}/${pos.caseTotal}</strong></span><span class="artifact-status-chip"><small>Decision</small><strong>${pos.partIndex+1}/${pos.partTotal}</strong></span><span class="artifact-status-chip"><small>Status</small><strong>${retry?'Retry required':answered?'Answered':'Ready'}</strong></span>${state.index>0&&!retry?'<button class="btn secondary" type="button" data-artifact-prev>← Previous</button>':''}<button class="btn primary" type="button" data-artifact-open-question>${answered?'Review question':'Answer question'}</button></aside>`;
}

function confirmationMarkup(){
  if(!state.confirming)return '';
  return `<div class="artifact-confirm-backdrop"><section class="artifact-dialog" role="dialog" aria-modal="true" aria-labelledby="artifact-confirm-title"><div class="artifact-dialog-icon" aria-hidden="true">?</div><div><div class="eyebrow">Confirm answer</div><h2 id="artifact-confirm-title">Are you sure?</h2><p>Submit this answer for grading? Choose Change answer if you want to select a different response first.</p><div class="artifact-dialog-actions"><button class="btn primary" type="button" data-artifact-confirm-submit>Submit answer</button><button class="btn secondary" type="button" data-artifact-confirm-cancel>Change answer</button></div></div></section></div>`;
}

function outcomeMarkup(question){
  const outcome=state.outcome;
  if(!outcome||outcome.questionId!==String(question.id))return '';
  const correct=Boolean(outcome.correct);
  const hint=outcome.hint?`<div class="artifact-hint"><strong>Hint</strong><span>${esc(hintFor(question))}</span></div>`:'';
  const actions=correct
    ? `<button class="btn primary" type="button" data-artifact-outcome="next">${allLocked()?'Finish pack':'Proceed to next'}</button><button class="btn secondary" type="button" data-artifact-outcome="review">Review case again</button><button class="btn secondary" type="button" data-artifact-outcome="hint">Ask for a hint</button>`
    : `<button class="btn primary" type="button" data-artifact-outcome="retry">Review and try again</button><button class="btn secondary" type="button" data-artifact-outcome="hint">Ask for a hint</button>`;
  return `<div class="artifact-outcome-backdrop"><section class="artifact-dialog ${correct?'correct':'incorrect'}" role="dialog" aria-modal="true" aria-labelledby="artifact-outcome-title"><div class="artifact-dialog-icon" aria-hidden="true">${correct?'✓':'×'}</div><div><div class="eyebrow">${correct?'Correct':'Incorrect'}</div><h2 id="artifact-outcome-title">${correct?'Choose what to do next.':'Review the signal before continuing.'}</h2><p>${correct?'Proceed, review the case again, or ask for a teaching hint.':'There is no Next option yet. Review the case and answer this decision correctly before proceeding.'}</p>${hint}<div class="artifact-dialog-actions">${actions}</div></div></section></div>`;
}

function reviewFeedback(question){
  if(!locked(question))return '';
  const submitted=selected(question);
  return `<div class="artifact-feedback ${submitted===question.answer?'correct':'retry'}"><strong>Submitted answer · ${esc(submitted)}</strong><p><strong>Correct answer:</strong> ${esc(question.answer)}</p><p>${esc(question.rationale||'Use the full signal context before continuing.')}</p></div>`;
}

function questionLayerMarkup(question,pos){
  const retry=state.retryRequired===String(question.id);
  const alreadyLocked=locked(question);
  return `<div class="artifact-question-layer" data-artifact-question-layer><section class="artifact-question-shell" role="dialog" aria-modal="true" aria-labelledby="artifact-question-title"><div class="artifact-question-header"><div><div class="eyebrow">Artifact Recognition · Case ${pos.caseIndex+1} · Decision ${pos.partIndex+1}</div><h2 id="artifact-question-title">${esc(question.prompt)}</h2></div><span class="artifact-question-count">${state.index+1}/${state.session.questions.length}</span></div>${retry?'<div class="artifact-retry-banner"><strong>Retry required</strong><span>Review the PSG, use the hint if needed, then submit a new answer. A correct response is required before you can continue.</span></div>':''}<div class="artifact-options">${optionMarkup(question)}</div>${state.questionHint?`<div class="artifact-hint"><strong>Hint</strong><span>${esc(hintFor(question))}</span></div>`:''}${reviewFeedback(question)}<footer class="artifact-question-footer"><button class="btn secondary" type="button" data-artifact-review-psg>← Review PSG</button><div class="actions">${!alreadyLocked?'<button class="btn secondary" type="button" data-artifact-question-hint>Ask for a hint</button>':''}</div></footer></section>${confirmationMarkup()}${outcomeMarkup(question)}</div>`;
}

function removeQuestionLayer(){
  const layer=workspace.querySelector('[data-artifact-question-layer]');
  if(layer)layer.remove();
}

function renderQuestionLayer(){
  removeQuestionLayer();
  if(!state.questionOpen||workspace.hidden||state.finished)return;
  const question=currentQuestion();
  if(!question)return;
  const pos=casePosition(question);
  workspace.insertAdjacentHTML('beforeend',questionLayerMarkup(question,pos));
}

function renderFinished(){
  const record=state.finished;
  workspace.hidden=false;
  document.body.classList.add('artifact-modal-open');
  workspace.classList.add('artifact-modal-active');
  workspace.innerHTML=`<button class="artifact-modal-close" type="button" data-artifact-close aria-label="Close Artifact Recognition Lab">×</button><div class="artifact-rotate" role="status"><div class="artifact-rotate-icon" aria-hidden="true">↻</div><strong>Rotate your phone sideways</strong><span>The Artifact Recognition Lab uses landscape mode so the PSG channels and troubleshooting controls fit together.</span></div><div class="artifact-result artifact-result-modal"><div class="eyebrow">Artifact Recognition Pack 1 saved · First-pass score</div><h2>${record.correct}/${record.total} correct · ${record.percent}%</h2><p>${record.passed?'Pack completion earned. You corrected every required decision and your first submitted responses met the 80% skill threshold.':'You corrected every required decision, but the saved first-pass score is below 80%. Review the signal clues and practice the pack again.'}</p><p>Retries support learning and progression but do not inflate the saved first-pass score.</p><div class="actions"><button class="btn primary" type="button" data-artifact-restart>Practice again</button><a class="btn secondary" href="labs.html">Return to Skills Labs</a></div></div>`;
}

function renderViewer(){
  if(state.finished){renderFinished();return;}
  const question=currentQuestion();
  const study=currentStudy();
  if(!question||!study)return;
  const pos=casePosition(question);
  workspace.hidden=false;
  document.body.classList.add('artifact-modal-open');
  workspace.classList.add('artifact-modal-active');
  state.questionOpen=false;
  state.confirming=false;
  state.questionHint=false;
  workspace.innerHTML=`<button class="artifact-modal-close" type="button" data-artifact-close aria-label="Close Artifact Recognition Lab">×</button><div class="artifact-rotate" role="status"><div class="artifact-rotate-icon" aria-hidden="true">↻</div><strong>Rotate your phone sideways</strong><span>The Artifact Recognition Lab uses landscape mode so the PSG channels and troubleshooting controls fit together.</span></div><div class="section-head"><div><div class="eyebrow">Artifact Recognition · Case ${pos.caseIndex+1} of ${pos.caseTotal}</div><h2>${esc(study.title)}</h2></div>${statusPanelMarkup(question,pos)}</div>${caseNavMarkup()}<div class="artifact-viewer"><div class="artifact-viewer-head"><div><strong>PSG signal window</strong><small>Compare affected and neighboring channels before answering.</small></div><span class="status green">Original schematic · No patient data</span></div><div class="artifact-scroll"><canvas data-artifact-canvas aria-label="Original schematic PSG artifact tracing"></canvas></div></div>`;
  requestAnimationFrame(renderCanvas);
}

function start(){
  saveLabs(engine.start(state.saved.labs,new Date().toISOString()));
  state.session=engine.buildSession(state.pack,'artifact|'+new Date().toISOString());
  state.index=0;
  state.answers={};
  state.firstAnswers={};
  state.locked=new Set();
  state.retryRequired=null;
  state.outcome=null;
  state.questionOpen=false;
  state.confirming=false;
  state.questionHint=false;
  state.finished=null;
  renderSummary();
  renderViewer();
}

function check(){
  const question=currentQuestion();
  const key=currentKey();
  if(!question||selected(question)==null)return;
  if(state.firstAnswers[key]==null)state.firstAnswers[key]=selected(question);
  state.locked.add(key);
  const correct=selected(question)===question.answer;
  state.retryRequired=correct?null:key;
  state.outcome={questionId:key,correct,hint:false};
  state.confirming=false;
  state.questionHint=false;
  renderQuestionLayer();
}

function proceed(){
  if(state.retryRequired)return;
  if(allLocked()){finish();return;}
  const next=nextUnfinishedIndex();
  if(next<0){finish();return;}
  state.index=next;
  state.outcome=null;
  renderViewer();
}

function retry(){
  const question=currentQuestion();
  const key=currentKey();
  if(!question||state.retryRequired!==key)return;
  state.locked.delete(key);
  delete state.answers[key];
  state.outcome=null;
  state.questionOpen=false;
  state.confirming=false;
  state.questionHint=false;
  renderViewer();
}

function finish(){
  if(!allLocked()||state.retryRequired)return;
  const record=engine.gradeSession({questions:state.session.questions,answers:{...state.firstAnswers},completedAt:new Date().toISOString()});
  saveLabs(engine.applySession(state.saved.labs,record));
  state.finished=record;
  renderSummary();
  renderFinished();
}

function closeLab(){
  removeQuestionLayer();
  workspace.hidden=true;
  workspace.classList.remove('artifact-modal-active');
  document.body.classList.remove('artifact-modal-open');
  state.questionOpen=false;
  state.confirming=false;
  state.outcome=null;
}

function settledOrientationRedraw(){
  if(orientationTimer)clearTimeout(orientationTimer);
  orientationTimer=setTimeout(()=>{
    orientationTimer=null;
    if(!workspace.hidden&&!state.finished&&!state.questionOpen)requestAnimationFrame(renderCanvas);
  },220);
}

async function init(){
  try{
    if(!window.RPSGTStorage)throw new Error('Versioned learner storage is unavailable.');
    state.saved=window.RPSGTStorage.load();
    state.pack=await loadJson('data/visual/artifact-pack-1.json');
    const validation=engine.validatePack(state.pack);
    if(!validation.valid)throw new Error('Artifact pack validation failed.');
    renderSummary();
  }catch(error){
    workspace.hidden=false;
    workspace.innerHTML=`<div class="notice error"><strong>Artifact Recognition Lab could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;
    startButton.disabled=true;
  }
}

startButton.addEventListener('click',start);

document.addEventListener('click',event=>{
  const answer=event.target.closest('[data-artifact-answer]');
  if(answer){
    const question=currentQuestion();
    if(question&&!locked(question)){
      state.answers[String(question.id)]=answer.dataset.artifactAnswer;
      state.confirming=true;
      state.questionHint=false;
      renderQuestionLayer();
    }
    return;
  }

  const caseButton=event.target.closest('[data-artifact-case]');
  if(caseButton&&!caseButton.disabled){
    if(state.retryRequired)return;
    const studyId=caseButton.dataset.artifactCase;
    const questions=caseQuestions(studyId);
    const target=questions.find(question=>!state.locked.has(String(question.id)))||questions[0];
    const index=target?state.session.questions.findIndex(question=>question.id===target.id):-1;
    if(index>=0){
      state.index=index;
      state.outcome=null;
      renderViewer();
    }
    return;
  }

  if(event.target.closest('[data-artifact-open-question]')){
    state.questionOpen=true;
    state.confirming=false;
    state.questionHint=false;
    state.outcome=null;
    renderQuestionLayer();
    return;
  }
  if(event.target.closest('[data-artifact-review-psg]')){
    state.outcome=null;
    renderViewer();
    return;
  }
  if(event.target.closest('[data-artifact-question-hint]')){
    state.questionHint=true;
    renderQuestionLayer();
    return;
  }
  if(event.target.closest('[data-artifact-confirm-submit]')){check();return;}
  if(event.target.closest('[data-artifact-confirm-cancel]')){
    state.confirming=false;
    renderQuestionLayer();
    return;
  }
  if(event.target.closest('[data-artifact-prev]')){
    if(!state.retryRequired&&state.index>0){
      state.index-=1;
      state.outcome=null;
      renderViewer();
    }
    return;
  }

  const outcomeAction=event.target.closest('[data-artifact-outcome]');
  if(outcomeAction){
    const action=outcomeAction.dataset.artifactOutcome;
    if(action==='next'){proceed();return;}
    if(action==='review'){
      state.outcome=null;
      renderViewer();
      return;
    }
    if(action==='retry'){retry();return;}
    if(action==='hint'&&state.outcome){
      state.outcome.hint=true;
      renderQuestionLayer();
      return;
    }
  }

  if(event.target.closest('[data-artifact-restart]')){start();return;}
  if(event.target.closest('[data-artifact-close]')){closeLab();}
});

document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||workspace.hidden)return;
  if(state.confirming){
    state.confirming=false;
    renderQuestionLayer();
    return;
  }
  if(state.outcome){
    if(state.outcome.correct){
      state.outcome=null;
      renderViewer();
    }else retry();
    return;
  }
  if(state.questionOpen){
    renderViewer();
    return;
  }
  closeLab();
});

if(window.screen&&screen.orientation&&typeof screen.orientation.addEventListener==='function')screen.orientation.addEventListener('change',settledOrientationRedraw);
else window.addEventListener('orientationchange',settledOrientationRedraw);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
