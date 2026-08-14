(function(){
  'use strict';

  const engine=window.RPSGTFlashcardEngine;
  const storeApi=window.RPSGTFlashcardStore;
  const library=window.RPSGTLearningLibrary;
  const grid=document.querySelector('[data-card-grid]');
  const stage=document.querySelector('[data-card-stage]');
  const empty=document.querySelector('[data-card-empty]');
  const focusDialog=document.querySelector('[data-focus-dialog]');
  const customDialog=document.querySelector('[data-custom-card-dialog]');
  const printHost=document.querySelector('[data-print-host]');
  if(!engine||!storeApi||!library||!grid||!stage||!empty) return;

  const state={saved:null,store:null,cards:[],index:0,flipped:false,returnFocus:null};
  const control={
    search:document.querySelector('[data-card-search]'),
    category:document.querySelector('[data-card-category]'),
    domain:document.querySelector('[data-card-domain]'),
    task:document.querySelector('[data-card-task]'),
    topic:document.querySelector('[data-card-topic]'),
    status:document.querySelector('[data-card-status]')
  };
  const cardButton=document.querySelector('[data-flashcard]');

  function text(value){return String(value==null?'':value).trim();}
  function currentFilters(){return {search:control.search?.value||'',category:control.category?.value||'all',domain:control.domain?.value||'all',task:control.task?.value||'all',topic:control.topic?.value||'all',status:control.status?.value||'all'};}
  function option(value,label){const node=document.createElement('option');node.value=value;node.textContent=label;return node;}
  function setOptions(node,placeholder,items,selected){if(!node)return;node.replaceChildren(option('all',placeholder),...items.map(item=>option(item.value,item.label)));node.value=[...node.options].some(item=>item.value===selected)?selected:'all';}
  function allCards(){return engine.filterCards(state.store,{},state.saved?.review||{});}

  function filterChoices(){
    const cards=allCards();
    const categories=[...new Set(cards.map(card=>card.category).filter(Boolean))].sort().map(value=>({value,label:value}));
    const domains=[...new Set(cards.map(card=>card.domain).filter(Boolean))].sort().map(value=>({value,label:value}));
    const taskMap=new Map();cards.forEach(card=>{const value=card.taskCode||card.task;if(value&&!taskMap.has(value))taskMap.set(value,card.task||card.taskCode);});
    const tasks=[...taskMap].sort((a,b)=>String(a[1]).localeCompare(String(b[1]))).map(([value,label])=>({value,label}));
    const topics=[...new Set(cards.map(card=>card.topic).filter(Boolean))].sort().map(value=>({value,label:value}));
    const selected=Object.assign({search:'',category:'all',domain:'all',task:'all',topic:'all',status:'all'},state.store.filters||{},currentFilters());
    if(control.search&&document.activeElement!==control.search) control.search.value=selected.search||'';
    setOptions(control.category,'All categories',categories,selected.category);setOptions(control.domain,'All domains',domains,selected.domain);setOptions(control.task,'All tasks',tasks,selected.task);setOptions(control.topic,'All topics',topics,selected.topic);
    if(control.status) control.status.value=[...control.status.options].some(item=>item.value===selected.status)?selected.status:'all';
  }

  function saveFilters(){state.store.filters=currentFilters();const persisted=storeApi.persist(state.saved,state.store);state.saved=persisted.saved;state.store=persisted.store;}
  function hashColor(value){let hash=0;const source=text(value)||'RPSGT';for(let i=0;i<source.length;i+=1)hash=((hash<<5)-hash)+source.charCodeAt(i);return Math.abs(hash)%8;}
  function chipValues(card){return [...new Set([card.domain,card.taskCode,card.task].map(text).filter(Boolean))].slice(0,4);}
  function cardContext(card){return [...new Set([card.category,card.domain,card.task,card.topic].filter(Boolean))].join(' · ')||'RPSGT review';}

  function createNote(card){
    const article=document.createElement('article');article.className='deck-note deck-note-color-'+hashColor(card.category||card.topic);article.dataset.cardId=card.id;
    const flip=document.createElement('button');flip.type='button';flip.className='deck-note-card';flip.setAttribute('aria-label','Flip flashcard: '+card.front);flip.setAttribute('aria-pressed','false');
    const inner=document.createElement('span');inner.className='deck-note-inner';
    const front=document.createElement('span');front.className='deck-note-face deck-note-front';
    const title=document.createElement('span');title.className='deck-note-title';title.textContent=card.front;
    const chips=document.createElement('span');chips.className='deck-note-chips';chipValues(card).forEach(value=>{const chip=document.createElement('span');chip.className='deck-note-chip';chip.textContent=value;chips.appendChild(chip);});
    const category=document.createElement('span');category.className='deck-note-category';category.textContent=card.category||card.topic||'RPSGT review';
    front.append(title,chips,category);
    const back=document.createElement('span');back.className='deck-note-face deck-note-back';
    const answer=document.createElement('span');answer.className='deck-note-answer';answer.textContent=card.back;
    back.appendChild(answer);
    if(card.memoryClue){const clue=document.createElement('span');clue.className='deck-note-clue';clue.textContent='Memory clue: '+card.memoryClue;back.appendChild(clue);}
    const backCat=document.createElement('span');backCat.className='deck-note-category';backCat.textContent=card.category||card.topic||'RPSGT review';back.appendChild(backCat);
    inner.append(front,back);flip.appendChild(inner);
    flip.addEventListener('click',()=>{const flipped=article.classList.toggle('is-flipped');flip.setAttribute('aria-pressed',flipped?'true':'false');});

    const actions=document.createElement('span');actions.className='deck-note-actions';
    const flag=document.createElement('button');flag.type='button';flag.className='deck-note-action'+(card.flagged?' active':'');flag.textContent=card.flagged?'★':'☆';flag.title=card.flagged?'Remove flag':'Flag this card';flag.setAttribute('aria-label',flag.title);
    flag.addEventListener('click',event=>{event.stopPropagation();updateById(card.id,{flagged:!card.flagged});});
    const focus=document.createElement('button');focus.type='button';focus.className='deck-note-action';focus.textContent='↗';focus.title='Open focused study card';focus.setAttribute('aria-label','Open focused study card for '+card.front);
    focus.addEventListener('click',event=>{event.stopPropagation();openFocus(card.id,focus);});
    actions.append(flag,focus);article.append(flip,actions);return article;
  }

  function renderDeck(focusId){
    state.cards=engine.filterCards(state.store,currentFilters(),state.saved?.review||{});
    if(focusId){const found=state.cards.findIndex(card=>card.id===focusId);if(found>=0)state.index=found;}
    else state.index=Math.max(0,Math.min(state.index,state.cards.length-1));
    grid.replaceChildren(...state.cards.map(createNote));
    const all=allCards();const flagged=all.filter(card=>card.flagged).length;
    document.querySelectorAll('[data-card-total]').forEach(node=>node.textContent=state.cards.length+' card'+(state.cards.length===1?'':'s'));
    const summary=document.querySelector('[data-card-summary]');if(summary)summary.textContent=state.cards.length+' shown · '+flagged+' flagged · '+all.length+' total';
    empty.hidden=state.cards.length>0;grid.closest('.flashcard-deck-section').hidden=state.cards.length===0;
  }

  function setFocusFlipped(value){state.flipped=Boolean(value);cardButton.classList.toggle('is-flipped',state.flipped);cardButton.setAttribute('aria-pressed',state.flipped?'true':'false');cardButton.setAttribute('aria-label',state.flipped?'Show flashcard front':'Show flashcard answer');}
  function setText(selector,value){const node=document.querySelector(selector);if(node)node.textContent=value||'';}
  function showSection(wrapperSelector,textSelector,value){const wrapper=document.querySelector(wrapperSelector);if(wrapper)wrapper.hidden=!text(value);setText(textSelector,value);}
  function renderResources(card){const wrapper=document.querySelector('[data-card-resources-wrap]');const host=document.querySelector('[data-card-resources]');const titles=Array.isArray(card.recommendedResources)?card.recommendedResources.filter(Boolean):[];if(wrapper)wrapper.hidden=!titles.length;if(host)host.replaceChildren(...titles.map(title=>{const item=document.createElement('span');item.textContent=title;return item;}));}
  function renderFocus(){
    const card=state.cards[state.index];if(!card)return;stage.hidden=false;setFocusFlipped(false);
    setText('[data-card-position]','Card '+(state.index+1)+' of '+state.cards.length);setText('[data-card-context]',cardContext(card));setText('[data-card-front-topic]',card.category||card.topic||card.task||'RPSGT concept');setText('[data-card-front]',card.front);setText('[data-card-back]',card.back);
    showSection('[data-card-explanation-wrap]','[data-card-explanation]',card.explanation);showSection('[data-card-memory-wrap]','[data-card-memory]',card.memoryClue);showSection('[data-card-coach-wrap]','[data-card-coach]',card.coachBobNote);renderResources(card);
    const flag=document.querySelector('[data-card-flag]');const mastered=document.querySelector('[data-card-mastered]');const again=document.querySelector('[data-card-review-again]');
    if(flag){flag.textContent=card.flagged?'Remove flag':'Flag';flag.classList.toggle('active',card.flagged);}if(mastered){mastered.textContent=card.masteryStatus==='mastered'?'Mastered ✓':'Mastered';mastered.classList.toggle('active',card.masteryStatus==='mastered');}if(again){again.textContent=card.masteryStatus==='review-again'?'Review again ✓':'Review again';again.classList.toggle('active',card.masteryStatus==='review-again');}
    document.querySelector('[data-card-prev]').disabled=state.cards.length<2;document.querySelector('[data-card-next]').disabled=state.cards.length<2;
  }
  function openFocus(id,trigger){const found=state.cards.findIndex(card=>card.id===id);if(found<0)return;state.index=found;state.returnFocus=trigger||document.activeElement;focusDialog.hidden=false;document.body.classList.add('flashcard-focus-open');renderFocus();requestAnimationFrame(()=>cardButton.focus({preventScroll:true}));}
  function closeFocus(){if(!focusDialog)return;focusDialog.hidden=true;document.body.classList.remove('flashcard-focus-open');if(state.returnFocus?.focus)state.returnFocus.focus({preventScroll:true});state.returnFocus=null;}
  function navigate(direction){if(state.cards.length<2)return;state.index=(state.index+direction+state.cards.length)%state.cards.length;renderFocus();}

  function updateById(id,changes){const result=storeApi.update(id,changes,new Date().toISOString());if(!result.updated)return;state.saved=result.saved;state.store=result.store;filterChoices();renderDeck(id);if(!focusDialog.hidden){const found=state.cards.findIndex(card=>card.id===id);if(found>=0){state.index=found;renderFocus();}}}
  function updateCurrent(changes){const card=state.cards[state.index];if(card)updateById(card.id,changes);}
  function changeFilters(){state.index=0;saveFilters();renderDeck();}
  function showAll(){if(control.search)control.search.value='';[control.category,control.domain,control.task,control.topic,control.status].forEach(node=>{if(node)node.value='all';});changeFilters();}
  function studyFlagged(){if(control.search)control.search.value='';if(control.status)control.status.value='flagged';[control.category,control.domain,control.task,control.topic].forEach(node=>{if(node)node.value='all';});changeFilters();}
  function presetMath(){showAll();const desired='Report Math & Indexes';if(control.category&&[...control.category.options].some(option=>option.value===desired)){control.category.value=desired;}else if(control.search){control.search.value='formula';}changeFilters();}

  function openCustom(trigger){state.returnFocus=trigger||document.activeElement;customDialog.hidden=false;document.body.classList.add('flashcard-dialog-open');requestAnimationFrame(()=>customDialog.querySelector('textarea[name="front"]')?.focus());}
  function closeCustom(){customDialog.hidden=true;document.body.classList.remove('flashcard-dialog-open');if(state.returnFocus?.focus)state.returnFocus.focus({preventScroll:true});state.returnFocus=null;}
  function saveCustom(form){const data=new FormData(form);const result=storeApi.addCustom({front:data.get('front'),back:data.get('back'),explanation:data.get('explanation'),memoryClue:data.get('memoryClue'),coachBobNote:data.get('coachBobNote'),category:data.get('category'),domain:data.get('domain'),task:data.get('task'),topic:data.get('topic'),sourceContext:'Custom RPSGT v3 card'},new Date().toISOString());state.saved=result.saved;state.store=result.store;form.reset();closeCustom();filterChoices();showAll();renderDeck(result.card.id);openFocus(result.card.id,document.querySelector('[data-custom-card-open]'));}

  function printFlagged(){const cards=allCards().filter(card=>card.flagged);if(!cards.length){window.alert('Flag one or more cards before printing.');return;}printHost.replaceChildren(...cards.map(card=>{const article=document.createElement('article');article.className='print-card';const h=document.createElement('h2');h.textContent=card.front;const p=document.createElement('p');p.textContent=card.back+(card.memoryClue?'\n\nMemory clue: '+card.memoryClue:'');const small=document.createElement('small');small.textContent=card.category||card.topic||'RPSGT review';article.append(h,p,small);return article;}));window.print();}

  async function init(){
    try{await library.load();const seeded=storeApi.seedCatalog({VERSION:library.VERSION,cards:library.flashcardRecords()});state.saved=seeded.saved;state.store=seeded.store;filterChoices();renderDeck();}
    catch(error){empty.hidden=false;grid.closest('.flashcard-deck-section').hidden=true;empty.querySelector('h2').textContent='Flashcard Center could not load';empty.querySelector('p').textContent=error.message+' No learner data was changed.';document.querySelectorAll('[data-card-total]').forEach(node=>node.textContent='0 cards');}
  }

  cardButton.addEventListener('click',()=>setFocusFlipped(!state.flipped));document.querySelector('[data-card-flip]').addEventListener('click',()=>setFocusFlipped(!state.flipped));document.querySelector('[data-card-prev]').addEventListener('click',()=>navigate(-1));document.querySelector('[data-card-next]').addEventListener('click',()=>navigate(1));document.querySelector('[data-card-flag]').addEventListener('click',()=>{const card=state.cards[state.index];if(card)updateCurrent({flagged:!card.flagged});});document.querySelector('[data-card-mastered]').addEventListener('click',()=>{const card=state.cards[state.index];if(card)updateCurrent({masteryStatus:card.masteryStatus==='mastered'?'learning':'mastered'});});document.querySelector('[data-card-review-again]').addEventListener('click',()=>{const card=state.cards[state.index];if(card)updateCurrent({masteryStatus:card.masteryStatus==='review-again'?'learning':'review-again'});});
  [control.category,control.domain,control.task,control.topic,control.status].forEach(node=>node&&node.addEventListener('change',changeFilters));let searchTimer=null;control.search&&control.search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(changeFilters,120);});
  document.querySelectorAll('[data-show-all]').forEach(button=>button.addEventListener('click',showAll));document.querySelector('[data-study-flagged]')?.addEventListener('click',studyFlagged);document.querySelector('[data-preset-math]')?.addEventListener('click',presetMath);document.querySelector('[data-print-flagged]')?.addEventListener('click',printFlagged);
  document.querySelectorAll('[data-focus-close]').forEach(button=>button.addEventListener('click',closeFocus));focusDialog?.addEventListener('click',event=>{if(event.target===focusDialog)closeFocus();});
  document.querySelectorAll('[data-custom-card-open]').forEach(button=>button.addEventListener('click',()=>openCustom(button)));document.querySelectorAll('[data-custom-card-close]').forEach(button=>button.addEventListener('click',closeCustom));document.querySelector('[data-custom-card-form]')?.addEventListener('submit',event=>{event.preventDefault();saveCustom(event.currentTarget);});customDialog?.addEventListener('click',event=>{if(event.target===customDialog)closeCustom();});
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(focusDialog&&!focusDialog.hidden)closeFocus();else if(customDialog&&!customDialog.hidden)closeCustom();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
