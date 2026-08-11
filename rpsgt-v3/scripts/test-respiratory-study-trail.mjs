import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [trailText,ppsmText,papFamilyText,studyHtml,trailJs,trailCss,homeJs,labsJs]=await Promise.all([
  readFile(join(root,'data','learner-trails','respiratory-pap.json'),'utf8'),
  readFile(join(root,'data','study-sources','principles-practice-sleep-medicine-7e.json'),'utf8'),
  readFile(join(root,'data','study-sources','topic-families-pap-modalities.json'),'utf8'),
  readFile(join(root,'study.html'),'utf8'),
  readFile(join(root,'core','respiratory-study-trail.js'),'utf8'),
  readFile(join(root,'assets','respiratory-study-trail.css'),'utf8'),
  readFile(join(root,'core','home-dashboard.js'),'utf8'),
  readFile(join(root,'core','labs.js'),'utf8')
]);

const trail=JSON.parse(trailText);
const ppsm=JSON.parse(ppsmText);
const papFamilies=JSON.parse(papFamilyText);
if(trail.id!=='respiratory-pap-pathway'||trail.schemaVersion!==1) throw new Error('Respiratory Study Trail identity/schema changed unexpectedly.');
if(!Array.isArray(trail.steps)||trail.steps.length!==9) throw new Error('Respiratory Study Trail must keep nine focused learner steps.');

const expectedIds=['osa-scoring','osa-pap-treatment','osa-manual-titration','pap-support','csa-distinction','csa-advanced-pap','hypoventilation-niv','oxygen-co2','respiratory-escalation'];
if(trail.steps.map(step=>step.id).join('|')!==expectedIds.join('|')) throw new Error('Respiratory Study Trail pathway order changed.');
const allowedTasks=new Set(['D1C','D2C','D3A','D4A','D4C']);
const chapters=new Map((ppsm.verifiedChapterLocators||[]).map(item=>[Number(item.chapter),item]));
for(const step of trail.steps){
  if(!allowedTasks.has(step.taskCode)) throw new Error(`Unexpected respiratory trail task: ${step.taskCode}`);
  for(const field of ['title','navLabel','whyThisMatters','primaryAuthority','referenceTopic','warning']) if(!String(step[field]||'').trim()) throw new Error(`${step.id} is missing ${field}.`);
  if(!step.lab||!/^lab-[a-z-]+\.html$/.test(String(step.lab.href||''))) throw new Error(`${step.id} is missing a safe V3 lab route.`);
  const chapter=chapters.get(Number(step.studyChapter));
  if(!chapter) throw new Error(`${step.id} points to an unverified PPSM 7e chapter.`);
  if(!Array.isArray(chapter.taskCodes)||!chapter.taskCodes.includes(step.taskCode)) throw new Error(`${step.id} PPSM chapter is not verified for ${step.taskCode}.`);
}
if(/driveFileId|sourceId|referenceKeys/.test(trailText)) throw new Error('Learner trail data must not expose private/internal source identifiers.');

const requiredFamilies=['pap-osa-current','pap-osa-manual-titration-current','pap-csa-asv-current','pap-treatment-emergent-central-current','pap-hypoventilation-niv-current','pap-cross-modality-support','pap-device-facility-boundary'];
const familyIds=new Set((papFamilies.topicFamilies||[]).map(item=>item.id));
for(const id of requiredFamilies) if(!familyIds.has(id)) throw new Error(`Protected PAP modality family is missing: ${id}`);

const combined=trail.steps.map(step=>step.warning+' '+step.primaryAuthority).join(' | ');
for(const boundary of ['Do not generalize CPAP/APAP/BPAP','Do not respond to central events','2025 AASM CSA guideline','universal NIV settings','Improved SpO2 alone does not establish adequate ventilation','patient safety takes priority','universal emergency or notification thresholds']){
  if(!combined.includes(boundary)) throw new Error(`Respiratory learner boundary missing: ${boundary}`);
}
if(!String(trail.learnerBoundary||'').includes('physician orders')||!trail.learnerBoundary.includes('manufacturer instructions')) throw new Error('Respiratory learner boundary no longer preserves local/device execution rules.');

for(const token of ['meta name="robots" content="noindex,nofollow"','id="respiratory-pap-trail"','data-respiratory-study-trail','assets/respiratory-study-trail.css','core/respiratory-study-trail.js']) if(!studyHtml.includes(token)) throw new Error(`Guided Study shell is missing ${token}.`);
for(const token of ['data-respiratory-step','Practice this concept','Open mapped references','data-checkpoint-start','Ask Coach Bob','sources-disclosures.html?','practice.html?task=','verifiedChapterLocators','data-respiratory-task-entry','Open Respiratory/PAP Study Trail']) if(!trailJs.includes(token)) throw new Error(`Respiratory trail controller is missing ${token}.`);
new Function(trailJs);
if(!trailCss.includes('@media(max-width:760px)')||!trailCss.includes('overflow-x:auto')||!trailCss.includes('grid-template-columns:1fr')) throw new Error('Respiratory trail CSS is missing mobile/compact behavior.');
if(/var\(--(?:card|soft)\)/.test(trailCss)) throw new Error('Respiratory trail CSS references undefined legacy surface variables.');
for(const token of ['var(--panel)','var(--sky)',':focus-visible']) if(!trailCss.includes(token)) throw new Error(`Respiratory trail CSS polish is missing ${token}.`);

for(const token of ['data-featured-respiratory-trail','study.html#respiratory-pap-trail','Start Respiratory/PAP Study Trail']) if(!homeJs.includes(token)) throw new Error(`Dashboard respiratory trail entry point is missing ${token}.`);
for(const token of ["new Set(['respiratory','pap','troubleshooting'])",'study.html#respiratory-pap-trail','Study respiratory/PAP trail first']) if(!labsJs.includes(token)) throw new Error(`Skills Lab respiratory trail entry point is missing ${token}.`);
new Function(homeJs);new Function(labsJs);

console.log('Respiratory/PAP Study Trail authority, locator, front-door routes, theme variables, noindex, Coach Bob, and mobile contracts passed.');
