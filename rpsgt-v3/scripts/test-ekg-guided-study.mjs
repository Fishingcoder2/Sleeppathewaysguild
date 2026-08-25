import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [controller,packSource,engineSource,html,css]=await Promise.all([
  readFile(join(root,'core','lab-ekg.js'),'utf8'),
  readFile(join(root,'data','ekg','guided-stations.json'),'utf8'),
  readFile(join(root,'core','ekg-lab-engine.js'),'utf8'),
  readFile(join(root,'lab-ekg.html'),'utf8'),
  readFile(join(root,'assets','ekg-guided.css'),'utf8')
]);

const context={globalThis:{},Date,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);
vm.runInContext(engineSource,context,{filename:'ekg-lab-engine.js'});
const engine=context.globalThis.RPSGTEkgLabEngine;
const pack=JSON.parse(packSource);
const expected=engine.STATIONS.map(item=>item.id);

assert.equal(pack.version,'1.0.0');
assert.equal(pack.stations.length,7);
assert.equal(JSON.stringify(pack.stations.map(item=>item.id)),JSON.stringify(expected),'Guided EKG station IDs/order must remain aligned with the durable engine checklist keys.');
for(const station of pack.stations){
  assert.ok(station.title&&station.study&&station.apply&&station.recap&&station.visual,`${station.id} is missing guided station content.`);
  assert.ok(station.study.intro&&Array.isArray(station.study.points)&&station.study.points.length>=4,`${station.id} Study content is too thin.`);
  assert.ok(station.visual.kind&&station.visual.label,`${station.id} visual specification is incomplete.`);
  assert.ok(station.apply.prompt&&Array.isArray(station.apply.options)&&station.apply.options.length===4&&station.apply.options.includes(station.apply.answer)&&station.apply.hint&&station.apply.rationale,`${station.id} Apply content is invalid.`);
  assert.ok(station.recap.reviewed&&station.recap.canDo,`${station.id} Recap content is incomplete.`);
}
assert.match(pack.reference,/Robertson, B\., Marshall, B\., & Carno, M\.-A\. \(2014\)/,'EKG learner reference must remain APA-style and source-grounded.');

for(const token of [
  'stationStep','studyMarkup','applyMarkup','recapMarkup','stripMarkup',
  'data-ekg-station-check','Are you sure?','data-ekg-station-submit','Review and try again.',
  'data-ekg-station-complete','engine.setStation(state.saved.labs,station.id,true',
  'checkpointIndex','data-ekg-checkpoint-go','Answer every question before scoring the checkpoint.',
  'data-ekg-checkpoint-submit','scoreCheckpoint','engine.gradeSession','engine.applySession',
  'requestFullscreen','data-ekg-exit-fullscreen','data/ekg/guided-stations.json'
])assert.ok(controller.includes(token),`Guided EKG controller is missing ${token}.`);

assert.equal(controller.includes('type="checkbox"'),false,'Guided EKG stations must not use learner self-attestation checkboxes.');
assert.equal(controller.includes("type='checkbox'"),false,'Guided EKG stations must not use learner self-attestation checkboxes.');
assert.equal(controller.includes('MutationObserver'),false,'Guided EKG controller must remain event-driven.');
assert.equal(/addEventListener\(\s*['"]resize['"]/.test(controller),false,'Guided EKG controller must not use a resize redraw loop.');

const completeStart=controller.indexOf('function completeStation');
const completeStop=controller.indexOf('function checkpointNavMarkup');
assert.ok(completeStart>=0&&completeStop>completeStart,'Could not inspect guided EKG station completion controller.');
const completeBody=controller.slice(completeStart,completeStop);
assert.ok(completeBody.includes("state.stationStep!=='recap'"),'A station must not be credited before the Recap step.');
assert.ok(completeBody.includes('engine.setStation(state.saved.labs,station.id,true'),'Recap completion must persist through the existing durable EKG checklist keys.');

const checkpointStart=controller.indexOf('function renderCheckpoint()');
const checkpointStop=controller.indexOf('function startCheckpoint');
assert.ok(checkpointStart>=0&&checkpointStop>checkpointStart,'Could not inspect focused EKG checkpoint rendering.');
const checkpointBody=controller.slice(checkpointStart,checkpointStop);
assert.equal(checkpointBody.includes('state.questions.map(question=>')&&checkpointBody.includes('question.prompt'),false,'The EKG checkpoint must render one focused question, not stack all ten question bodies.');

assert.ok(html.includes('Study → Apply → Recap'));
assert.ok(html.includes('Activity earns completion'));
assert.ok(html.includes('AI-generated teaching schematic · Not a patient recording'));
assert.ok(html.includes('Wrong Apply answers stay on the same station until corrected'));
assert.ok(html.includes('Never let the waveform replace the patient.'));
assert.ok(html.includes('assets/ekg-guided.css'));
assert.equal(html.includes('Study checklist'),false,'The obsolete passive EKG checklist label must not return.');
assert.equal(html.includes('Mark a station only after reviewing'),false,'The obsolete EKG self-attestation instruction must not return.');

assert.ok(css.includes('.ekg-visual-workstation'));
assert.ok(css.includes('.ekg-task-rail'));
assert.ok(css.includes('.ekg-station-card.complete'));
assert.ok(css.includes('.ekg-station-card.recommended'));
assert.ok(css.includes('.ekg-station-nav button.current'));
assert.ok(css.includes('@media(max-width:760px) and (orientation:portrait)'));
assert.ok(css.includes('.ekg-workspace:fullscreen'));

assert.equal(engine.SESSION_SIZE,10);
assert.equal(engine.PASS_PERCENT,80);
assert.equal(engine.STATIONS.length,7);
console.log('EKG guided-study regression passed: seven Study → Apply → Recap stations, original schematic ECG renderer, earned completion, focused 10-question checkpoint, APA reference, fullscreen/phone guidance, and event-driven safety boundaries are present.');
