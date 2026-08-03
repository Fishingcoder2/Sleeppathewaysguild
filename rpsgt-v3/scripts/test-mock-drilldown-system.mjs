import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);const here=dirname(fileURLToPath(import.meta.url));const root=join(here,"..");
const engine=require(join(root,"core","mock-drilldown-engine.js"));
const questions={
  q1:{id:"q1",domain:"D1",taskCode:"D1A",task:"Clinical overview",topic:"History",prompt:"Secret prompt one",options:["A1","B1"],answer:"A1",rationale:"Reason one"},
  q2:{id:"q2",domain:"D1",taskCode:"D1A",task:"Clinical overview",topic:"Safety",prompt:"Secret prompt two",options:["A2","B2"],answer:"B2",rationale:"Reason two"},
  q3:{id:"q3",domain:"D2",taskCode:"D2B",task:"Signal review",topic:"Artifact",prompt:"Secret prompt three",options:["A3","B3"],answer:"B3",rationale:"Reason three"}
};
const items=[{id:"q1",role:"scored"},{id:"q2",role:"scored"},{id:"q3",role:"pretest"}];
const answers={q1:"A1",q2:"A2"};const flags=["q2","q3"];
const before=JSON.stringify({questions,items,answers,flags});
const compact=engine.compactItemResults(items,questions,answers,flags);
assert.equal(compact.length,3);assert.equal(compact[0].selectedIndex,0);assert.equal(compact[0].correct,true);assert.equal(compact[1].correct,false);assert.equal(compact[2].answered,false);assert.equal(compact[2].role,"pretest");assert.equal(compact[2].flagged,true);
const serialized=JSON.stringify(compact);for(const forbidden of ["Secret prompt","A1","B2","Reason"])assert.equal(serialized.includes(forbidden),false,"Compact history must not duplicate question or answer text.");
assert.equal(JSON.stringify({questions,items,answers,flags}),before,"Drill-down compaction must not mutate source records.");
const attempt={resultVersion:2,sessionId:"mock-new",scoredCorrect:1,scoredPercent:50,weightedPercent:52,answeredTotal:2,unansweredCount:1,itemResults:compact,byDomain:{D1:{correct:1,total:2,percent:50}}};
assert.equal(engine.detailLevel(attempt),"question-review");assert.equal(engine.filterItems(attempt,"missed").length,1);assert.equal(engine.filterItems(attempt,"unanswered").length,1);assert.equal(engine.filterItems(attempt,"flagged").length,2);assert.equal(engine.filterItems(attempt,"all").length,3);
const tasks=engine.taskRows(attempt,Object.values(questions));const d1a=tasks.find(row=>row.taskCode==="D1A");const d2b=tasks.find(row=>row.taskCode==="D2B");assert.ok(d1a);assert.equal(d1a.scoredTotal,2);assert.equal(d1a.correct,1);assert.equal(d1a.missed,1);assert.equal(d1a.percent,50);assert.ok(d2b);assert.equal(d2b.pretestTotal,1);assert.equal(d2b.flagged,1);
const review=engine.questionRows(attempt,Object.values(questions),"missed");assert.equal(review.length,1);assert.equal(review[0].prompt,"Secret prompt two");assert.equal(review[0].selectedAnswer,"A2");assert.equal(review[0].correctAnswer,"B2");assert.equal(review[0].rationale,"Reason two");
const old={sessionId:"mock-old",scoredPercent:60,weakestTasks:[{taskCode:"D3A",total:10,correct:6,missed:4,percent:60}]};assert.equal(engine.detailLevel(old),"aggregate-only");assert.equal(engine.taskRows(old,[]).length,0);assert.equal(engine.findAttempt([old,attempt],"mock-old"),old);assert.equal(engine.findAttempt([old,attempt],"missing"),attempt);
console.log("Mock drill-down engine passed compact no-text storage, task aggregation, filter, reconstruction, source immutability, and aggregate-only fallback contracts.");
