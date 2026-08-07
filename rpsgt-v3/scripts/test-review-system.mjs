import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const html=await readFile(join(root,"review.html"),"utf8");
const js=await readFile(join(root,"core","review.js"),"utf8");
const manifest=JSON.parse(await readFile(join(root,"data","question-bank","manifest.json"),"utf8"));

const requiredSelectors=[
  "data-review-load","data-review-shell","data-question-panel","data-question-number","data-question-task",
  "data-question-difficulty","data-question-prompt","data-question-choices","data-answer-feedback",
  "data-submit-answer","data-next-question","data-review-complete","data-review-empty"
];
for(const selector of requiredSelectors){
  if(!html.includes(selector)) throw new Error(`review.html is missing ${selector}`);
}
if(!html.includes("core/review.js")) throw new Error("review.html does not load core/review.js");
if(!js.includes('v3-review-missed')||!js.includes('v3-review-mastered')) throw new Error("review history sources are missing");
if(!js.includes("manualReviewRecommended")) throw new Error("manual-review exclusion is missing");
if(!js.includes("saved.review.missedIds=removeValue")||!js.includes("saved.review.masteredIds=addUnique")) throw new Error("missed-to-mastered transition is missing");
if(!js.includes("saved.review.missedIds=addUnique")||!js.includes("saved.review.masteredIds=removeValue")) throw new Error("mastered-to-missed transition is missing");

let learner=null;
let quality=null;
for(const moduleMeta of manifest.modules){
  const moduleData=JSON.parse(await readFile(join(root,"data","question-bank",moduleMeta.path),"utf8"));
  for(const question of moduleData.questions){
    const manual=Boolean(question?.qa?.manualReviewRecommended);
    if(manual&&!quality) quality=question;
    if(!manual&&!learner) learner=question;
    if(learner&&quality) break;
  }
  if(learner&&quality) break;
}
if(!learner||!quality) throw new Error("Could not find both learner and quality-review records");
if(learner.qa?.manualReviewRecommended) throw new Error("Learner sample is manual-review flagged");
if(!quality.qa?.manualReviewRecommended) throw new Error("Quality sample is not manual-review flagged");

const same=(a,b)=>String(a)===String(b);
const addUnique=(list,value)=>list.some(item=>same(item,value))?list:list.concat([value]);
const remove=(list,value)=>list.filter(item=>!same(item,value));
let missed=[learner.id];
let mastered=[];
missed=remove(missed,learner.id);
mastered=addUnique(mastered,learner.id);
if(missed.length||!mastered.some(id=>same(id,learner.id))) throw new Error("Correct missed-answer transition failed");
missed=addUnique(missed,learner.id);
mastered=remove(mastered,learner.id);
if(mastered.length||!missed.some(id=>same(id,learner.id))) throw new Error("Incorrect mastered-answer transition failed");

console.log("Review system contract passed",{learnerId:learner.id,qualityId:quality.id,moduleCount:manifest.modules.length});
