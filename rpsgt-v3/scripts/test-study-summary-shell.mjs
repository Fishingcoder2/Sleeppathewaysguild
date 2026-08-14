import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const [html,controller,engine,insights,css,resourceCss,reportingCss,reports]=await Promise.all([
  readFile(join(root,'study-summary.html'),'utf8'),
  readFile(join(root,'core','study-summary.js'),'utf8'),
  readFile(join(root,'core','study-summary-engine.js'),'utf8'),
  readFile(join(root,'core','report-insights-engine.js'),'utf8'),
  readFile(join(root,'assets','study-summary.css'),'utf8'),
  readFile(join(root,'assets','study-summary-resources.css'),'utf8'),
  readFile(join(root,'assets','study-summary-reporting.css'),'utf8'),
  readFile(join(root,'reports.html'),'utf8')
]);
const selectors=['data-summary-report-type','data-summary-include-name','data-summary-print','data-summary-json','data-summary-csv','data-summary-load','data-summary-content','data-summary-generated','data-summary-report-label','data-summary-activity','data-summary-name','data-summary-snapshot','data-summary-domain-evidence','data-summary-practice-trend','data-summary-plan','data-summary-tasks','data-summary-readiness-latest','data-summary-readiness-history','data-summary-mock-latest','data-summary-mock-history','data-summary-trail','data-summary-labs','data-summary-privacy'];
for(const selector of selectors)if(!html.includes(selector))throw new Error(`study-summary.html is missing ${selector}.`);
for(const script of ['core/storage.js','core/report-insights-engine.js','core/study-summary-engine.js','core/study-summary.js'])if(!html.includes(`src="${script}"`))throw new Error(`Study summary page is missing ${script}.`);
const order=['core/storage.js','core/report-insights-engine.js','core/study-summary-engine.js','core/study-summary.js'].map(script=>html.indexOf(script));if(!(order[0]<order[1]&&order[1]<order[2]&&order[2]<order[3]))throw new Error('Study summary script order is incorrect.');
if(!html.includes('assets/study-summary-resources.css')||!html.includes('assets/study-summary-reporting.css'))throw new Error('Printable report stylesheets are incomplete.');
if(html.includes('core/app-shell.js'))throw new Error('Study summary page must not load app-shell because export must remain strictly read only.');
if(!html.includes('name="robots" content="noindex,nofollow"'))throw new Error('Study summary page must remain noindex during development.');
if(/data-summary-include-name[^>]*checked/.test(html))throw new Error('Learner-name inclusion must default off.');
for(const phrase of ['not an official BRPT examination score','question text','answer text','rationales','notes','searches','private links','raw browser storage','related study resources','not averaged together'])if(!html.toLowerCase().includes(phrase.toLowerCase()))throw new Error(`Study summary privacy, disclaimer, or recommendation text is missing: ${phrase}`);
if(/\bmapped\b/i.test(html))throw new Error('Study summary still exposes internal mapping terminology to learners.');
if(/RPSGTStorage\.save|rememberLocation|localStorage\.(?:setItem|removeItem|clear)/.test(controller+insights))throw new Error('Study summary and report insights must remain read only.');
if(!controller.includes('window.print()')||!controller.includes('JSON.stringify({...state.summary')||!controller.includes('engine.toCsv(state.summary)')||!controller.includes('new Blob'))throw new Error('Print, JSON, or CSV export controls are incomplete.');
if(!controller.includes('loadStudySources')||!controller.includes('Related study resources')||!controller.includes('sourceApa'))throw new Error('Printable summary is not loading or rendering APA-style related study resources.');
if(/Mapped study resources|route is mapped|verified task\/topic crosswalk/i.test(controller))throw new Error('Study summary controller still exposes internal mapping terminology.');
if(!engine.includes("containsQuestionText:false")||!engine.includes("containsNotes:false")||!engine.includes("containsRawBrowserState:false"))throw new Error('Study summary engine privacy contract is incomplete.');
if(!engine.includes('interactionTopics')||!engine.includes('resourceRoute'))throw new Error('Interaction-based recommendation engine is missing.');
if(!css.includes('@media print')||!css.includes('@page')||!css.includes('.no-print')||!resourceCss.includes('@media print')||!resourceCss.includes('.summary-resource-group')||!reportingCss.includes('@media print')||!reportingCss.includes('.summary-domain-table')||!reportingCss.includes('.summary-followup-grid'))throw new Error('Professional print stylesheet contract is incomplete.');
for(const profile of ['full','practice','readiness','mock','guided']){
  if(!html.includes(`value="${profile}"`))throw new Error(`Study summary is missing the ${profile} report profile option.`);
  if(!controller.includes(`${profile}:`))throw new Error(`Study summary controller is missing the ${profile} report profile.`);
}
if(!controller.includes("document.body.dataset.reportProfile")||!controller.includes("[data-report-section]"))throw new Error('Focused report profile section filtering is not wired.');
if(!controller.includes('renderDomainEvidence')||!controller.includes('renderPracticeTrend')||!controller.includes('renderReadiness')||!controller.includes('renderMock'))throw new Error('Printable evidence sections are incomplete.');
if(!reports.includes('study-summary.html?report=full')||!reports.includes('Professional print and export reports'))throw new Error('Reports Center is not linked to focused print reports.');
console.log('Printable report profiles, privacy boundary, separate domain evidence, recent Practice trend, diagnostic histories, APA-style source rendering, handwritten follow-up area, learner-name default, read-only controller, JSON/CSV downloads, print CSS, script order, and Reports routes passed.');
