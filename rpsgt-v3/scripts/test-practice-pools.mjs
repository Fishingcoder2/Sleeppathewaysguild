import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const bankDir=resolve(process.argv[2]||join(root,"data","question-bank"));
const require=createRequire(import.meta.url);
const eligibility=require(join(root,"core","guided-trail-engine.js"));
const manifest=JSON.parse(await readFile(join(bankDir,"manifest.json"),"utf8"));
const records=[];
for(const moduleMeta of manifest.modules){
  const packageData=JSON.parse(await readFile(join(bankDir,moduleMeta.path),"utf8"));
  if(!Array.isArray(packageData.questions)) throw new Error(`${moduleMeta.path} has no questions array`);
  records.push(...packageData.questions);
}
const manual=records.filter(question=>Boolean(question?.qa?.manualReviewRecommended));
const learnerReady=records.filter(question=>eligibility.eligibleQuestion(question,question.taskCode));
const cross=records.filter(question=>question.taskCode==="D2A/D2C");
const ids=records.map(question=>`${typeof question.id}:${JSON.stringify(question.id)}`);

const expectedTotal=Number(manifest.meta.questionCount);
const expectedManual=Number(manifest.integritySummary.manualReviewRecommendedCount);
if(records.length!==expectedTotal) throw new Error(`Expected ${expectedTotal} records, found ${records.length}`);
if(new Set(ids).size!==records.length) throw new Error("Practice pools contain duplicate exact IDs");
if(manual.length!==expectedManual) throw new Error(`Expected ${expectedManual} manual-review records, found ${manual.length}`);
if(cross.length!==5) throw new Error(`Expected 5 cross-task records, found ${cross.length}`);
if(cross.some(question=>!question?.qa?.manualReviewRecommended)) throw new Error("A D2A/D2C cross-task record lost its internal-review status");
if(learnerReady.some(question=>question?.qa?.manualReviewRecommended)) throw new Error("Learner Practice contains a manual-review record");
if(learnerReady.some(question=>question.taskCode==="D2A/D2C")) throw new Error("Learner Practice contains a cross-task review record");
if(learnerReady.some(question=>!eligibility.completePrompt(question.prompt))) throw new Error("Learner Practice contains an incomplete prompt");
if(learnerReady.some(question=>!Array.isArray(question.options)||question.options.length<2||question.options.some(option=>!String(option==null?'':option).trim()))) throw new Error("Learner Practice contains invalid choices");
if(learnerReady.some(question=>!question.options.includes(question.answer))) throw new Error("Learner Practice contains an answer outside its choices");

const valid={id:"valid",taskCode:"D1A",prompt:"Which signal is used for this complete learner question?",options:["One","Two"],answer:"One"};
const syntheticCases=[
  [{...valid,prompt:"This prompt trails off..."},"ellipsis-ending prompt"],
  [{...valid,prompt:"Incomplete question"},"placeholder prompt"],
  [{...valid,qa:{manualReviewRecommended:true}},"manual-review record"],
  [{...valid,taskCode:"D2A/D2C",qa:{manualReviewRecommended:true}},"cross-task review record"],
  [{...valid,options:["One",""]},"blank choice"],
  [{...valid,answer:"Three"},"answer outside choices"]
];
if(!eligibility.eligibleQuestion(valid,"D1A")) throw new Error("A complete synthetic learner question was rejected");
for(const [record,label] of syntheticCases){
  if(eligibility.eligibleQuestion(record,record.taskCode)) throw new Error(`Eligibility helper accepted ${label}`);
}

console.log(JSON.stringify({
  total:records.length,
  learnerReady:learnerReady.length,
  preservedInternalReview:manual.length,
  crossTask:cross.length,
  excludedFromLearner:records.length-learnerReady.length,
  uniqueIds:new Set(ids).size
},null,2));
