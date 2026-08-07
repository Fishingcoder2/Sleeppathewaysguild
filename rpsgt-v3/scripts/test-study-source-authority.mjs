import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
const plans=JSON.parse(await readFile(join(sourceRoot,'task-plans.json'),'utf8')).taskPlans;

const requiredSources=[
  'brpt-blueprint.json','brpt-handbook.json','brpt-refs.json','aasm-scoring-manual-v3.json','icsd-3-tr.json',
  'aasm-adult-mslt-mwt-2021.json','aasm-pediatric-mslt-mwt-2024.json','aasm-adult-osa-diagnostic-testing-2017.json',
  'aasm-oral-appliance-2015.json','aasm-surgical-referral-osa-2021.json','aasm-manual-pap-titration-2008.json','aasm-pap-treatment-2019.json',
  'aast-patient-assessment-vitals-2022.json','aast-patient-education-2020.json','aast-standard-psg-2021.json',
  'aast-hsat-2020.json','aast-end-tidal-co2-2018.json','aast-transcutaneous-co2-2018.json',
  'aast-pap-acclimation-2022.json','aast-pap-titration-2021.json',
  'aast-oral-appliance-titration-2018.json','aast-supplemental-low-flow-oxygen.json'
];
for(const file of requiredSources){if(!manifest.sourceFiles.includes(file)) throw new Error(`Study-source manifest is missing ${file}`);}
if(manifest.coreLibraryAuditFile!=='core-library-audit.json') throw new Error('Core library audit is not registered in the study-source manifest.');
const coreAudit=JSON.parse(await readFile(join(sourceRoot,manifest.coreLibraryAuditFile),'utf8'));

const sourceDocs={};
for(const file of manifest.sourceFiles){
  const source=JSON.parse(await readFile(join(sourceRoot,file),'utf8'));
  if(!source.id) throw new Error(`${file} is missing a source id.`);
  if(sourceDocs[source.id]) throw new Error(`Duplicate study-source id: ${source.id}`);
  sourceDocs[source.id]=source;
}

const officialTasks=['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C'];
for(const taskCode of officialTasks){
  const plan=plans[taskCode];
  if(!plan||!Array.isArray(plan.sequence)||!plan.sequence.length) throw new Error(`Missing task plan: ${taskCode}`);
  const first=plan.sequence[0];
  if(first.sourceId!=='brpt-blueprint'||!first.sectionIds.includes(`brpt-${taskCode}`)) throw new Error(`${taskCode} does not begin with its BRPT blueprint scope section.`);
  for(const item of plan.sequence){
    if(!sourceDocs[item.sourceId]) throw new Error(`${taskCode} references unknown source ${item.sourceId}`);
    const sectionIds=new Set((sourceDocs[item.sourceId].sections||[]).map(section=>section.id));
    for(const sectionId of item.sectionIds||[]){if(!sectionIds.has(sectionId)) throw new Error(`${taskCode} references unknown section ${item.sourceId}:${sectionId}`);}
  }
}

function tasksUsing(sourceId){return officialTasks.filter(taskCode=>plans[taskCode].sequence.some(item=>item.sourceId===sourceId));}
function assertExactTasks(sourceId,expected){
  const actual=tasksUsing(sourceId);
  if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error(`${sourceId} task mapping changed. Expected ${expected.join(', ')}, got ${actual.join(', ')}.`);
}

assertExactTasks('aast-patient-assessment-vitals-2022',['D1A']);
assertExactTasks('aast-patient-education-2020',['D1B']);
assertExactTasks('aast-pap-acclimation-2022',['D1C','D4A']);
assertExactTasks('aast-standard-psg-2021',['D2A','D2B','D2C']);
assertExactTasks('aast-hsat-2020',['D2A','D2B','D2C']);
assertExactTasks('aast-end-tidal-co2-2018',['D2A','D2B','D2C']);
assertExactTasks('aast-transcutaneous-co2-2018',['D2A','D2B','D2C']);
assertExactTasks('aasm-adult-osa-diagnostic-testing-2017',['D2B']);
assertExactTasks('aasm-adult-mslt-mwt-2021',['D2B','D3C']);
assertExactTasks('aasm-pediatric-mslt-mwt-2024',['D2B','D3C']);
assertExactTasks('aast-pap-titration-2021',['D4A']);
assertExactTasks('aasm-oral-appliance-2015',['D4B']);
assertExactTasks('aasm-surgical-referral-osa-2021',['D4B']);
assertExactTasks('aast-oral-appliance-titration-2018',['D4B']);
assertExactTasks('aast-supplemental-low-flow-oxygen',['D4C']);

const terms=sourceDocs['aast-terms-definitions'];
if(terms.currentAuthority!==false||terms.sourceRole!=='studySupport'||!/must not be substituted/i.test(terms.authorityBoundary||'')) throw new Error('AAST Terms and Definitions is not clearly bounded as terminology support.');
const oxygen=sourceDocs['aast-supplemental-low-flow-oxygen'];
if(oxygen.sourceType!=='AAST sleep-technologist core competency'||!/not an AAST Technical Guideline/i.test(oxygen.sourceIdentityNote||'')) throw new Error('AAST supplemental oxygen source is not clearly identified as a core competency rather than a technical guideline.');

const scoring=sourceDocs['aasm-scoring-manual-v3'];
if(scoring.currentAuthority!==true||scoring.sourceRole!=='currentAuthority'||!/Version 3 released February 2023/i.test(scoring.versionStatus||'')) throw new Error('AASM Scoring Manual Version 3 is not protected as the current scoring authority.');
if(!scoring.erratum||scoring.erratum.date!=='February 2024') throw new Error('AASM Scoring Manual Version 3 erratum metadata is missing.');

const icsd=sourceDocs['icsd-3-tr'];
if(icsd.currentAuthority!==true||icsd.sourceRole!=='currentAuthority'||icsd.publicationYear!==2023) throw new Error('ICSD-3-TR is not protected as current diagnostic authority.');
if(!/not a substitute for the current AASM Scoring Manual/i.test(icsd.authorityBoundary||'')) throw new Error('ICSD-3-TR scoring boundary is missing.');
if(!icsd.libraryAvailability||icsd.libraryAvailability.currentFullTextVerifiedInLibrary!==false||!/must not be represented as the 2023 ICSD-3-TR/i.test(icsd.libraryAvailability.olderFullTextBoundary||'')) throw new Error('ICSD older-edition/current-text-revision boundary is missing.');
const requiredIcsdSections=['Insomnia Disorders','Sleep-Related Breathing Disorders','Central Disorders of Hypersomnolence','Circadian Rhythm Sleep-Wake Disorders','Parasomnias','Sleep-Related Movement Disorders'];
for(const label of requiredIcsdSections){if(!(icsd.sections||[]).some(section=>section.label===label)) throw new Error(`ICSD-3-TR outline is missing ${label}.`);}

const pearls2=sourceDocs['sleep-medicine-pearls-2e'];
if(!pearls2||pearls2.currentAuthority!==false||pearls2.sourceRole!=='studySupport'||!/active provisional teaching source/i.test(pearls2.usageStatus||'')) throw new Error('Sleep Medicine Pearls 2e is not protected as provisional study support.');
if(pearls2.currentBrptListedEdition!=='3rd edition') throw new Error('Sleep Medicine Pearls 2e does not identify the current BRPT-listed 3rd edition.');
if(!/AASM Scoring Manual Version 3 controls current scoring rules/i.test(pearls2.authorityBoundary||'')||!/ICSD-3-TR controls current diagnostic classification/i.test(pearls2.authorityBoundary||'')) throw new Error('Sleep Medicine Pearls 2e current-authority correction boundary is missing.');
if(!Array.isArray(pearls2.versionSensitiveReviewRequiredFor)||pearls2.versionSensitiveReviewRequiredFor.length<5) throw new Error('Sleep Medicine Pearls 2e version-sensitive review queue is missing.');

const auditIds=new Set((coreAudit.coreSources||[]).map(item=>item.sourceId));
for(const id of ['brpt-blueprint','brpt-handbook','aasm-scoring-manual-v3','icsd-3-tr','fundamentals-sleep-technology-3e','polysomnography-sleep-technologist-2014','pediatric-sleep-pearls-1e','clinical-guide-pediatric-sleep-3e','sleep-medicine-pearls-3e']){
  if(!auditIds.has(id)) throw new Error(`Core library audit is missing ${id}.`);
}
const pearls3=(coreAudit.coreSources||[]).find(item=>item.sourceId==='sleep-medicine-pearls-3e');
if(!pearls3||!/library has 2nd edition/i.test(pearls3.libraryAvailability||'')) throw new Error('Sleep Medicine Pearls edition mismatch is not documented.');
const pedsPearls=(coreAudit.coreSources||[]).find(item=>item.sourceId==='pediatric-sleep-pearls-1e');
if(!pedsPearls||!/not found/i.test(pedsPearls.libraryAvailability||'')) throw new Error('Pediatric Sleep Pearls library gap is not documented.');

const diagnostic=sourceDocs['aasm-adult-osa-diagnostic-testing-2017'];
if(!/focused update project as in development/i.test(diagnostic.currencyNote||'')) throw new Error('Adult OSA diagnostic guideline update-watch metadata is missing.');
const hsat=sourceDocs['aast-hsat-2020'];
if(!/Current AASM diagnostic guidance and current AASM Scoring Manual requirements control/i.test(hsat.authorityBoundary||'')) throw new Error('AAST HSAT authority boundary is missing.');
for(const sourceId of ['aast-end-tidal-co2-2018','aast-transcutaneous-co2-2018']){
  if(!/Current AASM Scoring Manual/i.test(sourceDocs[sourceId].authorityBoundary||'')) throw new Error(`${sourceId} does not defer current scoring rules to AASM.`);
}

const professionalSources=[
  'aasm-scoring-manual-v3','icsd-3-tr','aasm-adult-mslt-mwt-2021','aasm-pediatric-mslt-mwt-2024','aasm-adult-osa-diagnostic-testing-2017',
  'aasm-oral-appliance-2015','aasm-surgical-referral-osa-2021','aasm-manual-pap-titration-2008','aasm-pap-treatment-2019',
  'aast-patient-assessment-vitals-2022','aast-patient-education-2020','aast-standard-psg-2021','aast-hsat-2020','aast-end-tidal-co2-2018','aast-transcutaneous-co2-2018',
  'aast-pap-acclimation-2022','aast-pap-titration-2021','aast-oral-appliance-titration-2018','aast-supplemental-low-flow-oxygen'
];
for(const sourceId of professionalSources){
  const source=sourceDocs[sourceId];
  if(source.currentAuthority!==true||source.sourceRole!=='currentAuthority') throw new Error(`${sourceId} is not marked as current professional authority.`);
}
const adult=sourceDocs['aasm-adult-mslt-mwt-2021'];
if(!adult.erratum||adult.erratum.doi!=='10.5664/jcsm.10100') throw new Error('Adult MSLT/MWT erratum protection is missing.');
const surgery=sourceDocs['aasm-surgical-referral-osa-2021'];
if(!/replaces the previously published 2010 AASM surgical guideline/i.test(surgery.currencyNote||'')) throw new Error('AASM surgical-referral supersession note is missing.');

for(const taskCode of officialTasks){
  const sequence=plans[taskCode].sequence.map(item=>item.sourceId);
  const fundamentalsIndex=sequence.indexOf('fundamentals-sleep-technology-3e');
  if(fundamentalsIndex<0) continue;
  const professionalBefore=sequence.slice(1,fundamentalsIndex).some(sourceId=>sourceDocs[sourceId]?.currentAuthority===true&&sourceId!=='brpt-blueprint');
  if(!professionalBefore) throw new Error(`${taskCode} still reaches Fundamentals before any applicable professional guidance.`);
}

console.log(JSON.stringify({
  sourceFiles:manifest.sourceFiles.length,
  brptBlueprintFirstAcrossTasks:true,
  allTwelveTasksProfessionalBeforeTextbook:true,
  coreLibraryAuditProtected:true,
  icsdCurrentDiagnosticAuthority:true,
  icsdLegacyFullTextBoundaryProtected:true,
  sleepMedicinePearlsEditionGapProtected:true,
  sleepMedicinePearls2eProvisionalUseProtected:true,
  pediatricSleepPearlsGapProtected:true,
  scoringManualCurrentAuthority:true,
  diagnosticGuidelineUpdateWatch:true,
  aastTerminologyBoundaryProtected:true,
  sectionReferencesValidated:true
},null,2));
