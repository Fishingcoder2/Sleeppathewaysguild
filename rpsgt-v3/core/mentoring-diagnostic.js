(function(){
  'use strict';
  const engine=window.RPSGTMentoringDiagnosticEngine;
  const summaryHost=document.querySelector('[data-md-summary]');
  const home=document.querySelector('[data-md-home]');
  const sectionsHost=document.querySelector('[data-md-sections]');
  const sessionHost=document.querySelector('[data-md-session]');
  const resultsHost=document.querySelector('[data-md-results]');
  const startButton=home&&home.querySelector('[data-md-start]');
  const state={catalog:null,saved:null,answers:{},index:0,result:null,active:false,launcher:null};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveLabs(next){state.saved.labs=next;state.saved=window.RPSGTStorage.save(state.saved);}
  function record(){return engine.summary(state.saved&&state.saved.labs);}
  function renderSummary(){
    const row=record();
    const latest=row.latestResult;
    summaryHost.innerHTML=`<div class="section-head"><div><div class="eyebrow">Mentoring record</div><h2>Targeted diagnostic progress</h2></div><span class="status ${row.completed?'green':''}">${row.completed?'Target reached':row.startedAt?'In progress':'Not started'}</span></div><div class="md-result-grid"><div><span>Attempts</span><strong>${row.attempts}</strong></div><div><span>Best score</span><strong>${row.attempts?row.bestPercent+'%':'—'}</strong></div><div><span>Latest</span><strong>${latest?latest.correct+' / '+latest.total:'—'}</strong></div></div>`;
  }
  function renderHome(){
    sectionsHost.innerHTML=(state.catalog.sections||[]).map(section=>`<article class="md-section-card"><span class="status">${esc((section.taskCodes||[]).join(' · '))}</span><h3>${esc(section.title)}</h3><p>${esc(section.description)}</p><p class="tiny"><strong>Mentoring target:</strong> ${section.targetCorrect}/${state.catalog.questions.filter(q=>q.section===section.id).length}</p></article>`).join('');
    home.hidden=false;sessionHost.hidden=true;resultsHost.hidden=true;document.body.classList.remove('md-session-open');
    if(startButton){
      startButton.textContent=state.active?'Resume diagnostic':'Start 24-question diagnostic';
      const old=home.querySelector('[data-md-resume-note]');if(old)old.remove();
      if(state.active){
        const note=document.createElement('p');note.className='md-resume-note';note.dataset.mdResumeNote='true';note.textContent=`Your current session is still open at question ${state.index+1}. ${answeredCount()}/${state.catalog.questions.length} answers are selected.`;startButton.closest('.actions')?.insertAdjacentElement('beforebegin',note);
      }
    }
  }
  function start(){
    state.answers={};state.index=0;state.result=null;state.active=true;
    saveLabs(engine.start(state.saved.labs,new Date().toISOString()));
    renderSummary();renderQuestion();
  }
  function current(){return state.catalog.questions[state.index];}
  function answeredCount(){return Object.keys(state.answers).filter(id=>state.answers[id]!==undefined&&state.answers[id]!==null).length;}
  function renderQuestion(){
    home.hidden=true;resultsHost.hidden=true;sessionHost.hidden=false;document.body.classList.add('md-session-open');
    const question=current();const total=state.catalog.questions.length;const answered=answeredCount();const selected=state.answers[question.id];const section=state.catalog.sections.find(item=>item.id===question.section)||{};
    const letters=['A','B','C','D'];
    sessionHost.innerHTML=`<div class="md-question-panel" data-md-question-panel tabindex="-1"><button class="md-session-close" type="button" data-md-close aria-label="Close diagnostic and keep your place">×</button><div class="md-question-number"><div><span class="status">Question ${state.index+1} of ${total}</span> <span class="status green">${esc(question.taskCode)}</span> <span class="status gold">${esc(section.title||question.section)}</span></div><strong data-md-answered-count>${answered}/${total} answered</strong></div>
      <div class="md-progress" aria-label="Question progress"><span style="width:${Math.round((state.index+1)/total*100)}%"></span></div>
      <div class="md-question"><h2 id="md-question-title">${esc(question.prompt)}</h2></div>
      <div class="md-options">${question.options.map((option,index)=>`<label class="md-option"><input type="radio" name="md-answer" value="${index}" ${selected===index?'checked':''}><strong>${letters[index]}.</strong><span>${esc(option)}</span></label>`).join('')}</div>
      <details class="md-palette-wrap"><summary>Question navigator · <span data-md-palette-count>${answered}/${total} answered</span></summary><div class="md-palette" aria-label="Question navigator">${state.catalog.questions.map((item,index)=>`<button type="button" data-md-jump="${index}" class="${state.answers[item.id]!==undefined?'answered':''} ${index===state.index?'current':''}" aria-label="Go to question ${index+1}">${index+1}</button>`).join('')}</div></details>
      <p class="md-boundary">Your selections stay in this session if you close the question window. Correctness feedback is shown only after submission.</p>
      <div class="md-nav"><button class="btn secondary" type="button" data-md-prev ${state.index===0?'disabled':''}>← Previous</button><div class="actions">${state.index<total-1?'<button class="btn primary" type="button" data-md-next>Next →</button>':'<button class="btn primary" type="button" data-md-submit>Submit diagnostic</button>'}</div></div></div>`;
    requestAnimationFrame(()=>{
      const selectedInput=sessionHost.querySelector('input[name="md-answer"]:checked');
      const target=selectedInput||sessionHost.querySelector('input[name="md-answer"]')||sessionHost.querySelector('[data-md-question-panel]');
      target?.focus({preventScroll:true});
    });
  }
  function updateAnsweredChrome(){
    const total=state.catalog.questions.length;const answered=answeredCount();
    const count=sessionHost.querySelector('[data-md-answered-count]');if(count)count.textContent=`${answered}/${total} answered`;
    const paletteCount=sessionHost.querySelector('[data-md-palette-count]');if(paletteCount)paletteCount.textContent=`${answered}/${total} answered`;
    const currentButton=sessionHost.querySelector(`[data-md-jump="${state.index}"]`);if(currentButton)currentButton.classList.add('answered');
  }
  function choose(value){const question=current();state.answers[question.id]=Number(value);updateAnsweredChrome();}
  function closeSession(){
    if(!state.active)return;
    sessionHost.hidden=true;document.body.classList.remove('md-session-open');renderHome();
    requestAnimationFrame(()=>startButton?.focus({preventScroll:true}));
  }
  function submit(){
    const unanswered=state.catalog.questions.filter(question=>state.answers[question.id]===undefined);
    if(unanswered.length){
      const first=state.catalog.questions.findIndex(question=>state.answers[question.id]===undefined);
      if(!window.confirm(`You still have ${unanswered.length} unanswered question${unanswered.length===1?'':'s'}. Go to the first unanswered item?`)) return;
      state.index=first;renderQuestion();return;
    }
    state.result=engine.grade(state.catalog,state.answers,new Date().toISOString());state.active=false;
    saveLabs(engine.applyResult(state.saved.labs,state.result));renderSummary();renderResults();
  }
  function resultPlanText(result,plan){
    const lines=['Sleep Pathways Guild — RPSGT Mentoring Prescription',`Diagnostic: ${result.correct}/${result.total} (${result.percent}%)`,`Learning band: ${plan.band.title}`,'','Section results:'];
    result.sectionResults.forEach(row=>lines.push(`- ${row.title}: ${row.correct}/${row.total} (${row.percent}%), target ${row.targetCorrect}/${row.total}${row.targetMet?' — met':' — review'}`));
    lines.push('','Priority review:');
    plan.priorities.forEach(item=>{lines.push(`- ${item.title}: ${item.missedSkills.length?item.missedSkills.join(', '):'mixed application'}`);});
    lines.push('','Next actions:');plan.nextActions.forEach(item=>lines.push(`- ${item}`));
    lines.push('','This is an educational mentoring diagnostic, not an official BRPT score or passing prediction.');
    return lines.join('\n');
  }
  async function copyPlan(textValue,button){
    try{await navigator.clipboard.writeText(textValue);const old=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=old,1400);}catch(error){window.prompt('Copy this mentoring plan:',textValue);}
  }
  function renderResults(){
    const result=state.result;const plan=engine.mentoringPlan(state.catalog,result);const sectionById=new Map(state.catalog.sections.map(section=>[section.id,section]));const questionById=new Map(state.catalog.questions.map(question=>[question.id,question]));
    const review=result.responses.filter(row=>!row.correct).map(row=>{const q=questionById.get(row.id);const selected=row.selected===null?'Unanswered':q.options[row.selected];return `<article><span class="status">${esc(q.taskCode)} · ${esc(q.topic)}</span><h3>${esc(q.prompt)}</h3><p class="learner-answer"><strong>Your answer:</strong> ${esc(selected)}</p><p class="correct-answer"><strong>Best answer:</strong> ${esc(q.options[q.answer])}</p><p>${esc(q.rationale)}</p></article>`;}).join('');
    const priorities=plan.priorities.map(item=>{const section=sectionById.get(item.id)||{};return `<article class="md-priority"><div class="md-score-line"><h3>${esc(item.title)}</h3><strong>${esc(item.score)} · target ${esc(item.target)}</strong></div>${item.missedSkills.length?`<p><strong>Missed pathways:</strong> ${item.missedSkills.map(esc).join(', ')}</p>`:'<p>Use mixed application to maintain this section.</p>'}<div class="md-resources">${(section.resources||[]).map(resource=>`<div class="md-resource"><strong>${esc(resource.label)}</strong><span>${esc(resource.focus)}</span></div>`).join('')}</div></article>`;}).join('');
    const planText=resultPlanText(result,plan);
    resultsHost.innerHTML=`<section class="card"><span class="status ${result.targetMet?'green':'gold'}">${esc(plan.band.title)}</span><h2>Mentoring diagnostic result</h2><p>${esc(plan.band.message)}</p><div class="md-result-grid"><div><span>Overall</span><strong>${result.correct}/${result.total}</strong><small>${result.percent}%</small></div><div><span>Overall target</span><strong>${result.overallTarget}/${result.total}</strong><small>${result.targetMet?'Target + sections met':'Use section targets below'}</small></div><div><span>Answered</span><strong>${result.answered}/${result.total}</strong><small>24-item intake</small></div></div><div class="md-section-grid">${result.sectionResults.map(row=>`<div class="md-section-card"><div class="md-score-line"><h3>${esc(row.title)}</h3><strong>${row.correct}/${row.total}</strong></div><p>${row.percent}% · target ${row.targetCorrect}/${row.total} · ${row.targetMet?'target met':'needs review'}</p></div>`).join('')}</div></section>
      <section class="card"><div class="section-head"><div><div class="eyebrow">Mentoring prescription</div><h2>Study the gaps, not the whole library</h2></div><span class="status gold">Coach plan</span></div>${priorities}<h3>Next actions</h3><ol>${plan.nextActions.map(item=>`<li>${esc(item)}</li>`).join('')}</ol><div class="md-copy-box" data-md-copy-text>${esc(planText)}</div><div class="actions"><button class="btn primary" type="button" data-md-copy>Copy mentoring plan</button><button class="btn secondary" type="button" data-md-retake>Retake diagnostic</button><a class="btn secondary" href="math-coach.html">Open Math Coach</a><a class="btn secondary" href="lab-troubleshooting.html">Open Troubleshooting Lab</a></div></section>
      <section class="card"><div class="section-head"><div><div class="eyebrow">Answer review</div><h2>${result.missedQuestionIds.length?result.missedQuestionIds.length+' item'+(result.missedQuestionIds.length===1?'':'s')+' to review':'No missed items'}</h2></div></div>${review?`<div class="md-review">${review}</div>`:'<p>All 24 items were answered correctly. Move to timed mixed application and explanation of distractors.</p>'}</section>
      <section class="notice"><strong>Important:</strong> Use the AASM Scoring Manual Version 3 as the primary reference when a scoring rule is version-sensitive. The textbook and Sleep Pathways Guild tools support learning and application; they do not replace the current scoring standard.</section>`;
    sessionHost.hidden=true;home.hidden=true;resultsHost.hidden=false;document.body.classList.remove('md-session-open');resultsHost.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error('Required mentoring modules are unavailable.');
      state.catalog=await loadJson('data/mentoring/diagnostic-v1.json');
      const validation=engine.validateCatalog(state.catalog);if(!validation.valid) throw new Error('The mentoring diagnostic did not pass validation.');
      state.saved=window.RPSGTStorage.load();renderSummary();renderHome();
    }catch(error){summaryHost.innerHTML=`<div class="notice error"><strong>Mentoring diagnostic could not load.</strong> ${esc(error.message)}</div>`;home.hidden=true;sessionHost.hidden=true;resultsHost.hidden=true;}
  }
  document.addEventListener('change',event=>{if(event.target.matches('input[name="md-answer"]')) choose(event.target.value);});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-md-start]')){state.launcher=event.target.closest('[data-md-start]');if(state.active)renderQuestion();else start();return;}
    if(event.target.closest('[data-md-close]')){closeSession();return;}
    const jump=event.target.closest('[data-md-jump]');if(jump){state.index=Number(jump.dataset.mdJump);renderQuestion();return;}
    if(event.target.closest('[data-md-prev]')){state.index=Math.max(0,state.index-1);renderQuestion();return;}
    if(event.target.closest('[data-md-next]')){state.index=Math.min(state.catalog.questions.length-1,state.index+1);renderQuestion();return;}
    if(event.target.closest('[data-md-submit]')){submit();return;}
    if(event.target.closest('[data-md-retake]')){start();return;}
    const copy=event.target.closest('[data-md-copy]');if(copy&&state.result){copyPlan(resultPlanText(state.result,engine.mentoringPlan(state.catalog,state.result)),copy);}
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.active&&!sessionHost.hidden){event.preventDefault();closeSession();}});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();