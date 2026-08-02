import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,"..");
const migrationSource=await readFile(join(root,"core","legacy-migration.js"),"utf8");
const storageSource=await readFile(join(root,"core","storage.js"),"utf8");
const feedbackIndex=JSON.parse(await readFile(join(root,"data","question-bank","feedback-index.json"),"utf8"));
const learnerRecords=feedbackIndex.records.filter(record=>!record.manualReviewRecommended&&record.taskCode!=="D2A/D2C");
const manualRecord=feedbackIndex.records.find(record=>record.manualReviewRecommended||record.taskCode==="D2A/D2C");
assert.ok(learnerRecords.length>=2,"The feedback index must contain at least two learner-eligible records.");
assert.ok(manualRecord,"The feedback index must contain a quality-review record.");
const learnerOne=learnerRecords[0].id;
const learnerTwo=learnerRecords[1].id;
const manualId=manualRecord.id;
const unknownId="__legacy_unknown_question__";

const legacyPrimary={
  stats:{
    answered:4,
    correct:3,
    byDomain:{D1:{answered:2,correct:1}},
    byTask:{D1A:{answered:2,correct:1}},
    history:[
      {id:learnerOne,mode:"practice",correct:true,time:"2026-01-01T00:00:00.000Z"},
      {id:learnerTwo,mode:"readiness",correct:false,time:"2026-01-02T00:00:00.000Z"},
      {id:learnerOne,mode:"mock",correct:true,time:"2026-01-03T00:00:00.000Z"},
      {id:learnerTwo,mode:"unresolved-legacy-mode",correct:false,time:"2026-01-04T00:00:00.000Z"}
    ]
  },
  missedIds:[learnerOne,learnerOne,manualId,unknownId],
  masteredIds:[learnerTwo],
  flaggedIds:[learnerOne],
  trailAwards:{tasks:{D1A:{score:80}},domains:{}},
  trailStudyMarks:{D1A:true},
  lastTrailPost:{domain:"D1",task:"D1A"},
  trailDomain:"D1",
  trailFocus:{domain:"D1",task:"D1A"},
  trailCheckpointHistory:[{scope:"task",domain:"D1",task:"D1A",score:80,total:5,correct:4}],
  lab:{kind:"overview",index:2},
  notes:{title:"My RPSGT Study Notes",body:"Review staging."},
  searches:{learn:"filters",glossary:"arousal",refs:"AASM"}
};
const values=new Map([
  ["spg_rpsgtv2_2026_evolved_v10_5_1",JSON.stringify(legacyPrimary)],
  ["spg_rpsgtv2_flash_flags_v1262a",JSON.stringify({[learnerTwo]:true,[manualId]:true})],
  ["spg_flash_flags_59b","{malformed legacy json"],
  ["spg_mathcoach_lesson_59b",JSON.stringify({lesson:3,completed:true})],
  ["spg_math_notes_59b_rate","Remember the rate formula."]
]);
const writes=[];
const localStorage={
  get length(){return values.size;},
  key(index){return [...values.keys()][index]??null;},
  getItem(key){return values.has(key)?values.get(key):null;},
  setItem(key,value){writes.push({key,value});throw new Error("Migration preview attempted a storage write.");}
};
const context={window:{},localStorage,console,Date,TextEncoder,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);
vm.runInContext(migrationSource,context,{filename:"legacy-migration.js"});
vm.runInContext(storageSource,context,{filename:"storage.js"});
const storage=context.window.RPSGTStorage;
const snapshot=storage.getLegacySnapshot();
const snapshotBefore=JSON.stringify(snapshot);
const currentState=storage.createDefaultState();
const draft=storage.createMigrationDraft({
  snapshot,
  questionIndex:feedbackIndex,
  currentState,
  now:()=>"2026-08-02T10:00:00.000Z"
});

assert.equal(writes.length,0,"Reading and drafting migration data must not write localStorage.");
assert.equal(JSON.stringify(snapshot),snapshotBefore,"Migration drafting must not mutate the legacy snapshot.");
assert.equal(draft.status,"preview-only");
assert.equal(draft.canImport,false,"User-facing import must remain disabled.");
assert.equal(draft.state.migration.importEnabled,false);
assert.equal(draft.state.migration.rollbackProtected,true);
assert.equal(draft.rollback.protected,true);
assert.equal(draft.rollback.strategy,"retain-current-v3-state-and-discard-preview");
assert.equal(draft.state.progress.answered,4);
assert.equal(draft.state.progress.correct,3);
assert.equal(draft.state.progress.history.length,1,"Practice history must stay separate.");
assert.equal(draft.state.readiness.history.length,1,"Readiness-like history must stay separate.");
assert.equal(draft.state.mock.history.length,1,"Mock-style history must stay separate.");
assert.equal(draft.validation.unresolvedHistoryRecords.length,1,"Ambiguous history must not be guessed into a report family.");
assert.deepEqual(Array.from(draft.state.review.missedIds),[learnerOne]);
assert.deepEqual(Array.from(draft.state.review.masteredIds),[learnerTwo]);
assert.deepEqual(Array.from(draft.state.review.flaggedIds),[learnerOne,learnerTwo,manualId]);
assert.ok(draft.validation.duplicateQuestionIds.some(item=>String(item.id)===String(learnerOne)));
assert.ok(draft.validation.unresolvedQuestionIds.some(item=>String(item.id)===unknownId));
assert.ok(draft.validation.rejectedManualReviewQuestionIds.some(item=>String(item.id)===String(manualId)),"Quality-review IDs must be excluded from remediation.");
assert.equal(draft.source.parseErrors.length,1,"Malformed legacy JSON must be reported.");
assert.equal(draft.state.guidedStudy.checkpointHistory.length,1);
assert.equal(draft.state.notes.general,"Review staging.");
assert.equal(draft.state.notes.searches.learn,"filters");
assert.equal(draft.state.notes.math.rate,"Remember the rate formula.");
assert.equal(draft.state.notes.mathCoachLesson.lesson,3);
assert.equal(draft.state.labs.index,2);
assert.ok(draft.sourceFingerprint.startsWith("fnv1a32:"));

const duplicate=storage.createMigrationDraft({
  snapshot,
  questionIndex:feedbackIndex,
  currentState:{migration:{sourceFingerprint:draft.sourceFingerprint,importedAt:"2026-08-02T09:00:00.000Z"}},
  now:()=>"2026-08-02T10:00:00.000Z"
});
assert.equal(duplicate.duplicate.detected,true,"An already-recorded source fingerprint must be detected.");
assert.equal(duplicate.canImport,false);
assert.equal(writes.length,0);

const blockedContext={window:{},localStorage,console,Date,TextEncoder,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(blockedContext);
vm.runInContext(storageSource,blockedContext,{filename:"storage.js"});
const blocked=blockedContext.window.RPSGTStorage.createMigrationDraft({questionIndex:feedbackIndex});
assert.equal(blocked.status,"blocked");
assert.equal(blocked.canImport,false,"Missing migration code must fail closed.");
assert.equal(writes.length,0);

console.log("✓ Legacy storage is read without modification");
console.log("✓ Migration drafts are in-memory, immutable, and non-importable");
console.log("✓ Practice, Readiness, Mock, Guided Trail, labs, notes, searches, and Math Coach mappings are separated");
console.log("✓ Question IDs, duplicates, manual-review exclusions, malformed data, duplicate migration, and rollback safeguards are validated");
