(function(root){
  'use strict';

  const EXPECTED={flashcards:312,glossary:258,mathLessons:20,mathQuestions:100,parts:5};
  const EXPECTED_BASE64_LENGTH=67644;
  const EXPECTED_PART_LENGTHS=[14000,14000,14000,14000,11644];
  const VERSION='2026-08-25-v2-learning-library-recovery-1';
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

  async function readTextStream(stream){
    const reader=stream.getReader();
    const decoder=new TextDecoder('utf-8');
    let output='';
    try{
      while(true){
        const result=await reader.read();
        if(result.done) break;
        output+=decoder.decode(result.value,{stream:true});
      }
      output+=decoder.decode();
      return output;
    }finally{
      try{reader.releaseLock();}catch(error){}
    }
  }

  async function decompressText(bytes,format){
    const stream=new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream(format));
    return readTextStream(stream);
  }

  function uint32LE(bytes,offset){
    return (bytes[offset]|(bytes[offset+1]<<8)|(bytes[offset+2]<<16)|(bytes[offset+3]<<24))>>>0;
  }

  function gzipPayloadRange(bytes){
    if(bytes.length<18||bytes[0]!==0x1f||bytes[1]!==0x8b||bytes[2]!==0x08){
      throw new Error('The RPSGT learning library payload is not a valid gzip file.');
    }
    const flags=bytes[3];
    if(flags&0xe0) throw new Error('The RPSGT learning library gzip header uses unsupported reserved flags.');
    const trailerStart=bytes.length-8;
    let index=10;

    if(flags&0x04){
      if(index+2>trailerStart) throw new Error('The RPSGT learning library gzip extra field is incomplete.');
      const length=bytes[index]|(bytes[index+1]<<8);
      index+=2+length;
      if(index>trailerStart) throw new Error('The RPSGT learning library gzip extra field is incomplete.');
    }

    function skipZeroTerminated(label){
      while(index<trailerStart&&bytes[index]!==0) index+=1;
      if(index>=trailerStart) throw new Error('The RPSGT learning library gzip '+label+' field is incomplete.');
      index+=1;
    }

    if(flags&0x08) skipZeroTerminated('filename');
    if(flags&0x10) skipZeroTerminated('comment');
    if(flags&0x02){
      if(index+2>trailerStart) throw new Error('The RPSGT learning library gzip header checksum is incomplete.');
      index+=2;
    }
    if(index>=trailerStart) throw new Error('The RPSGT learning library gzip data body is empty.');

    return {start:index,end:trailerStart,expectedSize:uint32LE(bytes,trailerStart+4)};
  }

  function libraryParts(){
    const parts=Array.isArray(root.RPSGTLearningLibraryParts)?root.RPSGTLearningLibraryParts:[];
    if(parts.length!==EXPECTED.parts){
      throw new Error('The RPSGT learning library is incomplete. Expected '+EXPECTED.parts+' data parts and found '+parts.length+'.');
    }
    parts.forEach((part,index)=>{
      const length=String(part||'').length;
      if(length!==EXPECTED_PART_LENGTHS[index]){
        throw new Error('RPSGT learning library data part '+(index+1)+' is incomplete. Expected '+EXPECTED_PART_LENGTHS[index]+' characters and found '+length+'.');
      }
    });
    const joined=parts.join('');
    if(joined.length!==EXPECTED_BASE64_LENGTH){
      throw new Error('The RPSGT learning library payload is incomplete. Expected '+EXPECTED_BASE64_LENGTH+' characters and found '+joined.length+'.');
    }
    return joined;
  }

  async function inflate(){
    const encoded=libraryParts();
    if(typeof root.DecompressionStream!=='function'){
      throw new Error('This browser cannot open the compressed RPSGT learning library. Please use a current version of Chrome, Edge, Firefox, or Safari.');
    }
    const bytes=decodeBase64(encoded);
    if(bytes.length<3||bytes[0]!==0x1f||bytes[1]!==0x8b||bytes[2]!==0x08){
      throw new Error('The RPSGT learning library payload is not a valid gzip file.');
    }
    try{
      const json=await decompressText(bytes,'gzip');
      if(!json.trim()) throw new Error('The decompressed learning library was empty.');
      return JSON.parse(json);
    }catch(error){
      // The imported V2 payload has a damaged gzip integrity trailer in some builds.
      // Recovery is intentionally narrow: decode only the original deflate body,
      // require the gzip ISIZE to match, parse valid JSON, and require every
      // expected V2 library count before accepting the recovered content.
      try{
        const range=gzipPayloadRange(bytes);
        const json=await decompressText(bytes.slice(range.start,range.end),'deflate-raw');
        if(!json.trim()) throw new Error('The recovered learning library was empty.');
        const actualSize=new Blob([json]).size>>>0;
        if(actualSize!==range.expectedSize){
          throw new Error('Recovered payload size did not match the gzip metadata.');
        }
        const recovered=JSON.parse(json);
        validate(recovered);
        return recovered;
      }catch(recoveryError){
        const detail=error&&error.message?String(error.message):'Unknown decompression error';
        const recoveryDetail=recoveryError&&recoveryError.message?String(recoveryError.message):'Unknown recovery error';
        throw new Error('The RPSGT learning library could not be decompressed in this browser. '+detail+' Recovery validation also failed: '+recoveryDetail);
      }
    }
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
