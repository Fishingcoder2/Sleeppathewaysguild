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
const map=await readJson(join(authorityRoot,'pediatric-infant-crosswalk-2026-08-08.json'));
const topics=(await readJson(join(sourceRoot,'topic-families-pediatric-crosswalk.json'))).topicFamilies||[];
const d2a=await readJson(join(root,'data','question-bank','d2a.json'));
const d3b=await readJson(join(root,'data','question-bank','d3b.json'));

const family=id=>topics.find(item=>item.id===id);
const order=item=>(item?.recommendations||[]).map(row=>Array.isArray(row)?row[0]:'').filter(Boolean);

if(!Array.isArray(registry.rules)||registry.rules.length!==15) throw new Error('Pediatric crosswalk work must not change the 15-rule governing authority registry.');
if(manifest.pediatricInfantCrosswalkFile!=='../authority/pediatric-infant-crosswalk-2026-08-08.json') throw new Error('Pediatric/infant crosswalk manifest pointer is missing.');
if(!(manifest.topicFamilyFiles||[]).includes('topic-families-pediatric-crosswalk.json')) throw new Error('Pediatric/infant topic overlay is not registered.');
if(manifest.schemaVersion<26) throw new Error('Study-source manifest schema must register the pediatric/infant crosswalk.');
if(d2a?.meta?.recordsPreservedUnchanged!==true||d3b?.meta?.recordsPreservedUnchanged!==true) throw new Error('D2A and D3B extracted question modules must remain preserved unchanged.');
if(d3b?.meta?.questionCount!==112) throw new Error('D3B preserved question count changed.');

if(map.authorityRegistryChanged!==false||map.authorityRegistryRuleCountExpected!==15||(map.routes||[]).length<11) throw new Error('Pediatric crosswalk must preserve the authority registry and all separated routes.');
for(const key of ['technicalDigitalSpecifications','pediatricSleepStaging','infantSleepStaging','arousalRules','movementRules','pediatricRespiratoryRules']) if(!map.localAasmV3Locators?.[key]) throw new Error(`Missing AASM V3 local locator: ${key}.`);
if(!(map.explicitBoundaries||[]).some(item=>/AAST Standard Polysomnography.*not pediatric PSG scoring authority/i.test(item))) throw new Error('Adult AAST Standard PSG pediatric-authority exclusion is missing.');

for(const id of ['pediatric-technical-preparation','pediatric-scoring-current','infant-scoring-current','pediatric-co2-oximetry','pediatric-mslt-current','pediatric-documentation']) if(!family(id)) throw new Error(`Pediatric topic family ${id} is missing.`);

const prep=order(family('pediatric-technical-preparation'));
if(prep[0]!=='aasm-scoring-manual-v3'||!prep.includes('aast-core-competencies-current')) throw new Error('Pediatric technical preparation must lead with AASM technical/scoring authority and include age-specific competency.');
if(prep.includes('aast-standard-psg-2021')) throw new Error('AAST Standard PSG must not be routed as pediatric PSG authority.');

const pedsScoring=order(family('pediatric-scoring-current'));
if(pedsScoring[0]!=='aasm-scoring-manual-v3') throw new Error('Current pediatric scoring must lead with AASM Scoring Manual Version 3.');
const infant=order(family('infant-scoring-current'));
if(infant[0]!=='aasm-scoring-manual-v3'||!infant.includes('atlas-infant-polysomnography-2003')) throw new Error('Infant route must lead with AASM and retain the infant atlas only as support.');

const co2=order(family('pediatric-co2-oximetry'));
if(co2[0]!=='aasm-scoring-manual-v3'||!co2.includes('aast-transcutaneous-co2-2018')||!co2.includes('aast-end-tidal-co2-2018')) throw new Error('Pediatric CO2 route must preserve AASM-first scoring plus distinct TcCO2 and ETCO2 guidance.');
if(!/oximetry.*not.*substitute.*ventilation/i.test(family('pediatric-co2-oximetry')?.authorityBoundary||'')) throw new Error('Pediatric oximetry-versus-ventilation boundary is missing.');

const mslt=order(family('pediatric-mslt-current'));
if(mslt[0]!=='aasm-pediatric-mslt-mwt-2024'||!mslt.includes('aasm-scoring-manual-v3')) throw new Error('Pediatric MSLT route must lead with the 2024 AASM protocol and retain current scoring/reporting authority.');
if(mslt.includes('aasm-adult-mslt-mwt-2021')) throw new Error('Adult MSLT protocol must not be substituted for the pediatric route.');

const gap=(gaps.taskGaps||[]).find(item=>item.task==='D3B + D2A');
if(!gap||!/crosswalk strengthened/i.test(gap.gap||'')||!/15-rule governing authority registry/i.test(gap.progress||'')) throw new Error('Pediatric/infant gap-queue progress is not recorded correctly.');
const d2aGap=(gaps.d2aGaps||[]).find(item=>item.id==='GAP-D2A-01');
if(!d2aGap||!/strengthened/i.test(d2aGap.gap||'')||!/no bulk D2A question generation/i.test(d2aGap.progress||'')) throw new Error('D2A pediatric preparation progress is not recorded correctly.');

console.log(JSON.stringify({
  pediatricCrosswalkRoutes:map.routes.length,
  pediatricTopicFamilies:topics.length,
  governingAuthorityRules:registry.rules.length,
  d3bQuestions:d3b.meta.questionCount,
  questionModulesPreserved:true,
  standardAdultPsgExcludedFromPediatricAuthority:true,
  childAndInfantScoringSeparated:true,
  co2TechnologiesSeparated:true,
  pediatricMsltCurrentProtocolFirst:true
},null,2));
