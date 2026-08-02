import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const bankDir=resolve(process.argv[2]||join(here,"..","data","question-bank"));
const manifest=JSON.parse(await readFile(join(bankDir,"manifest.json"),"utf8"));
const records=[];
for(const moduleMeta of manifest.modules){
  const packageData=JSON.parse(await readFile(join(bankDir,moduleMeta.path),"utf8"));
  if(!Array.isArray(packageData.questions)) throw new Error(`${moduleMeta.path} has no questions array`);
  records.push(...packageData.questions);
}
const manual=records.filter(question=>Boolean(question?.qa?.manualReviewRecommended));
const learner=records.filter(question=>!question?.qa?.manualReviewRecommended);
const cross=records.filter(question=>question.taskCode==="D2A/D2C");
const ids=records.map(question=>`${typeof question.id}:${JSON.stringify(question.id)}`);

const expectedTotal=Number(manifest.meta.questionCount);
const expectedManual=Number(manifest.integritySummary.manualReviewRecommendedCount);
if(records.length!==expectedTotal) throw new Error(`Expected ${expectedTotal} records, found ${records.length}`);
if(new Set(ids).size!==records.length) throw new Error("Practice pools contain duplicate exact IDs");
if(manual.length!==expectedManual) throw new Error(`Expected ${expectedManual} manual-review records, found ${manual.length}`);
if(learner.length+manual.length!==records.length) throw new Error("Learner and quality pools do not partition the bank");
if(learner.some(question=>question?.qa?.manualReviewRecommended)) throw new Error("Learner pool contains a manual-review record");
if(manual.some(question=>!question?.qa?.manualReviewRecommended)) throw new Error("Quality pool contains a non-manual record");
if(cross.length!==5) throw new Error(`Expected 5 cross-task records, found ${cross.length}`);
if(cross.some(question=>!question?.qa?.manualReviewRecommended)) throw new Error("A D2A/D2C cross-task record entered the learner pool");

console.log(JSON.stringify({
  total:records.length,
  learner:learner.length,
  qualityReview:manual.length,
  crossTask:cross.length,
  uniqueIds:new Set(ids).size
},null,2));
