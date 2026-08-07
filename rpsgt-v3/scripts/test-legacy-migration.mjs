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
const feedbackIndex=JSON.parse(await readFile(join(root,"data","question-bank","feedback-index.json"),"utf8"));
const learner=feedbackIndex.records.find(record=>!record.manualReviewRecommended&&record.taskCode!=="D2A/D2C");
assert.ok(learner,"The generated compact feedback index must include a learner-practice record.");

const primary={
  stats:{answered:1,correct:1,byDomain:{[learner.domain]:{answered:1,correct:1}},byTask:{[learner.taskCode]:{answered:1,correct:1}},history:[{id:learner.id,mode:"practice",correct:true}]},
  missedIds:[],masteredIds:[],flaggedIds:[learner.id]
};
const values=new Map([["spg_rpsgtv2_2026_evolved_v10_5_1",JSON.stringify(primary)]]);
const writes=[];
const localStorage={
  get length(){return values.size;},
  key(index){return [...values.keys()][index]??null;},
  getItem(key){return values.get(key)??null;},
  setItem(key,value){writes.push({key,value});throw new Error("Preview attempted a write.");}
};
const context={window:{},localStorage,console,Date,TextEncoder,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);
vm.runInContext(engineSource,context,{filename:"migration-engine.js"});
vm.runInContext(compatibilitySource,context,{filename:"legacy-migration.js"});
vm.runInContext(storageSource,context,{filename:"storage.js"});

assert.equal(context.window.RPSGTLegacyMigration,context.window.RPSGTMigrationEngine,"The legacy global must remain a compatibility alias.");
const report=context.window.RPSGTStorage.createMigrationDraft({
  questionIndex:feedbackIndex,
  currentState:context.window.RPSGTStorage.createDefaultState(),
  now:()=>"2026-08-02T14:00:00.000Z"
});
assert.equal(report.status,"preview-only");
assert.equal(report.validation.passesBlockingValidation,true);
assert.equal(report.canImport,false);
assert.equal(report.draft.progress.history.length,1);
assert.deepEqual(Array.from(report.draft.review.flaggedIds),[learner.id]);
assert.equal(report.sourceManifest.find(item=>item.key==="spg_rpsgtv2_2026_evolved_v10_5_1").parseStatus,"parsed");
assert.equal(report.rollback.legacyKeysUntouched,true);
assert.equal(writes.length,0);

console.log("✓ Legacy migration compatibility alias uses the pure migration engine");
console.log("✓ Generated feedback-index IDs validate without browser-storage writes");
