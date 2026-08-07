import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const require=createRequire(import.meta.url);
const engine=require(path.join(root,"core/mock-engine.js"));
const manifest=JSON.parse(fs.readFileSync(path.join(root,"data/question-bank/manifest.json"),"utf8"));
const questions=[];
for(const meta of manifest.modules){
  if(meta.taskCode==="D2A/D2C") continue;
  const data=JSON.parse(fs.readFileSync(path.join(root,"data/question-bank",meta.path),"utf8"));
  questions.push(...(data.questions||[]));
}
let seed=20260801;
const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const session=engine.buildSession(questions,rng);
const items=session.items;
const scored=items.filter(item=>item.role==="scored");
const pretest=items.filter(item=>item.role==="pretest");
if(items.length!==175) throw new Error(`Expected 175 items; got ${items.length}`);
if(scored.length!==150) throw new Error(`Expected 150 scored items; got ${scored.length}`);
if(pretest.length!==25) throw new Error(`Expected 25 pretest items; got ${pretest.length}`);
if(new Set(items.map(item=>String(item.id))).size!==175) throw new Error("Mock contains duplicate IDs.");
const families=items.map(item=>engine.normalizeFamily(session.questionsById[String(item.id)]));
if(new Set(families).size!==175) throw new Error("Mock contains repeated question families.");
if(items.some(item=>!engine.baseEligible(session.questionsById[String(item.id)]))) throw new Error("Mock contains an ineligible record.");
const domainCounts={};
for(const item of scored){
  const question=session.questionsById[String(item.id)];
  domainCounts[question.domain]=(domainCounts[question.domain]||0)+1;
}
for(const [domain,expected] of Object.entries(engine.SCORED_DOMAIN_COUNTS)){
  if(domainCounts[domain]!==expected) throw new Error(`${domain} expected ${expected}; got ${domainCounts[domain]||0}`);
}
const taskCoverage=new Set(scored.map(item=>session.questionsById[String(item.id)].taskCode));
for(const taskCode of engine.DIRECT_TASKS){if(!taskCoverage.has(taskCode)) throw new Error(`Scored set is missing ${taskCode}.`);}
const answers={};
for(const item of items) answers[String(item.id)]=session.questionsById[String(item.id)].answer;
const summary=engine.summarize(items,session.questionsById,answers);
if(summary.scoredPercent!==100||summary.weightedPercent!==100||summary.answeredTotal!==175) throw new Error("Perfect-answer summary failed.");
if(summary.scoredCount!==150||summary.pretestCount!==25) throw new Error("Summary role counts failed.");
console.log(JSON.stringify({eligiblePool:session.eligibleCount,total:items.length,scored:scored.length,pretest:pretest.length,domainCounts,taskCoverage:[...taskCoverage].sort()},null,2));
