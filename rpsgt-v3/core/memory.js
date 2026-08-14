(function(){
  'use strict';
  const library=window.RPSGTLearningLibrary;
  const poolSelect=document.querySelector('[data-memory-pool]');
  const sizeSelect=document.querySelector('[data-memory-size]');
  const categorySelect=document.querySelector('[data-memory-category]');
  const board=document.querySelector('[data-memory-board]');
  const matching=document.querySelector('[data-memory-matching]');
  const recall=document.querySelector('[data-memory-recall]');
  if(!library||!board) return;

  const state={glossary:[],lessons:[],pairs:[],open:[],moves:0,matched:0,locked:false,questions:[],qIndex:0,correct:0,answered:false};
  const clean=value=>String(value==null?'':value).trim();
  const shuffle=list=>{
    const out=list.slice();
    for(let i=out.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  };
  const shorten=(value,max=155)=>{const text=clean(value);return text.length>max?text.slice(0,max-1).trim()+'…':text;};

  function option(value,label){const node=document.createElement('option');node.value=value;node.textContent=label;return node;}
  function selectedPool(){return poolSelect?.value||'terms';}
  function selectedCategory(){return categorySelect?.value||'all';}

  function glossaryCandidates(){
    const selected=selectedCategory();
    return state.glossary.filter(item=>selected==='all'||item.category===selected).map(item=>({
      id:'term:'+clean(item.term).toLowerCase(),kind:'term',front:clean(item.term),back:shorten(item.plain),category:item.category||'RPSGT terms'
    })).filter(item=>item.front&&item.back);
  }
  function formulaCandidates(){
    return state.lessons.map(item=>({id:'formula:'+clean(item.id),kind:'formula',front:clean(item.short||item.title),back:clean(item.formula),category:'Math formulas'})).filter(item=>item.front&&item.back);
  }
  function candidates(){
    const pool=selectedPool();
    if(pool==='formulas') return formulaCandidates();
    if(pool==='mixed') return glossaryCandidates().concat(formulaCandidates());
    return glossaryCandidates();
  }

  function populateCategories(){
    if(!categorySelect) return;
    const values=[...new Set(state.glossary.map(item=>item.category).filter(Boolean))].sort();
    categorySelect.replaceChildren(option('all','All term categories'),...values.map(value=>option(value,value)));
  }
  function updateCategoryState(){
    if(categorySelect) categorySelect.disabled=selectedPool()==='formulas';
  }

  function stat(selector,value){const node=document.querySelector(selector);if(node) node.textContent=value;}
  function updateMatchingStats(){
    stat('[data-memory-moves]',state.moves);
    stat('[data-memory-matched]',state.matched+' / '+state.pairs.length);
    stat('[data-memory-remaining]',Math.max(0,state.pairs.length-state.matched));
  }

  function tile(pair,side){
    const button=document.createElement('button');
    button.type='button';button.className='memory-tile';button.dataset.pair=pair.id;button.dataset.side=side;
    button.dataset.label=side==='front'?pair.front:pair.back;
    button.setAttribute('aria-label','Hidden memory tile');
    button.textContent='?';
    button.addEventListener('click',()=>openTile(button));
    return button;
  }
  function reveal(button){button.classList.add('is-open');button.textContent=button.dataset.label;button.setAttribute('aria-label',button.dataset.label);}
  function hide(button){button.classList.remove('is-open');button.textContent='?';button.setAttribute('aria-label','Hidden memory tile');}
  function openTile(button){
    if(state.locked||button.classList.contains('is-matched')||button.classList.contains('is-open')) return;
    reveal(button);state.open.push(button);
    if(state.open.length<2) return;
    state.moves+=1;updateMatchingStats();
    const [first,second]=state.open;
    if(first.dataset.pair===second.dataset.pair&&first.dataset.side!==second.dataset.side){
      first.classList.add('is-matched');second.classList.add('is-matched');first.disabled=true;second.disabled=true;state.matched+=1;state.open=[];updateMatchingStats();
      if(state.matched===state.pairs.length){const done=document.querySelector('[data-memory-complete]');if(done){done.hidden=false;done.textContent='Round complete in '+state.moves+' moves. Choose another pool or start a recall quiz to check the same material a different way.';}}
      return;
    }
    state.locked=true;
    setTimeout(()=>{hide(first);hide(second);state.open=[];state.locked=false;},720);
  }

  function startMatching(){
    const available=shuffle(candidates());
    const requested=Number(sizeSelect?.value||8);
    const pairCount=Math.min(requested,available.length);
    state.pairs=available.slice(0,pairCount);state.open=[];state.moves=0;state.matched=0;state.locked=false;
    board.replaceChildren(...shuffle(state.pairs.flatMap(pair=>[tile(pair,'front'),tile(pair,'back')])));
    matching.hidden=false;recall.hidden=true;
    const done=document.querySelector('[data-memory-complete]');if(done) done.hidden=true;
    updateMatchingStats();
    matching.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function distractors(correct,items,key){
    const choices=[];
    shuffle(items).forEach(item=>{const value=clean(item[key]);if(value&&value!==correct&&!choices.includes(value)&&choices.length<3) choices.push(value);});
    return choices;
  }
  function buildTermQuestion(item,reverse){
    if(reverse){
      const answer=clean(item.term);const others=distractors(answer,state.glossary,'term');
      return {prompt:shorten(item.plain,220),label:'Which term matches this definition?',answer,choices:shuffle([answer,...others]),explanation:item.why||item.confusion||item.plain};
    }
    const answer=clean(item.plain);const others=distractors(answer,state.glossary,'plain');
    return {prompt:clean(item.term),label:'Which definition best matches this term?',answer,choices:shuffle([answer,...others]),explanation:item.confusion||item.why||item.plain};
  }
  function buildFormulaQuestion(item,reverse){
    if(reverse){
      const answer=clean(item.short||item.title);const others=distractors(answer,state.lessons.map(x=>({name:clean(x.short||x.title)})),'name');
      return {prompt:clean(item.formula),label:'Which Math Coach topic uses this formula?',answer,choices:shuffle([answer,...others]),explanation:item.concept||item.trap||item.formula};
    }
    const answer=clean(item.formula);const others=distractors(answer,state.lessons,'formula');
    return {prompt:clean(item.short||item.title),label:'Which formula or rule belongs to this topic?',answer,choices:shuffle([answer,...others]),explanation:item.trap||item.concept||item.formula};
  }
  function makeQuestions(){
    const pool=selectedPool();const termPool=shuffle(state.glossary.filter(item=>selectedCategory()==='all'||item.category===selectedCategory()));const formulaPool=shuffle(state.lessons);
    const questions=[];
    while(questions.length<10){
      let kind=pool;
      if(pool==='mixed') kind=questions.length%2===0?'terms':'formulas';
      if(kind==='terms'&&termPool.length){const item=termPool[questions.length%termPool.length];questions.push(buildTermQuestion(item,Math.random()<.5));}
      else if(formulaPool.length){const item=formulaPool[questions.length%formulaPool.length];questions.push(buildFormulaQuestion(item,Math.random()<.5));}
      else break;
    }
    return questions;
  }

  function renderQuestion(){
    const q=state.questions[state.qIndex];if(!q)return;
    state.answered=false;
    stat('[data-recall-question-number]','Question '+(state.qIndex+1)+' of '+state.questions.length);
    stat('[data-recall-question-label]',q.label);stat('[data-recall-question-prompt]',q.prompt);stat('[data-recall-score]',state.correct+' correct');
    const choices=document.querySelector('[data-recall-choices]');choices.replaceChildren();
    q.choices.forEach(value=>{
      const button=document.createElement('button');button.type='button';button.className='recall-choice';button.textContent=value;
      button.addEventListener('click',()=>answerRecall(button,value));choices.append(button);
    });
    const feedback=document.querySelector('[data-recall-feedback]');feedback.hidden=true;feedback.textContent='';
    document.querySelector('[data-recall-next-question]').disabled=true;
  }
  function answerRecall(button,value){
    if(state.answered)return;state.answered=true;
    const q=state.questions[state.qIndex];const correct=value===q.answer;if(correct) state.correct+=1;
    [...document.querySelectorAll('[data-recall-choices] .recall-choice')].forEach(node=>{node.disabled=true;if(node.textContent===q.answer) node.classList.add('correct');});
    if(!correct) button.classList.add('wrong');
    const feedback=document.querySelector('[data-recall-feedback]');feedback.hidden=false;feedback.innerHTML='';
    const strong=document.createElement('strong');strong.textContent=correct?'Correct.':'Review this one.';feedback.append(strong,document.createTextNode(' '+q.explanation));
    stat('[data-recall-score]',state.correct+' correct');document.querySelector('[data-recall-next-question]').disabled=false;
  }
  function nextRecall(){
    if(!state.answered)return;
    if(state.qIndex>=state.questions.length-1){
      const feedback=document.querySelector('[data-recall-feedback]');feedback.hidden=false;feedback.textContent='Recall round complete: '+state.correct+' of '+state.questions.length+' correct. Re-run the same pool or switch to matching for another retrieval pass.';
      document.querySelector('[data-recall-next-question]').disabled=true;return;
    }
    state.qIndex+=1;renderQuestion();
  }
  function startRecall(){
    state.questions=makeQuestions();state.qIndex=0;state.correct=0;matching.hidden=true;recall.hidden=false;renderQuestion();recall.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function init(){
    try{
      await library.load();state.glossary=library.glossaryRecords();state.lessons=library.mathLessonRecords();populateCategories();updateCategoryState();
      stat('[data-memory-term-total]',library.counts.glossary);stat('[data-memory-formula-total]',library.counts.mathLessons);
    }catch(error){const message=document.querySelector('[data-memory-load-error]');if(message){message.hidden=false;message.textContent=error.message;}}
  }
  poolSelect?.addEventListener('change',updateCategoryState);
  document.querySelector('[data-start-matching]')?.addEventListener('click',startMatching);
  document.querySelector('[data-start-memory-recall]')?.addEventListener('click',startRecall);
  document.querySelector('[data-recall-next-question]')?.addEventListener('click',nextRecall);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
