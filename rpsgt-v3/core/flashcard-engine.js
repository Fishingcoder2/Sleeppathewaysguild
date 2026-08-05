(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTFlashcardEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='1.0.0';
  const MASTERY_STATUSES=new Set(['learning','mastered','review-again']);
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const text=value=>String(value==null?'':value).trim();
  const normalizeText=value=>text(value).toLowerCase().replace(/\s+/g,' ');
  const asArray=value=>Array.isArray(value)?value:[];
  const uniqueText=value=>[...new Set(asArray(value).map(text).filter(Boolean))];

  function hash(value){
    let result=2166136261;
    const source=String(value||'');
    for(let index=0;index<source.length;index+=1){result^=source.charCodeAt(index);result=Math.imul(result,16777619);}
    return (result>>>0).toString(16).padStart(8,'0');
  }

  function normalizeStore(value){
    const source=isObject(value)?value:{};
    const cards=isObject(source.cards)?clone(source.cards):{};
    const order=uniqueText(source.order).filter(id=>Boolean(cards[id]));
    Object.keys(cards).forEach(id=>{if(!order.includes(id)) order.push(id);});
    const filters=isObject(source.filters)?clone(source.filters):{};
    return {
      cards,
      order,
      filters:{
        domain:text(filters.domain)||'all',
        task:text(filters.task)||'all',
        topic:text(filters.topic)||'all',
        status:text(filters.status)||'all'
      },
      updatedAt:source.updatedAt||null
    };
  }

  function cardId(input){
    const questionId=text(input&&(
      input.questionId||
      input.sourceQuestionId||
      input.stableQuestionId
    ));
    if(questionId) return 'question:'+questionId;
    const supplied=text(input&&input.id);
    if(supplied&&/^custom:/i.test(supplied)) return supplied;
    return 'custom:'+hash(normalizeText(input&&input.front)+'\n'+normalizeText(input&&input.back));
  }

  function masteryStatus(value){
    const status=text(value).toLowerCase();
    return MASTERY_STATUSES.has(status)?status:'learning';
  }

  function normalizeCard(input,existing,now){
    const source=isObject(input)?input:{};
    const prior=isObject(existing)?existing:{};
    const id=cardId(source);
    const questionId=text(source.questionId||source.sourceQuestionId||source.stableQuestionId||prior.questionId);
    const front=text(source.front||prior.front);
    const back=text(source.back||source.answer||prior.back);
    if(!front||!back) throw new Error('Flashcards require both a front and a back.');
    const time=text(now)||new Date().toISOString();
    const status=masteryStatus(source.masteryStatus||prior.masteryStatus);
    return {
      id,
      questionId:questionId||null,
      front,
      back,
      explanation:text(source.explanation||source.rationale||prior.explanation),
      memoryClue:text(source.memoryClue||source.whyTricky||prior.memoryClue),
      coachBobNote:text(source.coachBobNote||prior.coachBobNote),
      domain:text(source.domain||prior.domain),
      task:text(source.task||source.taskTitle||prior.task),
      taskCode:text(source.taskCode||prior.taskCode),
      topic:text(source.topic||prior.topic),
      recommendedResources:uniqueText(source.recommendedResources||prior.recommendedResources),
      sourceContext:text(source.sourceContext||prior.sourceContext||'RPSGT v3'),
      custom:questionId?false:source.custom!==undefined?Boolean(source.custom):prior.custom!==undefined?Boolean(prior.custom):true,
      flagged:source.flagged!==undefined?Boolean(source.flagged):Boolean(prior.flagged),
      masteryStatus:status,
      reviewAgain:status==='review-again',
      createdAt:text(prior.createdAt||source.createdAt)||time,
      updatedAt:time
    };
  }

  function upsertCard(value,input,now){
    const store=normalizeStore(value);
    const id=cardId(input||{});
    const existing=store.cards[id]||null;
    const card=normalizeCard(input,existing,now);
    store.cards[id]=card;
    if(!store.order.includes(id)) store.order.push(id);
    store.updatedAt=card.updatedAt;
    return {store,card:clone(card),created:!existing};
  }

  function removeCard(value,id,now){
    const store=normalizeStore(value);
    const key=text(id);
    const existed=Boolean(store.cards[key]);
    if(existed){delete store.cards[key];store.order=store.order.filter(item=>item!==key);store.updatedAt=text(now)||new Date().toISOString();}
    return {store,removed:existed};
  }

  function updateCard(value,id,changes,now){
    const store=normalizeStore(value);
    const key=text(id);
    if(!store.cards[key]) return {store,card:null,updated:false};
    const card=normalizeCard(Object.assign({},store.cards[key],changes||{},{id:key}),store.cards[key],now);
    store.cards[key]=card;
    store.updatedAt=card.updatedAt;
    return {store,card:clone(card),updated:true};
  }

  function setFlag(value,id,flagged,now){return updateCard(value,id,{flagged:Boolean(flagged)},now);}
  function setMastery(value,id,status,now){return updateCard(value,id,{masteryStatus:masteryStatus(status)},now);}

  function questionCard(question,options){
    const source=isObject(question)?question:{};
    const settings=isObject(options)?options:{};
    return {
      questionId:source.id,
      front:source.prompt,
      back:source.answer,
      explanation:source.rationale,
      memoryClue:source.whyTricky,
      coachBobNote:source.coachBobNote,
      domain:settings.domainTitle||source.domain,
      task:settings.taskTitle||source.task,
      taskCode:source.taskCode||settings.taskCode,
      topic:source.topic,
      recommendedResources:uniqueText(settings.recommendedResources),
      sourceContext:settings.sourceContext||'RPSGT v3 question',
      custom:false
    };
  }

  function addQuestionCard(value,question,options,now){return upsertCard(value,questionCard(question,options),now);}

  function includesId(values,id){return asArray(values).some(value=>String(value)===String(id));}

  function filterCards(value,filters,review){
    const store=normalizeStore(value);
    const selected=Object.assign({domain:'all',task:'all',topic:'all',status:'all'},filters||{});
    const reviewState=isObject(review)?review:{};
    return store.order.map(id=>store.cards[id]).filter(Boolean).filter(card=>{
      if(selected.domain&&selected.domain!=='all'&&card.domain!==selected.domain) return false;
      if(selected.task&&selected.task!=='all'&&card.taskCode!==selected.task&&card.task!==selected.task) return false;
      if(selected.topic&&selected.topic!=='all'&&card.topic!==selected.topic) return false;
      if(selected.status==='missed'&&!includesId(reviewState.missedIds,card.questionId)) return false;
      if(selected.status==='flagged'&&!card.flagged&&!includesId(reviewState.flaggedIds,card.questionId)) return false;
      if(selected.status==='custom'&&!card.custom) return false;
      if(selected.status==='mastered'&&card.masteryStatus!=='mastered') return false;
      if(selected.status==='review-again'&&card.masteryStatus!=='review-again') return false;
      return true;
    }).map(clone);
  }

  function filterOptions(value){
    const cards=filterCards(value,{},{ });
    return {
      domains:uniqueText(cards.map(card=>card.domain)).sort(),
      tasks:uniqueText(cards.map(card=>card.taskCode||card.task)).sort(),
      topics:uniqueText(cards.map(card=>card.topic)).sort()
    };
  }

  return {
    VERSION,
    MASTERY_STATUSES:[...MASTERY_STATUSES],
    normalizeStore,
    cardId,
    normalizeCard,
    upsertCard,
    removeCard,
    updateCard,
    setFlag,
    setMastery,
    questionCard,
    addQuestionCard,
    filterCards,
    filterOptions
  };
});
