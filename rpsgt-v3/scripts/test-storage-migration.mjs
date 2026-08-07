import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,"..");
const engineSource=await readFile(join(root,"core","migration-engine.js"),"utf8");
const compatibilitySource=await readFile(join(root,"core","legacy-migration.js"),"utf8");
const storageSource=await readFile(join(root,"core","storage.js"),"utf8");

const PRIMARY="spg_rpsgtv2_2026_evolved_v10_5_1";
const FLASH_CURRENT="spg_rpsgtv2_flash_flags_v1262a";
const FLASH_OLDER="spg_flash_flags_59b";
const MATH_LESSON="spg_mathcoach_lesson_59b";
const MATH_NOTE_PREFIX="spg_math_notes_59b_";
const NOW="2026-08-02T14:00:00.000Z";
const questionIndex={records:[
  {id:"q1",domainCode:"D1",taskCode:"D1A",manualReviewRecommended:false},
  {id:"q2",domainCode:"D2",taskCode:"D2B",manualReviewRecommended:false},
  {id:"q3",domainCode:"D3",taskCode:"D3C",manualReviewRecommended:false},
  {id:"manual-1",domainCode:"D2",taskCode:"D2A/D2C",manualReviewRecommended:true},
  {id:"manual-2",domainCode:"D4",taskCode:"D4A",manualReviewRecommended:true}
]};

function plain(value){return JSON.parse(JSON.stringify(value));}
function json(value){return JSON.stringify(value);}
function basePrimary(){
  return {
    stats:{
      answered:1,
      correct:1,
      byDomain:{D1:{answered:1,correct:1}},
      byTask:{D1A:{answered:1,correct:1}},
      history:[{id:"q1",mode:"practice",correct:true,time:"2026-01-01T00:00:00.000Z"}]
    },
    missedIds:[],masteredIds:[],flaggedIds:["q1"],
    trailAwards:{tasks:{D1A:{score:100}},domains:{}},
    trailStudyMarks:{D1A:true},
    lastTrailPost:{domain:"D1",task:"D1A"},
    trailDomain:"D1",
    trailFocus:{domain:"D1",task:"D1A"},
    trailCheckpointHistory:[{scope:"task",domain:"D1",task:"D1A",score:100,total:5,correct:5}],
    lab:{catalogIndex:1,completed:["hookup"]},
    notes:{title:"Study",body:"Review staging."},
    searches:{learn:"filters"}
  };
}

function harness(entries={}){
  const values=new Map(Object.entries(entries));
  const writes=[];
  const localStorage={
    get length(){return values.size;},
    key(index){return [...values.keys()][index]??null;},
    getItem(key){return values.has(key)?values.get(key):null;},
    setItem(key,value){writes.push({key,value});throw new Error("Migration preview attempted a localStorage write.");},
    removeItem(key){writes.push({key,remove:true});throw new Error("Migration preview attempted a localStorage deletion.");}
  };
  const context={window:{},localStorage,console,Date,TextEncoder,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
  vm.createContext(context);
  vm.runInContext(engineSource,context,{filename:"migration-engine.js"});
  vm.runInContext(compatibilitySource,context,{filename:"legacy-migration.js"});
  vm.runInContext(storageSource,context,{filename:"storage.js"});
  const storage=context.window.RPSGTStorage;
  const engine=context.window.RPSGTMigrationEngine;
  function report(options={}){
    return storage.createMigrationDraft({
      snapshot:options.snapshot||storage.getLegacySnapshot(),
      questionIndex:options.questionIndex===undefined?questionIndex:options.questionIndex,
      currentState:options.currentState===undefined?storage.createDefaultState():options.currentState,
      now:()=>NOW
    });
  }
  return {values,writes,localStorage,context,storage,engine,report};
}

const tests=[];
function test(name,fn){tests.push({name,fn});}
function hasCode(report,code,severity="blocking"){
  return report.issues[severity].some(item=>item.code===code);
}

test("no legacy records",()=>{
  const h=harness();
  const report=h.report();
  assert.equal(report.status,"preview-only");
  assert.equal(report.canImport,false);
  assert.ok(hasCode(report,"no-legacy-sources"));
  assert.equal(report.summary.sourceCount,0);
});

test("valid complete primary record",()=>{
  const h=harness({[PRIMARY]:json(basePrimary())});
  const report=h.report();
  assert.equal(report.validation.passesBlockingValidation,true);
  assert.equal(report.canImport,false,"Import feature must remain disabled even after blocking validation passes.");
  assert.equal(report.draft.progress.answered,1);
  assert.equal(report.draft.progress.correct,1);
  assert.deepEqual(plain(report.draft.review.flaggedIds),["q1"]);
  assert.equal(report.draft.guidedStudy.checkpointHistory.length,1);
  assert.equal(report.draft.labs.catalogIndex,1);
  assert.equal(report.draft.notes.general,"Review staging.");
});

test("malformed primary JSON",()=>{
  const h=harness({[PRIMARY]:"{not valid json"});
  const report=h.report();
  assert.ok(hasCode(report,"invalid-json"));
  assert.equal(report.sourceManifest.find(item=>item.key===PRIMARY).parseStatus,"invalid-json");
});

test("safe numeric strings",()=>{
  const primary=basePrimary();
  primary.stats.answered="4";primary.stats.correct="3";
  primary.stats.byDomain={D1:{answered:"4",correct:"3"}};
  primary.stats.byTask={D1A:{answered:"4",correct:"3"}};
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.equal(report.draft.progress.answered,4);
  assert.equal(report.draft.progress.correct,3);
  assert.ok(report.issues.notices.some(item=>item.code==="numeric-string-normalized"));
});

test("negative and impossible totals",()=>{
  const primary=basePrimary();
  primary.stats.answered=-2;primary.stats.correct=9;
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.ok(hasCode(report,"invalid-number"));
  assert.ok(hasCode(report,"impossible-total"));
  assert.equal(report.draft.progress.answered,0);
  assert.equal(report.draft.progress.correct,0);
});

test("duplicate missed IDs",()=>{
  const primary=basePrimary();primary.missedIds=["q1","q1"];
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.deepEqual(plain(report.draft.review.missedIds),["q1"]);
  assert.equal(report.unresolved.duplicateQuestionIds.length,1);
  assert.ok(hasCode(report,"duplicate-id","warnings"));
});

test("ID in missed and mastered",()=>{
  const primary=basePrimary();primary.missedIds=["q1"];primary.masteredIds=["q1","q2"];
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.ok(hasCode(report,"conflicting-source"));
  assert.deepEqual(plain(report.draft.review.missedIds),["q1"]);
  assert.deepEqual(plain(report.draft.review.masteredIds),["q2"]);
  assert.equal(report.unresolved.crossListQuestionIds[0].manualReviewRequired,true);
});

test("manual-review IDs excluded from remediation",()=>{
  const primary=basePrimary();primary.missedIds=["manual-1"];primary.masteredIds=["manual-2"];
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.deepEqual(plain(report.draft.review.missedIds),[]);
  assert.deepEqual(plain(report.draft.review.masteredIds),[]);
  assert.equal(report.unresolved.manualReviewQuestionIds.length,2);
  assert.ok(hasCode(report,"manual-review-remediation-id"));
});

test("unknown question IDs",()=>{
  const primary=basePrimary();primary.missedIds=["unknown-id"];
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.equal(report.unresolved.unknownQuestionIds.length,1);
  assert.ok(hasCode(report,"invalid-question-id"));
});

test("conflicting flash-flag sources use explicit priority without merging",()=>{
  const primary=basePrimary();primary.flaggedIds=["q1"];
  const h=harness({
    [PRIMARY]:json(primary),
    [FLASH_CURRENT]:json(["q2"]),
    [FLASH_OLDER]:json({q3:true})
  });
  const report=h.report();
  assert.deepEqual(plain(report.draft.review.flaggedIds),["q2"]);
  assert.equal(report.conflictResolution.flashFlags.chosenSource,FLASH_CURRENT);
  assert.equal(report.conflictResolution.flashFlags.conflicts.length,2);
  assert.ok(report.unresolved.sourceConflicts.every(item=>item.manualReviewRequired===true));
});

test("valid and malformed Math Coach notes",()=>{
  const h=harness({
    [PRIMARY]:json(basePrimary()),
    [MATH_NOTE_PREFIX+"rate"]:"Remember the rate formula.",
    [MATH_NOTE_PREFIX]:"orphan note"
  });
  const report=h.report();
  assert.equal(report.draft.notes.math.rate,"Remember the rate formula.");
  assert.ok(hasCode(report,"missing-required-field"));
});

test("Math Coach lesson state",()=>{
  const report=harness({[PRIMARY]:json(basePrimary()),[MATH_LESSON]:json({lesson:3,completed:true})}).report();
  assert.equal(report.draft.notes.mathCoachLesson.lesson,3);
});

test("Guided Trail awards and checkpoints",()=>{
  const report=harness({[PRIMARY]:json(basePrimary())}).report();
  assert.equal(report.draft.guidedStudy.trailAwards.tasks.D1A.score,100);
  assert.equal(report.draft.guidedStudy.checkpointHistory.length,1);
  assert.equal(report.draft.guidedStudy.trailDomain,"D1");
});

test("missing Guided Trail sections",()=>{
  const primary=basePrimary();
  delete primary.trailAwards;delete primary.trailStudyMarks;delete primary.lastTrailPost;delete primary.trailDomain;delete primary.trailFocus;delete primary.trailCheckpointHistory;
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.deepEqual(plain(report.draft.guidedStudy.trailAwards),{tasks:{},domains:{}});
  assert.deepEqual(plain(report.draft.guidedStudy.checkpointHistory),[]);
});

test("Practice, Readiness, and Mock histories remain separate",()=>{
  const primary=basePrimary();
  primary.stats.answered=1;primary.stats.correct=1;
  primary.stats.history=[
    {id:"q1",mode:"practice"},
    {id:"q2",mode:"readiness-check"},
    {id:"q3",mode:"mock-style"}
  ];
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.equal(report.draft.progress.history.length,1);
  assert.equal(report.draft.readiness.history.length,1);
  assert.equal(report.draft.mock.history.length,1);
});

test("source-specific readiness and mock histories",()=>{
  const primary=basePrimary();
  primary.stats.history=[];
  primary.readinessHistory=[{id:"q2",mode:"readiness"}];
  primary.mockHistory=[{id:"q3",mode:"mock"}];
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.equal(report.draft.readiness.history.length,1);
  assert.equal(report.draft.mock.history.length,1);
  assert.equal(report.draft.progress.history.length,0);
});

test("unclassifiable history remains unresolved",()=>{
  const primary=basePrimary();primary.stats.history=[{id:"q1",mode:"mystery"}];
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.equal(report.draft.progress.history.length,0);
  assert.equal(report.unresolved.historyRecords.length,1);
  assert.ok(hasCode(report,"unclassified-history-record"));
});

test("ambiguous D2A/D2C statistics are not reassigned",()=>{
  const primary=basePrimary();primary.stats.byTask["D2A/D2C"]={answered:1,correct:1};
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.equal(report.draft.progress.byTask["D2A/D2C"],undefined);
  assert.equal(report.unresolved.ambiguousTaskRecords.length,1);
  assert.ok(hasCode(report,"ambiguous-task-record"));
});

test("unknown fields are preserved in unresolved report",()=>{
  const primary=basePrimary();primary.futureFeature={enabled:true};primary.stats.futureCount=7;
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.ok(report.unresolved.unknownFields.some(item=>item.path==="futureFeature"));
  assert.ok(report.unresolved.unknownFields.some(item=>item.path==="stats.futureCount"));
});

test("count reconciliation",()=>{
  const primary=basePrimary();primary.stats.answered=5;primary.stats.correct=4;
  const report=harness({[PRIMARY]:json(primary)}).report();
  assert.ok(hasCode(report,"count-reconciliation-mismatch","warnings"));
  assert.deepEqual(plain(report.validation.countReconciliation.reported),{answered:5,correct:4});
});

test("existing non-empty v3 state blocks import eligibility",()=>{
  const h=harness({[PRIMARY]:json(basePrimary())});
  const current=h.storage.createDefaultState();current.progress.answered=2;
  const report=h.report({currentState:current});
  assert.equal(report.validation.existingV3Conflict,true);
  assert.ok(hasCode(report,"existing-v3-data-conflict"));
  assert.equal(report.rollback.backupSnapshot.progress.answered,2);
});

test("duplicate migration fingerprint",()=>{
  const h=harness({[PRIMARY]:json(basePrimary())});
  const first=h.report();
  const current=h.storage.createDefaultState();
  current.migration.sourceFingerprint=first.fingerprint;
  current.migration.importedAt="2026-08-02T13:00:00.000Z";
  const duplicate=h.report({currentState:current});
  assert.equal(duplicate.duplicate.detected,true);
  assert.ok(hasCode(duplicate,"duplicate-migration-fingerprint"));
  assert.equal(duplicate.canImport,false);
});

test("source immutability",()=>{
  const snapshot={sources:[{key:PRIMARY,raw:json(basePrimary()),bytes:100}],parseErrors:[]};
  const before=json(snapshot);
  const h=harness();
  h.report({snapshot});
  assert.equal(json(snapshot),before);
});

test("migration determinism",()=>{
  const h=harness({[PRIMARY]:json(basePrimary()),[MATH_NOTE_PREFIX+"rate"]:"formula"});
  const first=plain(h.report());
  const second=plain(h.report());
  assert.deepEqual(second,first);
  assert.equal(first.fingerprint,second.fingerprint);
});

test("no localStorage writes during preview or draft creation",()=>{
  const h=harness({[PRIMARY]:json(basePrimary())});
  h.storage.getLegacySnapshot();
  h.storage.previewLegacy();
  h.report();
  assert.equal(h.writes.length,0);
});

test("missing migration engine fails closed",()=>{
  const values=new Map([[PRIMARY,json(basePrimary())]]);
  const writes=[];
  const localStorage={get length(){return values.size;},key(index){return [...values.keys()][index]??null;},getItem(key){return values.get(key)??null;},setItem(key,value){writes.push({key,value});}};
  const context={window:{},localStorage,console,Date,TextEncoder,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
  vm.createContext(context);
  vm.runInContext(storageSource,context,{filename:"storage.js"});
  const report=context.window.RPSGTStorage.createMigrationDraft({questionIndex});
  assert.equal(report.status,"blocked");
  assert.equal(report.canImport,false);
  assert.equal(report.issues.blocking[0].code,"engine-unavailable");
  assert.equal(writes.length,0);
});

let passed=0;
for(const {name,fn} of tests){
  try{await fn();passed+=1;console.log("✓",name);}catch(error){console.error("✗",name);throw error;}
}
console.log(`\n${passed} deterministic storage-migration tests passed.`);
