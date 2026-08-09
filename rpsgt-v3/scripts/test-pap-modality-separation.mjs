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
const map=await readJson(join(authorityRoot,'pap-modality-separation-2026-08-08.json'));
const topics=(await readJson(join(sourceRoot,'topic-families-pap-modalities.json'))).topicFamilies||[];
const d1c=await readJson(join(root,'data','question-bank','d1c.json'));
const d4a=await readJson(join(root,'data','question-bank','d4a.json'));
const aasmOsa=await readJson(join(sourceRoot,'aasm-pap-treatment-2019.json'));
const aasmCsa=await readJson(join(sourceRoot,'aasm-csa-treatment-2025.json'));
const aastTitration=await readJson(join(sourceRoot,'aast-pap-titration-2021.json'));

const family=id=>topics.find(item=>item.id===id);
const order=item=>(item?.recommendations||[]).map(row=>Array.isArray(row)?row[0]:'').filter(Boolean);

if(!Array.isArray(registry.rules)||registry.rules.length!==15) throw new Error('PAP modality work must not change the 15-rule governing authority registry.');
if(manifest.papModalitySeparationFile!=='../authority/pap-modality-separation-2026-08-08.json') throw new Error('PAP modality authority-map manifest pointer is missing.');
if(!(manifest.topicFamilyFiles||[]).includes('topic-families-pap-modalities.json')) throw new Error('PAP modality topic-family overlay is not registered.');
if(manifest.schemaVersion<27) throw new Error('Study-source manifest schema must register the PAP modality separation layer.');
if(d1c?.meta?.questionCount!==77||d4a?.meta?.questionCount!==360) throw new Error('D1C/D4A preserved question counts changed.');
if(d1c?.meta?.recordsPreservedUnchanged!==true||d4a?.meta?.recordsPreservedUnchanged!==true) throw new Error('D1C/D4A extracted question modules must remain unchanged.');
if(map.authorityRegistryChanged!==false||map.authorityRegistryRuleCountExpected!==15||(map.routes||[]).length!==7) throw new Error('PAP modality map must preserve seven routes and the 15-rule authority registry.');

for(const id of ['pap-osa-current','pap-osa-manual-titration-current','pap-csa-asv-current','pap-treatment-emergent-central-current','pap-hypoventilation-niv-current','pap-cross-modality-support','pap-device-facility-boundary']) if(!family(id)) throw new Error(`PAP modality topic family ${id} is missing.`);

const osa=order(family('pap-osa-current'));
if(osa[0]!=='aasm-pap-treatment-2019'||!osa.includes('aast-pap-acclimation-2022')||!osa.includes('aast-pap-titration-2021')) throw new Error('OSA PAP route must lead with current AASM OSA PAP treatment guidance and retain technologist support/workflow.');
if(osa.includes('aasm-csa-treatment-2025')) throw new Error('OSA PAP route must not contain the adult CSA treatment guideline.');
if(!/adult OSA/i.test(aasmOsa.bestFor||'')||!(aasmOsa.mappedTaskCodes||[]).includes('D1C')||!(aasmOsa.mappedTaskCodes||[]).includes('D4A')) throw new Error('AASM OSA PAP source identity/task coverage changed.');

const manual=order(family('pap-osa-manual-titration-current'));
if(manual[0]!=='aasm-manual-pap-titration-2008'||!manual.includes('aast-pap-titration-2021')) throw new Error('OSA manual titration route must preserve AASM manual titration plus AAST workflow.');
if(!/not.*treatment authority for CSA\/ASV/i.test(aastTitration.authorityBoundary||'')) throw new Error('AAST OSA titration CSA/ASV exclusion is missing.');

const csa=order(family('pap-csa-asv-current'));
if(csa[0]!=='aasm-csa-treatment-2025'||csa.includes('aast-pap-titration-2021')||csa.includes('aasm-pap-treatment-2019')) throw new Error('CSA/ASV route must lead with 2025 AASM CSA guidance and exclude OSA treatment/titration authority.');
if(aasmCsa.publicationYear!==2025||aasmCsa.currentAuthority!==true||!(aasmCsa.mappedTaskCodes||[]).includes('D1C')||!(aasmCsa.mappedTaskCodes||[]).includes('D4A')) throw new Error('2025 AASM CSA treatment source identity/task coverage changed.');

const tecsa=order(family('pap-treatment-emergent-central-current'));
if(tecsa[0]!=='aasm-scoring-manual-v3'||!tecsa.includes('aasm-csa-treatment-2025')) throw new Error('Treatment-emergent central route must recognize/score first and then use current CSA treatment guidance.');
if(!/not.*automatically.*OSA.*pressure-increase algorithm/i.test(family('pap-treatment-emergent-central-current')?.authorityBoundary||'')) throw new Error('Treatment-emergent central versus OSA pressure-response boundary is missing.');

const niv=order(family('pap-hypoventilation-niv-current'));
if(niv[0]!=='aasm-scoring-manual-v3'||!niv.includes('aast-transcutaneous-co2-2018')||!niv.includes('aast-end-tidal-co2-2018')) throw new Error('NIV route must preserve AASM scoring plus distinct TcCO2/ETCO2 monitoring guidance.');
if(niv.includes('aast-pap-titration-2021')||niv.includes('aasm-pap-treatment-2019')) throw new Error('Hypoventilation/NIV route must not inherit OSA PAP treatment/titration authority.');
for(const phrase of ['order','facility protocol','manufacturer instructions','no universal NIV titration algorithm']) if(!String(family('pap-hypoventilation-niv-current')?.authorityBoundary||'').toLowerCase().includes(phrase.toLowerCase())) throw new Error(`NIV local/device boundary is missing: ${phrase}.`);

const support=order(family('pap-cross-modality-support'));
if(support[0]!=='aast-pap-acclimation-2022'||!support.includes('aast-core-competencies-current')) throw new Error('Cross-modality PAP support route must lead with AAST acclimation/support competency.');
if(!/does not decide.*diagnosis.*treatment indication.*modality.*device settings/i.test(family('pap-cross-modality-support')?.authorityBoundary||'')) throw new Error('Cross-modality support versus treatment-selection boundary is missing.');

if(!(map.explicitNonRules||[]).some(item=>/Do not collapse CPAP, BPAP for OSA, ASV for CSA, and NIV for hypoventilation/i.test(item))) throw new Error('PAP modality non-collapse rule is missing.');
if(!(map.remainingGaps||[]).some(item=>/NIV titration protocol/i.test(item.topic||'')&&item.status==='not identified')) throw new Error('Unresolved universal NIV titration-source gap must remain explicit.');

const gap=(gaps.taskGaps||[]).find(item=>item.task==='D4A + D1C');
if(!gap||!/modality separation strengthened/i.test(gap.gap||'')||!/15-rule governing authority registry/i.test(gap.progress||'')) throw new Error('PAP modality gap-queue progress is not recorded correctly.');
const d2aGap=(gaps.d2aGaps||[]).find(item=>item.id==='GAP-D2A-04');
if(!d2aGap||!/separation strengthened/i.test(d2aGap.gap||'')||!/pap modality separation/i.test(d2aGap.action||'')) throw new Error('D2A PAP modality separation progress is not recorded correctly.');

console.log(JSON.stringify({
  d1cQuestions:d1c.meta.questionCount,
  d4aQuestions:d4a.meta.questionCount,
  questionModulesPreserved:true,
  papModalityRoutes:map.routes.length,
  governingAuthorityRules:registry.rules.length,
  osaPapSeparated:true,
  csaAsvSeparated:true,
  treatmentEmergentCentralSeparated:true,
  hypoventilationNivSeparated:true,
  crossModalitySupportBounded:true,
  universalNivAlgorithmRejected:true
},null,2));
