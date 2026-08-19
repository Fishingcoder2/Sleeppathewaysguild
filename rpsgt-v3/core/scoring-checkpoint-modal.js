(function(){
'use strict';
const engine=window.RPSGTScoringLabEngine;
const storage=window.RPSGTStorage;
const workspace=document.querySelector('[data-scoring-workspace]');
const startButtons=[...document.querySelectorAll('[data-scoring-start]')];
if(!engine||!storage||!workspace||!startButtons.length)return;

function ensureStyle(href,marker){
  if(document.querySelector(`link[${marker}]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=href;
  link.setAttribute(marker,'');
  document.head.appendChild(link);
}
ensureStyle('assets/scoring-checkpoint-modal.css','data-scoring-checkpoint-modal-style');

const state={bank:[],questions:[],answerIndices:{},index:0,active:false,scored:false,record:null,loading:null};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
const familyLabel=value=>({'stage-transition':'Stage transition','sleep-stage':'Sleep stage','arousal':'Arousal','respiratory-event':'Respiratory event','limb-movement':'Limb movement','artifact':'Artifact review','pediatric':'Age-specific context','other':'Scoring context'}[value]||'Scoring context');
async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
function freshState(){return storage.load();}
function saveLabs(labs){const saved=freshState();saved.labs=labs;return storage.save(saved);}
async function ensureBank(){
  if(state.bank.length)return state.bank;
  if(state.loading)return state.loading;
  state.loading=Promise.all(['data/question-bank/d3a.json','data/question-bank/d3b.json','data/question-bank/d3c.json'].map(loadJson)).then(packs=>{
    state.bank=packs.flatMap(pack=>pack.questions||[]);
    return state.bank;
  }).finally(()=>{state.loading=null;});
  return state.loading;
}
function answeredCount(){return Object.keys(state.answerIndices).length;}
function currentQuestion(){return state.questions[state.index]||null;}
function currentAnswerIndex(){const question=currentQuestion();return question&&Object.prototype.hasOwnProperty.call(state.answerIndices,String(question.id))?state.answerIndices[String(question.id)]:null;}
function openModal(){
  document.body.classList.add('scoring-checkpoint-modal-open');
  workspace.hidden=false;
  workspace.classList.add('scoring-checkpoint-modal-active');
  workspace.setAttribute('role','dialog');
  workspace.setAttribute('aria-modal','true');
  workspace.setAttribute('aria-label','Ten-question scoring checkpoint');
}
function closeModal(){
  const reload=state.scored;
  state.active=false;
  state.questions=[];
  state.answerIndices={};
  state.record=null;
  state.scored=false;
  document.body.classList.remove('scoring-checkpoint-modal-open');
  workspace.classList.remove('scoring-checkpoint-modal-active','scoring-checkpoint-result-active');
  workspace.removeAttribute('role');
  workspace.removeAttribute('aria-modal');
  workspace.removeAttribute('aria-label');
  workspace.hidden=true;
  workspace.innerHTML='';
  if(reload)window.location.reload();
}
function navMarkup(){
  return state.questions.map((question,index)=>{
    const answered=Object.prototype.hasOwnProperty.call(state.answerIndices,String(question.id));
    const current=index===state.index;
    const cls=current?'current':answered?'complete':'';
    return `<button type="button" class="scoring-checkpoint-nav ${cls}" data-scoring-checkpoint-go="${index}" aria-current="${current?'step':'false'}" aria-label="Question ${index+1}${answered?', answered':''}">${answered&&!current?'✓ ':''}${index+1}</button>`;
  }).join('');
}
function renderQuestion(message){
  if(!state.active)return;
  const question=currentQuestion();
  if(!question)return;
  openModal();
  workspace.classList.remove('scoring-checkpoint-result-active');
  const selected=currentAnswerIndex();
  const isLast=state.index===state.questions.length-1;
  const answered=answeredCount();
  const choices=question.options.map((option,index)=>`<label class="scoring-checkpoint-choice ${selected===index?'selected':''}"><input type="radio" name="scoring-checkpoint-choice" value="${index}" data-scoring-checkpoint-option="${index}" ${selected===index?'checked':''}><span>${esc(option)}</span></label>`).join('');
  workspace.innerHTML=`<button class="scoring-checkpoint-close" type="button" data-scoring-checkpoint-close aria-label="Close checkpoint">×</button><header class="scoring-checkpoint-head"><div><div class="eyebrow">D3A · D3B · D3C scoring checkpoint</div><h2 tabindex="-1" data-scoring-checkpoint-heading>Question ${state.index+1} of ${state.questions.length}</h2></div><span class="status gold">${answered}/${state.questions.length} answered</span></header><div class="scoring-checkpoint-nav-row" aria-label="Checkpoint questions">${navMarkup()}</div><div class="scoring-checkpoint-body"><div class="scoring-checkpoint-meta"><span>${esc(question.taskCode)}</span><span>${esc(familyLabel(engine.classifyFamily(question)))}</span></div><h3 class="scoring-checkpoint-prompt">${esc(question.prompt)}</h3><div class="scoring-checkpoint-choices" role="radiogroup" aria-label="Answer choices">${choices}</div><div class="scoring-checkpoint-message" aria-live="polite">${message?`<div class="notice error">${esc(message)}</div>`:''}</div></div><footer class="scoring-checkpoint-footer"><p>Answers stay hidden until the full checkpoint is scored.</p><div class="scoring-checkpoint-actions"><button class="btn secondary" type="button" data-scoring-checkpoint-prev ${state.index===0?'disabled':''}>Previous</button><button class="btn primary" type="button" data-scoring-checkpoint-next>${isLast?'Score checkpoint':'Next'}</button></div></footer>`;
  const heading=workspace.querySelector('[data-scoring-checkpoint-heading]');
  if(heading)heading.focus({preventScroll:true});
}
function choose(index){
  const question=currentQuestion();
  const optionIndex=Number(index);
  if(!question||!Number.isInteger(optionIndex)||optionIndex<0||optionIndex>=question.options.length)return;
  state.answerIndices[String(question.id)]=optionIndex;
  renderQuestion();
}
function moveTo(index){
  if(!state.active||!state.questions.length)return;
  state.index=Math.max(0,Math.min(state.questions.length-1,Number(index)||0));
  renderQuestion();
}
function next(){
  if(state.index<state.questions.length-1){moveTo(state.index+1);return;}
  scoreCheckpoint();
}
function scoreCheckpoint(){
  const unanswered=state.questions.filter(question=>!Object.prototype.hasOwnProperty.call(state.answerIndices,String(question.id)));
  if(unanswered.length){
    const firstIndex=state.questions.findIndex(question=>String(question.id)===String(unanswered[0].id));
    state.index=Math.max(0,firstIndex);
    renderQuestion(`Checkpoint not scored. Answer all ${state.questions.length} questions before submitting. Your current selections are saved in this checkpoint.`);
    return;
  }
  const answers={};
  state.questions.forEach(question=>{answers[String(question.id)]=question.options[state.answerIndices[String(question.id)]];});
  const record=engine.gradeSession({questions:state.questions,answers,completedAt:new Date().toISOString()});
  saveLabs(engine.applySession(freshState().labs,record));
  state.record=record;
  state.scored=true;
  renderResult();
}
function renderResult(){
  const record=state.record;
  if(!record)return;
  openModal();
  workspace.classList.add('scoring-checkpoint-result-active');
  const byId=new Map(state.questions.map(question=>[String(question.id),question]));
  const review=record.responses.map((response,index)=>{
    const question=byId.get(String(response.id));
    const selected=response.selected==null?'No answer recorded':response.selected;
    return `<details class="scoring-review ${response.correct?'correct':'retry'}"><summary>${index+1}. ${response.correct?'Correct':'Review'} · ${esc(response.taskCode||'D3')} · ${esc(familyLabel(response.family))}</summary><p><strong>Your answer:</strong> ${esc(selected)}</p><p><strong>Correct answer:</strong> ${esc(question&&question.answer)}</p><p>${esc(question&&question.rationale||'Review the scoring evidence, source guidance, and event context before trying another checkpoint.')}</p></details>`;
  }).join('');
  workspace.innerHTML=`<button class="scoring-checkpoint-close" type="button" data-scoring-checkpoint-close aria-label="Close checkpoint results">×</button><header class="scoring-checkpoint-head"><div><div class="eyebrow">D3 scoring checkpoint complete</div><h2>${record.passed?'Checkpoint passed':'Checkpoint saved—review and retry'}</h2></div><span class="status ${record.passed?'green':'gold'}">${record.percent}%</span></header><div class="scoring-checkpoint-result-scroll"><div class="scoring-result ${record.passed?'pass':'retry'}"><strong>${record.correct}/${record.total} correct · ${record.percent}%</strong><p>${record.passed?'The checkpoint requirement is complete. Continue any remaining Scoring Lab skill work.':'An 80% score is required. Your best score and attempt history remain preserved.'}</p></div><h3>Answer review</h3>${review}</div><footer class="scoring-checkpoint-footer"><div class="scoring-checkpoint-actions single"><button class="btn primary" type="button" data-scoring-checkpoint-continue>Continue in Scoring Lab</button></div></footer>`;
}
async function startCheckpoint(){
  try{
    await ensureBank();
    const saved=freshState();
    saveLabs(engine.start(saved.labs,new Date().toISOString()));
    state.questions=engine.selectQuestions(state.bank,engine.SESSION_SIZE,'scoring-modal|'+new Date().toISOString());
    if(state.questions.length<engine.SESSION_SIZE)throw new Error('Fewer than ten eligible learner-practice questions were found across D3A, D3B, and D3C.');
    state.answerIndices={};
    state.index=0;
    state.record=null;
    state.scored=false;
    state.active=true;
    renderQuestion();
  }catch(error){
    state.active=true;
    openModal();
    workspace.innerHTML=`<button class="scoring-checkpoint-close" type="button" data-scoring-checkpoint-close aria-label="Close checkpoint">×</button><div class="notice error"><strong>Scoring checkpoint unavailable.</strong> ${esc(error.message)} No checkpoint score was changed.</div>`;
  }
}
function handleClick(event){
  const start=event.target.closest('[data-scoring-start]');
  if(start){event.preventDefault();event.stopImmediatePropagation();startCheckpoint();return;}
  if(!state.active)return;
  if(event.target.closest('[data-scoring-checkpoint-close]')){event.preventDefault();event.stopImmediatePropagation();closeModal();return;}
  const go=event.target.closest('[data-scoring-checkpoint-go]');
  if(go){event.preventDefault();event.stopImmediatePropagation();moveTo(go.dataset.scoringCheckpointGo);return;}
  if(event.target.closest('[data-scoring-checkpoint-prev]')){event.preventDefault();event.stopImmediatePropagation();moveTo(state.index-1);return;}
  if(event.target.closest('[data-scoring-checkpoint-next]')){event.preventDefault();event.stopImmediatePropagation();next();return;}
  if(event.target.closest('[data-scoring-checkpoint-continue]')){event.preventDefault();event.stopImmediatePropagation();window.location.reload();}
}
function handleChange(event){
  const choice=event.target.closest('[data-scoring-checkpoint-option]');
  if(!choice||!state.active||state.scored)return;
  event.stopImmediatePropagation();
  choose(choice.dataset.scoringCheckpointOption);
}
document.addEventListener('click',handleClick,true);
document.addEventListener('change',handleChange,true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.active){event.preventDefault();closeModal();}});
})();
