import {readFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const authorityRoot=join(root,'data','authority');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
const registry=JSON.parse(await readFile(join(authorityRoot,'current-authority-rules-2026-08-08.json'),'utf8'));
const gaps=JSON.parse(await readFile(join(authorityRoot,'gap-queue-2026-08-08.json'),'utf8'));
const topicsA=JSON.parse(await readFile(join(sourceRoot,'topic-families-a.json'),'utf8')).topicFamilies||[];
const topicsB=JSON.parse(await readFile(join(sourceRoot,'topic-families-b.json'),'utf8')).topicFamilies||[];

if(manifest.schemaVersion<25) throw new Error('Study-source manifest schema must include the separate authority-registry layer.');
if(manifest.authorityRegistryFile!=='../authority/current-authority-rules-2026-08-08.json') throw new Error('Current authority registry pointer is missing or changed.');
if(manifest.authorityGapQueueFile!=='../authority/gap-queue-2026-08-08.json') throw new Error('Authority gap queue pointer is missing or changed.');
if(registry.verifiedAt!=='2026-08-08'||registry.schemaVersion!==1) throw new Error('Authority registry verification identity changed.');
if(!Array.isArray(registry.rules)||registry.rules.length!==15) throw new Error('Authority registry must preserve all 15 audited rules.');
const ids=registry.rules.map(rule=>rule.ruleId);
if(new Set(ids).size!==15) throw new Error('Authority registry contains duplicate rule IDs.');
for(let i=1;i<=15;i++) if(!ids.includes(`AUTH-${String(i).padStart(3,'0')}`)) throw new Error(`Authority rule AUTH-${String(i).padStart(3,'0')} is missing.`);

const sourceFiles=new Set(manifest.sourceFiles||[]);
const sourceDocs=new Map();
for(const file of sourceFiles){
  const source=JSON.parse(await readFile(join(sourceRoot,file),'utf8'));
  sourceDocs.set(source.id,source);
}
for(const rule of registry.rules){
  if(!sourceDocs.has(rule.sourceId)) throw new Error(`${rule.ruleId} points to an unknown source ${rule.sourceId}.`);
  if(!Array.isArray(rule.tasks)||!rule.tasks.length) throw new Error(`${rule.ruleId} has no task coverage.`);
}

const rule=id=>registry.rules.find(item=>item.ruleId===id);
if(rule('AUTH-001').level!==1||rule('AUTH-001').sourceId!=='aasm-scoring-manual-v3') throw new Error('AASM Scoring Manual must remain level-1 governing scoring authority.');
if(rule('AUTH-015').level!==2||rule('AUTH-015').sourceId!=='aasm-accreditation-standards-2025') throw new Error('2025 AASM accreditation standards must remain the level-2 protocol/accreditation layer.');
if(rule('AUTH-008').level!==3||rule('AUTH-008').sourceId!=='aasm-csa-treatment-2025') throw new Error('2025 AASM adult CSA treatment guideline must remain active level-3 treatment authority.');
for(const id of ['AUTH-002','AUTH-003','AUTH-004','AUTH-005','AUTH-006','AUTH-012','AUTH-013','AUTH-014']) if(rule(id).level!==4) throw new Error(`${id} must remain in the AAST technologist technical/competency/scope/role layer.`);

const csa=sourceDocs.get('aasm-csa-treatment-2025');
if(csa.currentAuthority!==true||csa.sourceRole!=='currentAuthority'||csa.publicationYear!==2025||csa.doi!=='10.5664/jcsm.11858') throw new Error('2025 AASM CSA treatment source identity/currentness changed.');
for(const task of ['D1A','D1C','D2C','D4A','D4B','D4C']) if(!(csa.mappedTaskCodes||[]).includes(task)) throw new Error(`CSA treatment authority is missing ${task}.`);
if(!/distinct from diaphragm pacing/i.test(csa.authorityBoundary||'')) throw new Error('Transvenous PNS versus diaphragm-pacing boundary is missing.');

const oxygen=sourceDocs.get('aast-supplemental-low-flow-oxygen');
if(oxygen.sourceType!=='AAST sleep-technologist core competency'||!/not an AAST Technical Guideline/i.test(oxygen.sourceIdentityNote||'')) throw new Error('Low-flow oxygen must remain identified as an AAST competency, not a technical guideline.');
const standardPsg=sourceDocs.get('aast-standard-psg-2021');
if(!/does not address pediatric PSG, HSAT, or therapeutic PAP\/oxygen titration/i.test(standardPsg.authorityBoundary||'')) throw new Error('AAST Standard PSG pediatric/HSAT/therapy exclusion is missing.');
for(const task of ['D2A','D2B','D2C','D3C']) if(!(standardPsg.mappedTaskCodes||[]).includes(task)) throw new Error(`Standard PSG authority coverage is missing ${task}.`);

const adultDay=sourceDocs.get('aasm-adult-mslt-mwt-2021');
for(const task of ['D1A','D2A','D2B','D3C']) if(!(adultDay.mappedTaskCodes||[]).includes(task)) throw new Error(`Adult MSLT/MWT authority coverage is missing ${task}.`);
if(!adultDay.erratum||adultDay.erratum.year!==2022) throw new Error('Adult MSLT/MWT 2022 erratum protection is missing.');
const pedsDay=sourceDocs.get('aasm-pediatric-mslt-mwt-2024');
for(const task of ['D1A','D1B','D2A','D2B','D3B','D3C']) if(!(pedsDay.mappedTaskCodes||[]).includes(task)) throw new Error(`Pediatric MSLT authority coverage is missing ${task}.`);

for(const id of ['aast-end-tidal-co2-2018','aast-transcutaneous-co2-2018']){
  const source=sourceDocs.get(id);
  for(const task of ['D2A','D2B','D2C','D3A','D3B','D4C']) if(!(source.mappedTaskCodes||[]).includes(task)) throw new Error(`${id} authority coverage is missing ${task}.`);
}
const papTech=sourceDocs.get('aast-pap-titration-2021');
for(const task of ['D1B','D1C','D2A','D2B','D2C','D4A','D4C']) if(!(papTech.mappedTaskCodes||[]).includes(task)) throw new Error(`AAST PAP titration authority coverage is missing ${task}.`);
if(!/Do not use this source as the treatment authority for CSA\/ASV/i.test(papTech.authorityBoundary||'')) throw new Error('AAST PAP titration CSA/ASV override boundary is missing.');

function family(list,id){return list.find(item=>item.id===id);}
function order(item){return (item&&Array.isArray(item.recommendations)?item.recommendations:[]).map(row=>Array.isArray(row)?row[0]:'').filter(Boolean);}
const pediatric=family(topicsB,'pediatric');
const pediatricOrder=order(pediatric);
if(pediatricOrder[0]!=='aasm-scoring-manual-v3'||!pediatricOrder.includes('aasm-pediatric-mslt-mwt-2024')||!pediatricOrder.includes('aast-core-competencies-current')) throw new Error('Pediatric authority-first crosswalk is incomplete.');
if(pediatricOrder.includes('aast-standard-psg-2021')) throw new Error('AAST Standard PSG must not be routed as pediatric PSG authority.');

const osaPap=order(family(topicsB,'pap-titration'));
if(osaPap[0]!=='aasm-pap-treatment-2019'||!osaPap.includes('aast-pap-titration-2021')) throw new Error('OSA PAP route must lead with current OSA PAP treatment and technologist titration guidance.');
if(osaPap.includes('aasm-csa-treatment-2025')) throw new Error('Generic OSA PAP route must not contain the CSA treatment guideline.');
const csaPap=order(family(topicsB,'csa-asv-treatment'));
if(csaPap[0]!=='aasm-csa-treatment-2025') throw new Error('CSA/ASV route must lead with the 2025 AASM adult CSA guideline.');
const niv=family(topicsB,'hypoventilation-niv');
if(!niv||!Array.isArray(niv.recommendations)||!/manufacturer instructions/i.test(niv.authorityBoundary||'')) throw new Error('Hypoventilation/NIV pathway must require manufacturer/facility overlays.');

const oxygenRoute=family(topicsB,'oxygen-therapy');
const oxygenOrder=order(oxygenRoute);
if(oxygenOrder[0]!=='aast-supplemental-low-flow-oxygen'||!oxygenOrder.includes('aast-scope-practice-current')||!oxygenOrder.includes('aasm-csa-treatment-2025')) throw new Error('Oxygen authority pathway is incomplete.');
if(!/no standalone current AAST low-flow oxygen technical guideline/i.test(oxygenRoute.authorityBoundary||'')||!/Do not invent a universal oxygen titration protocol/i.test(oxygenRoute.authorityBoundary||'')) throw new Error('Oxygen facility/order-dependent boundary is missing.');

const alternatives=order(family(topicsB,'alternative-therapy'));
for(const id of ['aasm-oral-appliance-2015','aasm-surgical-referral-osa-2021','aasm-csa-treatment-2025']) if(!alternatives.includes(id)) throw new Error(`Alternative-therapy synthesis is missing ${id}.`);
if(!/upper-airway-stimulation authority remains a targeted mapping gap/i.test(family(topicsB,'alternative-therapy').gapNote||'')) throw new Error('Unresolved upper-airway-stimulation authority gap must remain explicit.');

const gas=order(family(topicsB,'gas-exchange'));
if(gas[0]!=='aasm-scoring-manual-v3'||!gas.includes('aast-end-tidal-co2-2018')||!gas.includes('aast-transcutaneous-co2-2018')) throw new Error('Gas-exchange route must preserve AASM-first scoring plus distinct ETCO2/TcCO2 guidance.');
const papSupport=order(family(topicsA,'pap-support'));
if(papSupport[0]!=='aasm-pap-treatment-2019'||!papSupport.includes('aast-pap-acclimation-2022')||!papSupport.includes('aast-pap-titration-2021')) throw new Error('PAP support route lost current authority-first ordering.');
const safety=family(topicsA,'safety-infection');
if(order(safety)[0]!=='aasm-accreditation-standards-2025'||!/facility SOPs/i.test(safety.authorityBoundary||'')) throw new Error('Safety/infection route must lead with accreditation and local-policy boundaries.');
const artifact=family(topicsA,'artifact-troubleshooting');
if(!/Recognize -> verify signal and patient -> document -> perform allowed technical correction -> escalate per facility policy/i.test(artifact.responseFramework||'')) throw new Error('D2C response/escalation framework is missing from artifact troubleshooting.');

const icsd=sourceDocs.get('icsd-3-tr');
if(icsd.libraryAvailability?.currentFullTextVerifiedInLibrary!==false||!/must not be represented as the 2023 ICSD-3-TR/i.test(icsd.libraryAvailability?.olderFullTextBoundary||'')) throw new Error('ICSD-3-TR licensed-current-text gap boundary changed.');
if(!Array.isArray(gaps.taskGaps)||gaps.taskGaps.filter(item=>item.priority==='P0').length!==4) throw new Error('Task gap queue must preserve four P0 priorities.');
if(!gaps.taskGaps.some(item=>item.rank===1&&/ICSD-3-TR exact-page map/i.test(item.gap))) throw new Error('P0 ICSD exact-page gap is missing.');
if(!Array.isArray(gaps.d2aGaps)||gaps.d2aGaps.length!==6||gaps.d2aGaps[0].id!=='GAP-D2A-01') throw new Error('D2A six-gap queue changed.');

console.log(JSON.stringify({
  authorityRules:registry.rules.length,
  separateAuthorityRegistry:true,
  csa2025CurrentAuthority:true,
  pediatricAuthorityCrosswalk:true,
  osaPapSeparatedFromCsaAsv:true,
  hypoventilationNivSeparated:true,
  oxygenOrderFacilityBoundary:true,
  alternativeTherapyCurrentOverlay:true,
  d2cResponseEscalationFramework:true,
  icsdExactPageGapStillOpen:true,
  p0TaskGaps:gaps.taskGaps.filter(item=>item.priority==='P0').length,
  d2aGaps:gaps.d2aGaps.length
},null,2));
