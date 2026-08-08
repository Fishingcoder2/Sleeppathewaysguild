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
const map=await readJson(join(authorityRoot,'d4b-alternative-therapy-map-2026-08-08.json'));
const topics=(await readJson(join(sourceRoot,'topic-families-d4b.json'))).topicFamilies||[];
const plans=(await readJson(join(sourceRoot,'task-plans.json'))).taskPlans||{};
const sourceDocs=new Map();
for(const file of manifest.sourceFiles||[]){
  const source=await readJson(join(sourceRoot,file));
  sourceDocs.set(source.id,source);
}
const family=id=>topics.find(item=>item.id===id);
const order=item=>(item?.recommendations||[]).map(row=>Array.isArray(row)?row[0]:'').filter(Boolean);

if(!Array.isArray(registry.rules)||registry.rules.length!==15) throw new Error('D4B work must not change the 15-rule governing authority registry.');
if(manifest.d4bAlternativeTherapyMapFile!=='../authority/d4b-alternative-therapy-map-2026-08-08.json') throw new Error('D4B authority-map manifest pointer is missing.');
if(!(manifest.topicFamilyFiles||[]).includes('topic-families-d4b.json')) throw new Error('D4B topic-family overlay is not registered.');

for(const id of ['ers-non-cpap-osa-2021','ats-weight-management-osa-2018','fda-hgns-device-labeling-current','fda-tirzepatide-osa-2024']){
  const source=sourceDocs.get(id);
  if(!source||source.sourceRole!=='studySupport'||source.currentAuthority!==false||(source.mappedTaskCodes||[]).join(',')!=='D4B') throw new Error(`${id} must remain D4B support/overlay, not governing authority.`);
  if(registry.rules.some(rule=>rule.sourceId===id)) throw new Error(`${id} must not be promoted into the governing authority registry.`);
}
const fdaHgns=sourceDocs.get('fda-hgns-device-labeling-current');
for(const pma of ['P130008','P240024','P250013']) if(!(fdaHgns.regulatoryRecords||[]).some(item=>item.pma===pma)) throw new Error(`FDA HNS map is missing ${pma}.`);
if(!/No universal HNS eligibility rule/i.test(fdaHgns.authorityBoundary||'')) throw new Error('Device-specific HNS boundary is missing.');
if(!/not an independent prescribing protocol/i.test(sourceDocs.get('fda-tirzepatide-osa-2024').authorityBoundary||'')) throw new Error('Tirzepatide prescribing/scope boundary is missing.');

const uas=family('d4b-upper-airway-stimulation');
for(const id of ['aasm-surgical-referral-osa-2021','fda-hgns-device-labeling-current','ers-non-cpap-osa-2021']) if(!order(uas).includes(id)) throw new Error(`UAS route is missing ${id}.`);
if(!/No single device's numeric criteria are universal/i.test(uas?.authorityBoundary||'')) throw new Error('UAS universal-criteria protection is missing.');
const positional=order(family('d4b-positional-therapy'));
if(positional[0]!=='ers-non-cpap-osa-2021'||!positional.includes('aasm-adult-osa-evaluation-management-2009')) throw new Error('Positional therapy must lead with current ERS support and retain legacy AASM context.');
const weight=order(family('d4b-weight-management'));
for(const id of ['fda-tirzepatide-osa-2024','ats-weight-management-osa-2018']) if(!weight.includes(id)) throw new Error(`Weight-management route is missing ${id}.`);
if(order(family('d4b-bariatric-referral'))[0]!=='aasm-surgical-referral-osa-2021') throw new Error('Bariatric referral must lead with current AASM surgical-referral guidance.');

const plan=(plans.D4B?.sequence||[]).map(item=>item.sourceId);
for(const id of ['aasm-oral-appliance-2015','aasm-surgical-referral-osa-2021','aasm-csa-treatment-2025','aast-oral-appliance-titration-2018','fda-hgns-device-labeling-current','fda-tirzepatide-osa-2024','ers-non-cpap-osa-2021','ats-weight-management-osa-2018']) if(!plan.includes(id)) throw new Error(`D4B Guided Study plan is missing ${id}.`);
if(plan.indexOf('aasm-csa-treatment-2025')>plan.indexOf('aast-oral-appliance-titration-2018')) throw new Error('D4B plan lost AASM-before-support ordering.');

if(map.authorityRegistryChanged!==false||map.authorityRegistryRuleCountExpected!==15||(map.therapyRoutes||[]).length<7) throw new Error('D4B authority map does not preserve separated routes and registry boundaries.');
if(!(map.remainingGaps||[]).some(item=>/AASM.*upper-airway-stimulation/i.test(item.topic||''))) throw new Error('Dedicated AASM UAS guideline gap must remain visible.');
const d4bGap=(gaps.taskGaps||[]).find(item=>item.task==='D4B');
if(!d4bGap||!/synthesis strengthened/i.test(d4bGap.gap||'')||!/15-rule/i.test(d4bGap.progress||'')) throw new Error('D4B gap queue progress is not recorded correctly.');

console.log(JSON.stringify({
  d4bRoutes:(map.therapyRoutes||[]).length,
  governingAuthorityRules:registry.rules.length,
  externalSupportPromoted:false,
  deviceSpecificHgnsBoundary:true,
  tirzepatideScopeBoundary:true,
  dedicatedAasmUasCpgGapStillOpen:true
},null,2));
