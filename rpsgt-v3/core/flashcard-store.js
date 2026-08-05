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
