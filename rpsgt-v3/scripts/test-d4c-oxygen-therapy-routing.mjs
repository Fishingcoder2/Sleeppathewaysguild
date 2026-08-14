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
const map=await readJson(join(authorityRoot,'d4c-oxygen-therapy-map-2026-08-08.json'));
const topics=(await readJson(join(sourceRoot,'topic-families-d4c.json'))).topicFamilies||[];
const questions=await readJson(join(root,'data','question-bank','d4c.json'));

const sourceDocs=new Map();
for(const file of manifest.sourceFiles||[]){
  const source=await readJson(join(sourceRoot,file));
  sourceDocs.set(source.id,source);
}
const family=id=>topics.find(item=>item.id===id);
const order=item=>(item?.recommendations||[]).map(row=>Array.isArray(row)?row[0]:'').filter(Boolean);

if(!Array.isArray(registry.rules)||registry.rules.length!==15) throw new Error('D4C work must not change the 15-rule governing authority registry.');
if(manifest.d4cOxygenTherapyMapFile!=='../authority/d4c-oxygen-therapy-map-2026-08-08.json') throw new Error('D4C oxygen authority-map manifest pointer is missing.');
if(!(manifest.topicFamilyFiles||[]).includes('topic-families-d4c.json')) throw new Error('D4C topic-family overlay is not registered.');
if(questions?.meta?.questionCount!==122||questions?.meta?.recordsPreservedUnchanged!==true) throw new Error('D4C must preserve the 122-question extracted module unchanged.');

const manualPap=sourceDocs.get('aasm-manual-pap-titration-2008');
if(!(manualPap?.mappedTaskCodes||[]).includes('D4C')) throw new Error('AASM manual PAP titration source must map to D4C for its supplemental-oxygen section.');
if(!(manualPap?.sections||[]).some(item=>item.id==='aasm-manual-pap-oxygen')) throw new Error('AASM manual PAP titration supplemental-oxygen section is missing.');
if(!/not a universal oxygen protocol/i.test(manualPap?.authorityBoundary||'')) throw new Error('PAP-specific oxygen boundary is missing from the AASM manual titration source.');

const aastPap=sourceDocs.get('aast-pap-titration-2021');
if(!(aastPap?.sections||[]).some(item=>item.id==='aast-titration-oxygen')) throw new Error('AAST PAP titration oxygen section is missing.');
if(!/universal oxygen algorithm/i.test(aastPap?.authorityBoundary||'')) throw new Error('AAST PAP oxygen universal-algorithm boundary is missing.');

const oxygenCompetency=sourceDocs.get('aast-supplemental-low-flow-oxygen');
for(const phrase of ['physician order','facility policy','manufacturer']) if(!String(oxygenCompetency?.authorityBoundary||'').toLowerCase().includes(phrase)) throw new Error(`AAST oxygen competency boundary is missing ${phrase}.`);
if(!/not a universal oxygen titration algorithm/i.test(oxygenCompetency?.authorityBoundary||'')) throw new Error('AAST oxygen competency must not be treated as a universal algorithm.');

for(const id of ['d4c-ordered-low-flow-oxygen','d4c-pap-titration-oxygen','d4c-csa-heart-failure-oxygen','d4c-csa-high-altitude-oxygen','d4c-hypoventilation-oxygen-co2','d4c-pediatric-infant-oxygen','d4c-safety-scope-oxygen','d4c-documentation-oxygen']) if(!family(id)) throw new Error(`D4C route ${id} is missing.`);

const papOxygen=order(family('d4c-pap-titration-oxygen'));
if(papOxygen[0]!=='aasm-manual-pap-titration-2008'||!papOxygen.includes('aast-pap-titration-2021')) throw new Error('PAP oxygen route must lead with active AASM manual PAP titration and include current AAST workflow.');
for(const id of ['d4c-csa-heart-failure-oxygen','d4c-csa-high-altitude-oxygen']) if(order(family(id))[0]!=='aasm-csa-treatment-2025') throw new Error(`${id} must lead with the 2025 AASM adult CSA treatment guideline.`);

const hypovent=order(family('d4c-hypoventilation-oxygen-co2'));
if(hypovent[0]!=='aasm-scoring-manual-v3'||!hypovent.includes('aast-transcutaneous-co2-2018')||!hypovent.includes('aast-end-tidal-co2-2018')) throw new Error('Hypoventilation/oxygen route must preserve AASM scoring plus distinct TcCO2 and ETCO2 monitoring.');
if(!/improved SpO2 with adequate ventilation/i.test(family('d4c-hypoventilation-oxygen-co2')?.authorityBoundary||'')) throw new Error('Oxygenation-versus-ventilation boundary is missing.');

const pediatric=order(family('d4c-pediatric-infant-oxygen'));
if(pediatric[0]!=='aasm-scoring-manual-v3'||!pediatric.includes('aast-core-competencies-current')) throw new Error('Pediatric oxygen route must be AASM-first with age-specific AAST competency.');
if(pediatric.includes('aast-standard-psg-2021')) throw new Error('AAST Standard PSG must not be routed as pediatric oxygen/scoring authority.');

const safety=order(family('d4c-safety-scope-oxygen'));
if(safety[0]!=='aasm-accreditation-standards-2025'||!safety.includes('aast-scope-practice-current')) throw new Error('Oxygen safety route must lead with facility-protocol requirements and scope.');
if(map.authorityRegistryChanged!==false||map.authorityRegistryRuleCountExpected!==15||(map.therapyRoutes||[]).length!==8) throw new Error('D4C authority map must preserve eight separated routes without changing governing registry.');
if(!(map.explicitNonRules||[]).some(item=>/No universal oxygen titration algorithm/i.test(item))) throw new Error('D4C map must explicitly reject a universal oxygen algorithm.');

console.log(JSON.stringify({
  d4cQuestions:questions.meta.questionCount,
  d4cRoutes:map.therapyRoutes.length,
  governingAuthorityRules:registry.rules.length,
  papOxygenSeparated:true,
  csaHeartFailureSeparated:true,
  csaHighAltitudeSeparated:true,
  hypoventilationCo2Boundary:true,
  pediatricAgeSpecificBoundary:true,
  universalOxygenAlgorithmRejected:true
},null,2));
