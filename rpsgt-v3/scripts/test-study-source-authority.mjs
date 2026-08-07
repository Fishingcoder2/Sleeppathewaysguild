import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
const plans=JSON.parse(await readFile(join(sourceRoot,'task-plans.json'),'utf8')).taskPlans;

const requiredSources=['brpt-blueprint.json','brpt-handbook.json','brpt-refs.json','aasm-pediatric-mslt-mwt-2024.json'];
for(const file of requiredSources){if(!manifest.sourceFiles.includes(file)) throw new Error(`Study-source manifest is missing ${file}`);}

const sourceDocs={};
for(const file of manifest.sourceFiles){
  const source=JSON.parse(await readFile(join(sourceRoot,file),'utf8'));
  if(!source.id) throw new Error(`${file} is missing a source id.`);
  if(sourceDocs[source.id]) throw new Error(`Duplicate study-source id: ${source.id}`);
  sourceDocs[source.id]=source;
}

for(const taskCode of ['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C']){
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

for(const taskCode of ['D2B','D3C']){
  if(!plans[taskCode].sequence.some(item=>item.sourceId==='aasm-pediatric-mslt-mwt-2024')) throw new Error(`${taskCode} is missing the verified 2024 pediatric MSLT protocol.`);
}
for(const taskCode of Object.keys(plans).filter(code=>!['D2B','D3C'].includes(code))){
  if(plans[taskCode].sequence.some(item=>item.sourceId==='aasm-pediatric-mslt-mwt-2024')) throw new Error(`Pediatric MSLT protocol was over-mapped to ${taskCode}.`);
}

const terms=sourceDocs['aast-terms-definitions'];
if(terms.currentAuthority!==false||terms.sourceRole!=='studySupport'||!/must not be substituted/i.test(terms.authorityBoundary||'')) throw new Error('AAST Terms and Definitions is not clearly bounded as terminology support.');

const peds=sourceDocs['aasm-pediatric-mslt-mwt-2024'];
if(peds.currentAuthority!==true||peds.sourceRole!=='currentAuthority') throw new Error('The 2024 AASM pediatric MSLT protocol is not marked as current authority.');
if(JSON.stringify(peds.mappedTaskCodes)!==JSON.stringify(['D2B','D3C'])) throw new Error('Pediatric MSLT task mapping changed unexpectedly.');

console.log(JSON.stringify({
  sourceFiles:manifest.sourceFiles.length,
  brptBlueprintFirstAcrossTasks:true,
  pediatricMsltTasks:peds.mappedTaskCodes,
  aastTerminologyBoundaryProtected:true,
  sectionReferencesValidated:true
},null,2));
