import {readFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const authorityRoot=join(root,'data','authority');
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));

const manifest=await readJson(join(sourceRoot,'manifest.json'));
const registry=await readJson(join(authorityRoot,'current-authority-rules-2026-08-08.json'));
const gaps=await readJson(join(authorityRoot,'gap-queue-2026-08-08.json'));
const map=await readJson(join(authorityRoot,'d2c-response-escalation-map-2026-08-10.json'));
const topics=(await readJson(join(sourceRoot,'topic-families-d2c-response.json'))).topicFamilies||[];
const d2c=await readJson(join(root,'data','question-bank','d2c.json'));

const family=id=>topics.find(item=>item.id===id);
const order=item=>(item?.recommendations||[]).map(row=>Array.isArray(row)?row[0]:'').filter(Boolean);
const route=id=>(map.routes||[]).find(item=>item.id===id);

if(!Array.isArray(registry.rules)||registry.rules.length!==15) throw new Error('D2C response work must not change the 15-rule governing authority registry.');
if(manifest.d2cResponseEscalationMapFile!=='../authority/d2c-response-escalation-map-2026-08-10.json') throw new Error('D2C response map manifest pointer is missing.');
if(!(manifest.topicFamilyFiles||[]).includes('topic-families-d2c-response.json')) throw new Error('D2C response topic overlay is not registered.');
if(manifest.schemaVersion<28) throw new Error('Study-source manifest schema must register the D2C response layer.');
if(d2c?.meta?.recordsPreservedUnchanged!==true||d2c?.meta?.questionCount!==305) throw new Error('D2C preserved question module changed.');
if(map.authorityRegistryChanged!==false||map.authorityRegistryRuleCountExpected!==15) throw new Error('D2C map must preserve the governing authority registry.');

const expected=['recognize','verify','document','technical-correction','escalate'];
const actual=(map.responseSequence||[]).map(item=>item.id);
if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error(`D2C response sequence changed: ${actual.join(' -> ')}`);
if((map.routes||[]).length<9) throw new Error('D2C response map must keep all separated routes.');
if(!/immediate threat.*facility emergency response/i.test(map.safetyOverride||'')) throw new Error('D2C immediate-safety override is missing.');
if(!(map.explicitNonRules||[]).some(item=>/No universal.*emergency threshold/i.test(item))) throw new Error('D2C universal-emergency-threshold prohibition is missing.');
if(!(map.explicitNonRules||[]).some(item=>/Do not repair.*before checking.*patient/i.test(item))) throw new Error('D2C patient-before-signal-repair boundary is missing.');

for(const id of ['d2c-response-framework','d2c-artifact-signal','d2c-respiratory-verification','d2c-co2-response','d2c-cardiac-response','d2c-treatment-related-response','d2c-pediatric-response','d2c-documentation-escalation']) if(!family(id)) throw new Error(`D2C topic family ${id} is missing.`);

const artifact=order(family('d2c-artifact-signal'));
if(artifact[0]!=='aasm-scoring-manual-v3'||!artifact.includes('aast-standard-psg-2021')) throw new Error('Adult artifact route must lead with AASM technical authority and include AAST Standard PSG workflow.');
const pediatric=order(family('d2c-pediatric-response'));
if(pediatric[0]!=='aasm-scoring-manual-v3'||pediatric.includes('aast-standard-psg-2021')) throw new Error('Pediatric D2C route must lead with AASM and exclude adult Standard PSG authority.');
const co2=order(family('d2c-co2-response'));
if(co2[0]!=='aasm-scoring-manual-v3'||!co2.includes('aast-end-tidal-co2-2018')||!co2.includes('aast-transcutaneous-co2-2018')) throw new Error('D2C CO2 route must keep AASM scoring plus distinct ETCO2 and TcCO2 guidance.');
if(!/Oximetry does not substitute for ventilation/i.test(family('d2c-co2-response')?.authorityBoundary||'')) throw new Error('D2C oxygenation-versus-ventilation boundary is missing.');
const cardiac=order(family('d2c-cardiac-response'));
if(cardiac[0]!=='aasm-scoring-manual-v3'||!/universal emergency threshold/i.test(family('d2c-cardiac-response')?.authorityBoundary||'')) throw new Error('D2C cardiac route must lead with AASM and protect the local threshold boundary.');
const treatment=order(family('d2c-treatment-related-response'));
if(!treatment.includes('aast-pap-titration-2021')||!treatment.includes('aasm-csa-treatment-2025')) throw new Error('D2C treatment-related route must retain PAP workflow and current CSA authority without collapsing modalities.');

if(!route('d2c-physiologic-event-patient-first')||!/verify the patient/i.test(route('d2c-physiologic-event-patient-first').boundary||'')) throw new Error('D2C patient-first physiologic-event route is missing.');
if(!route('d2c-documentation-handoff')||!/patient\/signal verification/i.test(route('d2c-documentation-handoff').boundary||'')) throw new Error('D2C documentation handoff route is incomplete.');

const gap=(gaps.taskGaps||[]).find(item=>item.task==='D2C');
if(!gap||!/strengthened/i.test(gap.gap||'')||!/2026-08-10/i.test(gap.progress||'')) throw new Error('D2C gap-queue progress is not recorded correctly.');

console.log(JSON.stringify({
  d2cQuestions:d2c.meta.questionCount,
  responseSteps:actual,
  responseRoutes:map.routes.length,
  responseTopicFamilies:topics.length,
  governingAuthorityRules:registry.rules.length,
  questionModulePreserved:true,
  patientAndSignalVerificationProtected:true,
  localEmergencyThresholdBoundary:true,
  pediatricAdultAuthoritySeparated:true,
  co2TechnologiesSeparated:true
},null,2));
