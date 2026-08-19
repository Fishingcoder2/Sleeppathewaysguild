(function(){
'use strict';
const STAGE_ORDER=['W','N1','N2','N3','R'];
const engine=window.RPSGTScoringLabEngine;
const renderer=window.RPSGTVisualPSGRenderer;
const storage=window.RPSGTStorage;
const display=window.SPGSharedVisualDisplay;
const workspace=document.querySelector('[data-scoring-stage-workspace]');
const startButtons=[...document.querySelectorAll('[data-scoring-stage-start]')];
if(!engine||!renderer||!storage||!workspace||!startButtons.length)return;
function ensureStyle(href,marker){if(document.querySelector(`link[${marker}]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute(marker,'');document.head.appendChild(link);}
ensureStyle('assets/scoring-stage-modal.css','data-scoring-stage-modal-style');
ensureStyle('assets/shared-visual-display.css','data-scoring-shared-visual-style');
const state={items:[],index:0,records:{},active:false,loading:null,result:null};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
function recordFor(item){const id=String(item.question.id);if(!state.records[id])state.records[id]={firstAnswer:null,selected:null,mastered:false,feedback:null,hint:false,confirming:false};return state.records[id];}
function fullscreenSupported(target){return Boolean(target&&(target.requestFullscreen||target.webkitRequestFullscreen||target.msRequestFullscreen));}
async function ensureItems(){
  if(state.items.length)return state.items;
  if(state.loading)return state.loading;
  state.loading=loadJson('data/visual/prototype-sleep-staging.json').then(pack=>{
    const studies=new Map((pack.studies||[]).map(study=>[String(study.id),study]));
    const raw=(pack.questions||[]).filter(question=>question.type==='stage-choice').map(question=>({question,study:studies.get(String(question.studyId))})).filter(item=>item.study);
    const byAnswer=new Map(raw.map(item=>[String(item.question.answer),item]));
    state.items=STAGE_ORDER.map(stage=>byAnswer.get(stage)).filter(Boolean);
    if(state.items.length!==STAGE_ORDER.length)throw new Error('The five-stage visual skill pack is incomplete.');
    return state.items;
  }).finally(()=>{state.loading=null;});
  return state.loading;
}
function openModal(){
  document.body.classList.add('scoring-stage-modal-open');
  workspace.hidden=false;
  workspace.classList.add('stage-modal-active');
  workspace.setAttribute('role','dialog');
  workspace.setAttribute('aria-modal','true');
  workspace.setAttribute('aria-label','Sleep staging skill');
}
function closeAndReload(){
  document.body.classList.remove('scoring-stage-modal-open');
  workspace.classList.remove('stage-modal-active');
  workspace.hidden=true;
  window.location.reload();
}
function navMarkup(){
  return state.items.map((item,index)=>{
    const rec=recordFor(item),current=index===state.index,next=index===state.index+1&&recordFor(state.items[state.index]).mastered;
    const cls=rec.mastered?'complete':rec.feedback&&rec.feedback.correct===false?'retry':current?'current':next?'recommended':'';
    const disabled=index>state.index&&!rec.mastered&&!next;
    return `<button type="button" class="scoring-stage-nav ${cls}" data-scoring-stage-go="${index}" ${disabled?'disabled':''} aria-current="${current?'step':'false'}">${rec.mastered?'✓ ':''}${esc(STAGE_ORDER[index])}</button>`;
  }).join('');
}
function renderResult(){
  const record=state.result;
  openModal();
  workspace.innerHTML=`<button class="scoring-stage-modal-close" type="button" data-scoring-stage-close aria-label="Close staging skill">×</button><div class="scoring-result ${record.passed?'pass':'retry'}"><h3>${record.passed?'Stage recognition skill passed':'Stage recognition skill saved—review and retry'}</h3><strong>${record.correct}/${record.total} first responses correct · ${record.percent}%</strong><p>${record.passed?'The existing 80% staging requirement is complete.':'Your first responses remain authoritative for this attempt. Corrections were required for mastery but did not inflate the score.'}</p><p>Continue to reload the Scoring Lab with this saved result before starting another station.</p></div><div class="actions"><button class="btn primary" type="button" data-scoring-stage-reload>Continue in Scoring Lab</button></div>`;
}
function render(){
  if(!state.active)return;
  if(state.result){renderResult();return;}
  const item=state.items[state.index],rec=recordFor(item),question=item.question;
  openModal();
  const confirmation=rec.confirming?`<div class="scoring-stage-confirmation" role="dialog" aria-label="Confirm staging answer"><strong>Are you sure?</strong><p>You selected <strong>${esc(rec.selected)}</strong>. Your first submitted answer is the score for this epoch.</p><div class="actions"><button class="btn primary" type="button" data-scoring-stage-submit>Submit answer</button><button class="btn secondary" type="button" data-scoring-stage-change>Change answer</button></div></div>`:'';
  const feedback=rec.feedback?`<div class="notice ${rec.feedback.correct?'success':'error'}"><strong>${rec.feedback.correct?'Correct.':'Review and try again.'}</strong> ${rec.feedback.correct?`The intended stage is <strong>${esc(question.answer)}</strong>.`:'Progression stays blocked until you identify this epoch correctly.'} ${esc(rec.feedback.rationale||'')}</div>`:'';
  const hint=rec.hint?`<div class="notice"><strong>Hint:</strong> Compare the EEG background and morphology with EOG and chin tone across the entire 30-second teaching epoch. Use the complete signal relationship before choosing a stage.</div>`:'';
  const canNext=rec.mastered;
  const visualId='scoring-stage-visual';
  workspace.innerHTML=`<button class="scoring-stage-modal-close" type="button" data-scoring-stage-close aria-label="Close staging skill">×</button><div class="scoring-stage-rotate-prompt" role="status"><div class="scoring-stage-rotate-icon" aria-hidden="true">↻</div><strong>Rotate your phone sideways</strong><span>This staging view uses landscape mode so the 30-second epoch and stage choices can fit together on screen.</span></div><div class="section-head"><div><div class="eyebrow">Interactive staging skill · Epoch ${state.index+1} of ${state.items.length}</div><h3>Stage this 30-second schematic epoch</h3></div><span class="status">First answer counts</span></div><div class="scoring-stage-nav-row" aria-label="Staging sequence">${navMarkup()}</div><p class="report-intro">Inspect EEG background, EOG, chin tone, morphology, and channel relationships. The stage label stays hidden until you submit an answer.</p><div class="scoring-stage-trace spg-visual-surface" data-scoring-stage-visual id="${visualId}"><button class="spg-visual-fullscreen-btn ${fullscreenSupported(workspace)?'':'is-unsupported'}" type="button" data-scoring-stage-fullscreen>Full screen</button><canvas data-scoring-stage-canvas aria-label="Original 30-second schematic PSG epoch"></canvas></div><p class="spg-visual-disclosure"><strong>AI-generated teaching schematic · Not a patient recording.</strong> Real PSG tracings vary. Compare authentic tracings in current sleep-technology textbooks, peer-reviewed educational resources, and official guidance.</p><div class="scoring-stage-options" role="group" aria-label="Choose sleep stage">${question.options.map(option=>`<button class="btn secondary ${rec.selected===option?'selected':''}" type="button" data-scoring-stage-answer="${esc(option)}" ${rec.confirming||rec.mastered?'disabled':''}>${esc(option)}</button>`).join('')}</div><div class="scoring-stage-toolbar"><button class="btn secondary" type="button" data-scoring-stage-prev ${state.index===0?'disabled':''}>Previous</button><button class="btn secondary" type="button" data-scoring-stage-hint>${rec.hint?'Hide hint':'Hint'}</button>${canNext?`<button class="btn primary" type="button" data-scoring-stage-next>${state.index===state.items.length-1?'Finish stage skill check':'Next'}</button>`:''}</div><div class="scoring-stage-feedback" data-scoring-stage-feedback aria-live="polite">${confirmation}${hint}${feedback}</div>`;
  const canvas=workspace.querySelector('[data-scoring-stage-canvas]');
  const visual=workspace.querySelector('[data-scoring-stage-visual]');
  renderer.render(canvas,item.study,{width:Math.max(980,(visual&&visual.clientWidth||1000)-10)});
}
async function startSkill(){
  try{
    await ensureItems();
    const saved=storage.load();saved.labs=engine.start(saved.labs,new Date().toISOString());storage.save(saved);
    state.index=0;state.records={};state.result=null;state.active=true;render();
  }catch(error){
    openModal();workspace.innerHTML=`<button class="scoring-stage-modal-close" type="button" data-scoring-stage-close aria-label="Close staging skill">×</button><div class="notice error"><strong>Staging skill could not load.</strong> ${esc(error.message)} No learner score was changed.</div>`;
  }
}
function choose(option){const item=state.items[state.index],rec=recordFor(item);if(rec.mastered||rec.confirming)return;rec.selected=option;rec.confirming=true;rec.feedback=null;render();}
function submitChoice(){
  const item=state.items[state.index],rec=recordFor(item);if(!rec.confirming||rec.selected==null)return;
  if(rec.firstAnswer==null)rec.firstAnswer=rec.selected;
  const correct=engine.answersMatch(rec.selected,item.question.answer);
  rec.confirming=false;rec.mastered=correct;rec.feedback={correct,rationale:correct?(item.question.rationale||'Use the complete epoch and current official criteria when scoring real studies.'):'Re-check the full epoch. The first response is saved for scoring; a correction is required before Next is available.'};
  if(!correct)rec.selected=null;
  render();
}
function changeChoice(){const rec=recordFor(state.items[state.index]);rec.confirming=false;render();}
function moveTo(index){
  const target=Math.max(0,Math.min(state.items.length-1,Number(index)));
  if(target>state.index&&!recordFor(state.items[state.index]).mastered)return;
  state.index=target;render();
}
function finishSkill(){
  if(!state.items.every(item=>recordFor(item).mastered))return;
  const answers={};state.items.forEach(item=>{answers[String(item.question.id)]=recordFor(item).firstAnswer;});
  const record=engine.gradeStageSkill({questions:state.items.map(item=>item.question),answers,completedAt:new Date().toISOString()});
  const saved=storage.load();saved.labs=engine.applyStageSkill(saved.labs,record);storage.save(saved);state.result=record;renderResult();
}
function requestFullscreen(){const target=workspace.querySelector('[data-scoring-stage-visual]');if(!target)return;if(display&&typeof display.requestFullscreen==='function'){display.requestFullscreen(target);return;}const request=target.requestFullscreen||target.webkitRequestFullscreen||target.msRequestFullscreen;if(typeof request==='function'){try{const result=request.call(target);if(result&&typeof result.catch==='function')result.catch(()=>{});}catch(error){}}}
function handleStageAction(event){
  const start=event.target.closest('[data-scoring-stage-start]');if(start){event.preventDefault();event.stopImmediatePropagation();startSkill();return;}
  if(!state.active)return;
  const answer=event.target.closest('[data-scoring-stage-answer]');if(answer){event.preventDefault();event.stopImmediatePropagation();choose(answer.dataset.scoringStageAnswer);return;}
  const go=event.target.closest('[data-scoring-stage-go]');if(go){event.preventDefault();event.stopImmediatePropagation();moveTo(go.dataset.scoringStageGo);return;}
  if(event.target.closest('[data-scoring-stage-submit]')){event.preventDefault();event.stopImmediatePropagation();submitChoice();return;}
  if(event.target.closest('[data-scoring-stage-change]')){event.preventDefault();event.stopImmediatePropagation();changeChoice();return;}
  if(event.target.closest('[data-scoring-stage-prev]')){event.preventDefault();event.stopImmediatePropagation();moveTo(state.index-1);return;}
  if(event.target.closest('[data-scoring-stage-next]')){event.preventDefault();event.stopImmediatePropagation();if(state.index===state.items.length-1)finishSkill();else moveTo(state.index+1);return;}
  if(event.target.closest('[data-scoring-stage-hint]')){event.preventDefault();event.stopImmediatePropagation();const rec=recordFor(state.items[state.index]);rec.hint=!rec.hint;render();return;}
  if(event.target.closest('[data-scoring-stage-fullscreen]')){event.preventDefault();event.stopImmediatePropagation();requestFullscreen();return;}
  if(event.target.closest('[data-scoring-stage-close]')||event.target.closest('[data-scoring-stage-reload]')){event.preventDefault();event.stopImmediatePropagation();closeAndReload();}
}
document.addEventListener('click',handleStageAction,true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.active){event.preventDefault();closeAndReload();}});
window.RPSGTScoringStageOrder={STAGE_ORDER:STAGE_ORDER.slice()};
})();
