import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const require=createRequire(import.meta.url);
const engine=require(join(root,"core","readiness-engine.js"));
const manifest=JSON.parse(await readFile(join(root,"data","question-bank","manifest.json"),"utf8"));
const blueprint=JSON.parse(await readFile(join(root,"data","blueprint.json"),"utf8"));
const questions=[];
for(const meta of manifest.modules){
  if(!engine.DIRECT_TASKS.includes(meta.taskCode)) continue;
  const moduleData=JSON.parse(await readFile(join(root,"data","question-bank",meta.path),"utf8"));
  questions.push(...moduleData.questions);
}
const learner=questions.filter(engine.isEligible);
assert.equal(learner.length,2327,"learner readiness pool must contain 2,327 records");
assert.ok(learner.every(question=>!question.qa?.manualReviewRecommended),"manual-review records must be excluded");
assert.ok(learner.every(question=>question.taskCode!=="D2A/D2C"),"cross-task records must be excluded");

const expected={
  25:{D1:5,D2:7,D3:6,D4:7},
  50:{D1:10,D2:14,D3:12,D4:14},
  100:{D1:20,D2:28,D3:25,D4:27}
};
let seed=123456789;
const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
for(const size of [25,50,100]){
  const counts=engine.allocateCounts(size,blueprint.domains);
  assert.deepEqual(counts,expected[size],`${size}-question domain allocation changed`);
  const session=engine.buildSession(learner,size,blueprint.domains,rng);
  assert.equal(session.questions.length,size,`${size}-question session length`);
  assert.equal(new Set(session.questions.map(question=>String(question.id))).size,size,"question IDs must be unique");
  assert.equal(new Set(session.questions.map(engine.normalizeFamily)).size,size,"question families must be unique");
  assert.ok(session.questions.every(engine.isEligible),"every readiness question must be learner eligible");
  const actualCounts=Object.fromEntries(blueprint.domains.map(domain=>[domain.id,session.questions.filter(question=>question.domain===domain.id).length]));
  assert.deepEqual(actualCounts,expected[size],`${size}-question session must preserve domain allocation`);
  assert.ok(engine.DIRECT_TASKS.every(code=>session.questions.some(question=>question.taskCode===code)),`${size}-question session should cover every direct task`);
  const answers=Object.fromEntries(session.questions.map((question,index)=>[String(question.id),index%2===0?question.answer:"__incorrect__"]));
  const summary=engine.summarize(session.questions,answers);
  assert.equal(summary.total,size,"summary total");
  assert.equal(summary.answered,size,"summary answered");
  assert.ok(summary.percent>=0&&summary.percent<=100,"raw percent range");
  assert.ok(summary.weightedPercent>=0&&summary.weightedPercent<=100,"weighted percent range");
  assert.ok(summary.weakestTasks.length>0&&summary.weakestTasks.length<=5,"weak-task recommendations");
}
console.log("Readiness pool and weighted-session checks passed.");
