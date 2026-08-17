import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [baseSource,contextSource,multiSource,pack,stagePack]=await Promise.all([
  readFile(join(root,'core','scoring-lab-engine.js'),'utf8'),
  readFile(join(root,'core','scoring-context-engine.js'),'utf8'),
  readFile(join(root,'core','scoring-multi-epoch-engine.js'),'utf8'),
  readFile(join(root,'data','scoring','multi-epoch-runs.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','visual','prototype-sleep-staging.json'),'utf8').then(JSON.parse)
]);
const context={globalThis:{},Date,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
context.globalThis.globalThis=context.globalThis;
vm.createContext(context);
vm.runInContext(baseSource,context,{filename:'scoring-lab-engine.js'});
vm.runInContext(contextSource,context,{filename:'scoring-context-engine.js'});
vm.runInContext(multiSource,context,{filename:'scoring-multi-epoch-engine.js'});
const engine=context.globalThis.RPSGTScoringLabEngine;
assert.ok(engine);
assert.equal(engine.VERSION,'1.4.0');
assert.equal(engine.MULTI_EPOCH_RUN_COUNT,4);
assert.equal(engine.MULTI_EPOCH_EPOCHS_PER_RUN,3);
assert.equal(engine.MULTI_EPOCH_DECISION_COUNT,12);
assert.equal(engine.MULTI_EPOCH_PASS_PERCENT,80);
const validation=engine.validateMultiEpochPack(pack);
assert.equal(validation.valid,true,validation.errors.join(' '));
assert.equal(validation.runCount,4);
assert.equal(validation.decisionCount,12);
for(const stage of ['W','N1','N2','N3','R'])assert.ok(validation.stages.includes(stage),`Missing stage ${stage}.`);
const studies=new Map((stagePack.studies||[]).map(study=>[String(study.id),study]));
for(const run of pack.runs){
  assert.equal(run.epochs.length,3);
  for(const epoch of run.epochs){
    const study=studies.get(String(epoch.studyId));
    assert.ok(study,`Missing referenced study ${epoch.studyId}.`);
    assert.equal(study.stage,epoch.answer,`Study ${epoch.studyId} must match ${epoch.answer}.`);
  }
}
const perfectAnswers={};
for(const run of pack.runs)run.epochs.forEach((epoch,index)=>{perfectAnswers[`${run.id}::${index}`]=epoch.answer;});
const perfect=engine.gradeMultiEpochSkill({runs:pack.runs,answers:perfectAnswers,completedAt:'2026-08-17T22:00:00.000Z'});
assert.equal(perfect.correct,12);
assert.equal(perfect.percent,100);
assert.equal(perfect.passed,true);
const nineAnswers={...perfectAnswers};
for(const [index,run] of pack.runs.entries())for(let epochIndex=0;epochIndex<run.epochs.length;epochIndex+=1)if(index*3+epochIndex>=9)nineAnswers[`${run.id}::${epochIndex}`]='__wrong__';
const nine=engine.gradeMultiEpochSkill({runs:pack.runs,answers:nineAnswers,completedAt:'2026-08-17T22:01:00.000Z'});
assert.equal(nine.correct,9);
assert.equal(nine.percent,75);
assert.equal(nine.passed,false);
const tenAnswers={...perfectAnswers};
const decisions=pack.runs.flatMap(run=>run.epochs.map((epoch,index)=>`${run.id}::${index}`));
tenAnswers[decisions[10]]='__wrong__';
tenAnswers[decisions[11]]='__wrong__';
const ten=engine.gradeMultiEpochSkill({runs:pack.runs,answers:tenAnswers,completedAt:'2026-08-17T22:02:00.000Z'});
assert.equal(ten.correct,10);
assert.equal(ten.percent,83);
assert.equal(ten.passed,true);
let labs={completed:[],scoring:{status:'in-progress',startedAt:'2026-08-17T21:50:00.000Z'}};
labs=engine.applyMultiEpochSkill(labs,ten);
let summary=engine.summary(labs);
assert.equal(summary.multiEpochSkillPassed,true);
assert.equal(summary.multiEpochSkillBestPercent,83);
assert.equal(summary.multiEpochSkillAttempts,1);
assert.equal(summary.completed,false,'Phase 3 short-run practice must not change the current Scoring completion gate yet.');
const failed=engine.gradeMultiEpochSkill({runs:pack.runs,answers:{},completedAt:'2026-08-17T22:03:00.000Z'});
labs=engine.applyMultiEpochSkill(labs,failed);
summary=engine.summary(labs);
assert.equal(summary.multiEpochSkillPassed,true,'A failed retry must not erase a previously earned Phase 3 pass.');
assert.equal(summary.multiEpochSkillBestPercent,83);
assert.equal(summary.multiEpochSkillAttempts,2);
labs=engine.start(labs,'2026-08-17T22:04:00.000Z');
summary=engine.summary(labs);
assert.equal(summary.multiEpochSkillPassed,true,'Base Scoring writes must preserve Phase 3 history.');
assert.equal(summary.multiEpochSkillAttempts,2);
const historical=engine.summary({completed:['scoring'],scoring:{completed:true,status:'completed'}});
assert.equal(historical.completed,true,'Existing Scoring completion remains preserved.');
assert.equal(historical.multiEpochSkillAttempts,0);
console.log('Scoring Phase 3 consecutive-epoch skill passed: four three-epoch runs, twelve first decisions, 80% pass threshold, durable retry-safe history, current completion gate unchanged, and all referenced schematic stages validated.');
