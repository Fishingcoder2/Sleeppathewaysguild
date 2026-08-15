import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');
const [engineSource,modelSource,controller]=await Promise.all([
  readFile(join(root,'core','respiratory-lab-engine.js'),'utf8'),
  readFile(join(root,'core','respiratory-signal-model.js'),'utf8'),
  readFile(join(root,'core','lab-respiratory.js'),'utf8')
]);
const context={globalThis:{},module:{exports:{}},exports:{},Date,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);vm.runInContext(engineSource,context,{filename:'respiratory-lab-engine.js'});vm.runInContext(modelSource,context,{filename:'respiratory-signal-model.js'});
const engine=context.globalThis.RPSGTRespiratoryLabEngine;assert.ok(engine);
const obstructiveApnea=engine.patternById('obstructive-apnea');assert.equal(obstructiveApnea.thermal,'absent');assert.equal(obstructiveApnea.eeg,'baseline');
const centralApnea=engine.patternById('central-apnea');assert.equal(centralApnea.thermal,'absent');
const obstructiveHypopnea=engine.patternById('obstructive-hypopnea');assert.equal(obstructiveHypopnea.thermal,'subtle-reduction');assert.ok(obstructiveHypopnea.spo2Nadir<obstructiveHypopnea.spo2Start);
const centralHypopnea=engine.patternById('central-hypopnea');assert.equal(centralHypopnea.thermal,'subtle-reduction');
const rera=engine.patternById('flow-limitation');assert.equal(rera.thermal,'near-normal');assert.equal(rera.eeg,'terminal-arousal');assert.match(rera.title,/RERA/i);assert.match(rera.cue,/EEG arousal/i);assert.match(rera.teaching,/not enough to call a RERA/i);assert.equal(rera.spo2Nadir,rera.spo2Start);
for(const token of ['trace-line eeg','trace-line thermal','trace-spo2-value','trace-arousal-note','EEG arousal','oxygenSeries','Thermistor']) assert.ok(controller.includes(token),`Expanded respiratory trace is missing ${token}.`);
console.log('Respiratory signal model passed thermal-airflow, numeric-SpO2, and terminal-EEG-arousal RERA contracts.');
