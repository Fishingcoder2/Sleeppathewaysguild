import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const bankDir=resolve(process.argv[2]||join(here,"..","data","question-bank"));
const manifest=JSON.parse(await readFile(join(bankDir,"manifest.json"),"utf8"));
const sha256=value=>createHash("sha256").update(value).digest("hex");
const records=[];
for(const meta of manifest.modules||[]){
  const module=JSON.parse(await readFile(join(bankDir,meta.path),"utf8"));
  for(const question of module.questions||[]){
    records.push({
      id:question.id,
      domain:question.domain,
      taskCode:question.taskCode,
      topic:question.topic||"",
      manualReviewRecommended:Boolean(question.qa&&question.qa.manualReviewRecommended)
    });
  }
}
records.sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
const exactIds=records.map(record=>`${typeof record.id}:${JSON.stringify(record.id)}`);
if(records.length!==manifest.meta.questionCount) throw new Error(`Feedback index count ${records.length} does not match manifest count ${manifest.meta.questionCount}.`);
if(new Set(exactIds).size!==records.length) throw new Error("Feedback index contains duplicate exact IDs.");
const learnerCount=records.filter(record=>!record.manualReviewRecommended&&record.taskCode!=="D2A/D2C").length;
const qualityCount=records.length-learnerCount;
const taskCounts={};const topicCounts={};
for(const record of records){taskCounts[record.taskCode]=(taskCounts[record.taskCode]||0)+1;if(record.topic) topicCounts[record.topic]=(topicCounts[record.topic]||0)+1;}
const payload={
  meta:{
    name:"RPSGT v3 compact learner-feedback index",
    version:2,
    sourceManifestSha256:sha256(JSON.stringify(manifest)),
    questionCount:records.length,
    learnerEligibleCount:learnerCount,
    qualityReviewCount:qualityCount,
    recordsContainQuestionText:false,
    recordFields:["id","domain","taskCode","topic","manualReviewRecommended"],
    developmentOnly:true
  },
  taskCounts,
  topicCounts,
  records
};
await writeFile(join(bankDir,"feedback-index.json"),JSON.stringify(payload),"utf8");
console.log(`Generated compact feedback index with ${records.length} records (${learnerCount} learner eligible, ${qualityCount} quality review).`);
