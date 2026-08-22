import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [rendererSource,pack]=await Promise.all([
  readFile(join(root,'core','artifact-psg-renderer.js'),'utf8'),
  readFile(join(root,'data','visual','artifact-pack-1.json'),'utf8').then(JSON.parse)
]);

const context={globalThis:{},Math,Number,String,Set,Array,Object};
vm.createContext(context);
vm.runInContext(rendererSource,context,{filename:'artifact-psg-renderer.js'});
const renderer=context.globalThis.RPSGTArtifactPSGRenderer;
assert.ok(renderer,'Artifact renderer must load.');

const study=pack.studies.find(item=>item.id==='artifact-movement-001');
assert.ok(study,'Shared-reference teaching case must remain present.');
assert.equal(study.title,'Shared M2 reference disturbance');
assert.equal(study.artifact.source,'M2-reference');
assert.deepEqual(
  study.artifact.channels,
  ['F3-M2','C3-M2','E1-M2','E2-M2'],
  'Only derivations using the displayed M2 reference should carry this teaching disturbance.'
);
for(const clean of ['F4-M1','C4-M1','Chin EMG','ECG']){
  assert.equal(study.artifact.channels.includes(clean),false,`${clean} must remain outside the shared-M2 artifact list.`);
}

const cleanStudy=JSON.parse(JSON.stringify(study));
cleanStudy.artifact.channels=[];
const time=15.2;
const channelIndex=label=>study.channels.findIndex(channel=>channel.label===label);
const artifactDelta=label=>{
  const index=channelIndex(label);
  assert.ok(index>=0,`Missing channel ${label}`);
  const channel=study.channels[index];
  return Math.abs(renderer.sample(study,channel,time,index)-renderer.sample(cleanStudy,channel,time,index));
};

for(const affected of ['F3-M2','C3-M2','E1-M2','E2-M2']){
  assert.ok(artifactDelta(affected)>.05,`${affected} should visibly carry the shared-reference disturbance.`);
}
for(const clean of ['F4-M1','C4-M1','Chin EMG','ECG']){
  assert.ok(artifactDelta(clean)<1e-12,`${clean} should remain unchanged by the shared-reference disturbance.`);
}

const identify=pack.questions.find(question=>question.id==='artifact-move-identify');
const evidence=pack.questions.find(question=>question.id==='artifact-move-evidence');
const action=pack.questions.find(question=>question.id==='artifact-move-action');
assert.equal(identify.answer,'Artifact introduced through the shared M2 reference');
assert.match(identify.rationale,/bipolar chin EMG remain stable/i);
assert.match(evidence.answer,/Only derivations using M2/i);
assert.match(action.answer,/Inspect and secure M2/i);
assert.doesNotMatch(identify.prompt,/increased chin activity/i);
assert.doesNotMatch(identify.answer,/generalized body movement/i);

console.log('Artifact shared-reference regression passed: M2-referenced EEG/EOG derivations carry the disturbance while M1-referenced EEG, bipolar Chin EMG, and ECG remain unchanged.');
