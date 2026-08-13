(function(){
  'use strict';

  const engine=window.RPSGTHookupLabEngine;
  const workspace=document.querySelector('[data-hookup-workspace]');
  const summaryHost=document.querySelector('[data-hookup-summary]');
  const stationHost=document.querySelector('[data-hookup-stations]');
  const startButton=document.querySelector('[data-hookup-start]');
  if(!workspace||!summaryHost||!stationHost||!startButton) return;

  const state={saved:null,questions:[],bank:[],skillFeedback:new Map()};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>value?new Date(value).toLocaleString():'Not recorded';

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function saveLabs(nextLabs){
    state.saved.labs=nextLabs;
    state.saved=window.RPSGTStorage.save(state.saved);
  }

  function renderSummary(){
    const report=engine.summary(state.saved.labs);
    summaryHost.innerHTML=`
      <div><span>Status</span><strong>${report.completed?'Completed':report.status==='in-progress'?'In progress':'Not started'}</strong></div>
      <div><span>Skill checks</span><strong>${report.stationsComplete}/${report.stationCount}</strong></div>
      <div><span>Skill attempts</span><strong>${report.skillAttempts}</strong></div>
      <div><span>Best checkpoint</span><strong>${report.attempts?report.bestPercent+'%':'—'}</strong></div>
      <div><span>Checkpoint attempts</span><strong>${report.attempts}</strong></div>`;
    startButton.textContent=report.attempts?'Start another 10-question checkpoint':'Open 10-question checkpoint';
    if(report.completed) startButton.textContent='Practice another 10-question checkpoint';
  }

  function feedbackMarkup(feedback){
    if(!feedback) return '';
    if(feedback.needsChoice){
      return `<div class="hookup-skill-feedback retry" role="status"><strong>Choose a response first</strong><p>${esc(feedback.rationale)}</p></div>`;
    }
    const answer=feedback.correct||!feedback.answer?'':`<p><strong>Best answer:</strong> ${esc(feedback.answer)}</p>`;
    return `<div class="hookup-skill-feedback ${feedback.correct?'correct':'retry'}" role="status"><strong>${feedback.correct?'Skill demonstrated':'Not yet — try the decision again'}</strong><p>${esc(feedback.rationale)}</p>${answer}</div>`;
  }

  function stationMarkup(station,index,report){
    const skill=report.skills[station.id]||{};
    const feedback=state.skillFeedback.get(station.id)||null;
    const status=skill.mastered?'<span class="status green">Demonstrated</span>':'<span class="status">Skill check</span>';
    const mastery=skill.mastered
      ?`<div class="hookup-skill-mastered"><strong>✓ Skill demonstrated</strong><p>${esc(station.rationale)}</p><small>${skill.masteredAt?'Completed '+esc(formatDate(skill.masteredAt)):'Completed in this learner record'}</small></div>`
      :`<form class="hookup-skill-form" data-hookup-skill="${esc(station.id)}">
          <fieldset>
            <legend class="sr-only">${esc(station.title)}</legend>
            <div class="hookup-skill-options">${station.options.map((option,optionIndex)=>`<label><input type="radio" name="skill-${esc(station.id)}" value="${esc(option)}"><span class="choice-marker">${String.fromCharCode(65+optionIndex)}</span><span>${esc(option)}</span></label>`).join('')}</div>
          </fieldset>
          <div class="actions"><button class="btn primary" type="submit">Check this decision</button></div>
          ${feedbackMarkup(feedback)}
        </form>`;

    return `<article class="hookup-skill-card ${skill.mastered?'complete':''}" id="hookup-skill-${esc(station.id)}">
      <header class="hookup-skill-head"><span class="hookup-station-number">${index+1}</span><div><div class="eyebrow">${esc(station.action)}</div><h3>${esc(station.title)}</h3></div>${status}</header>
      <p class="hookup-skill-prompt">${esc(station.prompt)}</p>
      ${mastery}
    </article>`;
  }

  function renderStations(){
    const report=engine.summary(state.saved.labs);
    stationHost.innerHTML=engine.STATIONS.map((station,index)=>stationMarkup(station,index,report)).join('');
  }

  function renderSession(){
    workspace.hidden=false;
    workspace.innerHTML=`<div class="section-head"><div><div class="eyebrow">D2A · D2B Hookup checkpoint</div><h2>Ten learner questions</h2></div><button class="btn secondary" type="button" data-hookup-cancel>Close checkpoint</button></div>
      <p class="report-intro">Use this checkpoint after the skill checks to test setup, electrode, impedance, calibration, and signal-quality reasoning across learner-ready D2A and D2B questions.</p>
      <form data-hookup-form>${state.questions.map((question,index)=>`<fieldset class="hookup-question"><legend><span>${index+1}</span>${esc(question.prompt)}</legend>${question.options.map(option=>`<label><input type="radio" name="hookup-${esc(question.id)}" value="${esc(option)}"> <span>${esc(option)}</span></label>`).join('')}</fieldset>`).join('')}<div class="actions"><button class="btn primary" type="submit">Score Hookup checkpoint</button></div></form>
      <div data-hookup-result></div>`;
    workspace.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderResult(record){
    const host=workspace.querySelector('[data-hookup-result]');
    const byId=new Map(state.questions.map(question=>[String(question.id),question]));
    const review=record.responses.map((response,index)=>{
      const question=byId.get(String(response.id));
      return `<details class="hookup-review ${response.correct?'correct':'retry'}"><summary>${index+1}. ${response.correct?'Correct':'Review'} · ${esc(question&&question.topic||response.taskCode||'Hookup')}</summary><p><strong>Correct answer:</strong> ${esc(question&&question.answer)}</p><p>${esc(question&&question.rationale||'Review the setup decision and try another checkpoint.')}</p></details>`;
    }).join('');
    const report=engine.summary(state.saved.labs);
    const remaining=Math.max(0,report.stationCount-report.stationsComplete);
    host.innerHTML=`<div class="hookup-result ${record.passed?'pass':'retry'}"><h3>${report.completed?'Hookup lab completed':record.passed?'Checkpoint passed — finish the remaining skill checks':'Checkpoint saved — review and retry'}</h3><strong>${record.correct}/${record.total} correct · ${record.percent}%</strong><p>${report.completed?'You demonstrated all six Hookup skills and met the 80% checkpoint requirement.':record.passed?`The checkpoint requirement is complete. ${remaining} skill check${remaining===1?' remains':'s remain'} before lab completion.`:'An 80% checkpoint score is required. Your best score and attempt history remain available.'}</p></div><h3>Answer review</h3>${review}`;
  }

  function startSession(){
    saveLabs(engine.start(state.saved.labs,new Date().toISOString()));
    state.questions=engine.selectQuestions(state.bank,engine.SESSION_SIZE,'hookup|'+new Date().toISOString());
    if(state.questions.length<engine.SESSION_SIZE){
      workspace.hidden=false;
      workspace.innerHTML='<div class="notice error"><strong>Hookup checkpoint unavailable.</strong> Fewer than ten eligible learner questions were found.</div>';
      return;
    }
    renderSummary();
    renderStations();
    renderSession();
  }

  function submitCheckpoint(form){
    const answers={};
    state.questions.forEach(question=>{
      const selected=form.querySelector(`[name="hookup-${CSS.escape(String(question.id))}"]:checked`);
      if(selected) answers[String(question.id)]=selected.value;
    });
    const record=engine.gradeSession({questions:state.questions,answers,completedAt:new Date().toISOString()});
    saveLabs(engine.applySession(state.saved.labs,record));
    form.querySelectorAll('input,button').forEach(node=>node.disabled=true);
    renderResult(record);
    renderSummary();
    renderStations();
  }

  function submitSkill(form){
    const stationId=form.dataset.hookupSkill;
    const selected=form.querySelector('input[type="radio"]:checked');
    if(!selected){
      state.skillFeedback.set(stationId,{needsChoice:true,correct:false,rationale:'Choose one response before checking this skill decision.'});
      renderStations();
      return;
    }
    const attempt=engine.gradeSkill(stationId,selected.value,new Date().toISOString());
    saveLabs(engine.applySkillAttempt(state.saved.labs,attempt));
    state.skillFeedback.set(stationId,attempt);
    renderSummary();
    renderStations();
    const report=engine.summary(state.saved.labs);
    const next=engine.STATIONS.find(station=>!report.skills[station.id].mastered);
    if(attempt.correct&&next){
      requestAnimationFrame(()=>document.getElementById('hookup-skill-'+next.id)?.scrollIntoView({behavior:'smooth',block:'center'}));
    }
  }

  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error('A required Hookup lab module is unavailable.');
      state.saved=window.RPSGTStorage.load();
      const modules=await Promise.all(['data/question-bank/d2a.json','data/question-bank/d2b.json'].map(loadJson));
      state.bank=modules.flatMap(module=>module.questions||[]);
      if(engine.eligibleQuestions(state.bank).length<engine.SESSION_SIZE) throw new Error('The learner D2A/D2B question bank does not contain enough eligible Hookup questions.');
      renderSummary();
      renderStations();
    }catch(error){
      workspace.hidden=false;
      workspace.innerHTML=`<div class="notice error"><strong>Hookup lab could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;
      startButton.disabled=true;
    }
  }

  startButton.addEventListener('click',startSession);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-hookup-cancel]')){
      state.questions=[];
      workspace.hidden=true;
      workspace.innerHTML='';
    }
  });
  document.addEventListener('submit',event=>{
    if(event.target.matches('[data-hookup-skill]')){
      event.preventDefault();
      submitSkill(event.target);
      return;
    }
    if(event.target.matches('[data-hookup-form]')){
      event.preventDefault();
      submitCheckpoint(event.target);
    }
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
