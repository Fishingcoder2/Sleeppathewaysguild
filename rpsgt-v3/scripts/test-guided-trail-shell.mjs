import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');
const [studyHtml,studyJs,reportsHtml,reportJs]=await Promise.all([
  readFile(join(root,'study.html'),'utf8'),readFile(join(root,'core','study.js'),'utf8'),readFile(join(root,'reports.html'),'utf8'),readFile(join(root,'core','guided-trail-report.js'),'utf8')
]);
for(const selector of ['data-guided-trail-dashboard','data-checkpoint-overlay','data-checkpoint-workspace','data-blueprint-map']) if(!studyHtml.includes(selector)) throw new Error(`Guided Study page is missing ${selector}.`);
for(const script of ['core/guided-trail-engine.js','core/study.js']) if(!studyHtml.includes(script)) throw new Error(`Guided Study page does not load ${script}.`);
if(studyHtml.indexOf('core/guided-trail-engine.js')>studyHtml.indexOf('core/study.js')) throw new Error('Guided Trail engine must load before the controller.');
for(const token of ['data-trail-mark','data-checkpoint-start','data-checkpoint-next','data-checkpoint-score','data-coach-toggle','coachBobNote','gradeCheckpoint','applyCheckpoint']) if(!studyJs.includes(token)) throw new Error(`Guided Study controller is missing ${token}.`);
if(!reportsHtml.includes('data-guided-trail-report')||!reportsHtml.includes('core/guided-trail-report.js')) throw new Error('Reports page is missing Guided Trail parity wiring.');
if(/RPSGTStorage\.save|localStorage\.(?:setItem|removeItem|clear)/.test(reportJs)) throw new Error('Guided Trail report controller must remain read only.');
if(!reportJs.includes('engine.summary')) throw new Error('Guided Trail report must derive its display from the pure engine.');
console.log('Guided Trail study and report shell contracts passed.');
