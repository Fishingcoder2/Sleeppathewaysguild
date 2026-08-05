(function(){
  'use strict';

  const storage=window.RPSGTStorage;
  const flashcards=window.RPSGTFlashcardStore;
  const engine=window.RPSGTGuidedTrailEngine;
  const resources=window.RPSGTStudyResourceCatalog;
  const checkpointHost=document.querySelector('[data-checkpoint-workspace]');
  if(!storage||!flashcards||!engine||!checkpointHost) return;
  if(resources) resources.load().catch(()=>null);

  const state={activeTaskCode:null,moduleCache:new Map(),taskMap:new Map(),blueprintLoading:null};
  const pending=new WeakSet();
  const clean=value=>String(value==null?'':value)
    .replace(/Medication-associated\s+\?Prozac eyes\?\s*\/\s*SSRI-related NREM eye movements/gi,'Medication-associated “Prozac eyes” (SSRI-related NREM eye movements)')
    .replace(/\?Prozac eyes\?/gi,'“Prozac eyes”')
    .replace(/\uFFFD/g,'');
  const normalize=value=>clean(value).trim().toLowerCase().replace(/\s+/g,' ');
  const sameId=(left,right)=>String(left)===String(right);
  const coachHeadings=['Start with the clinical clue.','Picture the technologist’s next decision.','Name the finding before choosing.','Use the stem to narrow the pathway.','Separate the key clue from the distractors.'];

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function safeCoachClue(question){
    const answer=normalize(question&&question.answer);
    const candidates=[question&&question.coachBobNote,question&&question.whyTricky,question&&question.rationale]
      .map(value=>clean(value).trim())
      .filter(Boolean)
      .filter(value=>!answer||!normalize(value).includes(answer));
    if(candidates.length) return candidates[0];
    const topic=clean(question&&question.topic||'this RPSGT concept').trim();
    return 'Focus on '+topic+'. Identify the finding or action the stem is testing, then remove choices that do not fit that clinical pathway.';
  }

  function coachHeading(question){
    const topic=clean(question&&question.topic||'RPSGT review');
    let hash=0;
    for(let index=0;index<topic.length;index+=1) hash=(hash*31+topic.charCodeAt(index))>>>0;
    return coachHeadings[hash%coachHeadings.length];
  }

  function enhanceCoach(question){
    const panel=checkpointHost.querySelector('.coach-question-panel');
    if(!panel||checkpointHost.querySelector('.answer-status')) return;
    const heading=panel.querySelector('h3');
    const paragraphs=[...panel.querySelectorAll('p')].filter(node=>!node.classList.contains('coach-boundary'));
    if(heading) heading.textContent=coachHeading(question);
    if(paragraphs[0]) paragraphs[0].textContent=safeCoachClue(question);
  }

  async function ensureBlueprint(){
    if(state.taskMap.size) return state.taskMap;
    if(!state.blueprintLoading){
      state.blueprintLoading=loadJson('data/blueprint.json').then(blueprint=>{
        (blueprint.domains||[]).forEach(domain=>(domain.tasks||[]).forEach(task=>state.taskMap.set(task.code,{...task,domainName:domain.fullName})));
        return state.taskMap;
      });
    }
    return state.blueprintLoading;
  }

  async function taskQuestions(taskCode){
    if(state.moduleCache.has(taskCode)) return state.moduleCache.get(taskCode);
    const promise=loadJson('data/question-bank/'+String(taskCode).toLowerCase()+'.json').then(module=>module.questions||[]);
    state.moduleCache.set(taskCode,promise);
    return promise;
  }

  function selectedOptions(){return [...checkpointHost.querySelectorAll('.checkpoint-option span')].map(node=>normalize(node.textContent));}

  async function resolveCurrentQuestion(){
    const taskCode=state.activeTaskCode;
    const stem=checkpointHost.querySelector('#checkpoint-title');
    if(!taskCode||!stem) return null;
    const prompt=normalize(stem.textContent);
    const options=selectedOptions();
    const topic=normalize(checkpointHost.querySelector('.checkpoint-question-meta .status')?.textContent);
    const questions=await taskQuestions(taskCode);
    let matches=questions.filter(question=>engine.eligibleQuestion(question,taskCode)&&normalize(question.prompt)===prompt);
    if(options.length) matches=matches.filter(question=>question.options.length===options.length&&question.options.every((option,index)=>normalize(option)===options[index]));
    if(matches.length>1&&topic&&topic!=='rpsgt review') matches=matches.filter(question=>normalize(question.topic)===topic);
    return matches.length===1?matches[0]:null;
  }

  function ensureReview(saved){
    saved.review=saved.review&&typeof saved.review==='object'?saved.review:{};
    ['flaggedIds','reviewLaterIds'].forEach(key=>{if(!Array.isArray(saved.review[key])) saved.review[key]=[];});
    return saved.review;
  }

  function contains(list,id){return list.some(value=>sameId(value,id));}
  function toggleList(list,id,enabled){const filtered=list.filter(value=>!sameId(value,id));return enabled?filtered.concat([id]):filtered;}

  function taskContext(question){
    const task=state.taskMap.get(question.taskCode)||{};
    return {
      domainTitle:task.domainName||question.domain,
      taskTitle:task.title||question.task,
      taskCode:question.taskCode,
      sourceContext:'Guided Study checkpoint',
      recommendedResources:resources&&resources.isReady()?resources.titlesForQuestion(question):[]
    };
  }

  function updateButtonStates(actions,question){
    const saved=storage.load();
    const review=ensureReview(saved);
    const flagged=contains(review.flaggedIds,question.id);
    const later=contains(review.reviewLaterIds,question.id);
    const cardId=window.RPSGTFlashcardEngine.cardId({questionId:question.id});
    const cardExists=Boolean(saved.flashcards&&saved.flashcards.cards&&saved.flashcards.cards[cardId]);
    const flagButton=actions.querySelector('[data-question-flag]');
    const laterButton=actions.querySelector('[data-question-review-later]');
    const cardButton=actions.querySelector('[data-question-flashcard]');
    flagButton.textContent=flagged?'Remove flag':'Flag for review';
    flagButton.classList.toggle('active',flagged);
    laterButton.textContent=later?'Remove from review later':'Review later';
    laterButton.classList.toggle('active',later);
    cardButton.textContent=cardExists?'Flashcard saved':'Make flashcard';
    cardButton.classList.toggle('active',cardExists);
  }

  function saveList(question,key,enabled){
    const saved=storage.load();
    const review=ensureReview(saved);
    review[key]=toggleList(review[key],question.id,enabled);
    storage.save(saved);
  }

  function makeActions(question){
    const wrap=document.createElement('div');
    wrap.className='guided-question-actions';
    wrap.dataset.guidedQuestionActions='true';
    const flag=document.createElement('button');
    flag.type='button';flag.className='btn secondary';flag.dataset.questionFlag='true';
    const later=document.createElement('button');
    later.type='button';later.className='btn secondary';later.dataset.questionReviewLater='true';
    const card=document.createElement('button');
    card.type='button';card.className='btn secondary';card.dataset.questionFlashcard='true';
    const queue=document.createElement('a');
    queue.className='btn secondary';queue.href='review-queue.html?list=flagged';queue.textContent='View saved questions';
    const status=document.createElement('span');
    status.className='guided-question-action-status';status.setAttribute('aria-live','polite');

    flag.addEventListener('click',()=>{
      const saved=storage.load();const review=ensureReview(saved);const next=!contains(review.flaggedIds,question.id);
      saveList(question,'flaggedIds',next);updateButtonStates(wrap,question);status.textContent=next?'Question added to your flagged queue.':'Question removed from your flagged queue.';
    });
    later.addEventListener('click',()=>{
      const saved=storage.load();const review=ensureReview(saved);const next=!contains(review.reviewLaterIds,question.id);
      saveList(question,'reviewLaterIds',next);updateButtonStates(wrap,question);status.textContent=next?'Question saved for later review.':'Question removed from review later.';
    });
    card.addEventListener('click',()=>{
      const result=flashcards.addQuestion(question,taskContext(question),new Date().toISOString());
      updateButtonStates(wrap,question);status.textContent=result.created?'Flashcard saved in the RPSGT Flashcard Center.':'This question is already in your flashcard deck.';
    });

    wrap.append(flag,later,card,queue,status);
    updateButtonStates(wrap,question);
    return wrap;
  }

  function enhanceExplanationControl(){
    const toggle=checkpointHost.querySelector('[data-coach-toggle]');
    const submitted=Boolean(checkpointHost.querySelector('.answer-status'));
    if(!toggle||!submitted) return;
    toggle.textContent=toggle.getAttribute('aria-expanded')==='true'?'Hide explanation':'Review explanation';
  }

  async function enhance(){
    enhanceExplanationControl();
    const pane=checkpointHost.querySelector('.checkpoint-question-pane');
    if(!pane||pending.has(pane)) return;
    pending.add(pane);
    try{
      await ensureBlueprint();
      const question=await resolveCurrentQuestion();
      if(!question||!pane.isConnected) return;
      enhanceCoach(question);
      if(pane.querySelector('[data-guided-question-actions]')) return;
      const options=pane.querySelector('.checkpoint-options');
      if(options) options.insertAdjacentElement('afterend',makeActions(question));
    }catch(error){console.warn('Guided Study question actions were not added.',error);}finally{pending.delete(pane);}
  }

  document.addEventListener('click',event=>{
    const start=event.target.closest('[data-checkpoint-start]');
    if(start){state.activeTaskCode=start.getAttribute('data-checkpoint-start');taskQuestions(state.activeTaskCode).catch(()=>{});ensureBlueprint().catch(()=>{});}
  },true);

  const observer=new MutationObserver(enhance);
  observer.observe(checkpointHost,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-expanded']});
  enhance();
})();
