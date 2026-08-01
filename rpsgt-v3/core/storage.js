(function(){
  "use strict";
  const NEW_KEY="spg_rpsgt_v3";
  const SCHEMA_VERSION=1;
  const LEGACY_KEYS=[
    "spg_rpsgtv2_2026_evolved_v10_5_1",
    "spg_rpsgtv2_flash_flags_v1262a",
    "spg_flash_flags_59b",
    "spg_mathcoach_lesson_59b"
  ];
  const MATH_NOTE_PREFIX="spg_math_notes_59b_";

  function defaultState(){
    return {
      schemaVersion:SCHEMA_VERSION,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      lastLocation:"index.html",
      learner:{displayName:"",settings:{}},
      progress:{answered:0,correct:0,byDomain:{},byTask:{},history:[]},
      review:{missedIds:[],masteredIds:[],flaggedIds:[]},
      guidedStudy:{trailAwards:{tasks:{},domains:{}},trailStudyMarks:{},lastTrailPost:null},
      mock:{history:[],activeSession:null},
      labs:{},
      notes:{general:"",math:{}},
      migration:{status:"not-started",sourceKeys:[],previewedAt:null,importedAt:null}
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

  function safeJson(raw){
    try{return raw?JSON.parse(raw):null;}catch(error){return null;}
  }

  function listMathNotes(){
    const notes={};
    for(let i=0;i<localStorage.length;i+=1){
      const key=localStorage.key(i);
      if(key&&key.indexOf(MATH_NOTE_PREFIX)===0) notes[key.slice(MATH_NOTE_PREFIX.length)]=localStorage.getItem(key)||"";
    }
    return notes;
  }

  function previewLegacy(){
    const found=[];
    LEGACY_KEYS.forEach(function(key){
      const raw=localStorage.getItem(key);
      if(raw!==null) found.push({key:key,bytes:new Blob([raw]).size,parsed:safeJson(raw),raw:raw});
    });
    const mathNotes=listMathNotes();
    Object.keys(mathNotes).forEach(function(name){
      const raw=mathNotes[name];
      found.push({key:MATH_NOTE_PREFIX+name,bytes:new Blob([raw]).size,parsed:null,raw:raw});
    });

    const primary=found.find(function(item){return item.key==="spg_rpsgtv2_2026_evolved_v10_5_1";});
    const old=primary&&primary.parsed&&typeof primary.parsed==="object"?primary.parsed:{};
    const stats=old.stats&&typeof old.stats==="object"?old.stats:{};
    const summary={
      sourceCount:found.length,
      sourceKeys:found.map(function(item){return item.key;}),
      totalBytes:found.reduce(function(sum,item){return sum+item.bytes;},0),
      answered:Number(stats.answered||0),
      correct:Number(stats.correct||0),
      missed:Array.isArray(old.missedIds)?old.missedIds.length:0,
      mastered:Array.isArray(old.masteredIds)?old.masteredIds.length:0,
      flagged:Array.isArray(old.flaggedIds)?old.flaggedIds.length:0,
      history:Array.isArray(stats.history)?stats.history.length:0,
      taskAwards:old.trailAwards&&old.trailAwards.tasks?Object.keys(old.trailAwards.tasks).length:0,
      domainAwards:old.trailAwards&&old.trailAwards.domains?Object.keys(old.trailAwards.domains).length:0,
      hasGeneralNotes:Boolean(old.notes&&(old.notes.body||old.notes.title)),
      mathNotes:Object.keys(mathNotes).length,
      safeToPreview:true
    };
    return {summary:summary,sources:found.map(function(item){return {key:item.key,bytes:item.bytes,validJson:item.parsed!==null};})};
  }

  function createMigrationDraft(){
    const preview=previewLegacy();
    const primaryRaw=localStorage.getItem("spg_rpsgtv2_2026_evolved_v10_5_1");
    const old=safeJson(primaryRaw)||{};
    const draft=defaultState();
    draft.progress=merge(draft.progress,old.stats||{});
    draft.review.missedIds=Array.isArray(old.missedIds)?old.missedIds.slice():[];
    draft.review.masteredIds=Array.isArray(old.masteredIds)?old.masteredIds.slice():[];
    draft.review.flaggedIds=Array.isArray(old.flaggedIds)?old.flaggedIds.slice():[];
    draft.guidedStudy.trailAwards=merge(draft.guidedStudy.trailAwards,old.trailAwards||{});
    draft.guidedStudy.trailStudyMarks=old.trailStudyMarks||{};
    draft.guidedStudy.lastTrailPost=old.lastTrailPost||null;
    draft.notes.general=old.notes&&old.notes.body?old.notes.body:"";
    draft.notes.math=listMathNotes();
    draft.migration.status="preview-only";
    draft.migration.sourceKeys=preview.summary.sourceKeys;
    draft.migration.previewedAt=new Date().toISOString();
    return draft;
  }

  window.RPSGTStorage={NEW_KEY:NEW_KEY,SCHEMA_VERSION:SCHEMA_VERSION,load:load,save:save,rememberLocation:rememberLocation,previewLegacy:previewLegacy,createMigrationDraft:createMigrationDraft};
})();
