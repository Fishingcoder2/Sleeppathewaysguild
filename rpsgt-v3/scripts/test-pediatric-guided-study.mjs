import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [controller,packSource,engineSource,html,css]=await Promise.all([
  readFile(join(root,'core','lab-pediatric.js'),'utf8'),
  readFile(join(root,'data','pediatric','guided-stations.json'),'utf8'),
  readFile(join(root,'core','pediatric-lab-engine.js'),'utf8'),
  readFile(join(root,'lab-pediatric.html'),'utf8'),
  readFile(join(root,'assets','pediatric-guided.css'),'utf8')
]);

const context={globalThis:{},Date,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);
vm.runInContext(engineSource,context,{filename:'pediatric-lab-engine.js'});
const engine=context.globalThis.RPSGTPediatricLabEngine;
const pack=JSON.parse(packSource);
const expected=engine.STATIONS.map(item=>item.id);

assert.equal(pack.version,'1.0.0');
assert.equal(pack.stations.length,7);
assert.equal(JSON.stringify(pack.stations.map(item=>item.id)),JSON.stringify(expected),'Guided Pediatric station IDs/order must remain aligned with the durable engine checklist keys.');
for(const station of pack.stations){
  assert.ok(station.title&&station.study&&station.apply&&station.recap&&station.visual,`${station.id} is missing guided station content.`);
  assert.ok(station.study.intro&&Array.isArray(station.study.points)&&station.study.points.length>=4,`${station.id} Study content is too thin.`);
  assert.ok(station.visual.kind&&station.visual.label,`${station.id} visual specification is incomplete.`);
  assert.ok(station.apply.prompt&&Array.isArray(station.apply.options)&&station.apply.options.length===4&&station.apply.options.includes(station.apply.answer)&&station.apply.hint&&station.apply.rationale,`${station.id} Apply content is invalid.`);
  assert.ok(station.recap.reviewed&&station.recap.canDo,`${station.id} Recap content is incomplete.`);
}
assert.match(pack.reference,/Robertson, B\., Marshall, B\., & Carno, M\.-A\. \(2014\)/,'Pediatric learner reference must remain APA-style and source-grounded.');
assert.equal(/\b\d+(?:\.\d+)?\s*(?:mm\s*Hg|seconds?|secs?|%)/i.test(packSource),false,'Guided Pediatric stations must not hard-code numerical scoring or gas-exchange thresholds.');

const development=pack.stations.find(item=>item.id==='development-context');
assert.ok(development.apply.answer.includes('developmental and safety needs')&&development.study.points.some(point=>point.includes('ordered study')),'Development station must start from the child plus the ordered study.');
const caregiver=pack.stations.find(item=>item.id==='caregiver-preparation');
assert.ok(caregiver.apply.answer.includes('age-appropriate explanation')&&caregiver.study.points.some(point=>point.includes('caregiver')),'Caregiver station must preserve developmentally appropriate preparation and partnership.');
const staging=pack.stations.find(item=>item.id==='developmental-staging');
assert.ok(staging.apply.answer.includes('current age-appropriate scoring guidance')&&staging.study.points.some(point=>point.includes('complete epoch')),'Staging station must resist adult-template shortcuts and use developmental context.');
const respiratory=pack.stations.find(item=>item.id==='respiratory-gas-exchange');
assert.ok(respiratory.study.points.some(point=>point.includes('oxygen saturation and carbon dioxide'))&&respiratory.apply.answer.includes('airflow, effort, oxygen, carbon dioxide'),'Respiratory station must integrate pediatric gas-exchange signals rather than use one channel alone.');
const safety=pack.stations.find(item=>item.id==='safety-observation');
assert.ok(safety.apply.answer.startsWith('Assess the child')&&safety.recap.canDo.includes('Prioritize the child'),'Safety station must remain patient-first.');
const documentation=pack.stations.find(item=>item.id==='documentation-handoff');
assert.ok(documentation.study.points.some(point=>point.includes('caregiver observations'))&&documentation.study.points.some(point=>point.includes('limitations')),'Documentation station must preserve caregiver context and study limitations.');

for(const token of [
  'stationStep','studyMarkup','applyMarkup','recapMarkup','schematicMarkup',
  'data-pediatric-station-check','Are you sure?','data-pediatric-station-submit','Review and try again.',
  'data-pediatric-station-complete','engine.setStation(state.saved.labs,station.id,true',
  'checkpointIndex','data-pediatric-checkpoint-go','Answer every question before scoring the checkpoint.',
  'data-pediatric-checkpoint-submit','scoreCheckpoint','engine.gradeSession','engine.applySession',
  'requestFullscreen','data-pediatric-exit-fullscreen','data/pediatric/guided-stations.json'
])assert.ok(controller.includes(token),`Guided Pediatric controller is missing ${token}.`);

assert.equal(controller.includes('type="checkbox"'),false,'Guided Pediatric stations must not use learner self-attestation checkboxes.');
assert.equal(controller.includes("type='checkbox'"),false,'Guided Pediatric stations must not use learner self-attestation checkboxes.');
assert.equal(controller.includes('MutationObserver'),false,'Guided Pediatric controller must remain event-driven.');
assert.equal(/addEventListener\(\s*['"]resize['"]/.test(controller),false,'Guided Pediatric controller must not use a resize redraw loop.');
assert.equal(/localStorage\.(?:setItem|removeItem|clear)/.test(controller),false,'Guided Pediatric controller must not write browser storage directly.');
assert.ok(controller.includes('storage.save'),'Pediatric progress must continue through versioned Skills Lab storage.');

const completeStart=controller.indexOf('function completeStation');
const completeStop=controller.indexOf('function checkpointNavMarkup');
assert.ok(completeStart>=0&&completeStop>completeStart,'Could not inspect guided Pediatric station completion controller.');
const completeBody=controller.slice(completeStart,completeStop);
assert.ok(completeBody.includes("state.stationStep!=='recap'"),'A Pediatric station must not be credited before the Recap step.');
assert.ok(completeBody.includes('engine.setStation(state.saved.labs,station.id,true'),'Pediatric Recap completion must persist through existing durable checklist keys.');

const checkpointStart=controller.indexOf('function renderCheckpoint()');
const checkpointStop=controller.indexOf('function startCheckpoint');
assert.ok(checkpointStart>=0&&checkpointStop>checkpointStart,'Could not inspect focused Pediatric checkpoint rendering.');
const checkpointBody=controller.slice(checkpointStart,checkpointStop);
assert.equal(checkpointBody.includes('state.questions.map(question=>')&&checkpointBody.includes('question.prompt'),false,'The Pediatric checkpoint must render one focused question, not stack all ten question bodies.');

assert.ok(html.includes('Study → Apply → Recap'));
assert.ok(html.includes('Activity earns completion'));
assert.ok(html.includes('AI-generated teaching schematic · Not a patient recording'));
assert.ok(html.includes('Wrong Apply answers stay on the same station until corrected'));
assert.ok(html.includes('Start with the child, not an adult template.'));
assert.ok(html.includes('do not reproduce proprietary pediatric scoring thresholds'));
assert.ok(html.includes('assets/pediatric-guided.css'));
assert.equal(html.includes('Study checklist'),false,'The obsolete passive Pediatric checklist label must not return.');
assert.equal(html.includes('Mark a station only after reviewing'),false,'The obsolete Pediatric self-attestation instruction must not return.');

for(const selector of ['.pediatric-visual-workstation','.pediatric-task-rail','.pediatric-station-card.complete','.pediatric-station-card.recommended','.pediatric-station-nav button.current','.pediatric-workspace:fullscreen'])assert.ok(css.includes(selector),`Guided Pediatric CSS is missing ${selector}.`);
assert.ok(css.includes('@media(max-width:760px) and (orientation:portrait)'));

assert.equal(engine.SESSION_SIZE,10);
assert.equal(engine.PASS_PERCENT,80);
assert.equal(engine.STATIONS.length,7);
console.log('Pediatric guided-study regression passed: seven development-aware Study → Apply → Recap stations, original SPG schematics, earned completion, focused checkpoint, APA reference, fullscreen/phone guidance, integrated gas-exchange reasoning, and no hard-coded proprietary scoring thresholds are present.');
