import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const html=await readFile(join(root,"practice.html"),"utf8");
const js=await readFile(join(root,"core","practice.js"),"utf8");

const requiredAttributes=[
  "data-practice-load","data-practice-setup","data-practice-mode","data-practice-domain",
  "data-practice-task","data-practice-size","data-mode-notice","data-start-practice",
  "data-practice-shell","data-question-panel","data-question-number","data-question-task",
  "data-question-review","data-question-difficulty","data-question-prompt","data-question-choices",
  "data-answer-feedback","data-submit-answer","data-next-question","data-session-answered",
  "data-session-correct","data-session-accuracy","data-session-pool","data-active-mode",
  "data-progress-policy","data-session-complete","data-complete-score","data-complete-percent",
  "data-complete-policy","data-bank-total","data-learner-total","data-quality-total","data-module-total"
];
for(const attribute of requiredAttributes){
  if(!html.includes(attribute)) throw new Error(`practice.html is missing ${attribute}`);
}
if(!html.includes('value="learner"')||!html.includes('value="quality"')) throw new Error("Practice mode options are incomplete");
if(!js.includes('data/question-bank/manifest.json')) throw new Error("Practice engine does not load the full-bank manifest");
if(js.includes('data/practice-slice/')) throw new Error("Practice engine still references the 36-question slice");
if(!js.includes('state.mode!=="learner"')) throw new Error("Quality-review progress guard is missing");
if(!js.includes('manualReviewRecommended')) throw new Error("Manual-review filtering is missing");

console.log(JSON.stringify({requiredSelectors:requiredAttributes.length,fullBank:true,qualityProgressGuard:true},null,2));
