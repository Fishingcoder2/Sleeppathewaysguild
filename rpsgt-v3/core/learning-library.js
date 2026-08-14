(function(root){
  'use strict';

  const EXPECTED={flashcards:312,glossary:258,mathLessons:20,mathQuestions:100,parts:5};
  const VERSION='2026-08-14-v2-learning-library-2';
  let payload=null;
  let loading=null;

  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function text(value){return String(value==null?'':value).trim();}

  function decodeBase64(value){
    const binary=root.atob(value);
    const bytes=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index+=1) bytes[index]=binary.charCodeAt(index);
    return bytes;
  }

  async function inflate(){
    const parts=Array.isArray(root.RPSGTLearningLibraryParts)?root.RPSGTLearningLibraryParts:[];
    if(parts.length!==EXPECTED.parts) throw new Error('The RPSGT learning library is incomplete. Expected '+EXPECTED.parts+' data parts and found '+parts.length+'.');
    if(typeof root.DecompressionStream!=='function') throw new Error('This browser cannot open the compressed RPSGT learning library. Please use a current version of Chrome, Edge, Firefox, or Safari.');
    const bytes=decodeBase64(parts.join(''));
    const stream=new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'));
    const json=await new Response(stream).text();
    return JSON.parse(json);
  }

  function validate(data){
    if(!data||typeof data!=='object') throw new Error('The RPSGT learning library payload is not valid.');
    const flashcards=Array.isArray(data.flashcards)?data.flashcards:[];
    const glossary=Array.isArray(data.glossary)?data.glossary:[];
    const mathLessons=Array.isArray(data.mathLessons)?data.mathLessons:[];
    const mathQuestions=mathLessons.reduce((sum,lesson)=>sum+(Array.isArray(lesson.questions)?lesson.questions.length:0),0);
    const found={flashcards:flashcards.length,glossary:glossary.length,mathLessons:mathLessons.length,mathQuestions};
    Object.keys(EXPECTED).filter(key=>key!=='parts').forEach(key=>{
      if(found[key]!==EXPECTED[key]) throw new Error('RPSGT learning library validation failed for '+key+': expected '+EXPECTED[key]+' and found '+found[key]+'.');
    });
    return found;
  }

  function flashcardRecord(card){
    return {
      id:'builtin:v2-'+text(card.id),
      legacyId:text(card.id),
      custom:false,
      category:text(card.cat)||'RPSGT Review',
      topic:text(card.cat)||'RPSGT Review',
      front:text(card.front),
      back:text(card.back),
      explanation:'',
      memoryClue:text(card.trap),
      coachBobNote:'',
      domain:'',
      task:'',
      taskCode:'',
      recommendedResources:[],
      sourceContext:'RPSGT V2 learning library'
    };
  }

  const api={
    VERSION,
    EXPECTED:clone(EXPECTED),
    source:'RPSGTv2.2026_1.html',
    counts:null,
    flashcards:[],
    glossary:[],
    mathLessons:[],
    isReady(){return Boolean(payload);},
    async load(){
      if(payload) return api;
      if(!loading){
        loading=inflate().then(data=>{
          const counts=validate(data);
          payload=data;
          api.counts=counts;
          api.flashcards=clone(data.flashcards);
          api.glossary=clone(data.glossary);
          api.mathLessons=clone(data.mathLessons);
          return api;
        }).catch(error=>{loading=null;throw error;});
      }
      return loading;
    },
    flashcardRecords(){
      if(!payload) throw new Error('Load the RPSGT learning library before requesting flashcards.');
      return payload.flashcards.map(flashcardRecord);
    },
    glossaryRecords(){
      if(!payload) throw new Error('Load the RPSGT learning library before requesting glossary terms.');
      return clone(payload.glossary);
    },
    mathLessonRecords(){
      if(!payload) throw new Error('Load the RPSGT learning library before requesting Math Coach lessons.');
      return clone(payload.mathLessons);
    },
    findGlossaryTerm(term){
      if(!payload) return null;
      const key=text(term).toLowerCase();
      return clone(payload.glossary.find(item=>text(item.term).toLowerCase()===key)||null);
    }
  };

  root.RPSGTLearningLibrary=api;
})(typeof window!=='undefined'?window:globalThis);
