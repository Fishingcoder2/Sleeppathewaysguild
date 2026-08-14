(function(){
  'use strict';
  const root=document.querySelector('[data-memory-arcade]');
  const memoryApi=window.RPSGTMemoryGames;
  if(!root||!memoryApi) return;

  let mathSkills=[];
  let handbookItems=[];
  let mode='formula-builder';
  let state=null;
  let sprintTimer=null;
  let sprintTimeout=null;

  const panel=root.querySelector('[data-arcade-panel]');
  const modeDescription=root.querySelector('[data-arcade-description]');
  const startButton=root.querySelector('[data-arcade-start]');

  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function shuffle(values){const copy=values.slice();for(let i=copy.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  function sample(values){return values[Math.floor(Math.random()*values.length)];}
  function unique(values){return Array.from(new Set(values.filter(value=>value!==undefined&&value!==null&&String(value).trim()!=='')));}
  function slug(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function formulaCardId(skill){return 'math:'+skill.id+':formula';}
  function unitCardId(skill){return 'math:'+skill.id+':unit';}
  function abbreviationCardId(item){return 'brpt-abbreviation:'+slug(item.abbreviation);}
  function formulaTokens(formula){
    const normalized=String(formula||'').replace(/[–—]/g,'−').trim();
    return normalized.split(/\s*(=|÷|×|−|\+)\s*/).map(value=>value.trim()).filter(Boolean);
  }
  function isOperator(token){return ['=','÷','×','−','+'].includes(token);}
  function record(cardId,correct){
    memoryApi.recordMemoryResult(cardId,correct);
    const metrics=memoryApi.arcadeStats();
    const sound=correct&&metrics.streak>0&&metrics.streak%5===0?'streak':correct?'correct':'incorrect';
    memoryApi.play(sound);renderStats();
  }
  function renderStats(){
    const metrics=memoryApi.arcadeStats();
    const accuracy=metrics.answered?Math.round(metrics.correct/metrics.answered*100):0;
    const targets={
      '[data-arcade-accuracy]':accuracy+'%',
      '[data-arcade-streak]':String(metrics.streak),
      '[data-arcade-best-streak]':String(metrics.bestStreak),
      '[data-arcade-best-sprint]':String(metrics.bestSprint)
    };
    Object.entries(targets).forEach(([selector,value])=>{const node=root.querySelector(selector);if(node)node.textContent=value;});
  }
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
  async function loadData(){
    const manifest=await loadJson('data/math-coach/manifest.json');
    mathSkills=await Promise.all((manifest.skillFiles||[]).map(file=>loadJson('data/math-coach/'+file)));
    const handbook=await loadJson('data/memory/brpt-rpsgt-abbreviations.json');
    handbookItems=Array.isArray(handbook.items)?handbook.items.slice():[];
  }

  function clearTimers(){
    if(sprintTimer){window.clearInterval(sprintTimer);sprintTimer=null;}
    if(sprintTimeout){window.clearTimeout(sprintTimeout);sprintTimeout=null;}
  }
  function setMode(next){
    clearTimers();mode=next;state=null;
    root.querySelectorAll('[data-arcade-mode]').forEach(button=>button.classList.toggle('active',button.dataset.arcadeMode===mode));
    const descriptions={
      'formula-builder':'Put the pieces of an RPSGT calculation formula into the correct order.',
      'missing-piece':'Retrieve the missing operator, numerator, denominator, or formula component.',
      'units':'Choose the reporting unit that belongs with the Math Coach skill.',
      'abbreviation-sprint':'Work through BRPT Candidate Handbook abbreviations for 60 seconds.'
    };
    modeDescription.textContent=descriptions[mode]||'';
    startButton.textContent=mode==='abbreviation-sprint'?'Start 60-second sprint':'New challenge';
    renderWelcome();
  }
  function renderWelcome(){
    const labels={'formula-builder':'Formula Builder','missing-piece':'Missing Formula Piece','units':'Units Challenge','abbreviation-sprint':'Abbreviation Sprint'};
    panel.innerHTML='<div class="arcade-welcome"><span class="status gold">'+escapeHtml(labels[mode])+'</span><h3>Ready when you are.</h3><p>'+escapeHtml(modeDescription.textContent)+'</p><button class="btn primary" type="button" data-arcade-inline-start>'+escapeHtml(startButton.textContent)+'</button></div>';
    panel.querySelector('[data-arcade-inline-start]')?.addEventListener('click',startCurrent);
  }

  function startFormulaBuilder(){
    const skill=sample(mathSkills.filter(item=>formulaTokens(item.formula).length>=3));
    if(!skill){showError('No Math Coach formulas are available.');return;}
    const tokens=formulaTokens(skill.formula).map((text,index)=>({text,index,key:skill.id+':'+index}));
    state={kind:'formula-builder',skill,solution:tokens.map(item=>item.index),bank:shuffle(tokens),built:[],answered:false};
    renderFormulaBuilder();
  }
  function renderFormulaBuilder(){
    const built=state.built.map(item=>'<button type="button" class="arcade-token built" data-builder-remove="'+item.key+'">'+escapeHtml(item.text)+'</button>').join('');
    const bank=state.bank.map(item=>'<button type="button" class="arcade-token" data-builder-add="'+item.key+'">'+escapeHtml(item.text)+'</button>').join('');
    panel.innerHTML='<div class="arcade-question"><span class="status">Formula Builder</span><h3>Build the formula for '+escapeHtml(state.skill.title)+'</h3><p class="arcade-memory-clue">'+escapeHtml(state.skill.memoryClue||'Name the numerator, denominator, and units before calculating.')+'</p><div class="arcade-build-zone" aria-label="Your formula">'+(built||'<span class="arcade-placeholder">Choose formula pieces below.</span>')+'</div><div class="arcade-token-bank" aria-label="Available formula pieces">'+bank+'</div><div class="actions"><button class="btn secondary" type="button" data-builder-clear '+(!state.built.length?'disabled':'')+'>Clear</button><button class="btn primary" type="button" data-builder-check '+(state.built.length!==state.solution.length?'disabled':'')+'>Check formula</button></div><div class="arcade-feedback" data-arcade-feedback hidden></div></div>';
    panel.querySelectorAll('[data-builder-add]').forEach(button=>button.addEventListener('click',()=>{
      if(state.answered)return;const index=state.bank.findIndex(item=>item.key===button.dataset.builderAdd);if(index<0)return;state.built.push(state.bank.splice(index,1)[0]);memoryApi.play('click');renderFormulaBuilder();
    }));
    panel.querySelectorAll('[data-builder-remove]').forEach(button=>button.addEventListener('click',()=>{
      if(state.answered)return;const index=state.built.findIndex(item=>item.key===button.dataset.builderRemove);if(index<0)return;state.bank.push(state.built.splice(index,1)[0]);memoryApi.play('click');renderFormulaBuilder();
    }));
    panel.querySelector('[data-builder-clear]')?.addEventListener('click',()=>{if(state.answered)return;state.bank=shuffle(state.bank.concat(state.built));state.built=[];renderFormulaBuilder();});
    panel.querySelector('[data-builder-check]')?.addEventListener('click',checkFormulaBuilder);
  }
  function checkFormulaBuilder(){
    if(!state||state.answered)return;
    const answer=state.built.map(item=>item.index);
    const correct=answer.length===state.solution.length&&answer.every((value,index)=>value===state.solution[index]);
    state.answered=true;record(formulaCardId(state.skill),correct);
    const feedback=panel.querySelector('[data-arcade-feedback]');feedback.hidden=false;feedback.className='arcade-feedback '+(correct?'correct':'incorrect');
    feedback.innerHTML=correct?'<strong>Formula built correctly.</strong> '+escapeHtml(state.skill.formula):'<strong>Review the order.</strong> Correct formula: '+escapeHtml(state.skill.formula);
    panel.querySelectorAll('.arcade-token,[data-builder-clear],[data-builder-check]').forEach(button=>button.disabled=true);
  }

  function operandDistractors(correct){
    const pool=[];
    mathSkills.forEach(skill=>formulaTokens(skill.formula).forEach((token,index)=>{if(index>0&&!isOperator(token)&&token!==correct)pool.push(token);}));
    return shuffle(unique(pool)).slice(0,3);
  }
  function startMissingPiece(){
    const candidates=mathSkills.map(skill=>({skill,tokens:formulaTokens(skill.formula)})).filter(row=>row.tokens.length>=3);
    const row=sample(candidates);if(!row){showError('No Math Coach formulas are available.');return;}
    const hiddenCandidates=row.tokens.map((token,index)=>({token,index})).filter(item=>item.index>0&&item.token!=='=');
    const hidden=sample(hiddenCandidates)||{token:row.tokens[row.tokens.length-1],index:row.tokens.length-1};
    let distractors=isOperator(hidden.token)?['÷','×','+','−'].filter(value=>value!==hidden.token):operandDistractors(hidden.token);
    const choices=shuffle(unique([hidden.token,...distractors])).slice(0,4);
    state={kind:'missing-piece',skill:row.skill,tokens:row.tokens,hiddenIndex:hidden.index,answer:hidden.token,choices,answered:false};
    renderMissingPiece();
  }
  function renderMissingPiece(){
    const display=state.tokens.map((token,index)=>index===state.hiddenIndex?'_____':token).join(' ');
    panel.innerHTML='<div class="arcade-question"><span class="status">Missing Formula Piece</span><h3>'+escapeHtml(state.skill.title)+'</h3><div class="arcade-formula-display">'+escapeHtml(display)+'</div><p>Which piece belongs in the blank?</p><div class="arcade-choice-grid">'+state.choices.map(choice=>'<button class="recall-choice" type="button" data-missing-choice="'+escapeHtml(choice)+'">'+escapeHtml(choice)+'</button>').join('')+'</div><div class="arcade-feedback" data-arcade-feedback hidden></div></div>';
    panel.querySelectorAll('[data-missing-choice]').forEach(button=>button.addEventListener('click',()=>answerChoice(button,state.answer,formulaCardId(state.skill),'missingChoice')));
  }

  function startUnits(){
    const skill=sample(mathSkills.filter(item=>String(item.unit||'').trim()));if(!skill){showError('No Math Coach units are available.');return;}
    const distractors=shuffle(unique(mathSkills.map(item=>item.unit).filter(unit=>unit&&unit!==skill.unit))).slice(0,3);
    state={kind:'units',skill,answer:skill.unit,choices:shuffle([skill.unit,...distractors]),answered:false};
    panel.innerHTML='<div class="arcade-question"><span class="status">Units Challenge</span><h3>What unit should be reported for '+escapeHtml(skill.title)+'?</h3><div class="arcade-choice-grid">'+state.choices.map(choice=>'<button class="recall-choice" type="button" data-unit-choice="'+escapeHtml(choice)+'">'+escapeHtml(choice)+'</button>').join('')+'</div><div class="arcade-feedback" data-arcade-feedback hidden></div></div>';
    panel.querySelectorAll('[data-unit-choice]').forEach(button=>button.addEventListener('click',()=>answerChoice(button,state.answer,unitCardId(skill),'unitChoice')));
  }

  function answerChoice(button,answer,cardId){
    if(!state||state.answered)return;state.answered=true;
    const selected=button.textContent;const correct=selected===answer;record(cardId,correct);
    panel.querySelectorAll('.recall-choice').forEach(choice=>{choice.disabled=true;if(choice.textContent===answer)choice.classList.add('correct');else if(choice===button&&!correct)choice.classList.add('incorrect');});
    const feedback=panel.querySelector('[data-arcade-feedback]');feedback.hidden=false;feedback.className='arcade-feedback '+(correct?'correct':'incorrect');
    feedback.textContent=correct?'Correct. Retrieve it once more before moving on.':'Review. Correct answer: '+answer;
  }

  function startSprint(){
    clearTimers();
    if(handbookItems.length<4){showError('The BRPT abbreviation deck is not available.');return;}
    state={kind:'abbreviation-sprint',remaining:60,score:0,answered:0,active:true,current:null};
    renderSprintQuestion();
    sprintTimer=window.setInterval(()=>{
      if(!state||!state.active)return;state.remaining-=1;updateSprintClock();if(state.remaining<=0)finishSprint();
    },1000);
  }
  function sprintChoices(item){return shuffle([item,...shuffle(handbookItems.filter(row=>row.abbreviation!==item.abbreviation)).slice(0,3)]);}
  function renderSprintQuestion(){
    if(!state||!state.active)return;
    const item=sample(handbookItems);state.current=item;
    const choices=sprintChoices(item);
    panel.innerHTML='<div class="arcade-question sprint"><div class="arcade-sprint-head"><span class="status gold">Abbreviation Sprint</span><strong data-sprint-clock>'+state.remaining+'s</strong><strong>'+state.score+' correct</strong></div><h3>What does '+escapeHtml(item.abbreviation)+' stand for?</h3><div class="arcade-choice-grid">'+choices.map(choice=>'<button class="recall-choice" type="button" data-sprint-choice="'+escapeHtml(choice.abbreviation)+'">'+escapeHtml(choice.meaning)+'</button>').join('')+'</div><div class="arcade-feedback" data-arcade-feedback hidden></div></div>';
    panel.querySelectorAll('[data-sprint-choice]').forEach(button=>button.addEventListener('click',()=>answerSprint(button)));
  }
  function answerSprint(button){
    if(!state||!state.active||!state.current)return;
    const correct=button.dataset.sprintChoice===state.current.abbreviation;state.answered+=1;if(correct)state.score+=1;
    record(abbreviationCardId(state.current),correct);
    panel.querySelectorAll('[data-sprint-choice]').forEach(choice=>{choice.disabled=true;if(choice.dataset.sprintChoice===state.current.abbreviation)choice.classList.add('correct');else if(choice===button&&!correct)choice.classList.add('incorrect');});
    const feedback=panel.querySelector('[data-arcade-feedback]');feedback.hidden=false;feedback.className='arcade-feedback '+(correct?'correct':'incorrect');feedback.textContent=correct?'Correct.':'Review: '+state.current.abbreviation+' = '+state.current.meaning;
    sprintTimeout=window.setTimeout(()=>{if(state&&state.active)renderSprintQuestion();},320);
  }
  function updateSprintClock(){const node=panel.querySelector('[data-sprint-clock]');if(node)node.textContent=Math.max(0,state.remaining)+'s';}
  function finishSprint(){
    if(!state||!state.active)return;state.active=false;clearTimers();const best=memoryApi.saveAbbreviationSprint(state.score);memoryApi.play('badge');renderStats();
    const accuracy=state.answered?Math.round(state.score/state.answered*100):0;
    panel.innerHTML='<div class="arcade-finish"><span class="status green">Sprint complete</span><h3>'+state.score+' correct in 60 seconds</h3><p>'+state.answered+' attempted · '+accuracy+'% correct · best score '+best+'.</p><button class="btn primary" type="button" data-sprint-again>Run another sprint</button></div>';
    panel.querySelector('[data-sprint-again]')?.addEventListener('click',startSprint);
  }

  function showError(message){panel.innerHTML='<div class="notice error"><strong>Memory Arcade could not start.</strong><br>'+escapeHtml(message)+'</div>';}
  function startCurrent(){
    clearTimers();memoryApi.play('click');
    if(mode==='formula-builder')startFormulaBuilder();
    else if(mode==='missing-piece')startMissingPiece();
    else if(mode==='units')startUnits();
    else startSprint();
  }

  root.querySelectorAll('[data-arcade-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.arcadeMode)));
  startButton?.addEventListener('click',startCurrent);

  async function init(){
    try{await loadData();renderStats();setMode(mode);}catch(error){showError(error.message);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
