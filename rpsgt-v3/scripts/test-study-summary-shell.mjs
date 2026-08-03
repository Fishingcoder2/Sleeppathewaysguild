import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const [html,controller,engine,css,reports]=await Promise.all([
  readFile(join(root,'study-summary.html'),'utf8'),
  readFile(join(root,'core','study-summary.js'),'utf8'),
  readFile(join(root,'core','study-summary-engine.js'),'utf8'),
  readFile(join(root,'assets','study-summary.css'),'utf8'),
  readFile(join(root,'reports.html'),'utf8')
]);
const selectors=['data-summary-include-name','data-summary-print','data-summary-json','data-summary-csv','data-summary-load','data-summary-content','data-summary-generated','data-summary-name','data-summary-snapshot','data-summary-plan','data-summary-tasks','data-summary-diagnostics','data-summary-trail','data-summary-labs','data-summary-privacy'];
for(const selector of selectors)if(!html.includes(selector))throw new Error(`study-summary.html is missing ${selector}.`);
for(const script of ['core/storage.js','core/study-summary-engine.js','core/study-summary.js'])if(!html.includes(`src="${script}"`))throw new Error(`Study summary page is missing ${script}.`);
const order=['core/storage.js','core/study-summary-engine.js','core/study-summary.js'].map(script=>html.indexOf(script));if(!(order[0]<order[1]&&order[1]<order[2]))throw new Error('Study summary script order is incorrect.');
if(html.includes('core/app-shell.js'))throw new Error('Study summary page must not load app-shell because export must remain strictly read only.');
if(!html.includes('name="robots" content="noindex,nofollow"'))throw new Error('Study summary page must remain noindex during development.');
if(/data-summary-include-name[^>]*checked/.test(html))throw new Error('Learner-name inclusion must default off.');
for(const phrase of ['not an official BRPT examination score','question text','answer text','rationales','notes','searches','private links','raw browser storage'])if(!html.toLowerCase().includes(phrase.toLowerCase()))throw new Error(`Study summary privacy or disclaimer text is missing: ${phrase}`);
if(/RPSGTStorage\.save|rememberLocation|localStorage\.(?:setItem|removeItem|clear)/.test(controller))throw new Error('Study summary controller must remain read only.');
if(!controller.includes('window.print()')||!controller.includes('JSON.stringify(state.summary')||!controller.includes('engine.toCsv(state.summary)')||!controller.includes('new Blob'))throw new Error('Print, JSON, or CSV export controls are incomplete.');
if(!engine.includes("containsQuestionText:false")||!engine.includes("containsNotes:false")||!engine.includes("containsRawBrowserState:false"))throw new Error('Study summary engine privacy contract is incomplete.');
if(!css.includes('@media print')||!css.includes('@page')||!css.includes('.no-print')||!css.includes('break-before:page'))throw new Error('Print stylesheet contract is incomplete.');
if(!reports.includes('href="study-summary.html"')||!reports.includes('Printable and exportable study summary'))throw new Error('Reports Center is not linked to the study summary page.');
console.log('Printable study summary page, privacy boundary, learner-name default, read-only controller, JSON/CSV downloads, print CSS, script order, and Reports route contracts passed.');
