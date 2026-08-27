import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [eventRendererSource,eventEngineSource,contextRendererSource,contextPack,miniPack,multiPack,boundaryPack,authorityMap,html]=await Promise.all([
  readFile(join(root,'core','scoring-event-renderer.js'),'utf8'),
  readFile(join(root,'core','respiratory-timeline-engine.js'),'utf8'),
  readFile(join(root,'core','scoring-context-renderer.js'),'utf8'),
  readFile(join(root,'data','scoring','context-cases.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','scoring','mini-study.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','scoring','multi-epoch-runs.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','scoring','event-boundary-cases.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','scoring','authority-map.json'),'utf8').then(JSON.parse),
  readFile(join(root,'lab-scoring.html'),'utf8')
]);

const context={globalThis:{},Math,Number,String,Object,Array,JSON,Set,Map};
context.globalThis.globalThis=context.globalThis;
vm.createContext(context);
vm.runInContext(eventRendererSource,context,{filename:'scoring-event-renderer.js'});
vm.runInContext(eventEngineSource,context,{filename:'respiratory-timeline-engine.js'});
vm.runInContext(contextRendererSource,context,{filename:'scoring-context-renderer.js'});
const eventRenderer=context.globalThis.RPSGTScoringEventRenderer;
const eventEngine=context.globalThis.RPSGTRespiratoryTimelineEngine;
const contextRenderer=context.globalThis.RPSGTScoringContextRenderer;
assert.ok(eventRenderer&&eventEngine&&contextRenderer);
assert.equal(typeof eventRenderer.signal,'function','Respiratory renderer must expose deterministic signal sampling for authority regression tests.');

function sampleRange(fn,start,end,step=.02){const values=[];for(let t=start;t<=end+1e-9;t+=step)values.push(fn(t));return values;}
function excursion(fn,start,end){const values=sampleRange(fn,start,end);return Math.max(...values)-Math.min(...values);}
function meanAbs(fn,start,end){const values=sampleRange(fn,start,end);return values.reduce((sum,value)=>sum+Math.abs(value),0)/values.length;}
function minimum(fn,start,end){return Math.min(...sampleRange(fn,start,end));}
function maximum(fn,start,end){return Math.max(...sampleRange(fn,start,end));}
function evidence(id){const item=eventEngine.evidenceCaseById(id);assert.ok(item,`Missing respiratory evidence case ${id}`);return item;}

// Adult apnea: recommended thermal airflow signal is nearly absent for >=10 s.
const oa=evidence('obstructive-apnea-evidence');
assert.ok(oa.event.end-oa.event.start>=10);
const oaThermalBaseline=excursion(t=>eventRenderer.signal(oa,'thermal',t),20,40);
const oaThermalEvent=excursion(t=>eventRenderer.signal(oa,'thermal',t),52,74);
assert.ok(oaThermalEvent/oaThermalBaseline<=.10,`Obstructive apnea thermal excursion must fall by at least 90%; ratio=${(oaThermalEvent/oaThermalBaseline).toFixed(3)}`);
const oaEffortBaseline=meanAbs(t=>eventRenderer.signal(oa,'thorax',t),20,40);
const oaEffortEvent=meanAbs(t=>eventRenderer.signal(oa,'thorax',t),52,74);
assert.ok(oaEffortEvent>oaEffortBaseline*.9,'Obstructive apnea must retain inspiratory effort while airflow is absent.');

// Central apnea: airflow and effort both become nearly absent for the same >=10 s interval.
const ca=evidence('central-apnea-evidence');
assert.ok(ca.event.end-ca.event.start>=10);
const caThermalRatio=excursion(t=>eventRenderer.signal(ca,'thermal',t),54,76)/excursion(t=>eventRenderer.signal(ca,'thermal',t),20,40);
const caThoraxRatio=excursion(t=>eventRenderer.signal(ca,'thorax',t),54,76)/excursion(t=>eventRenderer.signal(ca,'thorax',t),20,40);
assert.ok(caThermalRatio<=.10&&caThoraxRatio<=.10,`Central apnea must suppress both airflow and effort; thermal=${caThermalRatio.toFixed(3)} thorax=${caThoraxRatio.toFixed(3)}`);

// Mixed apnea: absent effort first, then effort returns while airflow remains absent.
const mixed=evidence('mixed-apnea-evidence');
assert.ok(mixed.event.end-mixed.event.start>=10);
const mixedEarly=meanAbs(t=>eventRenderer.signal(mixed,'thorax',t),48,62);
const mixedLate=meanAbs(t=>eventRenderer.signal(mixed,'thorax',t),72,84);
const mixedThermalLate=excursion(t=>eventRenderer.signal(mixed,'thermal',t),72,84)/excursion(t=>eventRenderer.signal(mixed,'thermal',t),20,40);
assert.ok(mixedLate>mixedEarly*5,'Mixed apnea must show clear return of effort after an initial absent-effort portion.');
assert.ok(mixedThermalLate<=.10,'Mixed apnea airflow must remain nearly absent while effort returns.');

// Adult hypopnea: nasal-pressure excursion reduction >=30% for >=10 s plus >=3% desaturation.
const hyp=evidence('obstructive-hypopnea-evidence');
assert.ok(hyp.event.end-hyp.event.start>=10);
const hypBaseline=excursion(t=>eventRenderer.signal(hyp,'nasal',t),20,40);
const hypEvent=excursion(t=>eventRenderer.signal(hyp,'nasal',t),52,84);
const hypReduction=1-hypEvent/hypBaseline;
assert.ok(hypReduction>=.30,`Hypopnea nasal-pressure reduction must be >=30%; reduction=${(hypReduction*100).toFixed(1)}%`);
const hypSpO2Baseline=maximum(t=>eventRenderer.signal(hyp,'spo2',t),30,48);
const hypSpO2Nadir=minimum(t=>eventRenderer.signal(hyp,'spo2',t),100,124);
assert.ok(hypSpO2Baseline-hypSpO2Nadir>=3,`Hypopnea teaching case must supply >=3% desaturation; drop=${(hypSpO2Baseline-hypSpO2Nadir).toFixed(2)}%`);

// Adult RERA: >=10 s flow-limited sequence leading to arousal, while staying short of apnea/hypopnea amplitude criteria.
const rera=evidence('rera-evidence');
assert.ok(rera.event.end-rera.event.start>=10);
assert.ok(rera.arousal.end-rera.arousal.start>=3);
const reraBaseline=excursion(t=>eventRenderer.signal(rera,'nasal',t),20,40);
const reraEvent=excursion(t=>eventRenderer.signal(rera,'nasal',t),52,90);
const reraReduction=1-reraEvent/reraBaseline;
assert.ok(reraReduction<.30,`RERA teaching flow limitation must stay below the adult hypopnea >=30% amplitude-reduction threshold; reduction=${(reraReduction*100).toFixed(1)}%`);
assert.ok(rera.arousal.start>=10,'RERA arousal must have enough preceding sleep context for the general arousal rule.');
assert.ok(rera.tasks.some(task=>/does not meet|short of|threshold/i.test(`${task.hint} ${task.explanation}`)),'RERA teaching text must explicitly distinguish the sequence from apnea/hypopnea criteria.');

// Boundary context: one adult obstructive apnea remains physiologically continuous across the epoch divider.
const boundaryContext=contextPack.cases.find(item=>item.id==='context-boundary-respiratory-spans');
assert.ok(boundaryContext);
assert.equal(boundaryContext.answer,'One obstructive apnea spanning the epoch boundary');
assert.equal(boundaryContext.study.respEvent.end-boundaryContext.study.respEvent.start,13);
const boundaryStudy=boundaryContext.study;
const thermRow={type:'thermal'},thoraxRow={type:'thorax'},abdomenRow={type:'abdomen'};
const boundaryThermalBase=excursion(t=>contextRenderer.sample(boundaryStudy,thermRow,t,0),5,20);
const boundaryThermalEvent=excursion(t=>contextRenderer.sample(boundaryStudy,thermRow,t,0),26,37);
assert.ok(boundaryThermalEvent/boundaryThermalBase<=.10,'Boundary apnea thermistor signal must fall by at least 90%.');
const boundaryThoraxBase=meanAbs(t=>contextRenderer.sample(boundaryStudy,thoraxRow,t,0),5,20);
const boundaryThoraxEvent=meanAbs(t=>contextRenderer.sample(boundaryStudy,thoraxRow,t,0),26,37);
const boundaryAbdomenBase=meanAbs(t=>contextRenderer.sample(boundaryStudy,abdomenRow,t,0),5,20);
const boundaryAbdomenEvent=meanAbs(t=>contextRenderer.sample(boundaryStudy,abdomenRow,t,0),26,37);
assert.ok(boundaryThoraxEvent>boundaryThoraxBase*.9&&boundaryAbdomenEvent>boundaryAbdomenBase*.9,'Boundary apnea must preserve thoracic and abdominal effort.');

// Version 3 arousal and movement teaching contracts.
const n2Arousal=contextPack.cases.find(item=>item.id==='context-arousal-n2-valid');
const remArousal=contextPack.cases.find(item=>item.id==='context-arousal-rem-no-chin');
const awakening=contextPack.cases.find(item=>item.id==='context-transition-awakening-arousal');
const plms=contextPack.cases.find(item=>item.id==='context-limb-series-valid');
assert.ok(n2Arousal.study.stableSleepSeconds>=10&&n2Arousal.study.arousalDuration>=3);
assert.equal(remArousal.study.stage,'R');assert.equal(remArousal.study.chinRise,false);assert.ok(/at least 1 second/i.test(remArousal.rationale));
assert.ok(/both the arousal and the transition to wake are scored/i.test(awakening.rationale));
assert.equal(plms.study.legBursts.length,4);for(let i=1;i<plms.study.legBursts.length;i+=1){const interval=plms.study.legBursts[i]-plms.study.legBursts[i-1];assert.ok(interval>=5&&interval<=90);}

// Placement-only boundary pack must not imply that generic reductions are already classified apnea/hypopnea events.
assert.ok(/placement only/i.test(boundaryPack.meta.clinicalBoundary));
for(const item of boundaryPack.cases){const learnerText=`${item.title} ${item.prompt} ${item.focus} ${item.rationale}`;assert.ok(/reduction/i.test(learnerText));assert.equal(/obstructive apnea|central apnea|hypopnea|rera/i.test(learnerText),false,`Boundary placement case ${item.id} must not pre-classify a generic reduction.`);}

// AASM Version 3 is the rule authority across every major Scoring Lab component; atlases are visual corroboration only.
assert.equal(authorityMap.sources.aasmV3.role,'governing scoring authority');
assert.ok(/never overrides current AASM rules/i.test(authorityMap.sources.clinicalAtlas2018.role));
assert.ok(/never overrides current AASM rules/i.test(authorityMap.sources.geyerAtlas2010.role));
const requiredComponents=['stage-skill','multi-epoch','boundary-annotation','mini-study','event-evidence','context-skill','review-checkpoint'];
for(const id of requiredComponents)assert.ok(authorityMap.components.some(item=>item.id===id),`Authority map is missing ${id}.`);
assert.ok(/AASM Scoring Manual Version 3/i.test(miniPack.meta.sourceBasis));
assert.ok(/AASM Scoring Manual Version 3/i.test(multiPack.meta.sourceBasis));
assert.ok(/AASM Scoring Manual Version 3/i.test(boundaryPack.meta.sourceBasis));

// Learner-facing case text should test rules/physiology, not AASM ISR interface trivia.
for(const item of contextPack.cases){const learnerText=[item.title,item.prompt,item.rationale,...item.options,...item.evidence.flatMap(choice=>[choice.label,choice.hint])].join(' ');assert.equal(/\bISR\b/i.test(learnerText),false,`Context case ${item.id} still exposes ISR interface wording.`);}
assert.ok(html.includes('AASM Scoring Manual Version 3'),'Scoring Lab must visibly identify Version 3 as the governing scoring authority.');
assert.ok(html.includes('Clinical atlas of polysomnography'),'Scoring Lab must visibly provide the Clinical Atlas as visual corroboration.');
assert.equal(/Suggested study materials:[\s\S]{0,1000}Sleep ISR/i.test(html),false,'General Scoring Lab study materials must not present ISR as a scoring authority.');

console.log('AASM Version 3 Scoring Lab authority regression passed: adult staging/arousal/movement/respiratory decisions are rule-anchored, boundary placement remains classification-neutral, RERA no longer satisfies hypopnea amplitude criteria, and atlas sources remain visual corroboration only.');
