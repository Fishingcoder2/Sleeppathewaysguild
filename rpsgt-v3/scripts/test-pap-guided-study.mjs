import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [controller,packSource,engineSource,html,css]=await Promise.all([
  readFile(join(root,'core','lab-pap.js'),'utf8'),
  readFile(join(root,'data','pap','guided-stations.json'),'utf8'),
  readFile(join(root,'core','pap-lab-engine.js'),'utf8'),
  readFile(join(root,'lab-pap.html'),'utf8'),
  readFile(join(root,'assets','pap-guided.css'),'utf8')
]);

const context={globalThis:{},Date,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);
vm.runInContext(engineSource,context,{filename:'pap-lab-engine.js'});
const engine=context.globalThis.RPSGTPapLabEngine;
const pack=JSON.parse(packSource);
const expected=engine.STATIONS.map(item=>item.id);

assert.equal(pack.version,'1.0.0');
assert.equal(pack.stations.length,7);
assert.equal(JSON.stringify(pack.stations.map(item=>item.id)),JSON.stringify(expected),'Guided PAP station IDs/order must remain aligned with the durable engine checklist keys.');
for(const station of pack.stations){
  assert.ok(station.title&&station.study&&station.apply&&station.recap&&station.visual,`${station.id} is missing guided station content.`);
  assert.ok(station.study.intro&&Array.isArray(station.study.points)&&station.study.points.length>=4,`${station.id} Study content is too thin.`);
  assert.ok(station.visual.kind&&station.visual.label,`${station.id} visual specification is incomplete.`);
  assert.ok(station.apply.prompt&&Array.isArray(station.apply.options)&&station.apply.options.length===4&&station.apply.options.includes(station.apply.answer)&&station.apply.hint&&station.apply.rationale,`${station.id} Apply content is invalid.`);
  assert.ok(station.recap.reviewed&&station.recap.canDo,`${station.id} Recap content is incomplete.`);
}
assert.match(pack.reference,/Robertson, B\., Marshall, B\., & Carno, M\.-A\. \(2014\)/,'PAP learner reference must remain APA-style and source-grounded.');
assert.equal(/cm\s*H2O|cm\s*H₂O/i.test(packSource),false,'Guided PAP stations must not hard-code dated numerical pressure-setting rules.');

const protocol=pack.stations.find(item=>item.id==='protocol-boundaries');
assert.ok(protocol.apply.answer.includes('Clarify the order')&&protocol.apply.rationale.includes('current protocol'),'Protocol-boundary station must require authorization before therapy changes.');
const eventResponse=pack.stations.find(item=>item.id==='event-response');
assert.ok(eventResponse.study.points.some(point=>point.includes('stage and body position'))&&eventResponse.study.points.some(point=>point.includes('leak and arousal timing')),'Event-response station must use complete-pattern context.');
const advanced=pack.stations.find(item=>item.id==='advanced-modes');
assert.ok(advanced.apply.answer.includes('escalate for clarification')&&advanced.apply.rationale.includes('current order and protocol'),'Advanced-mode station must preserve escalation rather than independent treatment selection.');
const documentation=pack.stations.find(item=>item.id==='documentation-handoff');
assert.ok(documentation.study.points.some(point=>point.includes('reason for an intervention'))&&documentation.study.points.some(point=>point.includes('patient tolerance')),'Documentation station must preserve intervention rationale and patient response.');

for(const token of [
  'stationStep','studyMarkup','applyMarkup','recapMarkup','schematicMarkup',
  'data-pap-station-check','Are you sure?','data-pap-station-submit','Review and try again.',
  'data-pap-station-complete','engine.setStation(state.saved.labs,station.id,true',
  'checkpointIndex','data-pap-checkpoint-go','Answer every question before scoring the checkpoint.',
  'data-pap-checkpoint-submit','scoreCheckpoint','engine.gradeSession','engine.applySession',
  'requestFullscreen','data-pap-exit-fullscreen','data/pap/guided-stations.json'
])assert.ok(controller.includes(token),`Guided PAP controller is missing ${token}.`);

assert.equal(controller.includes('type="checkbox"'),false,'Guided PAP stations must not use learner self-attestation checkboxes.');
assert.equal(controller.includes("type='checkbox'"),false,'Guided PAP stations must not use learner self-attestation checkboxes.');
assert.equal(controller.includes('MutationObserver'),false,'Guided PAP controller must remain event-driven.');
assert.equal(/addEventListener\(\s*['"]resize['"]/.test(controller),false,'Guided PAP controller must not use a resize redraw loop.');
assert.equal(/localStorage\.(?:setItem|removeItem|clear)/.test(controller),false,'Guided PAP controller must not write browser storage directly.');
assert.ok(controller.includes('storage.save'),'PAP progress must continue through versioned Skills Lab storage.');

const completeStart=controller.indexOf('function completeStation');
const completeStop=controller.indexOf('function checkpointNavMarkup');
assert.ok(completeStart>=0&&completeStop>completeStart,'Could not inspect guided PAP station completion controller.');
const completeBody=controller.slice(completeStart,completeStop);
assert.ok(completeBody.includes("state.stationStep!=='recap'"),'A PAP station must not be credited before the Recap step.');
assert.ok(completeBody.includes('engine.setStation(state.saved.labs,station.id,true'),'PAP Recap completion must persist through existing durable checklist keys.');

const checkpointStart=controller.indexOf('function renderCheckpoint()');
const checkpointStop=controller.indexOf('function startCheckpoint');
assert.ok(checkpointStart>=0&&checkpointStop>checkpointStart,'Could not inspect focused PAP checkpoint rendering.');
const checkpointBody=controller.slice(checkpointStart,checkpointStop);
assert.equal(checkpointBody.includes('state.questions.map(question=>')&&checkpointBody.includes('question.prompt'),false,'The PAP checkpoint must render one focused question, not stack all ten question bodies.');

assert.ok(html.includes('Study → Apply → Recap'));
assert.ok(html.includes('Activity earns completion'));
assert.ok(html.includes('AI-generated teaching schematic · Not a patient recording'));
assert.ok(html.includes('Wrong Apply answers stay on the same station until corrected'));
assert.ok(html.includes('Do not chase one event or one number.'));
assert.ok(html.includes('does not prescribe fixed pressure changes'));
assert.ok(html.includes('assets/pap-guided.css'));
assert.equal(html.includes('Study checklist'),false,'The obsolete passive PAP checklist label must not return.');
assert.equal(html.includes('Mark a station only after reviewing'),false,'The obsolete PAP self-attestation instruction must not return.');

for(const selector of ['.pap-visual-workstation','.pap-task-rail','.pap-station-card.complete','.pap-station-card.recommended','.pap-station-nav button.current','.pap-workspace:fullscreen'])assert.ok(css.includes(selector),`Guided PAP CSS is missing ${selector}.`);
assert.ok(css.includes('@media(max-width:760px) and (orientation:portrait)'));

assert.equal(engine.SESSION_SIZE,10);
assert.equal(engine.PASS_PERCENT,80);
assert.equal(engine.STATIONS.length,7);
console.log('PAP guided-study regression passed: seven protocol-first Study → Apply → Recap stations, original SPG schematics, earned completion, focused checkpoint, APA reference, fullscreen/phone guidance, and no dated fixed-pressure teaching are present.');
