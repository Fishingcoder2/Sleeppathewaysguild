import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"mock.html"),"utf8");
const controller=fs.readFileSync(path.join(root,"core/mock.js"),"utf8");
const storage=fs.readFileSync(path.join(root,"core/storage.js"),"utf8");
const mockCss=fs.readFileSync(path.join(root,"assets/mock.css"),"utf8");
const required=["data-mock-home","data-mock-shell","data-mock-results","data-start-mock","data-resume-mock","data-discard-mock","data-question-prompt","data-question-choices","data-prev-question","data-next-question","data-flag-question","data-submit-mock","data-mock-palette","data-mock-history","data-mock-domain-results","data-mock-weak-results"];
for(const selector of required){if(!html.includes(selector)) throw new Error(`mock.html is missing ${selector}`);}
for(const script of ["core/storage.js","core/app-shell.js","core/mock-engine.js","core/mock.js"]){if(!html.includes(`src=\"${script}\"`)) throw new Error(`mock.html is missing ${script}`);}
if(!html.includes('name="robots" content="noindex,nofollow"')) throw new Error("Mock page must remain noindex during development.");
if(!storage.includes('mock:{history:[],activeSession:null}')) throw new Error("Storage is missing the separate mock record.");
for(const forbidden of ["root.progress","root.review","root.readiness"]){if(controller.includes(forbidden)) throw new Error(`Mock controller must not write through ${forbidden}.`);}
if(!controller.includes("root.mock.history")||!controller.includes("root.mock.activeSession")) throw new Error("Mock controller is not using the separate mock record.");
for(const selector of ["data-mock-review","data-review-back","data-review-unanswered-first","data-review-flagged-first","data-review-submit"]){
  if(!html.includes(selector))throw new Error('Mock final review action missing: '+selector);
}
for(const section of ["data-mock-home","data-mock-shell","data-mock-review","data-mock-results","data-resume-card"]){
  if(!mockCss.includes('['+section+'].hidden'))throw new Error('Mock section must be fully hidden when inactive: '+section);
}
if(!controller.includes("function openReview()")||!controller.includes("function reviewToQuestion")||!controller.includes("focusPanel")||
   !controller.includes("addEventListener(\"click\",submitMock)")){
  throw new Error("Mock final submission controls and focus restoration are incomplete.");
}
if(/submitMock\(true\)/.test(controller))throw new Error("A missing question must never silently submit and grade a Mock.");

console.log("Mock shell and storage-separation contract passed.");
