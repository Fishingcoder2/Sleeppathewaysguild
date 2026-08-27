import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [trailText,ppsmText,papFamilyText,studyHtml,trailJs,trailCss,homeJs,labsJs,engineJs]=await Promise.all([
  readFile(join(root,'data','learner-trails','respiratory-pap.json'),'utf8'),
  readFile(join(root,'data','study-sources','principles-practice-sleep-medicine-7e.json'),'utf8'),
  readFile(join(root,'data','study-sources','topic-families-pap-modalities.json'),'utf8'),
  readFile(join(root,'study.html'),'utf8'),
  readFile(join(root,'core','respiratory-study-trail.js'),'utf8'),
  readFile(join(root,'assets','respiratory-study-trail.css'),'utf8'),
  readFile(join(root,'core','home-dashboard.js'),'utf8'),
  readFile(join(root,'core','labs.js'),'utf8'),
  readFile(join(root,'core','guided-trail-engine.js'),'utf8')
]);

const trail=JSON.parse(trailText);
const ppsm=JSON.parse(ppsmText);
const papFamilies=JSON.parse(papFamilyText);
if(trail.id!=='respiratory-pap-pathway'||trail.schemaVersion!==1) throw new Error('Respiratory Study Trail identity/schema changed unexpectedly.');
if(!Array.isArray(trail.steps)||trail.steps.length!==9) throw new Error('Respiratory Study Trail must keep nine focused learner steps.');
if(!String(trail.description||'').includes('Steps 1 through 9 in order')) throw new Error('Respiratory Study Trail no longer tells the learner to follow the sequence in order.');
if(ppsm.fullTitle!=='Principles and Practice of Sleep Medicine'||ppsm.edition!=='7th ed.') throw new Error('Respiratory trail textbook identity changed unexpectedly.');

const expectedIds=['osa-scoring','osa-pap-treatment','osa-manual-titration','pap-support','csa-distinction','csa-advanced-pap','hypoventilation-niv','oxygen-co2','respiratory-escalation'];
if(trail.steps.map(step=>step.id).join('|')!==expectedIds.join('|')) throw new Error('Respiratory Study Trail pathway order changed.');
const allowedTasks=new Set(['D1C','D2C','D3A','D4A','D4C']);
const chapters=new Map((ppsm.verifiedChapterLocators||[]).map(item=>[Number(item.chapter),item]));
for(const step of trail.steps){
  if(!allowedTasks.has(step.taskCode)) throw new Error(`Unexpected respiratory trail task: ${step.taskCode}`);
  for(const field of ['title','navLabel','whyThisMatters','primaryAuthority','referenceTopic','warning']) if(!String(step[field]||'').trim()) throw new Error(`${step.id} is missing ${field}.`);
  if(!step.checkpointFilter||typeof step.checkpointFilter!=='object') throw new Error(`${step.id} is missing its concept checkpoint filter.`);
  if(!step.lab||!/^lab-[a-z-]+\.html$/.test(String(step.lab.href||''))) throw new Error(`${step.id} is missing a safe V3 lab route.`);
  const chapter=chapters.get(Number(step.studyChapter));
  if(!chapter) throw new Error(`${step.id} points to an unverified PPSM 7e chapter.`);
  if(!Array.isArray(chapter.taskCodes)||!chapter.taskCodes.includes(step.taskCode)) throw new Error(`${step.id} PPSM chapter is not verified for ${step.taskCode}.`);
}
if(/driveFileId|sourceId|referenceKeys/.test(trailText)) throw new Error('Learner trail data must not expose private/internal source identifiers.');

const chapter131=chapters.get(131);
if(!chapter131||chapter131.label!=='Obstructive Sleep Apnea: Clinical Features, Evaluation, and Principles of Management'||Number(chapter131.printedStartPage)!==1245) throw new Error('Chapter 131 locator changed unexpectedly.');
if(!trailJs.includes("sourceTitle+(edition?', '+edition:'')")||!trailJs.includes("Book: <em>")) throw new Error('Respiratory chapter card must identify Principles and Practice of Sleep Medicine with its edition before the chapter locator.');

const engineContext={globalThis:{},Date,JSON,Map,Math,Object,Array,String,Number,Boolean};
vm.createContext(engineContext);vm.runInContext(engineJs,engineContext,{filename:'guided-trail-engine.js'});
const engine=engineContext.globalThis.RPSGTGuidedTrailEngine;
if(!engine||typeof engine.selectQuestions!=='function'||typeof engine.matchesQuestionFilter!=='function') throw new Error('Guided Trail concept-filter engine is unavailable.');
const bankCache=new Map();
for(const taskCode of new Set(trail.steps.map(step=>step.taskCode))){
  bankCache.set(taskCode,JSON.parse(await readFile(join(root,'data','question-bank',taskCode.toLowerCase()+'.json'),'utf8')));
}
for(const step of trail.steps){
  const bank=bankCache.get(step.taskCode);
  const selected=engine.selectQuestions(bank.questions||[],step.taskCode,15,'respiratory-concept-validation|'+step.id,step.checkpointFilter);
  if(selected.length<15) throw new Error(`${step.id} has only ${selected.length} eligible concept-matched questions; 15 are required.`);
  if(!selected.every(question=>engine.matchesQuestionFilter(question,step.checkpointFilter))) throw new Error(`${step.id} selected a question outside its concept filter.`);
  if(step.id==='osa-scoring'&&selected.some(question=>/sleep staging/i.test(String(question.topic||'')))) throw new Error('OSA-scoring concept checkpoint must not include Sleep Staging questions.');
}

const requiredFamilies=['pap-osa-current','pap-osa-manual-titration-current','pap-csa-asv-current','pap-treatment-emergent-central-current','pap-hypoventilation-niv-current','pap-cross-modality-support','pap-device-facility-boundary'];
const familyIds=new Set((papFamilies.topicFamilies||[]).map(item=>item.id));
for(const id of requiredFamilies) if(!familyIds.has(id)) throw new Error(`Protected PAP modality family is missing: ${id}`);

const combined=trail.steps.map(step=>step.warning+' '+step.primaryAuthority).join(' | ');
for(const boundary of ['Do not generalize CPAP/APAP/BPAP','Do not respond to central events','2025 AASM CSA guideline','universal NIV settings','Improved SpO2 alone does not establish adequate ventilation','patient safety takes priority','universal emergency or notification thresholds']){
  if(!combined.includes(boundary)) throw new Error(`Respiratory learner boundary missing: ${boundary}`);
}
if(!String(trail.learnerBoundary||'').includes('physician orders')||!trail.learnerBoundary.includes('manufacturer instructions')) throw new Error('Respiratory learner boundary no longer preserves local/device execution rules.');

for(const token of ['meta name="robots" content="noindex,nofollow"','id="respiratory-pap-trail"','data-respiratory-study-trail','assets/respiratory-study-trail.css','core/respiratory-study-trail.js']) if(!studyHtml.includes(token)) throw new Error(`Guided Study shell is missing ${token}.`);
for(const token of ['data-respiratory-step','Your learning path','respiratory-learning-path','respiratory-path-node','Continue here','Learn this first','Apply it','Check understanding','Finish lesson','Take 15-question concept checkpoint','data-checkpoint-concept','queueQuestionFilter','this respiratory concept','data-respiratory-next','data-respiratory-prev','respiratoryStudyTrail','completedThroughStepId','Related reference materials','Extra practice questions','data-checkpoint-start','Ask Coach Bob from inside a question','sources-disclosures.html?','practice.html?task=','verifiedChapterLocators','data-respiratory-task-entry','Open Respiratory/PAP Study Trail','Best textbook study support','Book: <em>','state.source=ppsm']) if(!trailJs.includes(token)) throw new Error(`Respiratory trail controller is missing ${token}.`);
if(/open mapped references|five-question task checkpoint|Practice this concept|Coach Bob opens the existing 15-question badge checkpoint/i.test(trailJs)) throw new Error('Respiratory learner trail still exposes stale or menu-like learner wording.');
new Function(trailJs);
if(!trailCss.includes('@media(max-width:760px)')||!trailCss.includes('grid-template-columns:1fr')||!trailCss.includes('respiratory-learning-path')) throw new Error('Respiratory trail CSS is missing mobile/compact vertical path behavior.');
if(/var\(--(?:card|soft)\)/.test(trailCss)) throw new Error('Respiratory trail CSS references undefined legacy surface variables.');
for(const token of ['var(--panel)','var(--sky)',':focus-visible','respiratory-route-overview','respiratory-guided-list','is-locked','is-current','respiratory-path-orb','respiratory-path-callout','respiratory-study-book']) if(!trailCss.includes(token)) throw new Error(`Respiratory trail CSS polish is missing ${token}.`);

for(const token of ['data-featured-respiratory-trail','study.html#respiratory-pap-trail','Start Respiratory/PAP Study Trail']) if(!homeJs.includes(token)) throw new Error(`Dashboard respiratory trail entry point is missing ${token}.`);
for(const token of ["new Set(['respiratory','pap','troubleshooting'])",'study.html#respiratory-pap-trail','Study respiratory/PAP trail first']) if(!labsJs.includes(token)) throw new Error(`Skills Lab respiratory trail entry point is missing ${token}.`);
new Function(homeJs);new Function(labsJs);

console.log('Respiratory/PAP Study Trail authority, nine-step stepping-stone learning path, guided Learn → Apply → Check flow, locked/current/completed lesson states, concept-matched 15-question checkpoints, Sleep Staging exclusion from OSA scoring, saved progression, explicit Principles and Practice of Sleep Medicine 7th-edition textbook identity, chapter locator, learner-facing reference wording, front-door routes, theme variables, noindex, Coach Bob, and mobile contracts passed.');
