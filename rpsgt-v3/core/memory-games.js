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
    return learner.labs.memoryGames;
  }

  function saveStats(){learner=storage.save(learner);}
  function shuffle(values){
    const copy=values.slice();
    for(let index=copy.length-1;index>0;index-=1){const j=Math.floor(Math.random()*(index+1));[copy[index],copy[j]]=[copy[j],copy[index]];}
    return copy;
  }
  function filtered(){return cards.filter(card=>category==='all'||card.category===category);}
  function sample(count){return shuffle(filtered()).slice(0,Math.min(count,filtered().length));}
  function short(value,max){const text=String(value||'');return text.length>max?text.slice(0,max-1).trim()+'…':text;}

  function renderStats(){
    const s=stats();
    const moves=matchState?matchState.moves:0;
    const matches=matchState?matchState.matched.size:0;
    root.querySelector('[data-stat-moves]').textContent=String(moves);
    root.querySelector('[data-stat-matches]').textContent=String(matches)+' / '+(matchState?matchState.pairs:0);
    root.querySelector('[data-stat-games]').textContent=String(s.games||0);
    const accuracy=s.recallAnswered?Math.round((s.recallCorrect/s.recallAnswered)*100):0;
    root.querySelector('[data-stat-accuracy]').textContent=accuracy+'%';
  }

  function modeButtons(){
    root.querySelectorAll('[data-memory-mode]').forEach(button=>button.classList.toggle('active',button.dataset.memoryMode===mode));
    matchPanel.hidden=mode!=='match';
    recallPanel.hidden=mode==='match';
    root.querySelector('[data-memory-mode-description]').textContent=mode==='match'?'Match each front with its answer.':mode==='recall'?'See the flashcard front and choose the correct answer.':'See the answer and choose the matching term or prompt.';
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
    const s=stats();s.games=(s.games||0)+1;saveStats();
    renderBoard();renderStats();
  }

  function renderBoard(){
    board.replaceChildren();
    if(!matchState||!matchState.deck.length){board.innerHTML='<div class="empty">No cards are available for this category.</div>';return;}
    matchState.deck.forEach(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='memory-tile';
      button.dataset.memoryKey=item.key;
      if(matchState.selected.includes(item.key)) button.classList.add('revealed');
      if(matchState.matched.has(item.pairId)) button.classList.add('matched');
      button.disabled=matchState.matched.has(item.pairId);
      button.setAttribute('aria-label',matchState.selected.includes(item.key)||matchState.matched.has(item.pairId)?item.label:'Hidden memory card');
      button.innerHTML='<span class="memory-tile-inner"><span class="memory-tile-face memory-tile-front">SPG</span><span class="memory-tile-face memory-tile-back">'+escapeHtml(short(item.label,170))+'</span></span>';
      button.addEventListener('click',()=>chooseMatch(item.key));
      board.appendChild(button);
    });
  }

  function chooseMatch(key){
    if(!matchState||matchState.locked||matchState.selected.includes(key)) return;
    const item=matchState.deck.find(row=>row.key===key);if(!item||matchState.matched.has(item.pairId)) return;
    matchState.selected.push(key);renderBoard();
    if(matchState.selected.length<2) return;
    matchState.moves+=1;renderStats();
    const first=matchState.deck.find(row=>row.key===matchState.selected[0]);
    const second=matchState.deck.find(row=>row.key===matchState.selected[1]);
    if(first&&second&&first.pairId===second.pairId&&first.side!==second.side){
      matchState.matched.add(first.pairId);matchState.selected=[];renderBoard();renderStats();
      if(matchState.matched.size===matchState.pairs){
        const s=stats();s.matchWins=(s.matchWins||0)+1;s.bestMoves=!s.bestMoves||matchState.moves<s.bestMoves?matchState.moves:s.bestMoves;saveStats();
        complete.hidden=false;complete.textContent='Round complete — '+matchState.pairs+' pairs matched in '+matchState.moves+' moves.';
      }
      return;
    }
    matchState.locked=true;
    window.setTimeout(()=>{matchState.selected=[];matchState.locked=false;renderBoard();},700);
  }

  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}

  function startRecall(){
    const pool=filtered();
    if(pool.length<4){recallPrompt.innerHTML='<strong>Choose a category with at least four cards.</strong>';recallChoices.replaceChildren();return;}
    const question=sample(1)[0];
    const distractors=shuffle(pool.filter(card=>card.id!==question.id)).slice(0,3);
    const choices=shuffle([question,...distractors]);
    recallState={question,choices,answered:false};
    recallFeedback.hidden=true;nextButton.hidden=true;
    const prompt=mode==='reverse'?question.back:question.front;
    recallPrompt.innerHTML='<span class="status">'+escapeHtml(question.category)+'</span><strong>'+escapeHtml(prompt)+'</strong>';
    recallChoices.replaceChildren();
    choices.forEach(card=>{
      const button=document.createElement('button');
      button.type='button';button.className='recall-choice';button.dataset.recallId=card.id;
      button.textContent=mode==='reverse'?card.front:card.back;
      button.addEventListener('click',()=>answerRecall(card.id));
      recallChoices.appendChild(button);
    });
  }

  function answerRecall(id){
    if(!recallState||recallState.answered) return;
    recallState.answered=true;
    const correct=id===recallState.question.id;
    const s=stats();s.recallAnswered=(s.recallAnswered||0)+1;if(correct)s.recallCorrect=(s.recallCorrect||0)+1;saveStats();renderStats();
    recallChoices.querySelectorAll('[data-recall-id]').forEach(button=>{
      button.disabled=true;
      if(button.dataset.recallId===recallState.question.id) button.classList.add('correct');
      else if(button.dataset.recallId===id) button.classList.add('incorrect');
    });
    recallFeedback.hidden=false;
    recallFeedback.className='recall-feedback '+(correct?'correct':'incorrect');
    recallFeedback.textContent=(correct?'Correct. ':'Review. ')+(recallState.question.memoryClue?'Memory clue: '+recallState.question.memoryClue:'Use the full flashcard answer as your retrieval target.');
    nextButton.hidden=false;
  }

  function startCurrent(){if(mode==='match')startMatch();else startRecall();}

  root.querySelectorAll('[data-memory-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.memoryMode;modeButtons();startCurrent();}));
  root.querySelectorAll('[data-memory-size]').forEach(button=>button.addEventListener('click',()=>{pairCount=Number(button.dataset.memorySize)||6;root.querySelectorAll('[data-memory-size]').forEach(item=>item.classList.toggle('active',item===button));if(mode==='match')startMatch();}));
  root.querySelector('[data-memory-start]')?.addEventListener('click',startCurrent);
  nextButton?.addEventListener('click',startRecall);
  categorySelect?.addEventListener('change',()=>{category=categorySelect.value;startCurrent();});

  async function init(){
    try{
      const payload=await libraryApi.load();cards=payload.cards.slice();
      const categories=['all',...payload.categories];
      categorySelect.replaceChildren(...categories.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value==='all'?'All categories':value;return option;}));
      stats();modeButtons();startMatch();renderStats();
    }catch(error){root.querySelector('[data-memory-error]').hidden=false;root.querySelector('[data-memory-error]').textContent=error.message;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
