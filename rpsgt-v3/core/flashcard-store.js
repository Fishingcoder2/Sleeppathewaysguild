(function(root){
  'use strict';

  function dependencies(){
    const storage=root.RPSGTStorage;
    const engine=root.RPSGTFlashcardEngine;
    if(!storage||!engine) throw new Error('RPSGT v3 flashcard storage is unavailable.');
    return {storage,engine};
  }

  function seedCatalog(saved,store,storage,engine){
    const catalog=root.RPSGTFlashcardCatalog;
    if(!catalog||!Array.isArray(catalog.cards)||!catalog.cards.length) return {saved,store};
    const version=String(catalog.VERSION||'').trim();
    const refresh=Boolean(version)&&store.catalogVersion!==version;
    const stamp=String(catalog.UPDATED_AT||'').trim()||new Date().toISOString();
    let nextStore=store;
    let changed=false;

    catalog.cards.forEach(input=>{
      const id=engine.cardId(input||{});
      if(!refresh&&nextStore.cards[id]) return;
      nextStore=engine.upsertCard(nextStore,input,stamp).store;
      changed=true;
    });

    if(version&&nextStore.catalogVersion!==version){
      nextStore.catalogVersion=version;
      changed=true;
    }
    if(!changed) return {saved,store:nextStore};

    saved.flashcards=engine.normalizeStore(nextStore);
    const next=storage.save(saved);
    return {saved:next,store:engine.normalizeStore(next.flashcards)};
  }

  function snapshot(){
    const {storage,engine}=dependencies();
    const saved=storage.load();
    const store=engine.normalizeStore(saved.flashcards);
    return seedCatalog(saved,store,storage,engine);
  }

  function persist(saved,store){
    const {storage,engine}=dependencies();
    saved.flashcards=engine.normalizeStore(store);
    const next=storage.save(saved);
    return {saved:next,store:engine.normalizeStore(next.flashcards)};
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

  root.RPSGTFlashcardStore={snapshot,persist,addQuestion,addCustom,update,remove};
})(typeof window!=='undefined'?window:globalThis);
