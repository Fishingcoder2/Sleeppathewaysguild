(function(){
  "use strict";

  const MIGRATION_SCHEMA_VERSION=1;
  const PRIMARY_KEY="spg_rpsgtv2_2026_evolved_v10_5_1";
  const FLAG_KEYS=["spg_rpsgtv2_flash_flags_v1262a","spg_flash_flags_59b"];
  const MATH_LESSON_KEY="spg_mathcoach_lesson_59b";
  const MATH_NOTE_PREFIX="spg_math_notes_59b_";
  const IMPORT_ENABLED=false;

  function isObject(value){return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);}
  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function stable(value){
    if(Array.isArray(value)) return value.map(stable);
    if(isObject(value)) return Object.keys(value).sort().reduce(function(out,key){out[key]=stable(value[key]);return out;},{});
    return value;
  }
  function fingerprint(value){
    const text=JSON.stringify(stable(value));
    let hash=2166136261;
    for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return "fnv1a32:"+(hash>>>0).toString(16).padStart(8,"0");
  }
  function asArray(value){return Array.isArray(value)?value:[];}
  function finiteNonnegative(value){const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
  function pushIssue(list,code,path,value,message){list.push({code:code,path:path,value:clone(value),message:message});}
  function sourceByKey(snapshot,key){return asArray(snapshot&&snapshot.sources).find(function(item){return item&&item.key===key;})||null;}
  function parsedSource(snapshot,key){const item=sourceByKey(snapshot,key);return item&&isObject(item.parsed)?item.parsed:null;}

  function defaultDraft(options){
    const base=options&&typeof options.createDefaultState==="function"?options.createDefaultState():{};
    return clone(base)||{};
  }

  function buildQuestionLookup(questionIndex){
    const records=Array.isArray(questionIndex)?questionIndex:asArray(questionIndex&&questionIndex.records);
    const lookup=new Map();
    records.forEach(function(record){if(record&&record.id!==undefined&&record.id!==null) lookup.set(String(record.id),record);});
    return lookup;
  }

  function validateIdList(value,path,lookup,issues,allowManualReview){
    if(value!==undefined&&!Array.isArray(value)){
      pushIssue(issues.malformedRecords,"invalid-id-list",path,value,"Expected an array of question IDs.");
      return [];
    }
    const output=[];const seen=new Set();
    asArray(value).forEach(function(id,index){
      if(typeof id!=="string"&&typeof id!=="number"){
        pushIssue(issues.malformedRecords,"invalid-question-id",path+"["+index+"]",id,"Question ID must be a string or number.");return;
      }
      const key=String(id);
      if(seen.has(key)){issues.duplicateQuestionIds.push({path:path,id:id});return;}
      seen.add(key);
      const record=lookup.get(key);
      if(!record){issues.unresolvedQuestionIds.push({path:path,id:id});return;}
      if(record.manualReviewRecommended&&!allowManualReview){issues.rejectedManualReviewQuestionIds.push({path:path,id:id});return;}
      output.push(id);
    });
    return output;
  }

  function sanitizeStatBucket(value,path,issues){
    if(!isObject(value)){
      if(value!==undefined) pushIssue(issues.malformedRecords,"invalid-stat-bucket",path,value,"Expected an object with answered and correct counts.");
      return {answered:0,correct:0};
    }
    const answered=value.answered===undefined?0:finiteNonnegative(value.answered);
    const correct=value.correct===undefined?0:finiteNonnegative(value.correct);
    if(answered===null) pushIssue(issues.malformedRecords,"invalid-answered-count",path+".answered",value.answered,"Answered count must be a nonnegative number.");
    if(correct===null) pushIssue(issues.malformedRecords,"invalid-correct-count",path+".correct",value.correct,"Correct count must be a nonnegative number.");
    const safeAnswered=answered===null?0:answered;
    const safeCorrect=correct===null?0:correct;
    if(safeCorrect>safeAnswered) pushIssue(issues.malformedRecords,"correct-exceeds-answered",path,value,"Correct count cannot exceed answered count.");
    return {answered:safeAnswered,correct:Math.min(safeCorrect,safeAnswered)};
  }

  function sanitizeStatMap(value,path,issues){
    if(value===undefined) return {};
    if(!isObject(value)){pushIssue(issues.malformedRecords,"invalid-stat-map",path,value,"Expected an object keyed by domain or task.");return {};}
    return Object.keys(value).reduce(function(out,key){out[key]=sanitizeStatBucket(value[key],path+"."+key,issues);return out;},{});
  }

  function classifyHistory(history,lookup,issues){
    const practice=[];const readiness=[];const mock=[];const unresolved=[];
    if(history!==undefined&&!Array.isArray(history)){
      pushIssue(issues.malformedRecords,"invalid-history","stats.history",history,"Expected an array of attempt records.");
      return {practice:practice,readiness:readiness,mock:mock,unresolved:unresolved};
    }
    asArray(history).forEach(function(record,index){
      const path="stats.history["+index+"]";
      if(!isObject(record)){pushIssue(issues.malformedRecords,"invalid-history-record",path,record,"Attempt record must be an object.");return;}
      if(record.id===undefined||record.id===null){pushIssue(issues.malformedRecords,"missing-history-id",path,record,"Attempt record is missing a question ID.");return;}
      if(!lookup.has(String(record.id))){issues.unresolvedQuestionIds.push({path:path+".id",id:record.id});unresolved.push(clone(record));return;}
      const mode=String(record.mode||"").toLowerCase();
      if(mode==="mock"||mode==="mock-style"||mode==="exam") mock.push(clone(record));
      else if(mode==="readiness"||mode==="readiness-check"||mode==="readiness_like") readiness.push(clone(record));
      else if(mode==="practice"||mode==="missed"||mode==="mastered"||mode==="review") practice.push(clone(record));
      else {issues.unresolvedHistoryRecords.push({path:path,mode:record.mode||null,id:record.id});unresolved.push(clone(record));}
    });
    return {practice:practice,readiness:readiness,mock:mock,unresolved:unresolved};
  }

  function collectFlagIds(snapshot,primary){
    let values=asArray(primary&&primary.flaggedIds).slice();
    FLAG_KEYS.forEach(function(key){
      const parsed=parsedSource(snapshot,key);
      if(Array.isArray(parsed)) values=values.concat(parsed);
      else if(isObject(parsed)){
        if(Array.isArray(parsed.flaggedIds)) values=values.concat(parsed.flaggedIds);
        else values=values.concat(Object.keys(parsed).filter(function(id){return Boolean(parsed[id]);}));
      }
    });
    return values;
  }

  function mapLegacy(snapshot,options){
    const primary=parsedSource(snapshot,PRIMARY_KEY)||{};
    const lookup=buildQuestionLookup(options.questionIndex);
    const issues={errors:[],warnings:[],malformedRecords:[],unresolvedQuestionIds:[],duplicateQuestionIds:[],rejectedManualReviewQuestionIds:[],unresolvedHistoryRecords:[]};
    const draft=defaultDraft(options);
    draft.progress=draft.progress||{answered:0,correct:0,byDomain:{},byTask:{},history:[]};
    draft.review=draft.review||{missedIds:[],masteredIds:[],flaggedIds:[]};
    draft.guidedStudy=draft.guidedStudy||{trailAwards:{tasks:{},domains:{}},trailStudyMarks:{},lastTrailPost:null};
    draft.readiness=draft.readiness||{history:[],activeSession:null};
    draft.mock=draft.mock||{history:[],activeSession:null};
    draft.labs=draft.labs||{};
    draft.notes=draft.notes||{general:"",math:{}};

    const stats=isObject(primary.stats)?primary.stats:{};
    if(primary.stats!==undefined&&!isObject(primary.stats)) pushIssue(issues.malformedRecords,"invalid-stats","stats",primary.stats,"Expected stats to be an object.");
    const total=sanitizeStatBucket(stats,"stats",issues);
    const histories=classifyHistory(stats.history,lookup,issues);
    draft.progress.answered=total.answered;
    draft.progress.correct=total.correct;
    draft.progress.byDomain=sanitizeStatMap(stats.byDomain,"stats.byDomain",issues);
    draft.progress.byTask=sanitizeStatMap(stats.byTask,"stats.byTask",issues);
    draft.progress.history=histories.practice;
    draft.readiness.history=histories.readiness.concat(asArray(primary.readinessHistory).filter(isObject).map(clone));
    draft.mock.history=histories.mock.concat(asArray(primary.mockHistory).filter(isObject).map(clone));

    draft.review.missedIds=validateIdList(primary.missedIds,"missedIds",lookup,issues,false);
    draft.review.masteredIds=validateIdList(primary.masteredIds,"masteredIds",lookup,issues,false);
    draft.review.flaggedIds=validateIdList(collectFlagIds(snapshot,primary),"flaggedIds",lookup,issues,true);

    if(primary.trailAwards!==undefined&&!isObject(primary.trailAwards)) pushIssue(issues.malformedRecords,"invalid-trail-awards","trailAwards",primary.trailAwards,"Expected trail awards to be an object.");
    else if(isObject(primary.trailAwards)) draft.guidedStudy.trailAwards=clone(primary.trailAwards);
    if(primary.trailStudyMarks!==undefined&&!isObject(primary.trailStudyMarks)) pushIssue(issues.malformedRecords,"invalid-trail-marks","trailStudyMarks",primary.trailStudyMarks,"Expected trail study marks to be an object.");
    else if(isObject(primary.trailStudyMarks)) draft.guidedStudy.trailStudyMarks=clone(primary.trailStudyMarks);
    draft.guidedStudy.lastTrailPost=isObject(primary.lastTrailPost)?clone(primary.lastTrailPost):null;
    draft.guidedStudy.trailDomain=typeof primary.trailDomain==="string"?primary.trailDomain:null;
    draft.guidedStudy.trailFocus=isObject(primary.trailFocus)?clone(primary.trailFocus):null;
    draft.guidedStudy.checkpointHistory=asArray(primary.trailCheckpointHistory).filter(isObject).map(clone);

    if(primary.lab!==undefined&&!isObject(primary.lab)) pushIssue(issues.malformedRecords,"invalid-lab-progress","lab",primary.lab,"Expected lab progress to be an object.");
    else if(isObject(primary.lab)) draft.labs=clone(primary.lab);

    const legacyNotes=isObject(primary.notes)?primary.notes:{};
    draft.notes.general=typeof legacyNotes.body==="string"?legacyNotes.body:"";
    draft.notes.title=typeof legacyNotes.title==="string"?legacyNotes.title:"";
    draft.notes.searches=isObject(primary.searches)?clone(primary.searches):{};
    draft.notes.math={};
    asArray(snapshot&&snapshot.sources).forEach(function(source){
      if(source&&typeof source.key==="string"&&source.key.indexOf(MATH_NOTE_PREFIX)===0){
        draft.notes.math[source.key.slice(MATH_NOTE_PREFIX.length)]=typeof source.raw==="string"?source.raw:"";
      }
    });
    const mathLesson=sourceByKey(snapshot,MATH_LESSON_KEY);
    draft.notes.mathCoachLesson=mathLesson?clone(mathLesson.parsed!==null?mathLesson.parsed:mathLesson.raw):null;

    const sourceFingerprint=fingerprint({sources:asArray(snapshot&&snapshot.sources).map(function(source){return {key:source.key,raw:source.raw};}).sort(function(a,b){return String(a.key).localeCompare(String(b.key));})});
    const currentState=options.currentState||{};
    const prior=currentState.migration||{};
    const duplicate=prior.sourceFingerprint===sourceFingerprint||asArray(prior.history).some(function(item){return item&&item.sourceFingerprint===sourceFingerprint;});
    const now=typeof options.now==="function"?options.now():new Date().toISOString();
    const parseErrors=asArray(snapshot&&snapshot.parseErrors);
    parseErrors.forEach(function(error){issues.errors.push({code:"legacy-json-parse-error",path:error.key||"unknown",message:error.message||"Legacy JSON could not be parsed."});});
    if(!sourceByKey(snapshot,PRIMARY_KEY)) issues.warnings.push({code:"primary-source-not-found",path:PRIMARY_KEY,message:"The primary legacy storage key was not found."});
    if(duplicate) issues.warnings.push({code:"duplicate-migration-source",path:"migration.sourceFingerprint",message:"This legacy snapshot fingerprint has already been imported or recorded."});

    draft.migration=Object.assign({},draft.migration||{}, {
      status:"preview-only",
      sourceKeys:asArray(snapshot&&snapshot.sources).map(function(source){return source.key;}),
      previewedAt:now,
      importedAt:null,
      sourceFingerprint:sourceFingerprint,
      migrationSchemaVersion:MIGRATION_SCHEMA_VERSION,
      importEnabled:false,
      rollbackProtected:true,
      lastValidation:{valid:issues.errors.length===0&&issues.malformedRecords.length===0,errors:issues.errors.length,warnings:issues.warnings.length}
    });

    return {
      status:"preview-only",
      canImport:IMPORT_ENABLED,
      migrationSchemaVersion:MIGRATION_SCHEMA_VERSION,
      createdAt:now,
      sourceFingerprint:sourceFingerprint,
      source:{keysFound:draft.migration.sourceKeys,recordCount:draft.migration.sourceKeys.length,parseErrors:clone(parseErrors)},
      fieldMappings:{
        practice:["stats.answered","stats.correct","stats.byDomain","stats.byTask","stats.history[practice|missed|mastered|review]"],
        review:["missedIds","masteredIds","flaggedIds",FLAG_KEYS.join(",")],
        guidedStudy:["lastTrailPost","trailDomain","trailFocus","trailAwards","trailStudyMarks","trailCheckpointHistory"],
        readiness:["stats.history[readiness*]","readinessHistory"],
        mock:["stats.history[mock|mock-style|exam]","mockHistory"],
        labs:["lab"],
        notesAndSearches:["notes","searches"],
        mathCoach:[MATH_LESSON_KEY,MATH_NOTE_PREFIX+"*"]
      },
      state:draft,
      validation:Object.assign({valid:issues.errors.length===0&&issues.malformedRecords.length===0,counts:{practiceHistory:histories.practice.length,readinessHistory:draft.readiness.history.length,mockHistory:draft.mock.history.length,unresolvedHistory:histories.unresolved.length,missedIds:draft.review.missedIds.length,masteredIds:draft.review.masteredIds.length,flaggedIds:draft.review.flaggedIds.length}},issues),
      duplicate:{detected:duplicate,reason:duplicate?"source-fingerprint-already-recorded":null,existingFingerprint:prior.sourceFingerprint||null,existingImportedAt:prior.importedAt||null},
      rollback:{protected:true,importEnabled:false,strategy:"retain-current-v3-state-and-discard-preview",baselineFingerprint:fingerprint(currentState)}
    };
  }

  function buildDraft(snapshot,options){
    const safeSnapshot=clone(snapshot||{sources:[],parseErrors:[]});
    return mapLegacy(safeSnapshot,options||{});
  }

  window.RPSGTLegacyMigration={
    MIGRATION_SCHEMA_VERSION:MIGRATION_SCHEMA_VERSION,
    PRIMARY_KEY:PRIMARY_KEY,
    IMPORT_ENABLED:IMPORT_ENABLED,
    fingerprint:fingerprint,
    buildDraft:buildDraft
  };
})();
