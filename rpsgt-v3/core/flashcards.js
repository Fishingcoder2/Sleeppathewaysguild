(function(){
  'use strict';

  const engine=window.RPSGTFlashcardEngine;
  const storeApi=window.RPSGTFlashcardStore;
  const stage=document.querySelector('[data-card-stage]');
  const empty=document.querySelector('[data-card-empty]');
  const dialog=document.querySelector('[data-custom-card-dialog]');
  if(!engine||!storeApi||!stage||!empty) return;

  const state={saved:null,store:null,cards:[],index:0,flipped:false,returnFocus:null};
  const select={
    domain:document.querySelector('[data-card-domain]'),
    task:document.querySelector('[data-card-task]'),
    topic:document.querySelector('[data-card-topic]'),
    status:document.querySelector('[data-card-status]')
  };
  const cardButton=document.querySelector('[data-flashcard]');

  function currentFilters(){
    return {
      domain:select.domain&&select.domain.value||'all',
      task:select.task&&select.task.value||'all',
      topic:select.topic&&select.topic.value||'all',
      status:select.status&&select.status.value||'all'
    };
  }

  function option(value,label){
    const node=document.createElement('option');
    node.value=value;
    node.textContent=label;
    return node;
  }

  function setOptions(node,placeholder,items,selected){
    if(!node) return;
    node.replaceChildren(option('all',placeholder),...items.map(item=>option(item.value,item.label)));
    node.value=[...node.options].some(item=>item.value===selected)?selected:'all';
  }

  function allCards(){return engine.filterCards(state.store,{},state.saved.review||{});}

  function filterChoices(){
    const cards=allCards();
    const domains=[...new Set(cards.map(card=>card.domain).filter(Boolean))].sort().map(value=>({value,label:value}));
    const taskMap=new Map();
    cards.forEach(card=>{
      const value=card.taskCode||card.task;
      if(value&&!taskMap.has(value)) taskMap.set(value,card.task||card.taskCode);
    });
    const tasks=[...taskMap].sort((a,b)=>String(a[1]).localeCompare(String(b[1]))).map(([value,label])=>({value,label}));
    const topics=[...new Set(cards.map(card=>card.topic).filter(Boolean))].sort().map(value=>({value,label:value}));
    const selected=Object.assign({domain:'all',task:'all',topic:'all',status:'all'},state.store.filters||{},currentFilters());
    setOptions(select.domain,'All domains',domains,selected.domain);
    setOptions(select.task,'All tasks',tasks,selected.task);
    setOptions(select.topic,'All topics',topics,selected.topic);
    if(select.status) select.status.value=[...select.status.options].some(item=>item.value===selected.status)?selected.status:'all';
  }

  function saveFilters(){
    state.store.filters=currentFilters();
    const persisted=storeApi.persist(state.saved,state.store);
    state.saved=persisted.saved;
    state.store=persisted.store;
  }

  function setFlipped(value){
    state.flipped=Boolean(value);
    cardButton.classList.toggle('is-flipped',state.flipped);
    cardButton.setAttribute('aria-pressed',state.flipped?'true':'false');
    cardButton.setAttribute('aria-label',state.flipped?'Show flashcard front':'Show flashcard answer');
  }

  function text(selector,value){const node=document.querySelector(selector);if(node) node.textContent=value||'';}
  function showSection(wrapperSelector,textSelector,value){
    const wrapper=document.querySelector(wrapperSelector);
    if(wrapper) wrapper.hidden=!String(value||'').trim();
    text(textSelector,value);
  }

  function cardContext(card){
    return [...new Set([card.domain,card.task,card.topic].filter(Boolean))].join(' · ')||'RPSGT review';
  }

  function renderResources(card){
    const wrapper=document.querySelector('[data-card-resources-wrap]');
    const host=document.querySelector('[data-card-resources]');
    const titles=Array.isArray(card.recommendedResources)?card.recommendedResources.filter(Boolean):[];
    if(wrapper) wrapper.hidden=!titles.length;
    if(host) host.replaceChildren(...titles.map(title=>{const item=document.createElement('span');item.textContent=title;return item;}));
  }

  function renderCard(){
    const card=state.cards[state.index];
    const total=state.cards.length;
    text('[data-card-total]',total+' card'+(total===1?'':'s'));
    if(!card){
      stage.hidden=true;
      empty.hidden=false;
      return;
    }
    stage.hidden=false;
    empty.hidden=true;
    setFlipped(false);
    text('[data-card-position]','Card '+(state.index+1)+' of '+total);
    text('[data-card-context]',cardContext(card));
    text('[data-card-front-topic]',card.topic||card.task||'RPSGT concept');
    text('[data-card-front]',card.front);
    text('[data-card-back]',card.back);
    showSection('[data-card-explanation-wrap]','[data-card-explanation]',card.explanation);
    showSection('[data-card-memory-wrap]','[data-card-memory]',card.memoryClue);
    showSection('[data-card-coach-wrap]','[data-card-coach]',card.coachBobNote);
    renderResources(card);

    const flag=document.querySelector('[data-card-flag]');
    const mastered=document.querySelector('[data-card-mastered]');
    const reviewAgain=document.querySelector('[data-card-review-again]');
    if(flag){flag.textContent=card.flagged?'Remove flag':'Flag';flag.classList.toggle('active',card.flagged);}
    if(mastered){mastered.textContent=card.masteryStatus==='mastered'?'Mastered ✓':'Mastered';mastered.classList.toggle('active',card.masteryStatus==='mastered');}
    if(reviewAgain){reviewAgain.textContent=card.masteryStatus==='review-again'?'Review again ✓':'Review again';reviewAgain.classList.toggle('active',card.masteryStatus==='review-again');}
    document.querySelector('[data-card-prev]').disabled=total<2;
    document.querySelector('[data-card-next]').disabled=total<2;
  }

  function applyFilters(focusId){
    state.cards=engine.filterCards(state.store,currentFilters(),state.saved.review||{});
    if(focusId){const found=state.cards.findIndex(card=>card.id===focusId);state.index=found>=0?found:0;}
    else state.index=Math.max(0,Math.min(state.index,state.cards.length-1));
    renderCard();
  }

  function navigate(direction){
    if(state.cards.length<2) return;
    state.index=(state.index+direction+state.cards.length)%state.cards.length;
    renderCard();
    cardButton.focus({preventScroll:true});
  }

  function updateCurrent(changes){
    const card=state.cards[state.index];
    if(!card) return;
    const result=storeApi.update(card.id,changes,new Date().toISOString());
    if(!result.updated) return;
    state.saved=result.saved;
    state.store=result.store;
    filterChoices();
    applyFilters(card.id);
  }

  function openDialog(trigger){
    if(!dialog) return;
    state.returnFocus=trigger||document.activeElement;
    dialog.hidden=false;
    document.body.classList.add('flashcard-dialog-open');
    requestAnimationFrame(()=>dialog.querySelector('textarea[name="front"]')?.focus());
  }

  function closeDialog(){
    if(!dialog) return;
    dialog.hidden=true;
    document.body.classList.remove('flashcard-dialog-open');
    if(state.returnFocus&&typeof state.returnFocus.focus==='function') state.returnFocus.focus({preventScroll:true});
    state.returnFocus=null;
  }

  function saveCustom(form){
    const data=new FormData(form);
    const result=storeApi.addCustom({
      front:data.get('front'),
      back:data.get('back'),
      explanation:data.get('explanation'),
      memoryClue:data.get('memoryClue'),
      coachBobNote:data.get('coachBobNote'),
      domain:data.get('domain'),
      task:data.get('task'),
      topic:data.get('topic'),
      sourceContext:'Custom RPSGT v3 card'
    },new Date().toISOString());
    state.saved=result.saved;
    state.store=result.store;
    form.reset();
    closeDialog();
    filterChoices();
    [select.domain,select.task,select.topic,select.status].forEach(node=>{if(node) node.value='all';});
    saveFilters();
    applyFilters(result.card.id);
  }

  function init(){
    try{
      const current=storeApi.snapshot();
      state.saved=current.saved;
      state.store=current.store;
      filterChoices();
      applyFilters();
    }catch(error){
      empty.hidden=false;
      empty.querySelector('h2').textContent='Flashcard Center could not load';
      empty.querySelector('p').textContent=error.message+' No learner data was changed.';
    }
  }

  cardButton.addEventListener('click',()=>setFlipped(!state.flipped));
  document.querySelector('[data-card-flip]').addEventListener('click',()=>setFlipped(!state.flipped));
  document.querySelector('[data-card-prev]').addEventListener('click',()=>navigate(-1));
  document.querySelector('[data-card-next]').addEventListener('click',()=>navigate(1));
  document.querySelector('[data-card-flag]').addEventListener('click',()=>{const card=state.cards[state.index];if(card) updateCurrent({flagged:!card.flagged});});
  document.querySelector('[data-card-mastered]').addEventListener('click',()=>{const card=state.cards[state.index];if(card) updateCurrent({masteryStatus:card.masteryStatus==='mastered'?'learning':'mastered'});});
  document.querySelector('[data-card-review-again]').addEventListener('click',()=>{const card=state.cards[state.index];if(card) updateCurrent({masteryStatus:card.masteryStatus==='review-again'?'learning':'review-again'});});
  Object.values(select).forEach(node=>node&&node.addEventListener('change',()=>{state.index=0;saveFilters();applyFilters();}));
  document.querySelectorAll('[data-custom-card-open]').forEach(button=>button.addEventListener('click',()=>openDialog(button)));
  document.querySelectorAll('[data-custom-card-close]').forEach(button=>button.addEventListener('click',closeDialog));
  document.querySelector('[data-custom-card-form]').addEventListener('submit',event=>{event.preventDefault();saveCustom(event.currentTarget);});
  dialog&&dialog.addEventListener('click',event=>{if(event.target===dialog) closeDialog();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&dialog&&!dialog.hidden) closeDialog();});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
