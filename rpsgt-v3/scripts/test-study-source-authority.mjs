import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
const plans=JSON.parse(await readFile(join(sourceRoot,'task-plans.json'),'utf8')).taskPlans;

const requiredSources=[
  'brpt-blueprint.json','brpt-handbook.json','brpt-refs.json',
  'aasm-adult-mslt-mwt-2021.json','aasm-pediatric-mslt-mwt-2024.json',
  'aast-patient-assessment-vitals-2022.json','aast-standard-psg-2021.json',
  'aast-pap-acclimation-2022.json','aast-pap-titration-2021.json'
];
for(const file of requiredSources){if(!manifest.sourceFiles.includes(file)) throw new Error(`Study-source manifest is missing ${file}`);}

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

assertExactTasks('aasm-adult-mslt-mwt-2021',['D2B','D3C']);
assertExactTasks('aasm-pediatric-mslt-mwt-2024',['D2B','D3C']);
assertExactTasks('aast-patient-assessment-vitals-2022',['D1A']);
assertExactTasks('aast-standard-psg-2021',['D2A','D2B','D2C']);
assertExactTasks('aast-pap-acclimation-2022',['D1C','D4A']);
assertExactTasks('aast-pap-titration-2021',['D4A']);

const terms=sourceDocs['aast-terms-definitions'];
if(terms.currentAuthority!==false||terms.sourceRole!=='studySupport'||!/must not be substituted/i.test(terms.authorityBoundary||'')) throw new Error('AAST Terms and Definitions is not clearly bounded as terminology support.');

for(const sourceId of ['aasm-adult-mslt-mwt-2021','aasm-pediatric-mslt-mwt-2024','aast-patient-assessment-vitals-2022','aast-standard-psg-2021','aast-pap-acclimation-2022','aast-pap-titration-2021']){
  const source=sourceDocs[sourceId];
  if(source.currentAuthority!==true||source.sourceRole!=='currentAuthority') throw new Error(`${sourceId} is not marked as current professional authority.`);
}
const adult=sourceDocs['aasm-adult-mslt-mwt-2021'];
if(!adult.erratum||adult.erratum.doi!=='10.5664/jcsm.10100') throw new Error('Adult MSLT/MWT erratum protection is missing.');
const peds=sourceDocs['aasm-pediatric-mslt-mwt-2024'];
if(JSON.stringify(peds.mappedTaskCodes)!==JSON.stringify(['D2B','D3C'])) throw new Error('Pediatric MSLT task mapping changed unexpectedly.');

for(const taskCode of ['D1A','D1C','D2A','D2B','D2C','D4A']){
  const sequence=plans[taskCode].sequence.map(item=>item.sourceId);
  const fundamentalsIndex=sequence.indexOf('fundamentals-sleep-technology-3e');
  if(fundamentalsIndex<0) continue;
  const professionalBefore=sequence.slice(1,fundamentalsIndex).some(sourceId=>sourceDocs[sourceId]?.currentAuthority===true&&sourceId!=='brpt-blueprint');
  if(!professionalBefore) throw new Error(`${taskCode} still reaches Fundamentals before any applicable professional guidance.`);
}

console.log(JSON.stringify({
  sourceFiles:manifest.sourceFiles.length,
  brptBlueprintFirstAcrossTasks:true,
  adultMsltTasks:tasksUsing('aasm-adult-mslt-mwt-2021'),
  pediatricMsltTasks:tasksUsing('aasm-pediatric-mslt-mwt-2024'),
  aastAssessmentTasks:tasksUsing('aast-patient-assessment-vitals-2022'),
  aastStandardPsgTasks:tasksUsing('aast-standard-psg-2021'),
  aastPapAcclimationTasks:tasksUsing('aast-pap-acclimation-2022'),
  aastPapTitrationTasks:tasksUsing('aast-pap-titration-2021'),
  aastTerminologyBoundaryProtected:true,
  professionalGuidanceBeforeFundamentals:true,
  sectionReferencesValidated:true
},null,2));
