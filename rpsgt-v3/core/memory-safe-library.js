(function(root){
  'use strict';
  const cardsApi=root.RPSGTV2FlashcardLibrary;
  let ready=false,loading=null,glossary=[],lessons=[];
  const text=value=>String(value==null?'':value).trim();
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  async function json(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
  function glossaryFromCards(cards){
    const seen=new Set();
    return cards.map(card=>({term:text(card.front),plain:text(card.back),category:text(card.category)||'RPSGT Review',why:text(card.memoryClue),confusion:text(card.explanation)})).filter(item=>{
      const key=item.term.toLowerCase();if(!item.term||!item.plain||seen.has(key))return false;seen.add(key);return true;
    });
  }
  function lessonRecord(item){return {id:text(item.id),short:text(item.shortTitle),title:text(item.title),formula:text(item.formula),concept:text(item.lesson),trap:text(item.memoryClue||item.coachBobNote),unit:text(item.unit)};}
  const api={
    VERSION:'2026-08-27-memory-safe-json-1',
    counts:{glossary:0,mathLessons:0},
    async load(){
      if(ready)return api;
      if(!loading)loading=(async()=>{
        if(!cardsApi)throw new Error('The reviewed RPSGT flashcard source is unavailable.');
        await cardsApi.load();
        glossary=glossaryFromCards(cardsApi.asV3Cards());
        const manifest=await json('data/math-coach/manifest.json');
        lessons=(await Promise.all((manifest.skillFiles||[]).map(file=>json('data/math-coach/'+file)))).map(lessonRecord);
        api.counts={glossary:glossary.length,mathLessons:lessons.length};ready=true;return api;
      })().catch(error=>{loading=null;throw error;});
      return loading;
    },
    glossaryRecords(){if(!ready)throw new Error('Load the Memory Lab library before requesting terms.');return clone(glossary);},
    mathLessonRecords(){if(!ready)throw new Error('Load the Memory Lab library before requesting formulas.');return clone(lessons);}
  };
  root.RPSGTLearningLibrary=api;
})(typeof window!=='undefined'?window:globalThis);
