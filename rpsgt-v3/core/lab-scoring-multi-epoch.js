(function(){
'use strict';
const engine=window.RPSGTScoringLabEngine;
const renderer=window.RPSGTVisualPSGRenderer;
const storage=window.RPSGTStorage;
const workspace=document.querySelector('[data-scoring-multi-workspace]');
const startButtons=[...document.querySelectorAll('[data-scoring-multi-start]')];
const summaryHost=document.querySelector('[data-scoring-summary]');
if(!engine||!renderer||!storage||!workspace||!startButtons.length||!summaryHost)return;
const state={pack:null,studies:new Map(),runs:[],run:null};
const esc=value=>String(value==null?'':value).replace(/[&<>\"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));
async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
function freshState(){return storage.load();}
function saveLabs(labs){const saved=freshState();saved.labs=labs;return storage.save(saved);}
function shuffle(items){const copy=items.slice();for(let index=copy.length-1;index>0;index-=1){const swap=Math.floor(Math.random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}return copy;}
function decisionKey(run,epochIndex){return `${run.id}::${epochIndex}`;}
function ensureSummaryTile(){
  const report=engine.summary(freshState().labs);
  let tile=summaryHost.querySelector('[data-scoring-multi-summary]');
  if(!tile){tile=document.createElement('div');tile.dataset.scoringMultiSummary='';summaryHost.appendChild(tile);}
  tile.innerHTML=`<span>Consecutive epochs</span><strong>${report.multiEpochSkillAttempts?report.multiEpochSkillBestPercent+'%':'—'}</strong>`;
  startButtons.forEach(button=>{button.textContent=report.multiEpochSkillPassed?'Practice consecutive epochs again':'Start consecutive-epoch skill';});
}
const observer=new MutationObserver(()=>queueMicrotask(ensureSummaryTile));
observer.observe(summaryHost,{childList:true});
function currentRun(){return state.run&&state.run.runs[state.run.runIndex]||null;}
function drawEpochs(){
  if(!state.run)return;
  const run=currentRun();
  if(!run)return;
  workspace.querySelectorAll('[data-scoring-multi-canvas]').forEach(canvas=>{
    const index=Number(canvas.dataset.scoringMultiCanvas),epoch=run.epochs[index],study=state.studies.get(String(epoch.studyId));
    if(study)renderer.render(canvas,study,{width:Math.max(980,workspace.clientWidth-24)});
  });
}
function renderRun(){
  if(!state.run)return;
  if(state.run.runIndex>=state.run.runs.length){finishSkill();return;}
  const run=currentRun();
  if(state.run.epochIndex>=run.epochs.length){state.run.runIndex+=1;state.run.epochIndex=0;state.run.locked=false;renderRun();return;}
  const currentIndex=state.run.epochIndex,currentEpoch=run.epochs[currentIndex],currentKey=decisionKey(run,currentIndex),selected=state.run.answers[currentKey]??null;
  workspace.hidden=false;
  const epochCards=run.epochs.map((epoch,index)=>{
    const key=decisionKey(run,index),answered=Object.prototype.hasOwnProperty.call(state.run.answers,key),isCurrent=index===currentIndex,isFuture=index>currentIndex;
    const choice=state.run.answers[key]??null,correct=answered&&engine.answersMatch(choice,epoch.answer);
    let controls='';
    if(isCurrent){
      controls=`<div class="scoring-multi-stage-options" role="group" aria-label="Choose sleep stage for epoch ${index+1}">${state.pack.options.map(option=>`<button class="btn secondary ${state.run.locked&&option===epoch.answer?'multi-correct':''} ${state.run.locked&&option===choice&&option!==epoch.answer?'multi-wrong':''}" type="button" data-scoring-multi-answer="${esc(option)}" ${state.run.locked?'disabled':''}>${esc(option)}</button>`).join('')}</div>`;
    }else if(answered){
      controls=`<div class="scoring-multi-epoch-result ${correct?'correct':'retry'}"><strong>${correct?'Correct':'Review'}:</strong> ${esc(choice)} → ${esc(epoch.answer)}</div>`;
    }else if(isFuture){
      controls='<div class="scoring-multi-locked">Keep this neighboring epoch in view. Its choices unlock after the current epoch is scored.</div>';
    }
    return `<article class="scoring-multi-epoch-card ${isCurrent?'current':''}"><div class="scoring-multi-epoch-head"><strong>Epoch ${index+1} of ${run.epochs.length}</strong><span>${answered?'Scored':isCurrent?'Stage this epoch':'Next in sequence'}</span></div><div class="scoring-multi-trace"><canvas data-scoring-multi-canvas="${index}" aria-label="Original 30-second schematic PSG epoch ${index+1}"></canvas></div>${controls}</article>`;
  }).join('');
  const feedback=state.run.locked?`<div class="notice ${engine.answersMatch(selected,currentEpoch.answer)?'success':'error'}"><strong>${engine.answersMatch(selected,currentEpoch.answer)?'Correct.':'Review this epoch.'}</strong> The intended stage is <strong>${esc(currentEpoch.answer)}</strong>. ${esc(currentEpoch.rationale)}</div><div class="actions"><button class="btn primary" type="button" data-scoring-multi-next>${state.run.runIndex===state.run.runs.length-1&&currentIndex===run.epochs.length-1?'Finish consecutive-epoch skill':currentIndex===run.epochs.length-1?'Next run':'Next epoch'}</button></div>`:'';
  workspace.innerHTML=`<div class="section-head"><div><div class="eyebrow">Phase 3 consecutive epochs · Run ${state.run.runIndex+1} of ${state.run.runs.length}</div><h3>${esc(run.title)}</h3></div><span class="status gold">First answer counts</span></div><p class="report-intro">${esc(run.focus)} Each 30-second epoch remains fully inspectable; neighboring traces provide context but do not replace the evidence in the epoch being staged.</p><div class="scoring-multi-sequence">${epochCards}</div><div class="scoring-multi-feedback" aria-live="polite">${feedback}</div>`;
  drawEpochs();
  const currentCard=workspace.querySelector('.scoring-multi-epoch-card.current');
  if(currentCard)currentCard.scrollIntoView({behavior:'smooth',block:'center'});
}
function startSkill(){
  if(!state.pack||!state.runs.length)return;
  const saved=freshState();
  saved.labs=engine.start(saved.labs,new Date().toISOString());
  storage.save(saved);
  state.run={runs:shuffle(state.runs),runIndex:0,epochIndex:0,answers:{},locked:false};
  ensureSummaryTile();
  renderRun();
}
function answerEpoch(button){
  if(!state.run||state.run.locked)return;
  const run=currentRun(),epochIndex=state.run.epochIndex,key=decisionKey(run,epochIndex);
  state.run.answers[key]=button.dataset.scoringMultiAnswer;
  state.run.locked=true;
  renderRun();
}
function nextEpoch(){
  if(!state.run||!state.run.locked)return;
  state.run.epochIndex+=1;
  state.run.locked=false;
  renderRun();
}
function finishSkill(){
  if(!state.run)return;
  const record=engine.gradeMultiEpochSkill({runs:state.run.runs,answers:state.run.answers,completedAt:new Date().toISOString()});
  const saved=freshState();
  const nextLabs=engine.applyMultiEpochSkill(saved.labs,record);
  saveLabs(nextLabs);
  state.run=null;
  workspace.hidden=false;
  workspace.innerHTML=`<div class="scoring-result ${record.passed?'pass':'retry'}"><h3>${record.passed?'Consecutive-epoch skill passed':'Consecutive-epoch skill saved—review and retry'}</h3><strong>${record.correct}/${record.total} epoch decisions correct · ${record.percent}%</strong><p>${record.passed?'Your Phase 3 consecutive-epoch practice pass is saved.':'Score at least 80% across all twelve neighboring-epoch decisions. Your best Phase 3 score is preserved.'} This new Phase 3 practice layer is tracked separately and does not yet change the Scoring Lab completion requirement while the interaction is being validated.</p></div><div class="actions"><button class="btn primary" type="button" data-scoring-multi-retry>Practice consecutive epochs again</button></div>`;
  ensureSummaryTile();
}
async function init(){
  try{
    const [pack,stagePack]=await Promise.all([loadJson('data/scoring/multi-epoch-runs.json'),loadJson('data/visual/prototype-sleep-staging.json')]);
    const validation=engine.validateMultiEpochPack(pack);
    if(!validation.valid)throw new Error(validation.errors.join(' '));
    state.pack=pack;
    state.studies=new Map((stagePack.studies||[]).map(study=>[String(study.id),study]));
    state.runs=pack.runs.map(run=>({...run,epochs:run.epochs.map(epoch=>({...epoch}))}));
    for(const run of state.runs)for(const epoch of run.epochs){const study=state.studies.get(String(epoch.studyId));if(!study)throw new Error(`Missing schematic study ${epoch.studyId}.`);if(study.stage!==epoch.answer)throw new Error(`Study ${epoch.studyId} does not match the intended stage ${epoch.answer}.`);}
    ensureSummaryTile();
  }catch(error){
    workspace.hidden=false;
    workspace.innerHTML=`<div class="notice error"><strong>Consecutive-epoch skill could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;
    startButtons.forEach(button=>{button.disabled=true;});
  }
}
document.addEventListener('click',event=>{
  if(event.target.closest('[data-scoring-multi-start]')){startSkill();return;}
  const answer=event.target.closest('[data-scoring-multi-answer]');if(answer){answerEpoch(answer);return;}
  if(event.target.closest('[data-scoring-multi-next]')){nextEpoch();return;}
  if(event.target.closest('[data-scoring-multi-retry]')){startSkill();}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
