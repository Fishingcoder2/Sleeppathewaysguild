import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const payload=JSON.parse(await readFile(join(root,'data','brpt-official-resources.json'),'utf8'));
const resources=Array.isArray(payload.resources)?payload.resources:[];

if(payload?.meta?.verifiedAt!=='2026-08-07') throw new Error('BRPT resource catalog verification date is missing or unexpected.');
if(resources.length<10) throw new Error(`Expected a substantial BRPT resource board, found ${resources.length} records.`);

const requiredIds=[
  'brpt-rpsgt-home','brpt-rpsgt-handbook','brpt-rpsgt-blueprint','brpt-rpsgt-eligibility',
  'brpt-rpsgt-new-candidates','brpt-rpsgt-apply','brpt-rpsgt-day-of-exam','pearson-brpt',
  'brpt-rpsgt-exam-prep','brpt-rpsgt-study-tips','brpt-rpsgt-references','brpt-rpsgt-practice-exams'
];
const ids=new Set(resources.map(item=>item.id));
for(const id of requiredIds){if(!ids.has(id)) throw new Error(`Missing required official RPSGT resource: ${id}`);}
if(ids.size!==resources.length) throw new Error('Duplicate BRPT resource IDs found.');

const priorities=new Set();
for(const resource of resources){
  if(resource.official!==true) throw new Error(`${resource.id} is not explicitly marked official.`);
  if(!resource.title||!resource.description||!resource.url||!resource.publisher) throw new Error(`${resource.id} is missing required navigation metadata.`);
  const url=new URL(resource.url);
  if(url.protocol!=='https:') throw new Error(`${resource.id} does not use HTTPS.`);
  const allowed=url.hostname==='brpt.org'||url.hostname==='www.brpt.org'||url.hostname==='www.pearsonvue.com';
  if(!allowed) throw new Error(`${resource.id} resolves to an unsupported external host: ${url.hostname}`);
  const priority=Number(resource.priority);
  if(!Number.isFinite(priority)||priority<1) throw new Error(`${resource.id} has an invalid priority.`);
  if(priorities.has(priority)) throw new Error(`Duplicate BRPT resource priority: ${priority}`);
  priorities.add(priority);
}

if(resources.some(item=>item.id==='brpt-rpsgt-study-guide-7e')) throw new Error('The 7th-edition study guide was promoted into the current-authority resource board.');
const studyGuide=(payload.notPrimaryAuthority||[]).find(item=>item.id==='brpt-rpsgt-study-guide-7e');
if(!studyGuide||!String(studyGuide.note||'').includes('2018 RPSGT Exam Blueprint')) throw new Error('The study-guide legacy-blueprint warning is missing.');

console.log(JSON.stringify({
  verifiedAt:payload.meta.verifiedAt,
  officialResources:resources.length,
  requiredResources:requiredIds.length,
  uniqueIds:ids.size,
  allowedHosts:true,
  legacyBlueprintStudyGuideNotPromoted:true
},null,2));
