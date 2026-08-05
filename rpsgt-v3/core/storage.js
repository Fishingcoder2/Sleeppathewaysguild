(function(){
  "use strict";
  const NEW_KEY="spg_rpsgt_v3";
  const SCHEMA_VERSION=2;
  const LEGACY_KEYS=[
    "spg_rpsgtv2_2026_evolved_v10_5_1",
    "spg_rpsgtv2_flash_flags_v1262a",
    "spg_flash_flags_59b",
    "spg_mathcoach_lesson_59b"
  ];
  const MATH_NOTE_PREFIX="spg_math_notes_59b_";

  function defaultState(){
    const now=new Date().toISOString();
    return {
      schemaVersion:SCHEMA_VERSION,
      createdAt:now,
      updatedAt:now,
      lastLocation:"index.html",
      learner:{displayName:"",settings:{}},
      progress:{answered:0,correct:0,byDomain:{},byTask:{},history:[]},
      review:{missedIds:[],masteredIds:[],flaggedIds:[],reviewLaterIds:[]},
      flashcards:{cards:{},order:[],filters:{domain:"all",task:"all",topic:"all",status:"all"},updatedAt:null},
      awards:{seenCeremonyIds:[]},
      mathCoach:{skills:{},currentSkill:null},
      guidedStudy:{trailAwards:{tasks:{},domains:{}},trailStudyMarks:{},lastTrailPost:null,trailDomain:null,trailFocus:null,checkpointHistory:[]},
      readiness:{history:[],activeSession:null},
      mock:{history:[],activeSession:null},
      labs:{},
      notes:{general:"",title:"",searches:{},math:{},mathCoachLesson:null},
      migration:{
        status:"not-started",
        engineVersion:null,
        targetSchemaVersion:null,
        sourceKeys:[],
        sourceHashes:[],
        previewedAt:null,
        importedAt:null,
        sourceFingerprint:null,
        importEnabled:false,
        rollbackProtected:true,
        previousV3Checksum:null,
        lastValidation:null,
        history:[]
      }
    };
  }

  function merge(base,source){
    if(!source||typeof source!=="object") return base;
    Object.keys(source).forEach(function(key){
      if(base[key]&&typeof base[key]==="object"&&!Array.isArray(base[key])&&typeof source[key]==="object"&&!Array.isArray(source[key])) merge(base[key],source[key]);
      else base[key]=source[key];
    });
    return base;
  }

  function load(){
    try{
      const raw=localStorage.getItem(NEW_KEY);
      if(!raw) return defaultState();
      return merge(defaultState(),JSON.parse(raw));
    }catch(error){
      console.warn("RPSGT v3 storage could not be loaded.",error);
      return defaultState();
    }
  }

  function save(state){
    const next=merge(defaultState(),state||{});
    next.schemaVersion=SCHEMA_VERSION;
    next.updatedAt=new Date().toISOString();
    localStorage.setItem(NEW_KEY,JSON.stringify(next));
    return next;
  }

  function rememberLocation(path){
    const state=load();
    state.lastLocation=path||"index.html";
    save(state);
  }

  function byteSize(raw){
    if(typeof TextEncoder!=="undefined") return new TextEncoder().encode(raw).length;
    try{return unescape(encodeURIComponent(raw)).length;}catch(error){return raw.length;}
  }

  function parseLegacy(key,raw,parseErrors){
    try{return raw===null?null:JSON.parse(raw);}catch(error){
      parseErrors.push({key:key,message:error&&error.message?error.message:"Invalid JSON."});
      return null;
    }
  }

  function getLegacySnapshot(){
    const sources=[];
    const parseErrors=[];
    LEGACY_KEYS.forEach(function(key){
      const raw=localStorage.getItem(key);
      if(raw===null) return;
      sources.push({key:key,bytes:byteSize(raw),parsed:parseLegacy(key,raw,parseErrors),raw:raw});
    });
    for(let i=0;i<localStorage.length;i+=1){
      const key=localStorage.key(i);
      if(!key||key.indexOf(MATH_NOTE_PREFIX)!==0) continue;
      const raw=localStorage.getItem(key)||"";
      sources.push({key:key,bytes:byteSize(raw),parsed:null,raw:raw});
    }
    sources.sort(function(a,b){return a.key.localeCompare(b.key);});
    return {
      readOnly:true,
      sources:sources,
      parseErrors:parseErrors,
      summary:{
        sourceCount:sources.length,
        sourceKeys:sources.map(function(item){return item.key;}),
        totalBytes:sources.reduce(function(sum,item){return sum+item.bytes;},0),
        parseErrorCount:parseErrors.length,
        safeToPreview:true
      }
    };
  }

  function previewLegacy(){
    const snapshot=getLegacySnapshot();
    const primary=snapshot.sources.find(function(item){return item.key==="spg_rpsgtv2_2026_evolved_v10_5_1";});
    const old=primary&&primary.parsed&&typeof primary.parsed==="object"?primary.parsed:{};
    const stats=old.stats&&typeof old.stats==="object"?old.stats:{};
    return {
      summary:Object.assign({},snapshot.summary,{
        answered:Number(stats.answered||0),
        correct:Number(stats.correct||0),
        missed:Array.isArray(old.missedIds)?old.missedIds.length:0,
        mastered:Array.isArray(old.masteredIds)?old.masteredIds.length:0,
        flagged:Array.isArray(old.flaggedIds)?old.flaggedIds.length:0,
        history:Array.isArray(stats.history)?stats.history.length:0,
        taskAwards:old.trailAwards&&old.trailAwards.tasks?Object.keys(old.trailAwards.tasks).length:0,
        domainAwards:old.trailAwards&&old.trailAwards.domains?Object.keys(old.trailAwards.domains).length:0,
        hasGeneralNotes:Boolean(old.notes&&(old.notes.body||old.notes.title)),
        mathNotes:snapshot.sources.filter(function(item){return item.key.indexOf(MATH_NOTE_PREFIX)===0;}).length
      }),
      sources:snapshot.sources.map(function(item){return {key:item.key,bytes:item.bytes,validJson:item.parsed!==null};}),
      parseErrors:snapshot.parseErrors.slice()
    };
  }

  function blockedDraft(){
    return {
      status:"blocked",
      canImport:false,
      error:"migration-engine-unavailable",
      draft:null,
      state:null,
      summary:{blockingIssueCount:1,warningIssueCount:0,canImport:false},
      issues:{blocking:[{severity:"blocking",blocking:true,code:"engine-unavailable",path:"core/migration-engine.js",message:"Load core/migration-engine.js before building a migration draft."}],warnings:[],notices:[]},
      unresolved:{unknownFields:[],malformedRecords:[],unknownQuestionIds:[],malformedQuestionIds:[],duplicateQuestionIds:[],manualReviewQuestionIds:[],crossListQuestionIds:[],ambiguousTaskRecords:[],historyRecords:[],sourceConflicts:[],unsupportedShapes:[]},
      validation:{valid:false,passesBlockingValidation:false,blockingCount:1,warningCount:0,importFeatureEnabled:false},
      rollback:{protected:true,importEnabled:false,legacyKeysUntouched:true,strategy:["retain-current-v3-state","discard-preview"]}
    };
  }

  function createMigrationDraft(options){
    const engine=window.RPSGTMigrationEngine||window.RPSGTLegacyMigration;
    if(!engine||typeof engine.buildMigrationReport!=="function"&&typeof engine.buildDraft!=="function") return blockedDraft();
    const supplied=options||{};
    const build=typeof engine.buildMigrationReport==="function"?engine.buildMigrationReport:engine.buildDraft;
    return build(supplied.snapshot||getLegacySnapshot(),{
      createDefaultState:defaultState,
      currentState:supplied.currentState||load(),
      questionIndex:supplied.questionIndex||[],
      now:supplied.now
    });
  }

  window.RPSGTStorage={
    NEW_KEY:NEW_KEY,
    SCHEMA_VERSION:SCHEMA_VERSION,
    LEGACY_KEYS:LEGACY_KEYS.slice(),
    MATH_NOTE_PREFIX:MATH_NOTE_PREFIX,
    createDefaultState:defaultState,
    defaultState:defaultState,
    load:load,
    save:save,
    rememberLocation:rememberLocation,
    getLegacySnapshot:getLegacySnapshot,
    previewLegacy:previewLegacy,
    createMigrationDraft:createMigrationDraft,
    buildLegacyMigrationDraft:createMigrationDraft
  };
})();