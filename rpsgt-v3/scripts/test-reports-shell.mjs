import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,"..");
const html=await readFile(join(root,"reports.html"),"utf8");const js=await readFile(join(root,"core","reports.js"),"utf8");const trailJs=await readFile(join(root,"core","guided-trail-report.js"),"utf8");
const selectors=["data-reports-load","data-reports-content","data-coach-plan","data-task-report","data-guided-trail-report","data-readiness-report","data-mock-report","data-source-outlines","data-migration-preview"];
for(const selector of selectors) if(!html.includes(selector)) throw new Error(`Reports page is missing ${selector}.`);
for(const script of ["core/study-feedback-engine.js","core/reports-engine.js","core/guided-trail-engine.js","core/reports.js","core/guided-trail-report.js"]) if(!html.includes(script)) throw new Error(`Reports page does not load ${script}.`);
if(/RPSGTStorage\.save|localStorage\.(?:setItem|removeItem|clear)/.test(js+trailJs)) throw new Error("Reports controllers must remain read only.");
if(/<span class="status">Planned<\/span>/.test(html)) throw new Error("Old placeholder report cards remain in the active Reports page.");
if(!html.includes("official rule")||!html.includes("copyrighted prose")) throw new Error("Reference and copyright boundaries are not visible to learners.");
if(!html.includes("checkpoint history")||!trailJs.includes("engine.summary")) throw new Error("Guided Study checkpoint reporting parity is incomplete.");
for(const label of ["Task badges","Domain medals","Clinical Guide","Study Signal Scout","Scoring Pathfinder","Therapy Trail Guide"]){
  if(!trailJs.includes(label)) throw new Error(`Guild achievement reporting is missing ${label}.`);
}
if(!html.includes("Reference Center mapping")||!html.includes("Open Reference Center")||!html.includes("sources-disclosures.html")) throw new Error("Reports page is not connected to the professional Reference Center.");
if(/Study source shelf|represented in the Sleep Pathways Guild library/i.test(html)) throw new Error("Learner-facing source shelf language has returned to Reports.");
if(!html.includes("do not expose private Drive files, storefronts, source-library internals")) throw new Error("Reports must state its private-library and storefront boundary.");
if(!trailJs.includes("Sleep Pathways Guild educational achievements")) throw new Error("Guild achievement boundary is not explicit in Reports.");
console.log("Reports selector, Guild achievement, Reference Center, Guided Study parity, and read-only contracts passed.");
