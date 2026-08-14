(function(){
  'use strict';

  const host=document.querySelector('[data-checkpoint-workspace]');
  const coach=window.RPSGTCoachBobEngine;
  const resources=window.RPSGTStudyResourceCatalog;
  const storage=window.RPSGTStorage;
  const trailEngine=window.RPSGTGuidedTrailEngine;
  if(!host||!coach||!trailEngine) return;

  const state={activeTaskCode:null,moduleCache:new Map(),renderToken:0};
  const clean=value=>String(value==null?'':value)
    .replace(/Medication-associated\s+\?Prozac eyes\?\s*\/\s*SSRI-related NREM eye movements/gi,'Medication-associated “Prozac eyes” (SSRI-related NREM eye movements)')
    .replace(/\?Prozac eyes\?/gi,'“Prozac eyes”')
    .replace(/\uFFFD/g,'');
  const normalize=value=>clean(value).trim().toLowerCase().replace(/\s+/g,' ');
  const esc=value=>clean(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function taskQuestions(taskCode){
    if(state.moduleCache.has(taskCode)) return state.moduleCache.get(taskCode);
    const promise=loadJson('data/question-bank/'+String(taskCode).toLowerCase()+'.json').then(module=>module.questions||[]);
    state.moduleCache.set(taskCode,promise);
    return promise;
  }

  function selectedOptions(){return [...host.querySelectorAll('.checkpoint-option span')].map(node=>normalize(node.textContent));}

  async function resolveCurrentQuestion(){
    const taskCode=state.activeTaskCode||clean(host.querySelector('.checkpoint-task-label strong')?.textContent);
    const stem=host.querySelector('#checkpoint-title');
    if(!taskCode||!stem) return null;
    state.activeTaskCode=taskCode;
    const prompt=normalize(stem.textContent);
    const options=selectedOptions();
    const topic=normalize(host.querySelector('.checkpoint-question-meta .status')?.textContent);
    const questions=await taskQuestions(taskCode);
    let matches=questions.filter(question=>trailEngine.eligibleQuestion(question,taskCode)&&normalize(question.prompt)===prompt);
    if(options.length) matches=matches.filter(question=>question.options.length===options.length&&question.options.every((option,index)=>normalize(option)===options[index]));
    if(matches.length>1&&topic&&topic!=='rpsgt review') matches=matches.filter(question=>normalize(question.topic)===topic);
    return matches.length===1?matches[0]:null;
  }

  function priorMisses(questionId,currentIncorrect){
    if(!storage) return 0;
    try{
      const saved=storage.load();
      const history=saved&&saved.guidedStudy&&Array.isArray(saved.guidedStudy.checkpointHistory)?saved.guidedStudy.checkpointHistory:[];
      const misses=history.reduce((sum,record)=>sum+(Array.isArray(record&&record.responses)&&record.responses.some(response=>String(response.id)===String(questionId)&&response.correct===false)?1:0),0);
      return Math.max(0,misses-(currentIncorrect?1:0));
    }catch(error){return 0;}
  }

  async function resourceTitles(question){
    if(!resources) return [];
    try{
      await resources.load();
      const result=resources.resolveQuestion(question);
      return Array.isArray(result&&result.titles)?result.titles:[];
    }catch(error){return [];}
  }

  function selectedAnswer(){
    const input=host.querySelector('.checkpoint-option input:checked');
    return input?clean(input.closest('.checkpoint-option')?.querySelector('span')?.textContent):'No answer selected';
  }

  function panelHtml(payload,question,submitted,correct,selected){
    const sourceList=payload.resources.length?`<div class="coach-source-list"><strong>Verified study resources</strong><ul>${payload.resources.map(title=>`<li>${esc(title)}</li>`).join('')}</ul></div>`:'';
    const review=submitted?`<dl class="coach-review-list"><div><dt>Your answer</dt><dd>${esc(selected)}</dd></div><div><dt>Correct answer</dt><dd>${esc(question.answer)}</dd></div></dl>
      ${payload.rationale?`<p><strong>Why:</strong> ${esc(payload.rationale)}</p>`:''}
      ${payload.whyTricky?`<p><strong>Why it is tricky:</strong> ${esc(payload.whyTricky)}</p>`:''}`:'';
    return `<span class="status gold">${esc(payload.label)}</span>
      <h3>${esc(payload.headline)}</h3>
      <p class="coach-note"><strong>Coach Bob:</strong> ${esc(payload.mentorMessage)}</p>
      <div class="coach-reasoning-compass"><strong>Reasoning Compass · ${esc(payload.compass.label)}</strong><p>${esc(payload.compass.prompt)}</p></div>
      <p><strong>Exam trap:</strong> ${esc(payload.examTrap)}</p>
      <p><strong>PSG connection:</strong> ${esc(payload.practiceConnection)}</p>
      ${review}
      ${sourceList}
      <p class="coach-next-action"><strong>Next move:</strong> ${esc(payload.nextAction)}</p>
      ${!submitted?'<p class="coach-boundary">This coaching guides your reasoning without revealing the answer.</p>':''}
      ${submitted&&!correct&&payload.repeatPattern?'<p class="coach-repeat-note"><strong>Repeat pattern:</strong> This item has been missed before in Guided Study. Repair the reasoning step before memorizing the choice.</p>':''}`;
  }

  async function renderCoach(){
    const panel=host.querySelector('.coach-question-panel');
    if(!panel) return;
    const token=++state.renderToken;
    const question=await resolveCurrentQuestion();
    if(!question||token!==state.renderToken||!panel.isConnected) return;
    const status=host.querySelector('.answer-status');
    const submitted=Boolean(status);
    const correct=Boolean(status&&status.classList.contains('correct'));
    const currentIncorrect=submitted&&!correct;
    const titles=await resourceTitles(question);
    if(token!==state.renderToken||!panel.isConnected) return;
    const payload=coach.build({
      question,
      phase:submitted?(correct?'correct':'incorrect'):'pre',
      resources:titles,
      priorMisses:priorMisses(question.id,currentIncorrect)
    });
    panel.innerHTML=panelHtml(payload,question,submitted,correct,selectedAnswer());
    panel.dataset.coachBobEngineVersion=payload.version;
  }

  function scheduleCoach(){queueMicrotask(()=>renderCoach().catch(error=>console.warn('Coach Bob guidance was not rendered.',error)));}

  document.addEventListener('click',event=>{
    const start=event.target.closest('[data-checkpoint-start]');
    if(start){
      state.activeTaskCode=start.getAttribute('data-checkpoint-start');
      taskQuestions(state.activeTaskCode).catch(()=>{});
      return;
    }
    if(event.target.closest('[data-coach-toggle],[data-checkpoint-score]')) scheduleCoach();
  });

  if(resources) resources.load().catch(()=>null);
  scheduleCoach();
})();
