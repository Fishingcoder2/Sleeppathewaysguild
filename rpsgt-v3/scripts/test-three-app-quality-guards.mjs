import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const v3=resolve(here,'..');
const repoRoot=resolve(v3,'..');
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));

for(const file of ['RPSGTv2.2026.html','RPSGTv2.2026-app.html']){
  const html=await readFile(join(repoRoot,file),'utf8');
  const start=html.indexOf('function examEligibleQuestions(pool)');
  const guard=html.slice(start,start+500);
  assert.ok(start>=0,`${file} is missing examEligibleQuestions.`);
  assert.ok(guard.includes('q.qa.manualReviewRecommended === true'),`${file} allows manual-review records into learner sessions.`);
  assert.ok(html.includes('const pretestBlueprintCounts = spgAllocateBlueprintCountsV1266(pretestCount);'),`${file} does not allocate the 25 pretest-style items by domain.`);
  assert.ok(html.includes('q=>q.domain===def.id')&&html.includes('D1 35, D2 48, D3 44, D4 48'),`${file} does not protect the complete 175-item domain allocation.`);
}

const cpsgt=await readFile(join(repoRoot,'cpsgt-study-app.html'),'utf8');
function referenceBlock(id){
  const start=cpsgt.indexOf(`"id":"${id}"`);
  assert.ok(start>=0,`CPSGT reference record is missing ${id}.`);
  return cpsgt.slice(start,start+1800);
}
const sleepMedicine=referenceBlock('fundamentals-sleep-medicine');
assert.ok(sleepMedicine.includes('amazon.com/dp/1437703267?tag=spg_rpsgt-20'));
assert.ok(sleepMedicine.includes('"linkType":"amazon-affiliate"'));
assert.ok(sleepMedicine.includes('paid Amazon affiliate link'));
assert.ok(sleepMedicine.includes('"actionLabel":"Click to view on Amazon"'));
const sleepTechnology=referenceBlock('fundamentals-tech');
assert.ok(sleepTechnology.includes('shop.lww.com/Fundamentals-of-Sleep-Technology'));
assert.ok(sleepTechnology.includes('"linkType":"official-store"'));
assert.ok(sleepTechnology.includes('Official publisher listing'));
assert.ok(sleepTechnology.includes('"actionLabel":"View exact publisher listing"'));

const blueprint=await readJson(join(v3,'data','blueprint.json'));
const bankManifest=await readJson(join(v3,'data','question-bank','manifest.json'));
const sourceManifest=await readJson(join(v3,'data','study-sources','manifest.json'));
const plans=(await readJson(join(v3,'data','study-sources','task-plans.json'))).taskPlans;
const inpatient=await readJson(join(v3,'data','study-sources','aasm-inpatient-osa-2025.json'));
const adultStudies=await readJson(join(v3,'data','study-sources','asa-adult-sleep-studies-2024.json'));
const csa=await readJson(join(v3,'data','study-sources','aasm-csa-treatment-2025.json'));
const rls=await readJson(join(v3,'data','study-sources','aasm-rls-plmd-2025.json'));

const directModules=bankManifest.modules.filter(module=>!String(module.taskCode).includes('/'));
const directCounts=Object.fromEntries(directModules.map(module=>[module.taskCode,module.questionCount]));
const blueprintTasks=blueprint.domains.flatMap(domain=>domain.tasks||[]);
for(const task of blueprintTasks)assert.equal(task.questionCount,directCounts[task.code],`Blueprint count drift for ${task.code}.`);
assert.equal(blueprintTasks.reduce((sum,task)=>sum+task.questionCount,0),2915);
assert.equal(bankManifest.meta.questionCount,2920);
assert.equal(bankManifest.crossTaskRecords.ids.length,5);

for(const file of ['aasm-inpatient-osa-2025.json','asa-adult-sleep-studies-2024.json'])assert.ok(sourceManifest.sourceFiles.includes(file),`Source manifest is missing ${file}.`);
assert.equal(inpatient.currentAuthority,true);
assert.deepEqual(inpatient.intentionalZeroTaskCodes,['D2A','D2B','D3A','D3B','D3C','D4C']);
assert.match(inpatient.monitoringBoundary,/no recommendation.*universal inpatient oximetry or capnography/i);
assert.match(inpatient.authorityBoundary,/Screening is not diagnosis/i);
assert.equal(adultStudies.currentAuthority,false);
assert.equal(adultStudies.sourceRole,'studySupport');
assert.deepEqual(adultStudies.intentionalZeroTaskCodes,['D3B','D4C']);
assert.match(adultStudies.consumerTechnologyBoundary,/not substitutes for validated diagnostic testing/i);

function tasksUsing(sourceId){
  return Object.keys(plans).filter(task=>plans[task].sequence.some(item=>item.sourceId===sourceId));
}
assert.deepEqual(tasksUsing('aasm-inpatient-osa-2025'),['D1A','D1B','D1C','D2C','D4A','D4B']);
assert.deepEqual(tasksUsing('asa-adult-sleep-studies-2024'),['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3C','D4A','D4B']);
assert.deepEqual(tasksUsing('aasm-rls-plmd-2025'),['D1A','D4B']);
assert.ok(tasksUsing('aasm-csa-treatment-2025').includes('D4A')&&tasksUsing('aasm-csa-treatment-2025').includes('D4C'));

assert.match(csa.recommendationSummary.bpapWithBackup,/backup rate/i);
assert.match(csa.recommendationSummary.bpapWithoutBackup,/discourages the non-backup pathway/i);
assert.ok(csa.learnerGuardrails.some(item=>/historical LVEF threshold/i.test(item)));
assert.match(rls.currentTreatmentSummary.augmentation,/earlier daily onset.*spread/i);
assert.match(rls.currentTreatmentSummary.plmsVsPlmd,/PLMS is a PSG finding/i);
assert.match(rls.currentTreatmentSummary.dopamineAgonists,/discouraged.*augmentation/i);

const targetText=Object.fromEntries(blueprintTasks.map(task=>[task.code,(task.studyTargets||[]).join(' ')]));
assert.match(targetText.D1A,/PLMS is a PSG finding.*PLMD requires clinical impact/i);
assert.match(targetText.D4A,/BPAP without backup/i);
assert.match(targetText.D4B,/augmentation risk/i);
assert.match(targetText.D4C,/heart-failure and high-altitude CSA/i);

console.log('Three-app quality guards passed: V2 eligibility and mock allocation, CPSGT link disclosures, V3 bank counts, and current guideline routing.');
