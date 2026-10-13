#!/usr/bin/env node
// Contract: owner conditional approval is not permission to bypass clinical or regression gates.
// This intentionally leaves the V2/V3 learner banks and every duplicate ID unchanged.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const json=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const file=await json('rpsgt-v3/data/question-proposals/OWNER-CONDITIONAL-APPROVAL-2026-10-13.json');
const first=await json('rpsgt-v3/data/question-proposals/spriggs-modernized-2026-10-12.json');
const second=await json('rpsgt-v3/data/question-proposals/spriggs-gap-pilot-2026-10-12.json');
const mslt=await json('rpsgt-v3/data/question-proposals/mslt-v2-v3-existing-item-revisions-2026-10-12.json');
const pediatric=await json('rpsgt-v3/data/question-proposals/pediatric-v2-v3-repair-review-2026-10-12.json');
const duplicates=await json('rpsgt-v3/data/question-proposals/v2-v3-duplicate-consolidation-queue-2026-10-12.json');
const manifest=await json('rpsgt-v3/data/question-bank/manifest.json');
const release=await json('data/owner-approved-question-release.json');
const html=await readFile(join(root,'RPSGTv2.2026.html'),'utf8');
const payload=html.match(/<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(payload,'Canonical V2 question seed cannot be located');
const v2=JSON.parse(payload).seed.questionBank;
const modules=[];
for(const entry of manifest.modules){const mod=await json('rpsgt-v3/data/question-bank/'+entry.path);assert.equal(mod.questions.length,entry.questionCount);modules.push(...mod.questions);}
assert.equal(modules.length,2920,'Source bank total unexpectedly changed');
assert.equal(release.questions.length,320,'Owner-approved overlay must remain unchanged in size');
assert.equal(v2.length,3240,'V2 bank size is an invariant for this approval-only release');
const effective=modules.concat(release.questions), v2ById=new Map(v2.map(q=>[String(q.id),q])), v3ById=new Map(effective.map(q=>[String(q.id),q]));
assert.equal(v2ById.size,3240,'Original V2 IDs lost or duplicated');
assert.equal(v3ById.size,3240,'Original V3 IDs lost or duplicated');
for(const [id,q] of v3ById){const q2=v2ById.get(id);assert.ok(q2,'V2/V3 missing question ID '+id);for(const field of ['taskCode','prompt','answer','options','rationale'])assert.deepEqual(q[field],q2[field],'V2/V3 content disagreement '+id+'/'+field);}
assert.equal(file.approvalRecordId,'spg-rpsgt-v2-v3-owner-conditional-2026-10-13');
const totals=file.decisionSummary;
assert.equal(totals.newQuestionsConditionallyApproved,7);
assert.equal(totals.existingQuestionRevisionsAuthorizedToProceed,5);
assert.equal(totals.duplicateCandidatesPendingReview,15);
for(const field of ['learnerQuestionAdditionsAuthorizedNow','learnerQuestionRevisionsAuthorizedNow','learnerRetirementsAuthorizedNow','duplicateRetirementsAuthorized'])assert.equal(totals[field],0,'No learner activation authorized: '+field);
assert.equal(file.gateDecision.qualifiedClinicalReleaseEligibility,'NONE_READY');
assert.equal(file.gateDecision.status,'BLOCKED_FROM_LEARNER_ACTIVATION');
const draftQuestions=[...first.questions,...second.questions];
const requiredNew=['SPG-SPRIGGS-2026-003','SPG-SPRIGGS-2026-005','SPG-SPRIGGS-2026-006','SPG-SPRIGGS-2026-008','SPG-SPRIGGS-2026-009','SPG-GAP-2026-001','SPG-GAP-2026-002'];
assert.deepEqual(file.newQuestions.map(q=>q.id).sort(),requiredNew.sort());
assert.deepEqual(draftQuestions.map(q=>q.id).sort(),requiredNew.sort());
for(const q of draftQuestions){
 const approval=file.newQuestions.find(x=>x.id===q.id);
 assert.equal(approval.taskCode,q.taskCode);
 assert.equal(approval.ownerConditionalPublicationApproved,true);
 assert.equal(approval.finalLearnerReleaseApproved,false);
 assert.equal(approval.eligibleForLearnerBank,false);
 assert.equal(approval.independentQualifiedClinicalSignoff,'PENDING');
 assert.equal(approval.individualAnswerDistractorRationaleSignoff,'PENDING');
 assert.equal(approval.completeSemanticDuplicateReview,'PENDING');
 assert.equal(approval.crossVersionLearnerAndHistoryRegression,'PENDING');
 assert.equal(approval.licensedCurrentAasmV3CheckCompleted,false);
 assert.ok(q.libraryEvidence?.brptRecommendedBooks?.length,'No indexed BRPT textbook mapping: '+q.id);
 assert.ok(q.referenceKeys.includes(approval.controllingReferenceKey)||q.referenceKeys.includes('aasm-scoring-current'),'Current evidence key not supported: '+q.id);
 assert.equal(q.qa?.manualReviewRecommended,true,'Candidate's manual-review hold must remain: '+q.id);
 assert.equal(q.publicationStatus,'proposed-not-learner-eligible');
 assert.notEqual(q.ownerReleaseApproved,true,'Conditional owner approval must NOT set automatic release flag');
 assert.ok(q.options.includes(q.answer),'Correct answer not in options '+q.id);
 assert.equal(v2ById.has(q.id),false,'New candidate silently entered V2 learner bank '+q.id);
 assert.equal(v3ById.has(q.id),false,'New candidate silently entered V3 learner bank '+q.id);
}
const revisions=[...mslt.items,...pediatric.proposedRuleSensitiveRevisions];
const requiredRevisionIds=['imp-051','grow-041','mb-pediatric-mixed-4','imp-050','boost-039'];
assert.equal(revisions.length,5);
assert.deepEqual(revisions.map(q=>q.id).sort(),requiredRevisionIds.sort());
assert.deepEqual(file.existingRevisions.map(q=>q.id).sort(),requiredRevisionIds.sort());
for(const q of revisions){
 const approval=file.existingRevisions.find(x=>x.id===q.id);
 assert.equal(approval.ownerAuthorizedToProceed,true);
 assert.equal(approval.finalLearnerRevisionApproved,false);
 assert.equal(approval.eligibleToApply,false);
 assert.equal(approval.independentQualifiedClinicalSignoff,'PENDING');
 assert.equal(approval.manualEditorialReview,'PENDING');
 assert.equal(approval.crossVersionHistoryAndReportRegression,'PENDING');
 const a=v2ById.get(q.id),b=v3ById.get(q.id);
 assert.ok(a&&b,'Existing question ID vanished '+q.id);
 assert.deepEqual(a.answer,b.answer);
 assert.deepEqual(a.options,b.options);
 assert.equal(a.prompt,b.prompt);
 const answer=q.existingAnswer||q.existing?.answer;
 assert.equal(a.answer,answer,'Review proposal differs from current correct answer '+q.id);
 if(q.id==='mb-pediatric-mixed-4'){
  assert.ok(a.answer.includes('at least 25%'),'ICSD diagnostic answer must remain intact');
  assert.equal(q.proposedAnswer,a.answer,'Never change approved pediatric diagnostic answer based on old scoring threshold');
 }
}
assert.equal(file.duplicateRetirements.decision,'DO_NOT_RETIRE');
assert.equal(file.duplicateRetirements.anyRetirementActionAllowed,false);
assert.equal(file.duplicateRetirements.ownerApprovalToRetire,false);
assert.equal(duplicates.families.length,6);
const candidates=duplicates.families.flatMap(g=>g.proposedExclusionIds);
assert.equal(candidates.length,15);
assert.equal(new Set(candidates).size,15);
for(const id of candidates){
 const q=v3ById.get(id);
 assert.ok(q,'Potential duplicate retirement ID missing '+id);
 assert.notEqual(q.reviewStatus,'retired','Duplicate has been retired without permission '+id);
 assert.notEqual(q.qa?.learnerExcluded,true,'Duplicate excluded without permission '+id);
 assert.notEqual(q.qa?.manualReviewRecommended,true,'Duplicate unexpectedly held '+id);
}
const readiness=await json('rpsgt-v3/data/release-readiness.json');
assert.equal(readiness.developmentOnly,true,'V3 must not switch to public production without separate readiness');
assert.equal(readiness.manualGates.representativeRealBrowserMigrationExports.complete,false);
assert.equal(readiness.manualGates.interactiveDesktopMobileRegression.complete,false);
const result={
 date:file.recordedDate,ownerConditionalNew:7,ownerProceedRevisions:5,
 clinicalReleaseEligibleNew:0,clinicalReleaseEligibleRevisions:0,activatedNow:0,
 duplicatesUntouched:15,immutableV2V3IDs:3240,
 currentSourceBankRecords:modules.length,existingApprovedOverlayRecords:release.questions.length,
 v3PublicReleaseAllowed:false,checksPassed:true,
 outstanding:['qualified independent clinical signoff on 7 new questions and 5 edits','complete human concept-family duplicate review','licensed AASM Version 3 scoring-rule passage for SPG-SPRIGGS-2026-008, imp-050 and boost-039','browser and stored progress/history/report regression for actual learner content activation','V3 public entry blocked on independent migration/interactive gates']
};
const dir=join(root,'rpsgt-v3/audit-output');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'rpsgt-conditional-owner-approval-release-gate-2026.json'),JSON.stringify(result,null,2)+'\n');
const report=[
'# RPSGT V2/V3 conditional owner approval — publication gate','',
'**Owner-approved to proceed, not learner-facing clinical release.**','',
'| Category | Conditionally authorized | Learner publication eligible now |',
'|---|---:|---:|',
'| Seven new original questions | 7 | 0 |',
'| Existing question revisions | 5 | 0 |',
'| Duplicate retirements | 0 (15 pending review) | 0 |',
'','All 3,240 existing source question IDs and options/answers remain matched across V2 and V3; no new draft IDs in either learner pool, no duplicate candidates retired, no storage schema changes.',
'','## Unresolved gates',...result.outstanding.map(x=>'- '+x),
'','The source-preflight evidence is necessary but not independent specialist signoff. This report does not enable learner publication.'
].join('\n');
await writeFile(join(dir,'rpsgt-conditional-owner-approval-release-gate-2026.md'),report+'\n');
console.log(report);
