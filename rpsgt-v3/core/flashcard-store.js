(function(root){
  'use strict';

  function dependencies(){
    const storage=root.RPSGTStorage;
    const engine=root.RPSGTFlashcardEngine;
    if(!storage||!engine) throw new Error('RPSGT v3 flashcard storage is unavailable.');
    return {storage,engine};
  }

  function snapshot(){
    const {storage,engine}=dependencies();
    const saved=storage.load();
    return {saved,store:engine.normalizeStore(saved.flashcards)};
  }

  function persist(saved,store){
    const {storage,engine}=dependencies();
    saved.flashcards=engine.normalizeStore(store);
    const next=storage.save(saved);
    return {saved:next,store:engine.normalizeStore(next.flashcards)};
  }

  function seedLibrary(inputs,now){
    const {engine}=dependencies();
    const current=snapshot();
    let store=current.store;
    let changed=false;
    let created=0;
    let refreshed=0;
    const expected=new Set();
    const fields=['front','back','explanation','memoryClue','coachBobNote','domain','task','taskCode','topic','sourceContext','custom'];
    const stamp=now||new Date().toISOString();
    (Array.isArray(inputs)?inputs:[]).forEach(input=>{
      const source=Object.assign({},input,{custom:false});
      const id=engine.cardId(source);
      if(!/^v2:/i.test(id)) throw new Error('Seeded v2 flashcards require a stable v2: id.');
      expected.add(id);
      const existing=store.cards[id];
      if(!existing){
        const result=engine.upsertCard(store,source,stamp);
        store=result.store;
        changed=true;
        created+=1;
        return;
      }
      const desired=engine.normalizeCard(Object.assign({},source,{
        flagged:existing.flagged,
        masteryStatus:existing.masteryStatus,
        createdAt:existing.createdAt
      }),existing,existing.updatedAt||stamp);
      const sameFields=fields.every(field=>String(existing[field]??'')===String(desired[field]??''));
      const sameResources=JSON.stringify(existing.recommendedResources||[])===JSON.stringify(desired.recommendedResources||[]);
      if(sameFields&&sameResources) return;
      const result=engine.upsertCard(store,Object.assign({},source,{
        flagged:existing.flagged,
        masteryStatus:existing.masteryStatus,
        createdAt:existing.createdAt
      }),stamp);
      store=result.store;
      changed=true;
      refreshed+=1;
    });

    const stale=store.order.filter(id=>/^v2:/i.test(id)&&!expected.has(id));
    stale.forEach(id=>{
      const result=engine.removeCard(store,id,stamp);
      store=result.store;
      changed=changed||result.removed;
    });

    if(!changed) return {saved:current.saved,store:current.store,created:0,refreshed:0,removed:0};
    const persisted=persist(current.saved,store);
    return {saved:persisted.saved,store:persisted.store,created,refreshed,removed:stale.length};
  }

  function addQuestion(question,options,now){
    const {engine}=dependencies();
    const current=snapshot();
    const result=engine.addQuestionCard(current.store,question,options,now);
    const persisted=persist(current.saved,result.store);
    return {saved:persisted.saved,store:persisted.store,card:result.card,created:result.created};
  }

  function addCustom(input,now){
    const {engine}=dependencies();
    const current=snapshot();
    const result=engine.upsertCard(current.store,Object.assign({},input,{custom:true}),now);
    const persisted=persist(current.saved,result.store);
    return {saved:persisted.saved,store:persisted.store,card:result.card,created:result.created};
  }

  function update(id,changes,now){
    const {engine}=dependencies();
    const current=snapshot();
    const result=engine.updateCard(current.store,id,changes,now);
    if(!result.updated) return {saved:current.saved,store:current.store,card:null,updated:false};
    const persisted=persist(current.saved,result.store);
    return {saved:persisted.saved,store:persisted.store,card:result.card,updated:true};
  }

  function remove(id,now){
    const {engine}=dependencies();
    const current=snapshot();
    const result=engine.removeCard(current.store,id,now);
    if(!result.removed) return {saved:current.saved,store:current.store,removed:false};
    const persisted=persist(current.saved,result.store);
    return {saved:persisted.saved,store:persisted.store,removed:true};
  }

  root.RPSGTFlashcardStore={snapshot,persist,seedLibrary,addQuestion,addCustom,update,remove};
})(typeof window!=='undefined'?window:globalThis);
