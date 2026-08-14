(function(){
  'use strict';
  const libraryApi=window.RPSGTV2FlashcardLibrary;
  const storage=window.RPSGTStorage;
  const root=document.querySelector('[data-memory-app]');
  if(!libraryApi||!storage||!root) return;

  let cards=[];
  let mode='match';
  let category='all';
  let pairCount=6;
  let matchState=null;
  let recallState=null;
  let weakTurn=0;
  let learner=storage.load();

  const categorySelect=root.querySelector('[data-memory-category]');
  const board=root.querySelector('[data-memory-board]');
  const matchPanel=root.querySelector('[data-memory-match-panel]');
  const recallPanel=root.querySelector('[data-memory-recall-panel]');
  const recallPrompt=root.querySelector('[data-recall-prompt]');
  const recallChoices=root.querySelector('[data-recall-choices]');
  const recallFeedback=root.querySelector('[data-recall-feedback]');
  const nextButton=root.querySelector('[data-recall-next]');
  const complete=root.querySelector('[data-memory-complete]');

  function stats(){
    learner.labs=learner.labs&&typeof learner.labs==='object'?learner.labs:{};
    learner.labs.memoryGames=learner.labs.memoryGames&&typeof learner.labs.memoryGames==='object'?learner.labs.memoryGames:{games:0,matchWins:0,recallAnswered:0,recallCorrect:0,bestMoves:null};
    const s=learner.labs.memoryGames;
    s.games=Number(s.games||0);s.matchWins=Number(s.matchWins||0);s.recallAnswered=Number(s.recallAnswered||0);s.recallCorrect=Number(s.recallCorrect||0);
    s.cardMemory=s.cardMemory&&typeof s.cardMemory==='object'?s.cardMemory:{};
    return s;
  }

  function saveStats(){learner=storage.save(learner);}
  function shuffle(values){
    const copy=values.slice();
    for(let index=copy.length-1;index>0;index-=1){const j=Math.floor(Math.random()*(index+1));[copy[index],copy[j]]=[copy[j],copy[index]];}
    return copy;
  }
  function filtered(){return cards.filter(card=>category==='all'||card.category===category);}
  function sampleFrom(pool,count){return shuffle(pool).slice(0,Math.min(count,pool.length));}
  function sample(count){return sampleFrom(filtered(),count);}
  function short(value,max){const text=String(value||'');return text.length>max?text.slice(0,max-1).trim()+'…':text;}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function play(kind){if(window.RPSGTApp&&typeof window.RPSGTApp.playFeedbackSound==='function')window.RPSGTApp.playFeedbackSound(kind);}

  function memoryRecord(cardId){
    const s=stats();const id=String(cardId);const prior=s.cardMemory[id]&&typeof s.cardMemory[id]==='object'?s.cardMemory[id]:{};
    return {attempts:Number(prior.attempts||0),correct:Number(prior.correct||0),misses:Number(prior.misses||0),streak:Number(prior.streak||0),lastSeen:prior.lastSeen||null,lastResult:prior.lastResult||null};
  }
  function recordMemory(cardId,correct){
    const s=stats();const record=memoryRecord(cardId);record.attempts+=1;record.lastSeen=new Date().toISOString();record.lastResult=correct?'correct':'incorrect';
    if(correct){record.correct+=1;record.streak+=1;}else{record.misses+=1;record.streak=0;}
    s.cardMemory[String(cardId)]=record;
  }
  function weaknessScore(card){
    const record=memoryRecord(card.id);if(!record.attempts||!record.misses)return -1;
    const missRate=record.misses/record.attempts;return missRate*100+record.misses*8-Math.min(record.streak,5)*3;
  }
  function weakCards(){return filtered().filter(card=>weaknessScore(card)>=0).sort((a,b)=>weaknessScore(b)-weaknessScore(a));}
  function weakCount(){return cards.filter(card=>weaknessScore(card)>=0).length;}

  function renderStats(){
    const s=stats();
    const moves=matchState?matchState.moves:0;
    const matches=matchState?matchState.matched.size:0;
    root.querySelector('[data-stat-moves]').textContent=String(moves);
    root.querySelector('[data-stat-matches]').textContent=String(matches)+' / '+(matchState?matchState.pairs:0);
    root.querySelector('[data-stat-games]').textContent=String(s.games||0);
    const accuracy=s.recallAnswered?Math.round((s.recallCorrect/s.recallAnswered)*100):0;
    root.querySelector('[data-stat-accuracy]').textContent=accuracy+'%';
    const weak=root.querySelector('[data-stat-weak]');if(weak)weak.textContent=String(weakCount());
    const libraryCount=root.querySelector('[data-memory-library-count]');if(libraryCount)libraryCount.textContent=cards.length.toLocaleString()+' recall cards';
  }

  function modeButtons(){
    root.querySelectorAll('[data-memory-mode]').forEach(button=>button.classList.toggle('active',button.dataset.memoryMode===mode));
    matchPanel.hidden=mode!=='match';
    recallPanel.hidden=mode==='match';
    const descriptions={match:'Match each front with its answer.',recall:'See the flashcard front and choose the correct answer.',reverse:'See the answer and retrieve the matching term or prompt.',weak:'Work the cards you have missed most often, switching recall direction as you improve.'};
    root.querySelector('[data-memory-mode-description]').textContent=descriptions[mode]||descriptions.recall;
    const heading=recallPanel.querySelector('h2');if(heading)heading.textContent=mode==='weak'?'Repair weak memory':'Choose the best match';
  }

  function startMatch(){
    const chosen=sample(pairCount);
    const deck=[];
    chosen.forEach(card=>{
      deck.push({key:card.id+':front',pairId:card.id,label:card.front,side:'front'});
      deck.push({key:card.id+':back',pairId:card.id,label:card.back,side:'back'});
    });
    matchState={deck:shuffle(deck),selected:[],matched:new Set(),moves:0,pairs:chosen.length,locked:false};
    complete.hidden=true;
    const s=stats();s.games+=1;saveStats();
    renderBoard();renderStats();
  }

  function renderBoard(){
    board.replaceChildren();
    if(!matchState||!matchState.deck.length){board.innerHTML='<div class="empty">No cards are available for this category.</div>';return;}
    matchState.deck.forEach(item=>{
      const button=document.createElement('button');
      button.type='button';button.className='memory-tile';button.dataset.memoryKey=item.key;
      if(matchState.selected.includes(item.key))button.classList.add('revealed');
      if(matchState.matched.has(item.pairId))button.classList.add('matched');
      button.disabled=matchState.matched.has(item.pairId);
      button.setAttribute('aria-label',matchState.selected.includes(item.key)||matchState.matched.has(item.pairId)?item.label:'Hidden memory card');
      button.innerHTML='<span class="memory-tile-inner"><span class="memory-tile-face memory-tile-front">SPG</span><span class="memory-tile-face memory-tile-back">'+escapeHtml(short(item.label,170))+'</span></span>';
      button.addEventListener('click',()=>chooseMatch(item.key));board.appendChild(button);
    });
  }

  function chooseMatch(key){
    if(!matchState||matchState.locked||matchState.selected.includes(key))return;
    const item=matchState.deck.find(row=>row.key===key);if(!item||matchState.matched.has(item.pairId))return;
    matchState.selected.push(key);renderBoard();if(matchState.selected.length<2)return;
    matchState.moves+=1;renderStats();
    const first=matchState.deck.find(row=>row.key===matchState.selected[0]);const second=matchState.deck.find(row=>row.key===matchState.selected[1]);
    if(first&&second&&first.pairId===second.pairId&&first.side!==second.side){
      matchState.matched.add(first.pairId);matchState.selected=[];play('correct');renderBoard();renderStats();
      if(matchState.matched.size===matchState.pairs){const s=stats();s.matchWins+=1;s.bestMoves=!s.bestMoves||matchState.moves<s.bestMoves?matchState.moves:s.bestMoves;saveStats();complete.hidden=false;complete.textContent='Round complete — '+matchState.pairs+' pairs matched in '+matchState.moves+' moves.';play('badge');}
      return;
    }
    play('incorrect');matchState.locked=true;window.setTimeout(()=>{matchState.selected=[];matchState.locked=false;renderBoard();},700);
  }

  function recallPool(){return mode==='weak'?weakCards():filtered();}
  function recallDirection(){if(mode==='reverse')return'reverse';if(mode!=='weak')return'forward';const direction=weakTurn%2?'reverse':'forward';weakTurn+=1;return direction;}
  function startRecall(){
    const pool=recallPool();
    if(mode==='weak'&&!pool.length){recallState=null;recallPrompt.innerHTML='<span class="status green">Weak Memory</span><strong>No weak cards yet.</strong><span>Complete Front → Answer or Answer → Term rounds. Any missed card will automatically enter this repair deck.</span>';recallChoices.replaceChildren();recallFeedback.hidden=true;nextButton.hidden=true;renderStats();return;}
    if(!pool.length){recallPrompt.innerHTML='<strong>No cards are available for this category.</strong>';recallChoices.replaceChildren();return;}
    const question=sampleFrom(pool,1)[0];const direction=recallDirection();
    let distractorPool=filtered().filter(card=>card.id!==question.id);
    if(distractorPool.length<3)distractorPool=cards.filter(card=>card.id!==question.id);
    if(distractorPool.length<3){recallPrompt.innerHTML='<strong>Choose a category with at least four cards.</strong>';recallChoices.replaceChildren();return;}
    const distractors=sampleFrom(distractorPool,3);const choices=shuffle([question,...distractors]);recallState={question,choices,answered:false,direction};
    recallFeedback.hidden=true;nextButton.hidden=true;
    const prompt=direction==='reverse'?question.back:question.front;
    const weakLabel=mode==='weak'?' · Weak Memory':'';
    recallPrompt.innerHTML='<span class="status">'+escapeHtml(question.category+weakLabel)+'</span><strong>'+escapeHtml(prompt)+'</strong>';
    recallChoices.replaceChildren();choices.forEach(card=>{
      const button=document.createElement('button');button.type='button';button.className='recall-choice';button.dataset.recallId=card.id;button.textContent=direction==='reverse'?card.front:card.back;button.addEventListener('click',()=>answerRecall(card.id));recallChoices.appendChild(button);
    });
  }

  function answerRecall(id){
    if(!recallState||recallState.answered)return;recallState.answered=true;
    const correct=id===recallState.question.id;const s=stats();s.recallAnswered+=1;if(correct)s.recallCorrect+=1;recordMemory(recallState.question.id,correct);saveStats();renderStats();play(correct?'correct':'incorrect');
    recallChoices.querySelectorAll('[data-recall-id]').forEach(button=>{button.disabled=true;if(button.dataset.recallId===recallState.question.id)button.classList.add('correct');else if(button.dataset.recallId===id)button.classList.add('incorrect');});
    recallFeedback.hidden=false;recallFeedback.className='recall-feedback '+(correct?'correct':'incorrect');
    const record=memoryRecord(recallState.question.id);const repair=mode==='weak'?' Weak score: '+record.misses+' miss'+(record.misses===1?'':'es')+', current streak '+record.streak+'.':'';
    recallFeedback.textContent=(correct?'Correct. ':'Review. ')+(recallState.question.memoryClue?'Memory clue: '+recallState.question.memoryClue:'Use the complete answer as your retrieval target.')+repair;nextButton.hidden=false;
  }

  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
  function mathCardsFromSkill(skill){
    const result=[{id:'math:'+skill.id+':formula',front:'What is the formula for '+skill.title+'?',back:skill.formula,category:'Math formulas',memoryClue:skill.memoryClue||'Name the numerator, denominator, and units.'},{id:'math:'+skill.id+':unit',front:'What unit should be reported for '+skill.shortTitle+'?',back:skill.unit,category:'Math units',memoryClue:'A correct calculation still needs the correct unit.'}];
    const abbreviation=String(skill.shortTitle||'').trim();
    if(/^[A-Z][A-Z0-9]{1,6}$/.test(abbreviation)){
      const expanded=String(skill.title||'').replace(new RegExp('\\s*\\('+abbreviation.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\)\\s*$'),'').trim();
      result.push({id:'math:'+skill.id+':abbreviation',front:'What does '+abbreviation+' stand for?',back:expanded||skill.title,category:'Math abbreviations',memoryClue:'Say the full term before moving on.'});
    }
    return result;
  }
  async function loadMathCards(){
    try{const manifest=await loadJson('data/math-coach/manifest.json');const skills=await Promise.all((manifest.skillFiles||[]).map(file=>loadJson('data/math-coach/'+file)));return skills.flatMap(mathCardsFromSkill);}catch(error){return[];}
  }
  function handbookCardsFromPayload(payload){
    return (payload&&Array.isArray(payload.items)?payload.items:[]).map((item,index)=>({
      id:'brpt-abbreviation:'+String(item.abbreviation||index).toLowerCase().replace(/[^a-z0-9]+/g,'-'),
      front:'What does '+item.abbreviation+' stand for?',
      back:item.meaning,
      category:'BRPT handbook abbreviations',
      memoryClue:'Retrieve the full meaning before choosing. These abbreviations are listed in the current BRPT RPSGT Candidate Handbook.',
      sourceLabel:payload.source||'BRPT RPSGT Candidate Handbook',
      sourceVerifiedDate:payload.verifiedDate||null
    }));
  }
  async function loadHandbookCards(){
    try{return handbookCardsFromPayload(await loadJson('data/memory/brpt-rpsgt-abbreviations.json'));}catch(error){return[];}
  }

  function startCurrent(){if(mode==='match')startMatch();else startRecall();}
  root.querySelectorAll('[data-memory-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.memoryMode;modeButtons();startCurrent();}));
  root.querySelectorAll('[data-memory-size]').forEach(button=>button.addEventListener('click',()=>{pairCount=Number(button.dataset.memorySize)||6;root.querySelectorAll('[data-memory-size]').forEach(item=>item.classList.toggle('active',item===button));if(mode==='match')startMatch();}));
  root.querySelector('[data-memory-start]')?.addEventListener('click',startCurrent);nextButton?.addEventListener('click',startRecall);categorySelect?.addEventListener('change',()=>{category=categorySelect.value;startCurrent();});

  async function init(){
    try{
      const [payload,mathCards,handbookCards]=await Promise.all([libraryApi.load(),loadMathCards(),loadHandbookCards()]);cards=payload.cards.slice().concat(mathCards,handbookCards);
      const categories=['all',...Array.from(new Set(cards.map(card=>card.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b))];
      categorySelect.replaceChildren(...categories.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value==='all'?'All categories':value;return option;}));
      stats();modeButtons();startMatch();renderStats();
    }catch(error){root.querySelector('[data-memory-error]').hidden=false;root.querySelector('[data-memory-error]').textContent=error.message;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
