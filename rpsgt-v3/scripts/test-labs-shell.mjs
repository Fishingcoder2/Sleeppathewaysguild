import {readFile} from 'node:fs/promises';import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');const [html,js]=await Promise.all([readFile(join(root,'labs.html'),'utf8'),readFile(join(root,'core','labs.js'),'utf8')]);
for(const selector of ['data-lab-summary','data-lab-last','data-lab-catalog','data-lab-boundary']) if(!html.includes(selector)) throw new Error(`Laboratory page is missing ${selector}.`);
for(const script of ['core/lab-catalog-engine.js','core/labs.js']) if(!html.includes(script)) throw new Error(`Laboratory page does not load ${script}.`);
if(html.indexOf('core/lab-catalog-engine.js')>html.indexOf('core/labs.js')) throw new Error('Laboratory catalog engine must load before the controller.');
if(/RPSGTStorage\.save|localStorage\.(?:setItem|removeItem|clear)/.test(js)) throw new Error('Laboratory catalog controller must remain read only.');
if(!js.includes("data/labs/catalog.json")||!js.includes('validateCatalog')||!js.includes('engine.summarize')) throw new Error('Laboratory controller is not driven by the canonical catalog engine.');
if(!html.includes('Hookup, Scoring, Respiratory, Instrumentation, PAP, Integrated Troubleshooting, and Math Coach are v3-ready')||!html.includes('visibly disabled')) throw new Error('Individual laboratory and remaining parity boundaries are not visible to learners.');
console.log('Laboratory catalog page selector, script-order, ready-lab, and read-only contracts passed.');
