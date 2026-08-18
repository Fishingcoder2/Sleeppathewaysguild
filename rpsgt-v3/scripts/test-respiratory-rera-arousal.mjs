import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,source]=await Promise.all([
  readFile(join(root,'lab-respiratory.html'),'utf8'),
  readFile(join(root,'core','respiratory-rera-arousal.js'),'utf8')
]);

assert.ok(html.includes('core/respiratory-rera-arousal.js'),'Respiratory Lab must load the RERA arousal correction.');
const engineIndex=html.indexOf('core/respiratory-timeline-engine.js');
const patchIndex=html.indexOf('core/respiratory-rera-arousal.js');
const timelineUiIndex=html.indexOf('core/respiratory-timeline-ui.js');
const labIndex=html.indexOf('core/lab-respiratory.js');
assert.ok(engineIndex>=0&&engineIndex<patchIndex&&patchIndex<timelineUiIndex&&patchIndex<labIndex,'RERA correction must load after the engines/models and before both respiratory renderers.');
assert.ok(html.includes('sustained faster-frequency EEG arousal'),'Respiratory visual instructions must cue the corrected arousal morphology.');

const visual=source.match(/VISUAL_AROUSAL=\{start:([\d.]+),end:([\d.]+)\}/);
const timeline=source.match(/TIMELINE_AROUSAL=\{start:([\d.]+),end:([\d.]+)\}/);
assert.ok(visual&&timeline,'RERA arousal windows must be explicit.');
const visualSeconds=Number(visual[2])-Number(visual[1]);
const timelineSeconds=Number(timeline[2])-Number(timeline[1]);
assert.ok(visualSeconds>=3,`Visual-challenge arousal is only ${visualSeconds} seconds.`);
assert.ok(timelineSeconds>=3,`Click-evidence arousal is only ${timelineSeconds} seconds.`);

for(const frequency of ['9.2','12.7','15.1'])assert.ok(source.includes(`TAU*${frequency}*t`),`Faster-frequency mixture is missing ${frequency} Hz component.`);
for(const contract of ['count:1200','count:4800','fasterFrequencyShift','edgeGate','trace-arousal-note','resp-timeline-arousal-label','data-rera-arousal-seconds','engine.checkEvidence=function','flow-limitation'])assert.ok(source.includes(contract),`RERA arousal correction is missing ${contract}.`);
assert.ok(source.includes("single large slow transient"),'Teaching text must explicitly guard against the prior slow-transient appearance.');
assert.ok(!source.includes('Math.sin(index*2.85)*5.2'),'Corrected RERA renderer must not restore the old oversized visual burst.');

console.log(`RERA respiratory visual correction passed: visual arousal ${visualSeconds.toFixed(1)} s, click-evidence arousal ${timelineSeconds.toFixed(1)} s, sustained faster-frequency EEG mixture, higher-density paths, and aligned evidence window.`);
