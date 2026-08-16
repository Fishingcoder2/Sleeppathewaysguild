(function(){
  'use strict';
  const engine=window.RPSGTScoringLabEngine;
  const renderer=window.RPSGTVisualPSGRenderer;
  const workspace=document.querySelector('[data-scoring-workspace]');
  const summaryHost=document.querySelector('[data-scoring-summary]');
  const stationHost=document.querySelector('[data-scoring-stations]');
  const startButton=document.querySelector('[data-scoring-start]');
  const stageStartButton=document.querySelector('[data-scoring-stage-start]');
  const stageWorkspace=document.querySelector('[data-scoring-stage-workspace]');
  if(!workspace||!summaryHost||!stationHost||!startButton||!stageStartButton||!stageWorkspace) return;
  const state={saved:null,questions:[],bank:[],stageItems:[],stageRun:null};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>value?new Date(value).toLocaleString():'Not recorded';
  const familyLabel=value=>({'stage-transition':'Stage transition','sleep-stage':'Sleep stage','arousal':'Arousal','respiratory-event':'Respiratory event','limb-movement':'Limb movement','artifact':'Artifact review','pediatric':'Age-specific context','other':'Scoring context'}[value]||'Scoring context');
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveLabs(nextLabs){state.saved.labs=nextLabs;state.saved=window.RPSGTStorage.save(state.saved);}
  function shuffle(items){const copy=items.slice();for(let index=copy.length-1;index>0;index-=1){const swap=Math.floor(Math.random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}return copy;}
  function renderSummary(){
    const report=engine.summary(state.saved.labs);
    summaryHost.innerHTML=`<div><span>Status</span><strong>${report.completed?'Completed':report.status==='in-progress'?'In progress':'Not started'}</strong></div><div><span>Stage skill</span><strong>${report.stageSkillAttempts?report.stageSkillBestPercent+'%':'—'}</strong></div><div><span>Review stations</span><strong>${report.stationsComplete}/${report.stationCount}</strong></div><div><span>Best checkpoint</span><strong>${report.attempts?report.bestPercent+'%':'—'}</strong></div><div><span>Checkpoint attempts</span><strong>${report.attempts}</strong></div><div><span>Last checkpoint</span><strong>${report.latestSession?formatDate(report.latestSession.completedAt):'—'}</strong></div>`;
    stageStartButton.textContent=report.stageSkillPassed?'Practice 5-stage skill check again':'Start 5-stage skill check';
    startButton.textContent=report.attempts?'Start another 10-question checkpoint':'Start 10-question checkpoint';
    if(report.completed) startButton.textContent='Practice another 10-question checkpoint';
  }
  function renderStations(){
    const report=engine.summary(state.saved.labs);
    stationHost.innerHTML=engine.STATIONS.map((station,index)=>`<label class="scoring-station ${report.checklist[station.id]?'complete':''}"><input type="checkbox" data-scoring-station="${esc(station.id)}" ${report.checklist[station.id]?'checked':''} ${report.completed?'disabled':''}><span class="scoring-station-number">${index+1}</span><span><strong>${esc(station.title)}</strong><small>${esc(station.focus)}</small><em>${report.checklist[station.id]?'Reviewed and recorded':'Mark after completing this review station'}</em></span></label>`).join('');
  }
  function renderStageQuestion(){
    if(!state.stageRun) return;
    if(state.stageRun.index>=state.stageRun.items.length){finishStageSkill();return;}
    const item=state.stageRun.items[state.stageRun.index];const question=item.question;const study=item.study;
    state.stageRun.locked=false;
    stageWorkspace.hidden=false;
    stageWorkspace.innerHTML=`<div class="section-head"><div><div class="eyebrow">Interactive staging skill · Epoch ${state.stageRun.index+1} of ${state.stageRun.items.length}</div><h3>Stage this 30-second schematic epoch</h3></div><span class="status">First answer counts</span></div><p class="report-intro">Inspect EEG background, EOG, chin tone, morphology, and channel relationships. The stage label stays hidden until you answer.</p><div class="scoring-stage-trace"><canvas data-scoring-stage-canvas aria-label="Original 30-second schematic PSG epoch"></canvas></div><div class="scoring-stage-options" role="group" aria-label="Choose sleep stage">${question.options.map(option=>`<button class="btn secondary" type="button" data-scoring-stage-answer="${esc(option)}">${esc(option)}</button>`).join('')}</div><div class="scoring-stage-feedback" data-scoring-stage-feedback aria-live="polite"></div>`;
    const canvas=stageWorkspace.querySelector('[data-scoring-stage-canvas]');
    renderer.render(canvas,study,{width:Math.max(980,stageWorkspace.clientWidth-10)});
    stageWorkspace.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function startStageSkill(){
    saveLabs(engine.start(state.saved.labs,new Date().toISOString()));
    state.stageRun={items:shuffle(state.stageItems),index:0,answers:{},locked:false};
    renderSummary();renderStageQuestion();
  }
  function answerStage(button){
    if(!state.stageRun||state.stageRun.locked) return;
    const item=state.stageRun.items[state.stageRun.index];const question=item.question;const selected=button.dataset.scoringStageAnswer;
    state.stageRun.answers[String(question.id)]=selected;state.stageRun.locked=true;
    const correct=engine.answersMatch(selected,question.answer);const buttons=[...stageWorkspace.querySelectorAll('[data-scoring-stage-answer]')];
    buttons.forEach(node=>{node.disabled=true;if(node.dataset.scoringStageAnswer===question.answer)node.classList.add('stage-correct');if(node===button&&!correct)node.classList.add('stage-wrong');});
    const feedback=stageWorkspace.querySelector('[data-scoring-stage-feedback]');const isLast=state.stageRun.index===state.stageRun.items.length-1;
    feedback.innerHTML=`<div class="notice ${correct?'success':'error'}"><strong>${correct?'Correct.':'Review this epoch.'}</strong> The intended stage is <strong>${esc(question.answer)}</strong>. ${esc(question.rationale||'Use the complete epoch and current official criteria when scoring real studies.')}</div><div class="actions"><button class="btn primary" type="button" data-scoring-stage-next>${isLast?'Finish stage skill check':'Next epoch'}</button></div>`;
  }
  function nextStage(){if(!state.stageRun)return;state.stageRun.index+=1;renderStageQuestion();}
  function finishStageSkill(){
    if(!state.stageRun) return;
    const questions=state.stageRun.items.map(item=>item.question);const record=engine.gradeStageSkill({questions,answers:state.stageRun.answers,completedAt:new Date().toISOString()});
    saveLabs(engine.applyStageSkill(state.saved.labs,record));const report=engine.summary(state.saved.labs);state.stageRun=null;
    stageWorkspace.hidden=false;
    stageWorkspace.innerHTML=`<div class="scoring-result ${record.passed?'pass':'retry'}"><h3>${report.completed?'Scoring lab completed':record.passed?'Stage recognition skill passed':'Stage recognition skill saved—review and retry'}</h3><strong>${record.correct}/${record.total} correct · ${record.percent}%</strong><p>${record.passed?'The 80% staging-skill requirement is complete. Continue with any remaining review stations and the D3 checkpoint.':'Score at least 80% across the five staging epochs. Your best skill score is preserved.'}</p></div><div class="actions"><button class="btn primary" type="button" data-scoring-stage-retry>Practice the 5-stage skill check again</button></div>`;
    renderSummary();renderStations();
  }
  function renderSession(){
    workspace.hidden=false;
    workspace.innerHTML=`<div class="section-head"><div><div class="eyebrow">D3A · D3B · D3C scoring checkpoint</div><h2>Ten learner-practice questions</h2></div><button class="btn secondary" type="button" data-scoring-cancel>Close checkpoint</button></div><p class="report-intro">This checkpoint balances learner-eligible scoring questions across D3A, D3B, and D3C and varies question families when the validated bank supports them. Answer all ten questions before scoring the checkpoint.</p><form data-scoring-form>${state.questions.map((question,index)=>`<fieldset class="scoring-question" data-scoring-question-id="${esc(question.id)}"><legend><span>${index+1}</span><span class="question-copy"><small>${esc(question.taskCode)} · ${esc(familyLabel(engine.classifyFamily(question)))}</small>${esc(question.prompt)}</span></legend>${question.options.map((option,optionIndex)=>`<label><input type="radio" name="scoring-${esc(question.id)}" value="${esc(option)}" data-option-index="${optionIndex}" required> <span>${esc(option)}</span></label>`).join('')}</fieldset>`).join('')}<div class="actions"><button class="btn primary" type="submit">Score event-scoring checkpoint</button></div></form><div data-scoring-result></div>`;
    workspace.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderResult(record){
    const host=workspace.querySelector('[data-scoring-result]');const byId=new Map(state.questions.map(question=>[String(question.id),question]));
    const review=record.responses.map((response,index)=>{const question=byId.get(String(response.id));const selected=response.selected==null?'No answer recorded':response.selected;return `<details class="scoring-review ${response.correct?'correct':'retry'}"><summary>${index+1}. ${response.correct?'Correct':'Review'} · ${esc(response.taskCode||'D3')} · ${esc(familyLabel(response.family))}</summary><p><strong>Your answer:</strong> ${esc(selected)}</p><p><strong>Correct answer:</strong> ${esc(question&&question.answer)}</p><p>${esc(question&&question.rationale||'Review the scoring evidence, source guidance, and event context before trying another checkpoint.')}</p></details>`;}).join('');
    const report=engine.summary(state.saved.labs);
    host.innerHTML=`<div class="scoring-result ${record.passed?'pass':'retry'}"><h3>${report.completed?'Scoring lab completed':record.passed?'Checkpoint passed—finish the remaining skill work':'Checkpoint saved—review and retry'}</h3><strong>${record.correct}/${record.total} correct · ${record.percent}%</strong><p>${report.completed?'The staging skill check, all seven review stations, and the checkpoint requirement are complete.':record.passed?'The 80% checkpoint requirement is complete. Finish the staging skill check and every review station to complete the lab.':'An 80% score is required. Your best score and attempt history remain preserved.'}</p></div><h3>Answer review</h3>${review}`;
  }
  function startSession(){
    saveLabs(engine.start(state.saved.labs,new Date().toISOString()));
    state.questions=engine.selectQuestions(state.bank,engine.SESSION_SIZE,'scoring|'+new Date().toISOString());
    if(state.questions.length<engine.SESSION_SIZE){workspace.hidden=false;workspace.innerHTML='<div class="notice error"><strong>Scoring checkpoint unavailable.</strong> Fewer than ten eligible learner-practice questions were found across D3A, D3B, and D3C.</div>';return;}
    renderSummary();renderStations();renderSession();
  }
  function submit(form){
    const answers={};const unanswered=[];
    state.questions.forEach(question=>{
      const selected=form.querySelector(`[name="scoring-${CSS.escape(String(question.id))}"]:checked`);
      if(!selected){unanswered.push(question);return;}
      const optionIndex=Number(selected.dataset.optionIndex);
      if(!Number.isInteger(optionIndex)||optionIndex<0||optionIndex>=question.options.length){unanswered.push(question);return;}
      answers[String(question.id)]=question.options[optionIndex];
    });
    if(unanswered.length){
      const host=workspace.querySelector('[data-scoring-result]');
      if(host) host.innerHTML=`<div class="notice error"><strong>Checkpoint not scored.</strong> Answer all ${state.questions.length} questions before submitting. Your current selections are still here.</div>`;
      const first=form.querySelector(`[data-scoring-question-id="${CSS.escape(String(unanswered[0].id))}"]`);
      if(first){first.scrollIntoView({behavior:'smooth',block:'center'});const input=first.querySelector('input[type="radio"]');if(input)input.focus();}
      return;
    }
    const record=engine.gradeSession({questions:state.questions,answers,completedAt:new Date().toISOString()});saveLabs(engine.applySession(state.saved.labs,record));form.querySelectorAll('input,button').forEach(node=>node.disabled=true);renderResult(record);renderSummary();renderStations();
  }
  async function init(){
    try{
      if(!engine||!renderer||!window.RPSGTStorage) throw new Error('A required Scoring lab module is unavailable.');
      state.saved=window.RPSGTStorage.load();
      const [d3a,d3b,d3c,stagePack]=await Promise.all(['data/question-bank/d3a.json','data/question-bank/d3b.json','data/question-bank/d3c.json','data/visual/prototype-sleep-staging.json'].map(loadJson));
      state.bank=[...(d3a.questions||[]),...(d3b.questions||[]),...(d3c.questions||[])];
      const studies=new Map((stagePack.studies||[]).map(study=>[String(study.id),study]));
      state.stageItems=(stagePack.questions||[]).filter(question=>question.type==='stage-choice').map(question=>({question,study:studies.get(String(question.studyId))})).filter(item=>item.study);
      if(engine.eligibleQuestions(state.bank).length<engine.SESSION_SIZE) throw new Error('The validated D3A/D3B/D3C banks do not contain enough eligible scoring questions.');
      if(state.stageItems.length!==engine.STAGE_SKILL_SIZE||new Set(state.stageItems.map(item=>item.question.answer)).size!==engine.STAGE_SKILL_SIZE) throw new Error('The five-stage interactive scoring pack is incomplete.');
      renderSummary();renderStations();
    }catch(error){workspace.hidden=false;workspace.innerHTML=`<div class="notice error"><strong>Scoring lab could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;startButton.disabled=true;stageStartButton.disabled=true;}
  }
  startButton.addEventListener('click',startSession);
  stageStartButton.addEventListener('click',startStageSkill);
  document.addEventListener('change',event=>{const station=event.target.closest('[data-scoring-station]');if(!station)return;saveLabs(engine.setStation(state.saved.labs,station.dataset.scoringStation,station.checked,new Date().toISOString()));renderSummary();renderStations();});
  document.addEventListener('click',event=>{
    const stageAnswer=event.target.closest('[data-scoring-stage-answer]');if(stageAnswer){answerStage(stageAnswer);return;}
    if(event.target.closest('[data-scoring-stage-next]')){nextStage();return;}
    if(event.target.closest('[data-scoring-stage-retry]')){startStageSkill();return;}
    if(event.target.closest('[data-scoring-cancel]')){state.questions=[];workspace.hidden=true;workspace.innerHTML='';}
  });
  document.addEventListener('submit',event=>{if(event.target.matches('[data-scoring-form]')){event.preventDefault();submit(event.target);}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
