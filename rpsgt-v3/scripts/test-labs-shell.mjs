import {readFile} from 'node:fs/promises';import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');const [html,js,catalogText,engineSource]=await Promise.all([readFile(join(root,'labs.html'),'utf8'),readFile(join(root,'core','labs.js'),'utf8'),readFile(join(root,'data','labs','catalog.json'),'utf8'),readFile(join(root,'core','lab-catalog-engine.js'),'utf8')]);
for(const selector of ['data-lab-summary','data-lab-last','data-lab-catalog','data-lab-boundary'])if(!html.includes(selector))throw new Error(`Laboratory page is missing ${selector}.`);
for(const script of ['core/learner-surface-guard.js','core/lab-catalog-engine.js','core/labs.js'])if(!html.includes(script))throw new Error(`Laboratory page does not load ${script}.`);
if(html.indexOf('core/lab-catalog-engine.js')>html.indexOf('core/labs.js'))throw new Error('Laboratory catalog engine must load before the controller.');
if(/RPSGTStorage\.save|localStorage\.(?:setItem|removeItem|clear)/.test(js))throw new Error('Laboratory catalog controller must remain read only.');
if(!js.includes("data/labs/catalog.json")||!js.includes('validateCatalog')||!js.includes('engine.summarize'))throw new Error('Laboratory controller is not driven by the canonical catalog engine.');
const catalog=JSON.parse(catalogText);if(!Array.isArray(catalog.labs)||catalog.labs.length!==13)throw new Error('Skills Lab catalog must retain all thirteen current lab families.');
for(const label of ['Hookup','EKG','Visual','Artifact','Scoring','Respiratory','Instrumentation','PAP','Troubleshooting','Pediatric','MSLT','Mentoring','Math'])if(!catalogText.toLowerCase().includes(label.toLowerCase()))throw new Error(`Skills Lab catalog is missing ${label}.`);
for(const learnerMarker of ['Applied Learning · Skills Labs','Lab learning boundary','Skills Lab record','educational practice','No prior lab activity yet.'])if(!html.includes(learnerMarker))throw new Error(`Skills Labs learner presentation is missing ${learnerMarker}.`);
for(const displayLabel of ['Completed','In progress','Interactive labs','Review + checkpoint','Interactive lab · expanding','Last activity','Not started'])if(!js.includes(displayLabel))throw new Error(`Skills Lab catalog is missing learner-facing status language: ${displayLabel}.`);
for(const internalTerm of ['stable identifiers','versioned progress keys','native laboratory parity','validated completion contracts','browser regression','Mapped complete','Mapped progress','No mapped completion yet','Last mapped position','No prior laboratory position is mapped','task mappings','source map','source key']){
  const exposed=`${html}\n${js}`.toLowerCase();if(exposed.includes(internalTerm.toLowerCase()))throw new Error(`Skills Labs exposes engineering terminology: ${internalTerm}.`);
}
if(!engineSource.includes('CONTENT_STATUSES')||!engineSource.includes('reviewShells')||!engineSource.includes('interactiveLabs'))throw new Error('Lab catalog engine must distinguish route readiness from learner-content completeness.');
const expectedContentStatuses={'interactive-rich':10,'interactive-foundation':1,'assessment-tool':1,'interactive-tool':1};
for(const [status,count] of Object.entries(expectedContentStatuses))if(catalog.labs.filter(lab=>lab.contentStatus===status).length!==count)throw new Error(`Skills Lab catalog must retain ${count} ${status} lab${count===1?'':'s'}.`);
if(catalog.labs.some(lab=>lab.contentStatus==='review-shell'))throw new Error('No current Skills Lab should remain a review-only shell.');
console.log('Skills Lab catalog passed thirteen-lab coverage, current content-status distribution, learner-safe progress language, script order, read-only behavior, and engineering-language exclusion.');
