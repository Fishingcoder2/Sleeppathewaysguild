import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [engineSource,supplementSource,html,css]=await Promise.all([
  readFile(join(root,'core','hookup-lab-engine.js'),'utf8'),
  readFile(join(root,'core','hookup-aasm-supplement.js'),'utf8'),
  readFile(join(root,'lab-hookup.html'),'utf8'),
  readFile(join(root,'assets','hookup-aasm.css'),'utf8')
]);
const context={globalThis:{},Date,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
context.window=context.globalThis;
vm.createContext(context);
vm.runInContext(engineSource,context,{filename:'hookup-lab-engine.js'});
vm.runInContext(supplementSource,context,{filename:'hookup-aasm-supplement.js'});
const engine=context.globalThis.RPSGTHookupLabEngine;
const supplement=context.globalThis.RPSGTHookupAasmSupplement;
assert.ok(engine&&supplement,'AASM/10-20 supplement failed to attach to the Hookup engine.');
assert.equal(supplement.version,'1.0.0');
assert.equal(supplement.appAuthored,true);
assert.equal(supplement.questionCount,20);
assert.equal(supplement.checkpointTarget,6);
assert.equal(supplement.questions.filter(q=>q.taskCode==='D2A').length,12);
assert.equal(supplement.questions.filter(q=>q.taskCode==='D2B').length,8);
for(const question of supplement.questions){
  assert.ok(question.id&&question.topic&&question.prompt&&question.rationale,`${question.id||'question'} is incomplete.`);
  assert.ok(Array.isArray(question.options)&&question.options.length===4&&question.options.includes(question.answer),`${question.id} has an invalid answer contract.`);
  assert.equal(question.qa.manualReviewRecommended,false,`${question.id} must remain explicitly app-authored and reviewed for this lab.`);
  assert.match(question.source,/Sleep Pathways Guild app-authored/);
}
const requiredTopics=['International 10-20','F4-M1','C4-M1','O2-M1','E1-M2','E2-M2','Chin EMG','anterior tibialis','5 kΩ','Oronasal thermal','Nasal pressure'];
for(const token of requiredTopics)assert.ok(supplementSource.includes(token),`AASM/10-20 supplement is missing ${token}.`);
const legacy=[
  {id:'legacy-a1',taskCode:'D2A',topic:'electrode preparation',prompt:'Legacy electrode preparation A?',options:['A','B','C','D'],answer:'A'},
  {id:'legacy-a2',taskCode:'D2A',topic:'montage review',prompt:'Legacy montage review A?',options:['A','B','C','D'],answer:'A'},
  {id:'legacy-b1',taskCode:'D2B',topic:'impedance troubleshooting',prompt:'Legacy impedance troubleshooting B?',options:['A','B','C','D'],answer:'A'},
  {id:'legacy-b2',taskCode:'D2B',topic:'sensor placement',prompt:'Legacy sensor placement B?',options:['A','B','C','D'],answer:'A'}
];
const selected=engine.selectQuestions(legacy,10,'aasm-1020-regression');
assert.equal(selected.length,10,'Hookup checkpoint must remain ten questions.');
assert.equal(selected.filter(q=>q.taskCode==='D2A').length,5,'Hookup checkpoint must retain five D2A questions.');
assert.equal(selected.filter(q=>q.taskCode==='D2B').length,5,'Hookup checkpoint must retain five D2B questions.');
assert.equal(selected.filter(q=>String(q.id).startsWith('v3-hookup-aasm-')).length,6,'Hookup checkpoint should target six AASM/10-20 supplement questions.');
assert.equal(new Set(selected.map(q=>q.id)).size,10,'Hookup checkpoint must not duplicate questions.');
for(const token of ['International 10–20 + AASM correlation','Adult PSG head-hookup reference','F4-M1 · C4-M1 · O2-M1','E1-M2 · E2-M2','Three-electrode submental setup','assets/hookup-aasm.css','core/hookup-aasm-supplement.js','Original educational schematic.'])assert.ok(html.includes(token),`Hookup page is missing ${token}.`);
assert.ok(html.indexOf('core/hookup-aasm-supplement.js')<html.indexOf('core/hookup-guided-lab.js'),'AASM/10-20 supplement must load before the guided Hookup controller.');
for(const token of ['.hookup-aasm-grid','.hookup-1020-visual','.site.recommended','.site.backup','@media(max-width:620px)'])assert.ok(css.includes(token),`Hookup AASM visual CSS is missing ${token}.`);
console.log('Hookup AASM/10-20 regression passed: original scalp visual, 20-question supplement, six-of-ten targeted checkpoint depth, D2A/D2B balance, AASM recommended montage correlation, and mobile styling are present.');
