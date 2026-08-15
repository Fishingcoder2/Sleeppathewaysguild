import {readFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const html=await readFile(join(root,'lab-respiratory.html'),'utf8');
const js=await readFile(join(root,'core','respiratory-timeline-lab.js'),'utf8');
const css=await readFile(join(root,'assets','respiratory-timeline.css'),'utf8');
const catalog=JSON.parse(await readFile(join(root,'data','labs','catalog.json'),'utf8'));

for(const token of [
  'id="respiratory-timeline-lab"',
  'data-respiratory-timeline-mode="long"',
  'data-respiratory-timeline-mode="evidence"',
  'data-respiratory-timeline-workspace',
  '5-minute Full Pattern View',
  '2:30 Click-the-Evidence',
  'core/respiratory-timeline-engine.js',
  'core/respiratory-timeline-lab.js',
  'assets/respiratory-timeline.css'
]) assert.ok(html.includes(token),`Respiratory page is missing ${token}`);

for(const preserved of [
  'id="pattern-lab"',
  'id="visual-respiratory-challenge"',
  'data-respiratory-visual-start',
  'Start 10-question checkpoint'
]) assert.ok(html.includes(preserved),`Existing respiratory experience was accidentally removed: ${preserved}`);

for(const token of [
  'Cheyne–Stokes',
  'periodic breathing',
  'Thermistor',
  'SpO₂',
  'EEG',
  'Incorrect attempts stay visible with a hint'
]) assert.ok(html.includes(token),`Restored learner framing is missing ${token}`);

for(const token of [
  'data-respiratory-evidence-svg',
  'handleGuess',
  'engine.checkEvidence',
  'state.feedback',
  'data-resp-evidence-show',
  'data-resp-evidence-time',
  'getBoundingClientRect',
  'channelFromY',
  'spo2Percent',
  'centralEnvelope'
]) assert.ok(js.includes(token),`Timeline controller is missing ${token}`);

assert.ok(!/setTimeout\s*\(/.test(js),'Evidence hints must not disappear on a timer');
assert.ok(js.includes("if(result.correct)")&&js.includes("Not there yet."),'Incorrect evidence clicks must remain on the same target with persistent feedback');
assert.ok(js.includes("def.pattern==='rera'")&&js.includes('def.arousal'),'RERA renderer must contain an EEG arousal region');
assert.ok(js.includes("channel==='thermal'")&&js.includes("channel==='nasal'"),'Thermistor and nasal pressure must be independently rendered');
assert.ok(js.includes("duration===300")&&js.includes("duration===150"),'Renderer must preserve separate 5-minute and 2:30 time scales');

for(const token of ['touch-action:manipulation','min-height:44px','resp-evidence-highlight','respiratory-timeline-trace.is-interactive','@media(max-width:720px)']) assert.ok(css.includes(token),`Timeline CSS is missing ${token}`);

const respiratory=catalog.labs.find(item=>item.id==='respiratory');
assert.ok(respiratory,'Respiratory lab catalog entry is missing');
assert.match(respiratory.description,/five-minute/i);
assert.match(respiratory.description,/Cheyne–Stokes/i);
assert.match(respiratory.description,/2:30 click-the-evidence/i);

console.log('Respiratory timeline learner shell passed: old long-form concept restored without removing newer respiratory tools.');
