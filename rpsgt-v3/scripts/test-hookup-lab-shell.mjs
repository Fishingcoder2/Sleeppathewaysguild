import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,js,catalog]=await Promise.all([
  readFile(join(root,'lab-hookup.html'),'utf8'),
  readFile(join(root,'core','lab-hookup.js'),'utf8'),
  readFile(join(root,'data','labs','catalog.json'),'utf8').then(JSON.parse)
]);

for(const selector of ['data-hookup-start','data-hookup-summary','data-hookup-stations','data-hookup-workspace']) {
  if(!html.includes(selector)) throw new Error(`Hookup page is missing ${selector}.`);
}
for(const script of ['core/storage.js','core/learner-surface-guard.js','core/hookup-lab-engine.js','core/lab-hookup.js']) {
  if(!html.includes(script)) throw new Error(`Hookup page does not load ${script}.`);
}
if(html.indexOf('core/hookup-lab-engine.js')>html.indexOf('core/lab-hookup.js')) throw new Error('Hookup engine must load before its controller.');

for(const token of ['data/question-bank/d2a.json','data/question-bank/d2b.json','eligibleQuestions','selectQuestions','gradeSession','gradeSkill','applySkillAttempt','applySession','RPSGTStorage.save']) {
  if(!js.includes(token)) throw new Error(`Hookup controller is missing ${token}.`);
}
if(js.includes('setStation')) throw new Error('Hookup must not use self-certifying station checkboxes.');
if(/localStorage\.(?:setItem|removeItem|clear)/.test(js)) throw new Error('Hookup controller must write only through versioned RPSGT storage.');

for(const learnerCopy of ['six original mini skill checks','A station counts only after you choose the correct response','Demonstrate all six skill checks','80% or higher','Related reference materials']) {
  if(!html.toLowerCase().includes(learnerCopy.toLowerCase())) throw new Error(`Hookup learner boundary is missing: ${learnerCopy}`);
}
for(const forbidden of ['development branch','spg_rpsgt_v3.labs','study checklist','mark a station']) {
  if(html.toLowerCase().includes(forbidden)) throw new Error(`Hookup learner surface still exposes obsolete wording: ${forbidden}`);
}

const lab=catalog.labs.find(item=>item.id==='hookup');
if(!lab||lab.status!=='v3-ready'||lab.plannedRoute!=='lab-hookup.html') throw new Error('The internal laboratory catalog does not route the Hookup lab.');

console.log('Hookup page, graded skill evidence, storage isolation, script order, and catalog route contracts passed.');
