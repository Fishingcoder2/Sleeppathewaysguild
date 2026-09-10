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
const v3ReferenceCenter=await readFile(join(v3,'core','reference-center.js'),'utf8');
const commerceRegistry=await readFile(join(repoRoot,'assets','guild-resource-commerce-registry.js'),'utf8');
assert.ok(v3ReferenceCenter.includes('>View on Amazon</a>'),'RPSGT V3 Amazon action label drifted.');
assert.ok(v3ReferenceCenter.includes('We may earn a commission from qualifying purchases through this link.'),'RPSGT V3 link-level commission disclosure is missing.');
assert.ok(v3ReferenceCenter.includes('const actions=affiliate||(url?'),'RPSGT V3 must suppress public/publisher actions when verified Amazon commerce exists.');
assert.ok(commerceRegistry.includes("disclosure_label:'We may earn a commission from qualifying purchases through this link.'"),'Shared commerce registry disclosure copy drifted.');
function referenceBlock(id){
  const start=cpsgt.indexOf(`"id":"${id}"`);
  assert.ok(start>=0,`CPSGT reference record is missing ${id}.`);
  return cpsgt.slice(start,start+1800);
}
function functionBlock(startMarker,endMarker){
  const start=cpsgt.indexOf(startMarker);
  assert.ok(start>=0,`CPSGT function is missing ${startMarker}.`);
  const end=cpsgt.indexOf(endMarker,start);
  assert.ok(end>start,`CPSGT function boundary is missing ${endMarker}.`);
  return cpsgt.slice(start,end);
}

// CPSGT commerce must be source-ID driven through the shared registry. Legacy raw Amazon
// URLs may remain in APP_DATA as historical metadata, but renderers must never trust them.
assert.ok(cpsgt.includes('<script src="assets/guild-resource-commerce-registry.js"></script>'),'CPSGT does not load the shared commerce registry.');
for(const [localId,sourceId] of Object.entries({
  'fundamentals-tech':'fundamentals-sleep-technology-3e',
  'fst3':'fundamentals-sleep-technology-3e',
  'pst2014':'polysomnography-sleep-technologist-2014',
  'pediatric-guide':'clinical-guide-pediatric-sleep-3e',
  'sleep-medicine-pearls':'sleep-medicine-pearls-3e',
  'pediatric-sleep-pearls':'pediatric-sleep-pearls-1e'
})) assert.ok(cpsgt.includes(`"${localId}":"${sourceId}"`),`CPSGT is missing canonical commerce mapping ${localId} -> ${sourceId}.`);
assert.ok(cpsgt.includes('label="View on Amazon"'),'CPSGT Amazon action label drifted.');
assert.ok(cpsgt.includes('We may earn a commission from qualifying purchases through this link.'),'CPSGT link-level commission disclosure is missing.');
assert.ok(!cpsgt.includes('View on Amazon · Affiliate link')&&!cpsgt.includes('Find on Amazon · Paid link'),'CPSGT returned to confusing affiliate wording inside the button.');
assert.ok(cpsgt.includes('rel="sponsored noopener noreferrer"'),'CPSGT affiliate rel protections drifted.');
assert.ok(cpsgt.includes('resourceContext:"cpsgt_reference"'),'CPSGT affiliate analytics context drifted.');
assert.ok(cpsgt.includes('credentialArea:"cpsgt"'),'CPSGT affiliate analytics credential area drifted.');
assert.ok(cpsgt.includes('As an Amazon Associate I earn from qualifying purchases.'),'CPSGT exact affiliate disclosure is missing.');
assert.ok(cpsgt.includes('No verified purchase link is available for this cited edition.'),'CPSGT safe-failure copy is missing.');
assert.ok(cpsgt.includes('function bookCitationHtml(book){return `<div class="book-apa-link">'),'CPSGT book APA citations became purchase links again.');
assert.ok(cpsgt.includes('if(commerce)return cpsgtAffiliateActionHtml(book.id,commerceClass);'),'CPSGT shelf must prefer verified Amazon commerce over a publisher action.');
assert.ok(!cpsgt.includes('Official publisher listing · optional paid Amazon link'),'CPSGT shelf still advertises simultaneous publisher and Amazon purchase actions.');
assert.ok(cpsgt.includes('function availableBookRecommendations(){return BOOK_RECOMMENDATIONS.filter(book=>bookHasVerifiedAction(book)'), 'CPSGT timed shelf does not fail closed on unverified destinations.');
for(const forbidden of ['BRPT-listed','RPSGT-listed','CPSGT-listed']) assert.ok(!cpsgt.includes(forbidden),`CPSGT learner-facing legacy terminology remains: ${forbidden}.`);

const citationRenderer=functionBlock('function citationLinkHtml(r){','function referenceChips(q){');
assert.ok(citationRenderer.includes('const legacyAffiliate=isAffiliateReference(r);'));
assert.ok(citationRenderer.includes('const commerceAction=cpsgtAffiliateActionHtml(r.id'));
assert.ok(citationRenderer.includes('const publicAction=(!commerceAction&&!legacyAffiliate&&r.url)?'),'CPSGT reference renderer must show a public/publisher action only when verified Amazon commerce is unavailable.');
assert.ok(citationRenderer.includes('<div class="apa-reference-text">${escapeHtml(r.apa||r.title)}</div>'),'CPSGT reference APA text rendering drifted.');

const xrefRenderer=functionBlock('function xrefSourceCardHtml(item,kind="support"){','function blueprintCrossReferenceHtml(q){');
assert.ok(xrefRenderer.includes('const legacyAffiliate=source.linkType==="amazon-affiliate";'));
assert.ok(xrefRenderer.includes('const commerceAction=cpsgtAffiliateActionHtml(source.id||item.sourceId'));
assert.ok(xrefRenderer.includes('const publicAction=source.url&&!legacyAffiliate&&!commerceAction?'),'CPSGT cross-reference renderer must show a public/publisher action only when verified Amazon commerce is unavailable.');

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

console.log('Three-app quality guards passed: V2 eligibility and mock allocation, CPSGT shared-commerce safeguards, V3 bank counts, and current guideline routing.');
