import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const [insights,reportsAction,summaryAction,engine,css]=await Promise.all([
  readFile(join(root,'core','report-insights-engine.js'),'utf8'),
  readFile(join(root,'core','report-action-plan.js'),'utf8'),
  readFile(join(root,'core','study-summary-action-plan.js'),'utf8'),
  readFile(join(root,'core','improvement-plan-engine.js'),'utf8'),
  readFile(join(root,'assets','improvement-plan.css'),'utf8')
]);
if(!insights.includes("src='core/report-action-plan.js'")||!insights.includes("src='core/study-summary-action-plan.js'"))throw new Error('Report insight loader does not attach the actionable report companions.');
for(const phrase of ['plain-language note from Coach Bob','Your improvement roadmap','Study materials to use','Practice inside the webapp'])if(!reportsAction.includes(phrase))throw new Error('Reports Center actionable recommendation UI is missing: '+phrase);
for(const phrase of ['plain-language letter','Coach Bob’s note about your progress','Domains, tasks, materials, and webapp practice to use next','Study materials','Webapp practice'])if(!summaryAction.includes(phrase))throw new Error('Printable actionable recommendation UI is missing: '+phrase);
for(const phrase of ['Guided Study: ','Focused Practice: ','Review missed questions','Recheck after remediation','Math Coach','Memory Games','Flashcard Center','practice.html?task='])if(!engine.includes(phrase))throw new Error('Improvement engine is missing an in-app remediation route: '+phrase);
if(/RPSGTStorage\.save|localStorage\.(?:setItem|removeItem|clear)/.test(reportsAction+summaryAction+engine))throw new Error('Actionable reports must remain read only.');
if(!reportsAction.includes('apaCitation')||!summaryAction.includes('apaCitation'))throw new Error('Actionable study materials must prefer APA citation metadata.');
if(/mapped reference|mapped source/i.test(reportsAction+summaryAction))throw new Error('Internal mapped-reference wording leaked into actionable learner reports.');
if(!css.includes('@media print')||!css.includes('.coach-letter-panel')||!css.includes('.improvement-priority'))throw new Error('Coach Bob letter and improvement roadmap print styling is incomplete.');
console.log('Actionable Reports Center and printable report shell passed Coach Bob letter, domain/task focus, APA study materials, in-app practice routing, read-only, learner-language, and print contracts.');
