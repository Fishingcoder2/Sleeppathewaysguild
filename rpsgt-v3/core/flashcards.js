(function(){
  'use strict';

  const engine=window.RPSGTFlashcardEngine;
  const storeApi=window.RPSGTFlashcardStore;
  const stage=document.querySelector('[data-card-stage]');
  const library=document.querySelector('[data-card-library]');
  const empty=document.querySelector('[data-card-empty]');
  const customDialog=document.querySelector('[data-custom-card-dialog]');
  if(!engine||!storeApi||!stage||!library||!empty) return;

  const state={saved:null,store:null,cards:[],index:0,flipped:false,reviewOpen:false,returnFocus:null,customReturnFocus:null};
  const select={
    domain:document.querySelector('[data-card-domain]'),
    task:document.querySelector('[data-card-task]'),
    topic:document.querySelector('[data-card-topic]'),
    status:document.querySelector('[data-card-status]')
  };
  const cardButton=document.querySelector('[data-flashcard]');
  const reviewDialog=stage.querySelector('[role="dialog"]');

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

  function text(selector,value){const node=document.querySelector(selector);if(node) node.textContent=value||'';}

  function setFlipped(value){
    state.flipped=Boolean(value);
    cardButton.classList.toggle('is-flipped',state.flipped);
    cardButton.setAttribute('aria-pressed',state.flipped?'true':'false');
    cardButton.setAttribute('aria-label',state.flipped?'Show flashcard front':'Show flashcard answer');
    const flip=document.querySelector('[data-card-flip]');
    if(flip) flip.textContent=state.flipped?'Show front':'Flip to reveal';
  }

  function showSection(wrapperSelector,textSelector,value){
    const wrapper=document.querySelector(wrapperSelector);
    if(wrapper) wrapper.hidden=!String(value||'').trim();
    text(textSelector,value);
  }

  function categoryFor(card){
    if(!card) return 'RPSGT Review Cards';
    if(card.domain) return card.domain;
    if(card.custom) return 'My Custom Cards';
    return card.sourceContext||card.task||'RPSGT Review Cards';
  }

  function cardContext(card){
    return [...new Set([card.domain,card.task,card.topic].filter(Boolean))].join(' · ')||card.sourceContext||'RPSGT review';
  }

  function themeIndex(value){
    return [...String(value||'')].reduce((sum,char)=>sum+char.charCodeAt(0),0)%5;
  }

  function cardBadges(card){
    const values=[];
    if(card.flagged) values.push({label:'Flagged for review',className:''});
    if(card.masteryStatus==='mastered') values.push({label:'Mastered',className:'mastered'});
    if(card.masteryStatus==='review-again') values.push({label:'Review again',className:'review'});
    return values;
  }

  function createTile(card,category){
    const button=document.createElement('button');
    button.type='button';
    button.className='flashcard-tile';
    button.dataset.cardTile=card.id;
    button.setAttribute('aria-label','Open flashcard: '+card.front);
    const title=document.createElement('span');
    title.className='flashcard-tile-title';
    title.textContent=card.front;
    const subtitle=document.createElement('span');
    subtitle.className='flashcard-tile-subtitle';
    subtitle.textContent=category;
    button.append(title,subtitle);
    const badges=cardBadges(card);
    if(badges.length){
      const row=document.createElement('span');
      row.className='flashcard-tile-flags';
      badges.forEach(item=>{
        const badge=document.createElement('span');
        badge.className='flashcard-tile-badge'+(item.className?' '+item.className:'');
        badge.textContent=item.label;
        row.appendChild(badge);
      });
      button.appendChild(row);
    }
    button.addEventListener('click',()=>openReview(card.id,button));
    return button;
  }

  function renderLibrary(){
    const total=state.cards.length;
    text('[data-card-total]',total+' card'+(total===1?'':'s'));
    text('[data-card-context]',total?'Browse by learning category':'No cards in this deck');
    library.replaceChildren();
    if(!total){
      library.hidden=true;
      empty.hidden=false;
      if(state.reviewOpen) closeReview(false);
      return;
    }
    library.hidden=false;
    empty.hidden=true;
    const groups=new Map();
    state.cards.forEach(card=>{
      const category=categoryFor(card);
      if(!groups.has(category)) groups.set(category,[]);
      groups.get(category).push(card);
    });
    [...groups.entries()].forEach(([category,cards],groupIndex)=>{
      const details=document.createElement('details');
      details.className='flashcard-category flashcard-category--'+themeIndex(category);
      if(groupIndex<3) details.open=true;
      const summary=document.createElement('summary');
      const heading=document.createElement('span');
      heading.textContent=category;
      const count=document.createElement('span');
      count.className='flashcard-category-count';
      count.textContent=String(cards.length);
      summary.append(heading,count);
      const grid=document.createElement('div');
      grid.className='flashcard-tile-grid';
      cards.forEach(card=>grid.appendChild(createTile(card,category)));
      details.append(summary,grid);
      library.appendChild(details);
    });
  }

  function renderResources(card){
    const wrapper=document.querySelector('[data-card-resources-wrap]');
    const host=document.querySelector('[data-card-resources]');
    const titles=Array.isArray(card.recommendedResources)?card.recommendedResources.filter(Boolean):[];
    if(wrapper) wrapper.hidden=!titles.length;
    if(host) host.replaceChildren(...titles.map(title=>{const item=document.createElement('span');item.textContent=title;return item;}));
    return titles.length;
  }

  function renderReviewMap(card,resourceCount){
    const wrapper=document.querySelector('[data-card-review-map]');
    const host=document.querySelector('[data-card-review-chips]');
    const values=[card.taskCode,card.domain].filter(Boolean);
    const unique=[...new Set(values)];
    if(host){
      host.replaceChildren(...unique.map(value=>{
        const chip=document.createElement('span');
        chip.className='flashcard-review-chip';
        chip.textContent=value;
        return chip;
      }));
    }
    if(wrapper) wrapper.hidden=!unique.length&&!resourceCount;
  }

  function renderCard(){
    const card=state.cards[state.index];
    const total=state.cards.length;
    if(!card){
      text('[data-card-position]','Card 0 / 0');
      if(state.reviewOpen) closeReview(false);
      return;
    }
    setFlipped(false);
    text('[data-card-position]','Card '+(state.index+1)+' / '+total);
    text('[data-card-modal-title]',card.front);
    text('[data-card-front-topic]',categoryFor(card));
    text('[data-card-front]',card.front);
    text('[data-card-back]',card.back);
    showSection('[data-card-explanation-wrap]','[data-card-explanation]',card.explanation);
    showSection('[data-card-memory-wrap]','[data-card-memory]',card.memoryClue);
    showSection('[data-card-coach-wrap]','[data-card-coach]',card.coachBobNote);
    const resourceCount=renderResources(card);
    renderReviewMap(card,resourceCount);

    const flag=document.querySelector('[data-card-flag]');
    const flagBadge=document.querySelector('[data-card-flag-state]');
    const mastered=document.querySelector('[data-card-mastered]');
    const reviewAgain=document.querySelector('[data-card-review-again]');
    if(flag){
      flag.textContent=card.flagged?'Unflag':'Flag for review';
      flag.classList.toggle('active',card.flagged);
      flag.setAttribute('aria-pressed',card.flagged?'true':'false');
    }
    if(flagBadge) flagBadge.hidden=!card.flagged;
    if(mastered){mastered.textContent=card.masteryStatus==='mastered'?'Mastered ✓':'Mastered';mastered.classList.toggle('active',card.masteryStatus==='mastered');}
    if(reviewAgain){reviewAgain.textContent=card.masteryStatus==='review-again'?'Review again ✓':'Review again';reviewAgain.classList.toggle('active',card.masteryStatus==='review-again');}
    const prev=document.querySelector('[data-card-prev]');
    const next=document.querySelector('[data-card-next]');
    if(prev) prev.disabled=total<2;
    if(next) next.disabled=total<2;
  }

  function applyFilters(focusId){
    state.cards=engine.filterCards(state.store,currentFilters(),state.saved.review||{});
    if(focusId){
      const found=state.cards.findIndex(card=>card.id===focusId);
      state.index=found>=0?found:Math.max(0,Math.min(state.index,state.cards.length-1));
    }else state.index=Math.max(0,Math.min(state.index,state.cards.length-1));
    renderLibrary();
    if(state.reviewOpen&&state.cards.length) renderCard();
  }

  function openReview(cardId,trigger){
    const found=state.cards.findIndex(card=>card.id===cardId);
    if(found<0) return;
    state.index=found;
    state.returnFocus=trigger||document.activeElement;
    state.reviewOpen=true;
    stage.hidden=false;
    document.body.classList.add('flashcard-review-open');
    renderCard();
    requestAnimationFrame(()=>reviewDialog&&reviewDialog.focus({preventScroll:true}));
  }

  function closeReview(restoreFocus=true){
    if(!state.reviewOpen&&stage.hidden) return;
    state.reviewOpen=false;
    stage.hidden=true;
    setFlipped(false);
    document.body.classList.remove('flashcard-review-open');
    if(restoreFocus&&state.returnFocus&&typeof state.returnFocus.focus==='function'&&document.contains(state.returnFocus)) state.returnFocus.focus({preventScroll:true});
    state.returnFocus=null;
  }

  function navigate(direction){
    if(state.cards.length<2) return;
    state.index=(state.index+direction+state.cards.length)%state.cards.length;
    renderCard();
  }

  function shuffleDeck(){
    if(state.cards.length<2) return;
    const current=state.reviewOpen?state.cards[state.index]:null;
    const copy=state.cards.slice();
    for(let i=copy.length-1;i>0;i-=1){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    if(copy[0]&&current&&copy[0].id===current.id&&copy.length>1) [copy[0],copy[1]]=[copy[1],copy[0]];
    state.cards=copy;
    state.index=0;
    renderLibrary();
    if(state.reviewOpen) renderCard();
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

  function showFlagged(){
    if(!select.status) return;
    closeReview(false);
    select.status.value='flagged';
    state.index=0;
    saveFilters();
    applyFilters();
  }

  function openCustomDialog(trigger){
    if(!customDialog) return;
    state.customReturnFocus=trigger||document.activeElement;
    customDialog.hidden=false;
    document.body.classList.add('flashcard-dialog-open');
    requestAnimationFrame(()=>customDialog.querySelector('textarea[name="front"]')?.focus());
  }

  function closeCustomDialog(){
    if(!customDialog) return;
    customDialog.hidden=true;
    document.body.classList.remove('flashcard-dialog-open');
    if(state.customReturnFocus&&typeof state.customReturnFocus.focus==='function') state.customReturnFocus.focus({preventScroll:true});
    state.customReturnFocus=null;
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
    closeCustomDialog();
    filterChoices();
    [select.domain,select.task,select.topic,select.status].forEach(node=>{if(node) node.value='all';});
    saveFilters();
    applyFilters(result.card.id);
    const tile=library.querySelector('[data-card-tile="'+CSS.escape(result.card.id)+'"]');
    openReview(result.card.id,tile||document.querySelector('[data-custom-card-open]'));
  }

  function init(){
    try{
      const current=storeApi.snapshot();
      state.saved=current.saved;
      state.store=current.store;
      filterChoices();
      applyFilters();
    }catch(error){
      library.hidden=true;
      empty.hidden=false;
      empty.querySelector('h2').textContent='Flashcard Center could not load';
      empty.querySelector('p').textContent=error.message+' No learner data was changed.';
    }
  }

  cardButton.addEventListener('click',()=>setFlipped(!state.flipped));
  document.querySelector('[data-card-flip]').addEventListener('click',()=>setFlipped(!state.flipped));
  document.querySelector('[data-card-prev]').addEventListener('click',()=>navigate(-1));
  document.querySelector('[data-card-next]').addEventListener('click',()=>navigate(1));
  document.querySelector('[data-card-shuffle]').addEventListener('click',shuffleDeck);
  document.querySelector('[data-card-flag]').addEventListener('click',()=>{const card=state.cards[state.index];if(card) updateCurrent({flagged:!card.flagged});});
  document.querySelector('[data-card-mastered]').addEventListener('click',()=>{const card=state.cards[state.index];if(card) updateCurrent({masteryStatus:card.masteryStatus==='mastered'?'learning':'mastered'});});
  document.querySelector('[data-card-review-again]').addEventListener('click',()=>{const card=state.cards[state.index];if(card) updateCurrent({masteryStatus:card.masteryStatus==='review-again'?'learning':'review-again'});});
  document.querySelector('[data-card-close]').addEventListener('click',()=>closeReview());
  document.querySelectorAll('[data-card-show-flagged]').forEach(button=>button.addEventListener('click',showFlagged));
  Object.values(select).forEach(node=>node&&node.addEventListener('change',()=>{closeReview(false);state.index=0;saveFilters();applyFilters();}));
  document.querySelectorAll('[data-custom-card-open]').forEach(button=>button.addEventListener('click',()=>openCustomDialog(button)));
  document.querySelectorAll('[data-custom-card-close]').forEach(button=>button.addEventListener('click',closeCustomDialog));
  document.querySelector('[data-custom-card-form]').addEventListener('submit',event=>{event.preventDefault();saveCustom(event.currentTarget);});
  stage.addEventListener('click',event=>{if(event.target===stage) closeReview();});
  customDialog&&customDialog.addEventListener('click',event=>{if(event.target===customDialog) closeCustomDialog();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&customDialog&&!customDialog.hidden){closeCustomDialog();return;}
    if(event.key==='Escape'&&state.reviewOpen){closeReview();return;}
    if(customDialog&&!customDialog.hidden) return;
    if(!state.reviewOpen) return;
    if(event.key==='ArrowLeft'){event.preventDefault();navigate(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();navigate(1);}
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();