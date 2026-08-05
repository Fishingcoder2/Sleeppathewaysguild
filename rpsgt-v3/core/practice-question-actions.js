(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTPracticeQuestionActions=api;
  if(root&&root.document){
    const start=()=>api.mount(root);
    if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',start); else start();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const allowedReviewKeys=new Set(['flaggedIds','reviewLaterIds']);
  const sameId=(left,right)=>String(left)===String(right);

  function ensureReview(saved){
    saved.review=saved.review&&typeof saved.review==='object'?saved.review:{};
    allowedReviewKeys.forEach(key=>{if(!Array.isArray(saved.review[key])) saved.review[key]=[];});
    return saved.review;
  }

  function contains(list,id){return Array.isArray(list)&&list.some(value=>sameId(value,id));}
  function toggleList(list,id,enabled){
    const filtered=(Array.isArray(list)?list:[]).filter(value=>!sameId(value,id));
    return enabled?filtered.concat([id]):filtered;
  }

  function toggleReview(storage,questionId,key){
    if(!storage||typeof storage.load!=='function'||typeof storage.save!=='function') throw new Error('RPSGT v3 storage is unavailable.');
    if(!allowedReviewKeys.has(key)) throw new Error('Unsupported Practice review list.');
    const saved=storage.load();
    const review=ensureReview(saved);
    const enabled=!contains(review[key],questionId);
    review[key]=toggleList(review[key],questionId,enabled);
    storage.save(saved);
    return enabled;
  }

  function saveFlashcard(flashcards,question,context,now){
    if(!flashcards||typeof flashcards.addQuestion!=='function') throw new Error('RPSGT v3 flashcard storage is unavailable.');
    return flashcards.addQuestion(question,context||{},now||new Date().toISOString());
  }

  function mount(root){
    const document=root&&root.document;
    const storage=root&&root.RPSGTStorage;
    const flashcards=root&&root.RPSGTFlashcardStore;
    const flashcardEngine=root&&root.RPSGTFlashcardEngine;
    const resources=root&&root.RPSGTStudyResourceCatalog;
    if(!document||!storage||!flashcards||!flashcardEngine) return false;
    if(resources) resources.load().catch(()=>null);

    const host=()=>document.querySelector('[data-practice-question-actions]');

    function contextFor(question,detail){
      const supplied=detail&&detail.context&&typeof detail.context==='object'?detail.context:{};
      const titles=resources&&resources.isReady()?resources.titlesForQuestion(question):[];
      return Object.assign({},supplied,{recommendedResources:titles,sourceContext:'Learner Practice'});
    }

    function updateButtonStates(wrap,question){
      const saved=storage.load();
      const review=ensureReview(saved);
      const flagged=contains(review.flaggedIds,question.id);
      const later=contains(review.reviewLaterIds,question.id);
      const cardId=flashcardEngine.cardId({questionId:question.id});
      const cardExists=Boolean(saved.flashcards&&saved.flashcards.cards&&saved.flashcards.cards[cardId]);
      const flagButton=wrap.querySelector('[data-practice-flag]');
      const laterButton=wrap.querySelector('[data-practice-review-later]');
      const cardButton=wrap.querySelector('[data-practice-flashcard]');
      flagButton.textContent=flagged?'Remove flag':'Flag for review';
      flagButton.classList.toggle('active',flagged);
      laterButton.textContent=later?'Remove from review later':'Review later';
      laterButton.classList.toggle('active',later);
      cardButton.textContent=cardExists?'Flashcard saved':'Make flashcard';
      cardButton.classList.toggle('active',cardExists);
    }

    function render(detail){
      const target=host();
      if(!target) return;
      target.replaceChildren();
      const question=detail&&detail.question;
      if(!question) return;

      const wrap=document.createElement('div');
      wrap.className='practice-question-action-row';
      const flag=document.createElement('button');
      flag.type='button';flag.className='btn secondary';flag.dataset.practiceFlag='true';
      const later=document.createElement('button');
      later.type='button';later.className='btn secondary';later.dataset.practiceReviewLater='true';
      const card=document.createElement('button');
      card.type='button';card.className='btn secondary';card.dataset.practiceFlashcard='true';
      const queue=document.createElement('a');
      queue.className='btn secondary';queue.href='review-queue.html?list=flagged';queue.textContent='View saved questions';
      const status=document.createElement('span');
      status.className='practice-question-action-status';status.setAttribute('aria-live','polite');status.setAttribute('role','status');

      flag.addEventListener('click',()=>{
        const enabled=toggleReview(storage,question.id,'flaggedIds');
        updateButtonStates(wrap,question);
        status.textContent=enabled?'Question added to your flagged queue.':'Question removed from your flagged queue.';
      });
      later.addEventListener('click',()=>{
        const enabled=toggleReview(storage,question.id,'reviewLaterIds');
        updateButtonStates(wrap,question);
        status.textContent=enabled?'Question saved for later review.':'Question removed from review later.';
      });
      card.addEventListener('click',()=>{
        const result=saveFlashcard(flashcards,question,contextFor(question,detail),new Date().toISOString());
        updateButtonStates(wrap,question);
        status.textContent=result.created?'Flashcard saved in the RPSGT Flashcard Center.':'This question is already in your flashcard deck.';
      });

      wrap.append(flag,later,card,queue,status);
      target.appendChild(wrap);
      updateButtonStates(wrap,question);
    }

    document.addEventListener('rpsgt:practice-question',event=>render(event.detail||{}));
    return true;
  }

  return {ensureReview,contains,toggleList,toggleReview,saveFlashcard,mount};
});
