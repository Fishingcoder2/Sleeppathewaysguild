(function(global){
  "use strict";

  const ENGINE_VERSION="2.0.0";
  const TARGET_SCHEMA_VERSION=2;
  const IMPORT_ENABLED=false;
  const PRIMARY_KEY="spg_rpsgtv2_2026_evolved_v10_5_1";
  const FLASH_KEY_CURRENT="spg_rpsgtv2_flash_flags_v1262a";
  const FLASH_KEY_OLDER="spg_flash_flags_59b";
  const MATH_LESSON_KEY="spg_mathcoach_lesson_59b";
  const MATH_NOTE_PREFIX="spg_math_notes_59b_";
  const DOMAIN_CODES=new Set(["D1","D2","D3","D4"]);
  const TASK_CODES=new Set(["D1A","D1B","D1C","D2A","D2B","D2C","D3A","D3B","D3C","D4A","D4B","D4C"]);
  const AMBIGUOUS_TASK_CODE="D2A/D2C";
  const SOURCE_DEFINITIONS=[
    {key:PRIMARY_KEY,recordType:"primary-record",sourcePriority:80,json:true},
    {key:FLASH_KEY_CURRENT,recordType:"flash-flags",sourcePriority:100,json:true},
    {key:FLASH_KEY_OLDER,recordType:"flash-flags",sourcePriority:60,json:true},
    {key:MATH_LESSON_KEY,recordType:"math-coach-lesson",sourcePriority:70,json:true}
  ];

  function isObject(value){return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);}
  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function asArray(value){return Array.isArray(value)?value:[];}
  function stable(value){
    if(Array.isArray(value)) return value.map(stable);
    if(isObject(value)) return Object.keys(value).sort().reduce(function(out,key){out[key]=stable(value[key]);return out;},{});
    return value;
  }
  function stableStringify(value){return JSON.stringify(stable(value));}
  function fingerprint(value){
    const text=typeof value==="string"?value:stableStringify(value);
    let hash=2166136261;
    for(let index=0;index<text.length;index+=1){hash^=text.charCodeAt(index);hash=Math.imul(hash,16777619);}
    return "fnv1a32:"+(hash>>>0).toString(16).padStart(8,"0");
  }
  function byteSize(value){
    const text=typeof value==="string"?value:stableStringify(value);
    if(typeof TextEncoder!=="undefined") return new TextEncoder().encode(text).length;
    return unescape(encodeURIComponent(text)).length;
  }
  function nowValue(options){return typeof options.now==="function"?options.now():new Date().toISOString();}
  function setEquals(left,right){
    if(left.size!==right.size) return false;
    for(const value of left){if(!right.has(value)) return false;}
    return true;
  }
  function issueBag(){return {blocking:[],warnings:[],notices:[]};}
  function addIssue(issues,severity,code,details){
    const item=Object.assign({severity:severity,code:code,path:null,sourceKey:null,message:code,blocking:severity==="blocking"},clone(details||{}));
    issues[severity].push(item);
    return item;
  }
  function unresolvedBag(){
    return {
      unknownFields:[],
      malformedRecords:[],
      unknownQuestionIds:[],
      malformedQuestionIds:[],
      duplicateQuestionIds:[],
      manualReviewQuestionIds:[],
      crossListQuestionIds:[],
      ambiguousTaskRecords:[],
      historyRecords:[],
      sourceConflicts:[],
      unsupportedShapes:[]
    };
  }

  function normalizeSnapshot(snapshot){
    const sources=asArray(snapshot&&snapshot.sources).map(function(source){
      return {
        key:source&&source.key!==undefined?String(source.key):"",
        raw:source&&typeof source.raw==="string"?source.raw:null,
        parsed:source&&source.parsed!==undefined?clone(source.parsed):undefined,
        bytes:source&&Number.isFinite(Number(source.bytes))?Number(source.bytes):null
      };
    }).filter(function(source){return Boolean(source.key);});
    return {sources:sources,parseErrors:clone(asArray(snapshot&&snapshot.parseErrors))};
  }

  function sourceDefinition(key){
    const exact=SOURCE_DEFINITIONS.find(function(definition){return definition.key===key;});
    if(exact) return exact;
    if(key.indexOf(MATH_NOTE_PREFIX)===0) return {key:key,recordType:"math-coach-note",sourcePriority:50,json:false};
    return {key:key,recordType:"unrecognized",sourcePriority:0,json:false};
  }

  function parseSource(source,definition,issues,unresolved){
    if(!source) return {status:"missing",value:null,error:null};
    if(!definition.json) return {status:"raw-text",value:source.raw===null?String(source.parsed??""):source.raw,error:null};
    if(source.raw!==null){
      try{return {status:"parsed",value:JSON.parse(source.raw),error:null};}
      catch(error){
        const detail={sourceKey:definition.key,path:definition.key,message:"Legacy JSON could not be parsed.",errorMessage:error&&error.message?error.message:"Invalid JSON."};
        addIssue(issues,"blocking","invalid-json",detail);
        unresolved.malformedRecords.push(Object.assign({value:source.raw},detail));
        return {status:"invalid-json",value:null,error:detail.errorMessage};
      }
    }
    if(source.parsed!==undefined) return {status:"parsed",value:clone(source.parsed),error:null};
    const detail={sourceKey:definition.key,path:definition.key,message:"The source was present without readable raw or parsed content."};
    addIssue(issues,"blocking","unsupported-shape",detail);
    unresolved.unsupportedShapes.push(detail);
    return {status:"unsupported-shape",value:null,error:"missing-content"};
  }

  function discover(snapshot,issues,unresolved){
    const supplied=new Map();
    snapshot.sources.forEach(function(source){
      if(supplied.has(source.key)){
        addIssue(issues,"blocking","duplicate-source-key",{sourceKey:source.key,path:source.key,message:"The snapshot contains the same storage key more than once."});
        unresolved.sourceConflicts.push({code:"duplicate-source-key",sourceKey:source.key,manualReviewRequired:true});
      }else supplied.set(source.key,source);
    });
    const dynamicNotes=snapshot.sources.filter(function(source){return source.key.indexOf(MATH_NOTE_PREFIX)===0;}).map(function(source){return source.key;}).sort();
    const knownKeys=SOURCE_DEFINITIONS.map(function(definition){return definition.key;}).concat(dynamicNotes);
    const unexpected=snapshot.sources.map(function(source){return source.key;}).filter(function(key){return knownKeys.indexOf(key)===-1;}).sort();
    const manifest=[];
    knownKeys.forEach(function(key){
      const definition=sourceDefinition(key);
      const source=supplied.get(key)||null;
      const parsed=parseSource(source,definition,issues,unresolved);
      const contentForHash=parsed.status==="parsed"?stable(parsed.value):parsed.status==="raw-text"?parsed.value:source&&source.raw!==null?source.raw:null;
      manifest.push({
        key:key,
        present:Boolean(source),
        byteSize:source?(source.bytes===null?byteSize(source.raw!==null?source.raw:source.parsed):source.bytes):0,
        parseStatus:parsed.status,
        recordType:definition.recordType,
        sourcePriority:definition.sourcePriority,
        sourceHash:source?fingerprint({key:key,content:contentForHash}):null,
        value:parsed.value
      });
    });
    unexpected.forEach(function(key){
      const source=supplied.get(key);
      const definition=sourceDefinition(key);
      const parsed=parseSource(source,definition,issues,unresolved);
      const detail={sourceKey:key,path:key,value:clone(parsed.value),message:"The snapshot contains an unrecognized legacy storage key."};
      addIssue(issues,"warnings","unrecognized-source-key",detail);
      unresolved.unknownFields.push(detail);
      manifest.push({
        key:key,present:true,byteSize:source.bytes===null?byteSize(source.raw!==null?source.raw:source.parsed):source.bytes,
        parseStatus:parsed.status,recordType:"unrecognized",sourcePriority:0,
        sourceHash:fingerprint({key:key,content:parsed.status==="parsed"?stable(parsed.value):source.raw}),value:parsed.value
      });
    });
    snapshot.parseErrors.forEach(function(error){
      const already=manifest.some(function(item){return item.key===error.key&&item.parseStatus==="invalid-json";});
      if(!already) addIssue(issues,"blocking","invalid-json",{sourceKey:error.key||null,path:error.key||null,message:error.message||"Legacy JSON could not be parsed."});
    });
    return manifest.sort(function(a,b){return a.key.localeCompare(b.key);});
  }

  function manifestSource(manifest,key){return manifest.find(function(item){return item.key===key;})||null;}

  function buildQuestionLookup(questionIndex){
    const records=Array.isArray(questionIndex)?questionIndex:asArray(questionIndex&&questionIndex.records);
    const lookup=new Map();
    records.forEach(function(record){
      if(!record||record.id===undefined||record.id===null) return;
      const key=String(record.id).trim();
      if(!key) return;
      lookup.set(key,record);
    });
    return lookup;
  }

  function classifyQuestionId(rawId,lookup){
    if((typeof rawId!=="string"&&typeof rawId!=="number")||String(rawId).trim()==="") return {classification:"malformed",canonicalId:null,record:null};
    const key=String(rawId).trim();
    const record=lookup.get(key)||null;
    if(!record) return {classification:"unknown",canonicalId:key,record:null};
    const manual=Boolean(record.manualReviewRecommended)||String(record.taskCode||"")===AMBIGUOUS_TASK_CODE;
    return {classification:manual?"manual-review":"learner-practice",canonicalId:record.id,record:record};
  }

  function normalizeIdList(value,context){
    const {path,sourceKey,lookup,issues,unresolved,allowManualReview}=context;
    if(value===undefined||value===null) return [];
    if(!Array.isArray(value)){
      const detail={sourceKey:sourceKey,path:path,value:clone(value),message:"Expected an array of question IDs."};
      addIssue(issues,"blocking","unexpected-type",detail);
      unresolved.unsupportedShapes.push(detail);
      return [];
    }
    const output=[];
    const seen=new Set();
    value.forEach(function(rawId,index){
      const itemPath=path+"["+index+"]";
      const result=classifyQuestionId(rawId,lookup);
      if(result.classification==="malformed"){
        const detail={sourceKey:sourceKey,path:itemPath,value:clone(rawId),message:"Question ID must be a non-empty string or number."};
        addIssue(issues,"blocking","invalid-question-id",detail);
        unresolved.malformedQuestionIds.push(detail);
        return;
      }
      const canonicalKey=String(result.canonicalId);
      if(seen.has(canonicalKey)){
        const detail={sourceKey:sourceKey,path:path,id:result.canonicalId,message:"Duplicate question ID removed during normalization."};
        addIssue(issues,"warnings","duplicate-id",detail);
        unresolved.duplicateQuestionIds.push(detail);
        return;
      }
      seen.add(canonicalKey);
      if(result.classification==="unknown"){
        const detail={sourceKey:sourceKey,path:itemPath,id:result.canonicalId,message:"Question ID is not present in the compact feedback index."};
        addIssue(issues,"blocking","invalid-question-id",detail);
        unresolved.unknownQuestionIds.push(detail);
        return;
      }
      if(result.classification==="manual-review"&&!allowManualReview){
        const detail={sourceKey:sourceKey,path:itemPath,id:result.canonicalId,classification:"manual-review",message:"Manual-review question IDs cannot enter learner remediation lists."};
        addIssue(issues,"blocking","manual-review-remediation-id",detail);
        unresolved.manualReviewQuestionIds.push(detail);
        return;
      }
      output.push(result.canonicalId);
    });
    return output;
  }

  function normalizeCount(value,context){
    const {path,sourceKey,issues,unresolved}=context;
    if(value===undefined||value===null||value==="") return 0;
    const numeric=typeof value==="string"&&value.trim()!==""?Number(value):value;
    if(typeof numeric!=="number"||!Number.isFinite(numeric)||!Number.isSafeInteger(numeric)){
      const detail={sourceKey:sourceKey,path:path,value:clone(value),message:"Progress counts must be finite whole numbers."};
      addIssue(issues,"blocking","invalid-number",detail);
      unresolved.malformedRecords.push(detail);
      return 0;
    }
    if(numeric<0){
      const detail={sourceKey:sourceKey,path:path,value:numeric,normalizedValue:0,message:"Negative progress counts are not valid and were normalized to zero in the draft."};
      addIssue(issues,"blocking","invalid-number",detail);
      unresolved.malformedRecords.push(detail);
      return 0;
    }
    if(typeof value==="string") addIssue(issues,"notices","numeric-string-normalized",{sourceKey:sourceKey,path:path,value:value,normalizedValue:numeric,message:"A safe numeric string was converted to a number."});
    return numeric;
  }

  function normalizeStatBucket(value,context){
    const {path,sourceKey,issues,unresolved}=context;
    if(value===undefined||value===null) return {answered:0,correct:0};
    if(!isObject(value)){
      const detail={sourceKey:sourceKey,path:path,value:clone(value),message:"Expected an object with answered and correct counts."};
      addIssue(issues,"blocking","unexpected-type",detail);
      unresolved.unsupportedShapes.push(detail);
      return {answered:0,correct:0};
    }
    Object.keys(value).filter(function(key){return key!=="answered"&&key!=="correct";}).forEach(function(key){
      unresolved.unknownFields.push({sourceKey:sourceKey,path:path+"."+key,value:clone(value[key]),message:"Unknown statistic field preserved for review."});
      addIssue(issues,"warnings","unknown-field",{sourceKey:sourceKey,path:path+"."+key,message:"Unknown statistic field preserved in the unresolved report."});
    });
    const answered=normalizeCount(value.answered,{path:path+".answered",sourceKey:sourceKey,issues:issues,unresolved:unresolved});
    let correct=normalizeCount(value.correct,{path:path+".correct",sourceKey:sourceKey,issues:issues,unresolved:unresolved});
    if(correct>answered){
      const detail={sourceKey:sourceKey,path:path,value:{answered:answered,correct:correct},normalizedValue:{answered:answered,correct:answered},message:"Correct count cannot exceed answered count; the draft was clamped for safety."};
      addIssue(issues,"blocking","impossible-total",detail);
      unresolved.malformedRecords.push(detail);
      correct=answered;
    }
    return {answered:answered,correct:correct};
  }

  function normalizeStatMap(value,kind,context){
    const {path,sourceKey,issues,unresolved}=context;
    if(value===undefined||value===null) return {};
    if(!isObject(value)){
      const detail={sourceKey:sourceKey,path:path,value:clone(value),message:"Expected an object keyed by "+kind+" code."};
      addIssue(issues,"blocking","unexpected-type",detail);
      unresolved.unsupportedShapes.push(detail);
      return {};
    }
    const output={};
    Object.keys(value).sort().forEach(function(code){
      if(kind==="domain"&&!DOMAIN_CODES.has(code)){
        const detail={sourceKey:sourceKey,path:path+"."+code,value:clone(value[code]),message:"Unknown domain statistic preserved for review."};
        addIssue(issues,"blocking","unsupported-shape",detail);
        unresolved.unknownFields.push(detail);
        return;
      }
      if(kind==="task"&&code===AMBIGUOUS_TASK_CODE){
        const detail={sourceKey:sourceKey,path:path+"."+code,value:clone(value[code]),message:"Ambiguous D2A/D2C statistics were preserved without reclassification."};
        addIssue(issues,"blocking","ambiguous-task-record",detail);
        unresolved.ambiguousTaskRecords.push(detail);
        return;
      }
      if(kind==="task"&&!TASK_CODES.has(code)){
        const detail={sourceKey:sourceKey,path:path+"."+code,value:clone(value[code]),message:"Unknown task statistic preserved for review."};
        addIssue(issues,"blocking","unsupported-shape",detail);
        unresolved.unknownFields.push(detail);
        return;
      }
      output[code]=normalizeStatBucket(value[code],{path:path+"."+code,sourceKey:sourceKey,issues:issues,unresolved:unresolved});
    });
    return output;
  }

  function sumStatMap(map){return Object.values(map).reduce(function(total,bucket){total.answered+=bucket.answered;total.correct+=bucket.correct;return total;},{answered:0,correct:0});}

  function reconcileTotals(total,byDomain,byTask,historyCount,issues){
    const domainTotal=sumStatMap(byDomain);
    const taskTotal=sumStatMap(byTask);
    if(Object.keys(byDomain).length&&(domainTotal.answered!==total.answered||domainTotal.correct!==total.correct)){
      addIssue(issues,"warnings","count-reconciliation-mismatch",{path:"stats.byDomain",reported:total,calculated:domainTotal,message:"Domain totals do not reconcile with overall practice totals."});
    }
    if(Object.keys(byTask).length&&(taskTotal.answered!==total.answered||taskTotal.correct!==total.correct)){
      addIssue(issues,"warnings","count-reconciliation-mismatch",{path:"stats.byTask",reported:total,calculated:taskTotal,message:"Task totals do not reconcile with overall practice totals."});
    }
    if(historyCount>total.answered){
      addIssue(issues,"warnings","count-reconciliation-mismatch",{path:"stats.history",reportedAnswered:total.answered,historyCount:historyCount,message:"Validated history contains more records than the reported answered total."});
    }
    return {reported:clone(total),domainSum:domainTotal,taskSum:taskTotal,validatedHistoryCount:historyCount};
  }

  function historyMode(record){return String(record.mode||record.kind||record.type||"").trim().toLowerCase();}
  function classifyMode(mode){
    if(["practice","quick-practice","domain-practice","task-practice","missed","mastered","review"].includes(mode)) return "practice";
    if(["readiness","readiness-check","readiness_like","readiness-like","diagnostic"].includes(mode)) return "readiness";
    if(["mock","mock-style","mock_style","exam","mock-exam"].includes(mode)) return "mock";
    return null;
  }

  function validateHistoryArray(value,context){
    const {path,sourceKey,forcedFamily,lookup,issues,unresolved}=context;
    const families={practice:[],readiness:[],mock:[]};
    if(value===undefined||value===null) return families;
    if(!Array.isArray(value)){
      const detail={sourceKey:sourceKey,path:path,value:clone(value),message:"Expected an array of history records."};
      addIssue(issues,"blocking","unexpected-type",detail);
      unresolved.unsupportedShapes.push(detail);
      return families;
    }
    value.forEach(function(record,index){
      const recordPath=path+"["+index+"]";
      if(!isObject(record)){
        const detail={sourceKey:sourceKey,path:recordPath,value:clone(record),message:"History record must be an object."};
        addIssue(issues,"blocking","unsupported-shape",detail);
        unresolved.historyRecords.push(detail);
        return;
      }
      if(record.id===undefined||record.id===null){
        const detail={sourceKey:sourceKey,path:recordPath,value:clone(record),message:"History record is missing a required question ID."};
        addIssue(issues,"blocking","missing-required-field",detail);
        unresolved.historyRecords.push(detail);
        return;
      }
      const idResult=classifyQuestionId(record.id,lookup);
      if(idResult.classification==="malformed"||idResult.classification==="unknown"){
        const detail={sourceKey:sourceKey,path:recordPath+".id",id:record.id,value:clone(record),message:idResult.classification==="unknown"?"History question ID is not present in the compact feedback index.":"History question ID is malformed."};
        addIssue(issues,"blocking","invalid-question-id",detail);
        unresolved.historyRecords.push(detail);
        if(idResult.classification==="unknown") unresolved.unknownQuestionIds.push(detail); else unresolved.malformedQuestionIds.push(detail);
        return;
      }
      const explicit=classifyMode(historyMode(record));
      let family=forcedFamily||explicit;
      if(forcedFamily&&explicit&&explicit!==forcedFamily){
        const detail={sourceKey:sourceKey,path:recordPath,forcedFamily:forcedFamily,recordMode:historyMode(record),message:"History source and record mode disagree; the source family was preserved and manual review is required."};
        addIssue(issues,"blocking","conflicting-source",detail);
        unresolved.sourceConflicts.push(Object.assign({value:clone(record),manualReviewRequired:true},detail));
      }
      if(!family){
        const detail={sourceKey:sourceKey,path:recordPath,mode:historyMode(record)||null,value:clone(record),message:"History record could not be classified without guessing."};
        addIssue(issues,"blocking","unclassified-history-record",detail);
        unresolved.historyRecords.push(detail);
        return;
      }
      const normalized=clone(record);
      normalized.id=idResult.canonicalId;
      normalized.migrationClassification=idResult.classification;
      families[family].push(normalized);
    });
    return families;
  }

  function mergeHistoryFamilies(target,source){
    ["practice","readiness","mock"].forEach(function(family){target[family]=target[family].concat(source[family]);});
    return target;
  }

  function unknownFields(object,knownKeys,sourceKey,path,issues,unresolved){
    if(!isObject(object)) return;
    Object.keys(object).filter(function(key){return knownKeys.indexOf(key)===-1;}).sort().forEach(function(key){
      const detail={sourceKey:sourceKey,path:path?path+"."+key:key,value:clone(object[key]),message:"Unknown legacy field preserved for manual review."};
      addIssue(issues,"warnings","unknown-field",detail);
      unresolved.unknownFields.push(detail);
    });
  }

  function normalizeObject(value,context,defaultValue){
    const fallback=arguments.length>=3?defaultValue:{};
    if(value===undefined||value===null) return clone(fallback);
    if(!isObject(value)){
      const detail={sourceKey:context.sourceKey,path:context.path,value:clone(value),message:"Expected an object."};
      addIssue(context.issues,"blocking","unexpected-type",detail);
      context.unresolved.unsupportedShapes.push(detail);
      return clone(fallback);
    }
    return clone(value);
  }

  function normalizeArrayOfObjects(value,context){
    if(value===undefined||value===null) return [];
    if(!Array.isArray(value)){
      const detail={sourceKey:context.sourceKey,path:context.path,value:clone(value),message:"Expected an array of objects."};
      addIssue(context.issues,"blocking","unexpected-type",detail);
      context.unresolved.unsupportedShapes.push(detail);
      return [];
    }
    const output=[];
    value.forEach(function(item,index){
      if(!isObject(item)){
        const detail={sourceKey:context.sourceKey,path:context.path+"["+index+"]",value:clone(item),message:"Expected an object record."};
        addIssue(context.issues,"blocking","unsupported-shape",detail);
        context.unresolved.malformedRecords.push(detail);
      }else output.push(clone(item));
    });
    return output;
  }

  function flagCandidate(value,sourceKey,priority,lookup,issues,unresolved,path){
    if(value===undefined||value===null) return null;
    let rawIds=null;
    if(Array.isArray(value)) rawIds=value;
    else if(isObject(value)&&Array.isArray(value.flaggedIds)) rawIds=value.flaggedIds;
    else if(isObject(value)) rawIds=Object.keys(value).filter(function(key){return Boolean(value[key]);});
    else{
      const detail={sourceKey:sourceKey,path:path,value:clone(value),message:"Flash flags must be an array, an object with flaggedIds, or a truthy ID map."};
      addIssue(issues,"blocking","unsupported-shape",detail);
      unresolved.unsupportedShapes.push(detail);
      return null;
    }
    const ids=normalizeIdList(rawIds,{path:path,sourceKey:sourceKey,lookup:lookup,issues:issues,unresolved:unresolved,allowManualReview:true});
    return {sourceKey:sourceKey,priority:priority,ids:ids,idSet:new Set(ids.map(String)),rawValue:clone(value)};
  }

  function reconcileFlags(manifest,primary,lookup,issues,unresolved){
    const candidates=[];
    const current=manifestSource(manifest,FLASH_KEY_CURRENT);
    const older=manifestSource(manifest,FLASH_KEY_OLDER);
    const currentCandidate=current&&current.present&&current.parseStatus==="parsed"?flagCandidate(current.value,FLASH_KEY_CURRENT,100,lookup,issues,unresolved,FLASH_KEY_CURRENT):null;
    const primaryCandidate=Object.prototype.hasOwnProperty.call(primary,"flaggedIds")?flagCandidate(primary.flaggedIds,PRIMARY_KEY,80,lookup,issues,unresolved,"flaggedIds"):null;
    const olderCandidate=older&&older.present&&older.parseStatus==="parsed"?flagCandidate(older.value,FLASH_KEY_OLDER,60,lookup,issues,unresolved,FLASH_KEY_OLDER):null;
    [currentCandidate,primaryCandidate,olderCandidate].forEach(function(candidate){if(candidate) candidates.push(candidate);});
    candidates.sort(function(a,b){return b.priority-a.priority||a.sourceKey.localeCompare(b.sourceKey);});
    if(!candidates.length) return {ids:[],chosenSource:null,alternates:[],conflicts:[]};
    const chosen=candidates[0];
    const conflicts=[];
    candidates.slice(1).forEach(function(candidate){
      if(setEquals(chosen.idSet,candidate.idSet)) return;
      const detail={
        path:"review.flaggedIds",chosenSource:chosen.sourceKey,alternateSource:candidate.sourceKey,
        chosenValues:clone(chosen.ids),alternateValues:clone(candidate.ids),
        resolutionRule:"highest-source-priority-wins-without-merging",manualReviewRequired:true,
        message:"Flash-flag sources conflict. The highest-priority source was selected without silently merging values."
      };
      addIssue(issues,"blocking","conflicting-source",detail);
      unresolved.sourceConflicts.push(detail);
      conflicts.push(detail);
    });
    return {ids:clone(chosen.ids),chosenSource:chosen.sourceKey,alternates:candidates.slice(1).map(function(item){return item.sourceKey;}),conflicts:conflicts};
  }

  function mapMathNotes(manifest,issues,unresolved){
    const notes={};
    manifest.filter(function(item){return item.present&&item.recordType==="math-coach-note";}).forEach(function(item){
      const suffix=item.key.slice(MATH_NOTE_PREFIX.length).trim();
      if(!suffix){
        const detail={sourceKey:item.key,path:item.key,value:item.value,message:"Math Coach note key is missing its note identifier."};
        addIssue(issues,"blocking","missing-required-field",detail);
        unresolved.malformedRecords.push(detail);
        return;
      }
      if(typeof item.value!=="string"){
        const detail={sourceKey:item.key,path:item.key,value:clone(item.value),message:"Math Coach notes must be stored as text."};
        addIssue(issues,"blocking","unexpected-type",detail);
        unresolved.malformedRecords.push(detail);
        return;
      }
      notes[suffix]=item.value;
    });
    return notes;
  }

  function mapMathLesson(manifest,issues,unresolved){
    const source=manifestSource(manifest,MATH_LESSON_KEY);
    if(!source||!source.present||source.parseStatus!=="parsed") return null;
    if(!isObject(source.value)){
      const detail={sourceKey:MATH_LESSON_KEY,path:MATH_LESSON_KEY,value:clone(source.value),message:"Math Coach lesson state must be an object."};
      addIssue(issues,"blocking","unsupported-shape",detail);
      unresolved.unsupportedShapes.push(detail);
      return null;
    }
    return clone(source.value);
  }

  function defaultDraft(options){
    const supplied=typeof options.createDefaultState==="function"?options.createDefaultState():{};
    const draft=clone(supplied)||{};
    draft.schemaVersion=TARGET_SCHEMA_VERSION;
    draft.progress=isObject(draft.progress)?draft.progress:{answered:0,correct:0,byDomain:{},byTask:{},history:[]};
    draft.review=isObject(draft.review)?draft.review:{missedIds:[],masteredIds:[],flaggedIds:[]};
    draft.guidedStudy=isObject(draft.guidedStudy)?draft.guidedStudy:{trailAwards:{tasks:{},domains:{}},trailStudyMarks:{},lastTrailPost:null};
    draft.readiness=isObject(draft.readiness)?draft.readiness:{history:[],activeSession:null};
    draft.mock=isObject(draft.mock)?draft.mock:{history:[],activeSession:null};
    draft.labs=isObject(draft.labs)?draft.labs:{};
    draft.notes=isObject(draft.notes)?draft.notes:{general:"",math:{}};
    draft.migration=isObject(draft.migration)?draft.migration:{};
    return draft;
  }

  function meaningfulV3Data(state){
    if(!isObject(state)) return false;
    const progress=isObject(state.progress)?state.progress:{};
    const review=isObject(state.review)?state.review:{};
    const guided=isObject(state.guidedStudy)?state.guidedStudy:{};
    const notes=isObject(state.notes)?state.notes:{};
    const learner=isObject(state.learner)?state.learner:{};
    const migration=isObject(state.migration)?state.migration:{};
    return Boolean(
      Number(progress.answered)>0||Number(progress.correct)>0||asArray(progress.history).length||Object.keys(isObject(progress.byDomain)?progress.byDomain:{}).length||Object.keys(isObject(progress.byTask)?progress.byTask:{}).length||
      asArray(review.missedIds).length||asArray(review.masteredIds).length||asArray(review.flaggedIds).length||
      asArray(state.readiness&&state.readiness.history).length||asArray(state.mock&&state.mock.history).length||
      Object.keys(isObject(state.labs)?state.labs:{}).length||
      String(notes.general||"").trim()||Object.keys(isObject(notes.math)?notes.math:{}).length||
      Object.keys(isObject(guided.trailStudyMarks)?guided.trailStudyMarks:{}).length||
      Object.keys(isObject(guided.trailAwards&&guided.trailAwards.tasks)?guided.trailAwards.tasks:{}).length||
      Object.keys(isObject(guided.trailAwards&&guided.trailAwards.domains)?guided.trailAwards.domains:{}).length||
      guided.lastTrailPost||String(learner.displayName||"").trim()||Object.keys(isObject(learner.settings)?learner.settings:{}).length||
      migration.importedAt||migration.sourceFingerprint||asArray(migration.history).length
    );
  }

  function buildMigrationReport(snapshotInput,optionsInput){
    const options=optionsInput||{};
    const snapshot=normalizeSnapshot(snapshotInput||{sources:[],parseErrors:[]});
    const originalSnapshot=stableStringify(snapshot);
    const issues=issueBag();
    const unresolved=unresolvedBag();
    const manifestInternal=discover(snapshot,issues,unresolved);
    const sourceManifest=manifestInternal.map(function(item){
      const copy=clone(item);delete copy.value;return copy;
    });
    const presentSources=manifestInternal.filter(function(item){return item.present;});
    if(!presentSources.length) addIssue(issues,"blocking","no-legacy-sources",{path:"sources",message:"No recognized legacy records were supplied for migration."});
    const primarySource=manifestSource(manifestInternal,PRIMARY_KEY);
    const primary=primarySource&&primarySource.present&&primarySource.parseStatus==="parsed"&&isObject(primarySource.value)?clone(primarySource.value):{};
    if(primarySource&&primarySource.present&&primarySource.parseStatus==="parsed"&&!isObject(primarySource.value)){
      const detail={sourceKey:PRIMARY_KEY,path:PRIMARY_KEY,value:clone(primarySource.value),message:"Primary legacy record must be an object."};
      addIssue(issues,"blocking","unsupported-shape",detail);unresolved.unsupportedShapes.push(detail);
    }
    if(!primarySource||!primarySource.present) addIssue(issues,"warnings","primary-source-not-found",{sourceKey:PRIMARY_KEY,path:PRIMARY_KEY,message:"The primary legacy storage key was not found."});

    const lookup=buildQuestionLookup(options.questionIndex||[]);
    if(!lookup.size) addIssue(issues,"blocking","missing-question-index",{path:"questionIndex",message:"A valid compact question-ID index is required before migration can be validated."});
    const draft=defaultDraft(options);
    const stats=isObject(primary.stats)?primary.stats:{};
    if(primary.stats!==undefined&&!isObject(primary.stats)){
      const detail={sourceKey:PRIMARY_KEY,path:"stats",value:clone(primary.stats),message:"Primary stats must be an object."};
      addIssue(issues,"blocking","unexpected-type",detail);unresolved.unsupportedShapes.push(detail);
    }
    unknownFields(stats,["answered","correct","byDomain","byTask","history"],PRIMARY_KEY,"stats",issues,unresolved);
    const total=normalizeStatBucket({answered:stats.answered,correct:stats.correct},{path:"stats",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved});
    const byDomain=normalizeStatMap(stats.byDomain,"domain",{path:"stats.byDomain",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved});
    const byTask=normalizeStatMap(stats.byTask,"task",{path:"stats.byTask",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved});
    let histories={practice:[],readiness:[],mock:[]};
    histories=mergeHistoryFamilies(histories,validateHistoryArray(stats.history,{path:"stats.history",sourceKey:PRIMARY_KEY,forcedFamily:null,lookup:lookup,issues:issues,unresolved:unresolved}));
    histories=mergeHistoryFamilies(histories,validateHistoryArray(primary.practiceHistory,{path:"practiceHistory",sourceKey:PRIMARY_KEY,forcedFamily:"practice",lookup:lookup,issues:issues,unresolved:unresolved}));
    histories=mergeHistoryFamilies(histories,validateHistoryArray(primary.readinessHistory,{path:"readinessHistory",sourceKey:PRIMARY_KEY,forcedFamily:"readiness",lookup:lookup,issues:issues,unresolved:unresolved}));
    histories=mergeHistoryFamilies(histories,validateHistoryArray(primary.mockHistory,{path:"mockHistory",sourceKey:PRIMARY_KEY,forcedFamily:"mock",lookup:lookup,issues:issues,unresolved:unresolved}));
    const reconciliation=reconcileTotals(total,byDomain,byTask,histories.practice.length,issues);
    draft.progress.answered=total.answered;
    draft.progress.correct=total.correct;
    draft.progress.byDomain=byDomain;
    draft.progress.byTask=byTask;
    draft.progress.history=histories.practice;
    draft.readiness.history=histories.readiness;
    draft.readiness.activeSession=null;
    draft.mock.history=histories.mock;
    draft.mock.activeSession=null;

    const missed=normalizeIdList(primary.missedIds,{path:"missedIds",sourceKey:PRIMARY_KEY,lookup:lookup,issues:issues,unresolved:unresolved,allowManualReview:false});
    let mastered=normalizeIdList(primary.masteredIds,{path:"masteredIds",sourceKey:PRIMARY_KEY,lookup:lookup,issues:issues,unresolved:unresolved,allowManualReview:false});
    const missedSet=new Set(missed.map(String));
    const overlap=mastered.filter(function(id){return missedSet.has(String(id));});
    if(overlap.length){
      overlap.forEach(function(id){
        const detail={sourceKey:PRIMARY_KEY,path:"review",id:id,chosenList:"missedIds",removedFrom:"masteredIds",resolutionRule:"missed-precedes-mastered-pending-manual-review",manualReviewRequired:true,message:"Question ID appeared in both missed and mastered lists."};
        addIssue(issues,"blocking","conflicting-source",detail);unresolved.crossListQuestionIds.push(detail);
      });
      const overlapSet=new Set(overlap.map(String));
      mastered=mastered.filter(function(id){return !overlapSet.has(String(id));});
    }
    const flagResolution=reconcileFlags(manifestInternal,primary,lookup,issues,unresolved);
    draft.review.missedIds=missed;
    draft.review.masteredIds=mastered;
    draft.review.flaggedIds=flagResolution.ids;

    draft.guidedStudy.trailAwards=normalizeObject(primary.trailAwards,{path:"trailAwards",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved},{tasks:{},domains:{}});
    draft.guidedStudy.trailStudyMarks=normalizeObject(primary.trailStudyMarks,{path:"trailStudyMarks",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved},{});
    draft.guidedStudy.lastTrailPost=primary.lastTrailPost===undefined||primary.lastTrailPost===null?null:normalizeObject(primary.lastTrailPost,{path:"lastTrailPost",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved},null);
    draft.guidedStudy.trailDomain=typeof primary.trailDomain==="string"&&DOMAIN_CODES.has(primary.trailDomain)?primary.trailDomain:null;
    if(primary.trailDomain!==undefined&&draft.guidedStudy.trailDomain===null){
      const detail={sourceKey:PRIMARY_KEY,path:"trailDomain",value:clone(primary.trailDomain),message:"Guided Trail domain is not recognized."};
      addIssue(issues,"blocking","unsupported-shape",detail);unresolved.malformedRecords.push(detail);
    }
    draft.guidedStudy.trailFocus=primary.trailFocus===undefined||primary.trailFocus===null?null:normalizeObject(primary.trailFocus,{path:"trailFocus",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved},null);
    draft.guidedStudy.checkpointHistory=normalizeArrayOfObjects(primary.trailCheckpointHistory,{path:"trailCheckpointHistory",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved});

    const labsValue=primary.labs!==undefined?primary.labs:primary.lab;
    if(primary.labs!==undefined&&primary.lab!==undefined&&stableStringify(primary.labs)!==stableStringify(primary.lab)){
      const detail={sourceKey:PRIMARY_KEY,path:"labs",chosenSource:"labs",alternateSource:"lab",chosenValues:clone(primary.labs),alternateValues:clone(primary.lab),resolutionRule:"plural-labs-field-precedes-singular-lab-field",manualReviewRequired:true,message:"Legacy laboratory progress fields conflict."};
      addIssue(issues,"blocking","conflicting-source",detail);unresolved.sourceConflicts.push(detail);
    }
    draft.labs=normalizeObject(labsValue,{path:primary.labs!==undefined?"labs":"lab",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved},{});

    const legacyNotes=isObject(primary.notes)?primary.notes:{};
    if(primary.notes!==undefined&&!isObject(primary.notes)){
      const detail={sourceKey:PRIMARY_KEY,path:"notes",value:clone(primary.notes),message:"Legacy notes must be an object."};
      addIssue(issues,"blocking","unexpected-type",detail);unresolved.unsupportedShapes.push(detail);
    }
    unknownFields(legacyNotes,["title","body"],PRIMARY_KEY,"notes",issues,unresolved);
    draft.notes.general=typeof legacyNotes.body==="string"?legacyNotes.body:"";
    draft.notes.title=typeof legacyNotes.title==="string"?legacyNotes.title:"";
    draft.notes.searches=normalizeObject(primary.searches!==undefined?primary.searches:primary.searchHistory,{path:primary.searches!==undefined?"searches":"searchHistory",sourceKey:PRIMARY_KEY,issues:issues,unresolved:unresolved},{});
    draft.notes.math=mapMathNotes(manifestInternal,issues,unresolved);
    draft.notes.mathCoachLesson=mapMathLesson(manifestInternal,issues,unresolved);

    const knownPrimaryFields=["stats","practiceHistory","readinessHistory","mockHistory","missedIds","masteredIds","flaggedIds","trailAwards","trailStudyMarks","lastTrailPost","trailDomain","trailFocus","trailCheckpointHistory","lab","labs","notes","searches","searchHistory"];
    unknownFields(primary,knownPrimaryFields,PRIMARY_KEY,"",issues,unresolved);

    const sourceHashes=sourceManifest.filter(function(item){return item.present;}).map(function(item){return {key:item.key,sourceHash:item.sourceHash};}).sort(function(a,b){return a.key.localeCompare(b.key);});
    const migrationFingerprint=fingerprint({engineVersion:ENGINE_VERSION,targetSchemaVersion:TARGET_SCHEMA_VERSION,sources:sourceHashes});
    const generatedAt=nowValue(options);
    const currentState=clone(options.currentState||{});
    const currentStateHasMeaningfulData=meaningfulV3Data(currentState);
    if(!currentStateHasMeaningfulData){
      if(Object.prototype.hasOwnProperty.call(currentState,"createdAt")) currentState.createdAt=generatedAt;
      if(Object.prototype.hasOwnProperty.call(currentState,"updatedAt")) currentState.updatedAt=generatedAt;
    }
    const existingChecksum=fingerprint(currentState);
    const priorMigration=isObject(currentState.migration)?currentState.migration:{};
    const priorFingerprints=[priorMigration.sourceFingerprint].concat(asArray(priorMigration.history).map(function(item){return item&&item.sourceFingerprint;})).filter(Boolean);
    const duplicate=priorFingerprints.includes(migrationFingerprint);
    if(duplicate) addIssue(issues,"blocking","duplicate-migration-fingerprint",{path:"migration.sourceFingerprint",fingerprint:migrationFingerprint,message:"This migration fingerprint has already been recorded. A protected reset is required before re-import."});
    const existingConflict=currentStateHasMeaningfulData&&!duplicate;
    if(existingConflict) addIssue(issues,"blocking","existing-v3-data-conflict",{path:"spg_rpsgt_v3",previousChecksum:existingChecksum,message:"Existing non-empty v3 data must be backed up and explicitly resolved before import."});

    draft.createdAt=generatedAt;
    draft.updatedAt=generatedAt;
    const passesBlockingValidation=issues.blocking.length===0;
    const canImport=IMPORT_ENABLED&&passesBlockingValidation&&!duplicate&&!existingConflict;
    draft.migration=Object.assign({},draft.migration,{
      status:"preview-only",
      engineVersion:ENGINE_VERSION,
      targetSchemaVersion:TARGET_SCHEMA_VERSION,
      sourceKeys:sourceManifest.filter(function(item){return item.present;}).map(function(item){return item.key;}),
      sourceHashes:sourceHashes,
      sourceFingerprint:migrationFingerprint,
      previewedAt:generatedAt,
      importedAt:null,
      importEnabled:false,
      rollbackProtected:true,
      previousV3Checksum:existingChecksum,
      lastValidation:{passesBlockingValidation:passesBlockingValidation,blocking:issues.blocking.length,warnings:issues.warnings.length,notices:issues.notices.length},
      history:asArray(draft.migration.history)
    });

    const fieldMappings=[
      {source:"stats.answered / stats.correct",target:"progress.answered / progress.correct",status:"mapped-normalized"},
      {source:"stats.byDomain",target:"progress.byDomain",status:"mapped-validated"},
      {source:"stats.byTask",target:"progress.byTask",status:"mapped-validated-with-D2A/D2C-preserved-unresolved"},
      {source:"stats.history + practiceHistory",target:"progress.history",status:"mapped-practice-only"},
      {source:"readinessHistory + readiness-like generic history",target:"readiness.history",status:"mapped-separately"},
      {source:"mockHistory + mock-style generic history",target:"mock.history",status:"mapped-separately"},
      {source:"missedIds",target:"review.missedIds",status:"learner-IDs-only"},
      {source:"masteredIds",target:"review.masteredIds",status:"learner-IDs-only"},
      {source:"flash-flag sources",target:"review.flaggedIds",status:"priority-reconciled-no-silent-merge",chosenSource:flagResolution.chosenSource},
      {source:"trailDomain / trailFocus / lastTrailPost",target:"guidedStudy position",status:"mapped-validated"},
      {source:"trailAwards / trailCheckpointHistory / trailStudyMarks",target:"guidedStudy awards/checkpoints/marks",status:"mapped"},
      {source:"lab / labs",target:"labs",status:"mapped-with-conflict-detection"},
      {source:"notes / searches / searchHistory",target:"notes",status:"mapped"},
      {source:MATH_LESSON_KEY,target:"notes.mathCoachLesson",status:"mapped-object-only"},
      {source:MATH_NOTE_PREFIX+"*",target:"notes.math",status:"mapped-text-only"},
      {source:"migration metadata",target:"migration",status:"generated-preview-only"}
    ];

    const validation={
      valid:passesBlockingValidation,
      passesBlockingValidation:passesBlockingValidation,
      blockingCount:issues.blocking.length,
      warningCount:issues.warnings.length,
      noticeCount:issues.notices.length,
      duplicateFingerprint:duplicate,
      existingV3Conflict:existingConflict,
      importFeatureEnabled:IMPORT_ENABLED,
      questionIndexCount:lookup.size,
      countReconciliation:reconciliation,
      historyCounts:{practice:histories.practice.length,readiness:histories.readiness.length,mock:histories.mock.length,unresolved:unresolved.historyRecords.length},
      idCounts:{missed:missed.length,mastered:mastered.length,flagged:flagResolution.ids.length,unknown:unresolved.unknownQuestionIds.length,manualReviewRejected:unresolved.manualReviewQuestionIds.length,duplicates:unresolved.duplicateQuestionIds.length},
      sourceConflictCount:unresolved.sourceConflicts.length,
      malformedRecordCount:unresolved.malformedRecords.length+unresolved.unsupportedShapes.length
    };

    const summary={
      sourceCount:presentSources.length,
      recognizedSourceCount:presentSources.filter(function(item){return item.recordType!=="unrecognized";}).length,
      totalBytes:presentSources.reduce(function(sum,item){return sum+item.byteSize;},0),
      parseErrorCount:sourceManifest.filter(function(item){return item.parseStatus==="invalid-json";}).length,
      blockingIssueCount:issues.blocking.length,
      warningIssueCount:issues.warnings.length,
      unresolvedItemCount:Object.values(unresolved).reduce(function(sum,list){return sum+list.length;},0),
      practiceAnswered:draft.progress.answered,
      practiceCorrect:draft.progress.correct,
      practiceHistory:histories.practice.length,
      readinessHistory:histories.readiness.length,
      mockHistory:histories.mock.length,
      canImport:canImport
    };

    const rollback={
      protected:true,
      importEnabled:false,
      legacyKeysUntouched:true,
      cancellationAllowedBeforeWrite:true,
      previousV3Checksum:existingChecksum,
      backupSnapshot:currentState,
      verificationRequired:true,
      restorePreviousStateOnVerificationFailure:true,
      strategy:["capture-existing-v3-snapshot","record-previous-checksum","write-once-after-explicit-approval","read-back-and-verify-checksum","restore-backup-on-verification-failure"]
    };

    if(stableStringify(snapshot)!==originalSnapshot) throw new Error("Migration engine mutated the supplied legacy snapshot.");

    const report={
      status:"preview-only",
      engineVersion:ENGINE_VERSION,
      targetSchemaVersion:TARGET_SCHEMA_VERSION,
      generatedAt:generatedAt,
      fingerprint:migrationFingerprint,
      sourceFingerprint:migrationFingerprint,
      canImport:canImport,
      draft:draft,
      state:draft,
      summary:summary,
      issues:issues,
      unresolved:unresolved,
      fieldMappings:fieldMappings,
      sourceManifest:sourceManifest,
      validation:validation,
      duplicate:{detected:duplicate,reason:duplicate?"source-fingerprint-already-recorded":null,existingFingerprint:priorMigration.sourceFingerprint||null,existingImportedAt:priorMigration.importedAt||null},
      conflictResolution:{flashFlags:flagResolution,existingV3Data:existingConflict},
      rollback:rollback,
      source:{keysFound:draft.migration.sourceKeys,recordCount:draft.migration.sourceKeys.length,parseErrors:sourceManifest.filter(function(item){return item.parseStatus==="invalid-json";}).map(function(item){return {key:item.key,status:item.parseStatus};})}
    };
    return report;
  }

  const api={
    ENGINE_VERSION:ENGINE_VERSION,
    TARGET_SCHEMA_VERSION:TARGET_SCHEMA_VERSION,
    MIGRATION_SCHEMA_VERSION:TARGET_SCHEMA_VERSION,
    IMPORT_ENABLED:IMPORT_ENABLED,
    PRIMARY_KEY:PRIMARY_KEY,
    FLASH_KEYS:[FLASH_KEY_CURRENT,FLASH_KEY_OLDER],
    MATH_LESSON_KEY:MATH_LESSON_KEY,
    MATH_NOTE_PREFIX:MATH_NOTE_PREFIX,
    stableStringify:stableStringify,
    fingerprint:fingerprint,
    buildQuestionLookup:buildQuestionLookup,
    buildMigrationReport:buildMigrationReport,
    buildDraft:buildMigrationReport,
    hasMeaningfulV3Data:meaningfulV3Data
  };
  global.RPSGTMigrationEngine=api;
  global.RPSGTLegacyMigration=api;
})(typeof window!=="undefined"?window:globalThis);
