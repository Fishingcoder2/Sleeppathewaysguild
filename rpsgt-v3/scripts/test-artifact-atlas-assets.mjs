import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const [pack,html,js,css]=await Promise.all([
  readFile(join(root,'data','visual','artifact-pack-1.json'),'utf8').then(JSON.parse),
  readFile(join(root,'lab-artifact.html'),'utf8'),
  readFile(join(root,'core','lab-artifact.js'),'utf8'),
  readFile(join(root,'assets','artifact.css'),'utf8')
]);
const expected=new Map([
  ['artifact-electrode-pop-001',['electrode-pop',12]],
  ['artifact-ecg-contamination-001',['ecg-contamination',12]],
  ['artifact-sweat-drift-001',['sweat-drift',12]],
  ['artifact-line-noise-001',['line-noise',6]],
  ['artifact-movement-001',['shared-m2',12]]
]);
const bonus=['jaw-emg','eye-blink','thoracic-belt-slip'];
assert.equal(pack.studies.length,5,'Keep stable five-case scored assessment.');
assert.equal(pack.questions.length,15,'Keep stable fifteen scored decisions.');
assert.equal(new Set(pack.questions.map(q=>q.id)).size,15,'Do not change or duplicate learner question IDs.');
assert.equal(pack.meta.visualAtlas?.version,'original-svg-2026-11-11','Keep original visual provenance.');
const hashes=new Set();

async function inspect(path){
  const svg=await readFile(join(root,path),'utf8');
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1560 752"/);
  assert.match(svg,/<title\s+id="traceTitle">/,'Accessible title required.');
  assert.match(svg,/<desc\s+id="traceDesc">/,'Accessible graphic explanation required.');
  assert.match(svg,/NOT A PATIENT RECORDING/);
  assert.doesNotMatch(svg,/<script\b|<foreignObject\b|<image\b|onload=|onclick=/i,'No embedded active, copied, or external imagery.');
  const traces=[...svg.matchAll(/<path d="([^"]+)" fill="none"/g)].map(x=>x[1]);
  assert.equal(traces.length,8,'Each original atlas strip needs eight synchronized channels.');
  const digest=createHash('sha256').update(svg).digest('hex');
  assert.ok(!hashes.has(digest),'Avoid duplicated pictures across different teaching patterns.');
  hashes.add(digest);
  const amplitudes=traces.map(trace=>{
    const values=[...trace.matchAll(/(?:M|L)[\d.]+,([\d.]+)/g)].map(match=>Number(match[1]));
    assert.ok(values.length>=900,'Each trace needs a substantial waveform, not a stylized placeholder.');
    return Math.max(...values)-Math.min(...values);
  });
  return amplitudes;
}
for(const study of pack.studies){
  const [name,seconds]=expected.get(study.id)||[];
  assert.ok(name,'Unexpected case ID: '+study.id);
  assert.equal(study.visualAsset,`assets/artifact-atlas/${name}.svg`);
  assert.equal(study.visualWindowSeconds,seconds,'Case excerpt length must be disclosed.');
  assert.ok(study.visualAlt&&study.visualDescription,'Case picture must have context and accessible instructions.');
  const a=await inspect(study.visualAsset);
  if(name==='electrode-pop')assert.ok(a[0]>2*a[1],'Electrode pop must stand out in the correct channel.');
  if(name==='ecg-contamination')assert.ok(a[0]>2*a[1],'ECG-contaminated EEG channel must be visibly different.');
  if(name==='sweat-drift')assert.ok(a[0]>2*a[2]&&a[1]>2*a[3],'Frontal baseline wander must differ from adjacent central derivations.');
  if(name==='line-noise')assert.ok(a[2]>2*a[3],'60-Hz interference must stand out in C3-M2.');
  if(name==='shared-m2')assert.ok([0,2,4,5].every(i=>a[i]>35)&&a[1]<20&&a[3]<20,'Shared M2 example must affect M2-referenced channels while sparing independent pathways.');
}
for(const name of bonus){
  const path=`assets/artifact-atlas/${name}.svg`;
  assert.ok(html.includes(path),'Optional gallery image missing: '+path);
  await inspect(path);
}
assert.equal(hashes.size,8,'Expect eight independent original atlas illustrations.');
assert.match(html,/Study only · Does not change your score/);
assert.match(html,/Atlas of polysomnography/);
assert.match(html,/Atlas of electroencephalography in sleep medicine/);
assert.match(html,/Clinical atlas of polysomnography/);
assert.ok(js.includes('data-artifact-atlas-image')&&js.includes('renderer.render(canvas,study)'),'Static image and robust PSG fallback must both remain.');
assert.ok(js.includes("document.addEventListener('error'"),'An image error cannot block the learner.');
assert.ok(css.includes('.artifact-psg-illustration')&&css.includes('.artifact-pattern-gallery'),'Static figures must fit the lab and study gallery.');
console.log('Artifact atlas passed: eight unique original eight-channel SVG strips, five scored-case links, three optional study comparisons, clinically targeted waveform amplitudes, accessible disclosure, image fallback, and original learner IDs.');
