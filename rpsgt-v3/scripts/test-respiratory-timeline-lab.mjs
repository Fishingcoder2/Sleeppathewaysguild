import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const engine=require('../core/respiratory-timeline-engine.js');

assert.equal(engine.VERSION,'1.0.0');
assert.equal(engine.LONG_DURATION,300);
assert.equal(engine.EVIDENCE_DURATION,150);
assert.deepEqual(engine.CHANNELS,['eeg','nasal','thermal','thorax','abdomen','spo2']);

assert.ok(engine.LONG_CASES.length>=5,'Expected at least five long-form respiratory cases');
assert.ok(engine.LONG_CASES.every(item=>item.duration===300),'Every long-form case must use the five-minute view');
const ids=new Set(engine.LONG_CASES.map(item=>item.id));
assert.ok(ids.has('cheyne-stokes'),'Cheyne–Stokes case is required');
assert.ok(ids.has('periodic-breathing'),'Periodic breathing case is required');
assert.ok(ids.has('recurrent-obstructive'),'Recurrent obstructive case is required');
assert.ok(ids.has('recurrent-central'),'Recurrent central case is required');
const csr=engine.longCaseById('cheyne-stokes');
assert.equal(csr.kind,'cheyne-stokes');
assert.ok(csr.cycleSeconds>=40,'Cheyne–Stokes teaching cycle must preserve a long waxing/waning cycle');
assert.match(csr.teaching,/crescendo–decrescendo/i);
const periodic=engine.longCaseById('periodic-breathing');
assert.match(periodic.teaching,/less regular|less classically|less stereotyped/i);

assert.equal(engine.EVIDENCE_CASES.length,7,'The restored click-the-evidence lab should contain seven 2:30 cases');
assert.ok(engine.EVIDENCE_CASES.every(item=>item.duration===150),'Every evidence case must use 2 minutes 30 seconds');
assert.ok(engine.EVIDENCE_CASES.every(item=>Array.isArray(item.tasks)&&item.tasks.length>=1),'Every evidence case must have clickable targets');
for(const item of engine.EVIDENCE_CASES){
  for(const task of item.tasks){
    assert.ok(engine.CHANNELS.includes(task.channel),`Unknown channel ${task.channel}`);
    assert.ok(task.start>=0&&task.end<=item.duration&&task.end>task.start,'Evidence window must fit the tracing');
    assert.ok(task.prompt&&task.hint&&task.explanation,'Evidence task requires prompt, persistent hint, and explanation');
    const middle=(task.start+task.end)/2;
    assert.equal(engine.checkEvidence(item.id,item.tasks.indexOf(task),task.channel,middle).correct,true,'Center of target window should be correct');
    const wrongChannel=engine.CHANNELS.find(channel=>channel!==task.channel);
    assert.equal(engine.checkEvidence(item.id,item.tasks.indexOf(task),wrongChannel,middle).correct,false,'Wrong channel must not pass');
  }
}

const obstructive=engine.evidenceCaseById('obstructive-apnea-evidence');
assert.ok(obstructive.tasks.some(task=>task.channel==='thermal'&&/thermistor/i.test(task.prompt)),'Obstructive apnea evidence must explicitly use the thermistor');
assert.ok(obstructive.tasks.some(task=>task.channel==='thorax'),'Obstructive apnea must include continued effort evidence');
const central=engine.evidenceCaseById('central-apnea-evidence');
assert.ok(central.tasks.some(task=>task.channel==='thorax')&&central.tasks.some(task=>task.channel==='abdomen'),'Central apnea must check both effort belts');
const mixed=engine.evidenceCaseById('mixed-apnea-evidence');
assert.ok(Number.isFinite(mixed.transition),'Mixed apnea must define an effort-return transition');
const rera=engine.evidenceCaseById('rera-evidence');
assert.ok(rera.tasks.some(task=>task.channel==='eeg'&&/arousal/i.test(task.prompt)),'RERA teaching case must require the terminal EEG arousal');
assert.ok(rera.tasks.some(task=>task.channel==='nasal'&&/flow/i.test(task.prompt)),'RERA teaching case must also localize flow limitation');
const oxygen=engine.evidenceCaseById('oxygen-lag-evidence');
assert.ok(oxygen.tasks.some(task=>task.channel==='spo2'&&/nadir/i.test(task.prompt)),'Oxygen-lag case must localize the delayed SpO2 nadir');

const ticks5=engine.timelineTicks(300,30);
const ticks230=engine.timelineTicks(150,30);
assert.equal(ticks5.at(-1),300);
assert.equal(ticks230.at(-1),150);

console.log('Respiratory timeline lab model passed:',engine.LONG_CASES.length,'five-minute cases and',engine.EVIDENCE_CASES.length,'2:30 evidence cases.');
