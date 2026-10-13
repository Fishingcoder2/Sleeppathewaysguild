#!/usr/bin/env node
// Editorial quality contract for seven UNPUBLISHED RPSGT candidates.
// This check does not constitute clinical signoff, semantic uniqueness,
// licensed AASM v3 verification, or learner-history/browser regression.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const dir='rpsgt-v3/data/question-proposals/';
const spriggs=await read(dir+'spriggs-modernized-2026-10-12.json');
const gaps=await read(dir+'spriggs-gap-pilot-2026-10-12.json');
const approval=await read(dir+'OWNER-CONDITIONAL-APPROVAL-2026-10-13.json');
const overlay=await read('data/owner-approved-question-release.json');
const qList=[...spriggs.questions,...gaps.questions];
const expected={
  'SPG-SPRIGGS-2026-003':{task:'D2A',answer:'Check the affected EOG electrode, connector, impedance and derivation; restore the signal and repeat calibration',source:'aast-psg',rationale:/EOG.*calibration|calibration.*EOG/i},
  'SPG-SPRIGGS-2026-005':{task:'D2B',answer:"Flag the short sleep time and communicate with the ordering team under the laboratory's protocol before proceeding",source:'aasm-pediatric-mslt-mwt-2024',rationale:/eight hours.*seven hours/i},
  'SPG-SPRIGGS-2026-006':{task:'D2B',answer:'Recognize that an MSLT should not follow a PAP-adjustment night and contact the ordering team about rescheduling or further direction',source:'aasm-adult-mslt-mwt-2021',rationale:/split-night/i},
  'SPG-SPRIGGS-2026-008':{task:'D3B',answer:'Review and, where necessary, re-score the respiratory events under the AASM pediatric rules applicable to this age, documenting the correction',source:'aasm-scoring-current',rationale:/licensed AASM Version 3/i,requiresLicensed:true},
  'SPG-SPRIGGS-2026-009':{task:'D3C',answer:'Nasal-pressure signal absent from 02:10–03:00; cause, correction and restoration time recorded, with affected data-quality limitations identified',source:'aast-psg',rationale:/02:10.*03:00/i},
  'SPG-GAP-2026-001':{task:'D1A',answer:'Document the new symptom timing, involved body regions and dopaminergic medication history, and alert the treating clinician to possible augmentation',source:'aasm-rls-plmd-2025',rationale:/dopamine-agonist/i},
  'SPG-GAP-2026-002':{task:'D2B',answer:'Arrange clinician-directed attended polysomnography because a negative HSAT does not conclusively exclude OSA in this symptomatic patient',source:'aasm-adult-osa-diagnostic-testing-2017',rationale:/negative.*HSAT/i}
};
assert.equal(spriggs.questions.length,5,'Five Spriggs drafts required');
assert.equal(gaps.questions.length,2,'Two gap drafts required');
assert.equal(qList.length,7,'Seven held drafts required');
assert.deepEqual(qList.map(q=>q.id).sort(),Object.keys(expected).sort());
const overlayIds=new Set(overlay.questions.map(q=>String(q.id)));
assert.equal(overlay.questions.length,320,'Owner-approved historical overlay must not be changed');
for(const q of qList){
 const rule=expected[q.id], recorded=approval.newQuestions.find(x=>x.id===q.id);
 assert.ok(recorded,'Missing owner conditional record '+q.id);
 assert.equal(q.taskCode,rule.task,'BRPT task must be preserved '+q.id);
 assert.equal(recorded.taskCode,q.taskCode,'Owner task mismatch '+q.id);
 assert.equal(q.answer,rule.answer,'Keyed answer changed '+q.id);
 assert.equal(q.publicationStatus,'proposed-not-learner-eligible','Unapproved content release '+q.id);
 assert.equal(q.qa?.manualReviewRecommended,true,'Manual review hold removed '+q.id);
 assert.notEqual(q.ownerReleaseApproved,true,'Final owner release must not be auto-set');
 assert.equal(recorded.ownerConditionalPublicationApproved,true);
 assert.equal(recorded.finalLearnerReleaseApproved,false);
 assert.equal(recorded.eligibleForLearnerBank,false);
 assert.equal(recorded.independentQualifiedClinicalSignoff,'PENDING');
 assert.equal(recorded.individualAnswerDistractorRationaleSignoff,'PENDING');
 assert.equal(recorded.completeSemanticDuplicateReview,'PENDING');
 assert.equal(recorded.crossVersionLearnerAndHistoryRegression,'PENDING');
 assert.equal(recorded.licensedCurrentAasmV3CheckCompleted,false);
 if(rule.requiresLicensed)assert.equal(recorded.licensedCurrentAasmV3CheckRequired,true);
 assert.equal(overlayIds.has(q.id),false,'Candidate found in released overlay '+q.id);
 assert.ok(q.referenceKeys?.includes(rule.source),'Missing controlling source key '+q.id);
 assert.equal(q.options?.length,4,'Not a four-option item '+q.id);
 assert.equal(new Set(q.options).size,4,'Duplicate option '+q.id);
 assert.equal(q.options.filter(x=>x===q.answer).length,1,'Non-unique keyed answer '+q.id);
 assert.ok(q.rationale?.length>=150,'Insufficient item-specific rationale '+q.id);
 assert.ok(rule.rationale.test(q.rationale),'Missing critical source/clinical boundary in '+q.id);
}
assert.equal(approval.decisionSummary.newQuestionsConditionallyApproved,7);
assert.equal(approval.decisionSummary.existingQuestionRevisionsAuthorizedToProceed,5);
assert.equal(approval.decisionSummary.duplicateRetirementsAuthorized,0);
assert.equal(approval.decisionSummary.learnerQuestionAdditionsAuthorizedNow,0);
assert.equal(approval.decisionSummary.learnerQuestionRevisionsAuthorizedNow,0);
assert.equal(approval.decisionSummary.learnerRetirementsAuthorizedNow,0);
assert.equal(approval.duplicateRetirements.anyRetirementActionAllowed,false);
assert.equal(approval.duplicateRetirements.candidateCount,15);
assert.equal(approval.gateDecision.status,'BLOCKED_FROM_LEARNER_ACTIVATION');
const report={
 date:'2026-10-13',
 purpose:'Non-publishing seven-item draft editorial preflight',
 testsPassed:true,
 candidatesInspected:qList.length,
 questionIds:qList.map(q=>q.id),
 unchangedCorrectAnswers:7,
 unchangedTaskCodes:7,
 uniqueFourOptionItems:7,
 ownerConditionalApprovals:7,
 qualifiedClinicalSignoffsClaimed:0,
 licensedAasmV3ScoringRulesClaimedVerified:0,
 learnerContentActivated:0,
 duplicateRetirementsAuthorized:0,
 caveat:'Automated structural and editorial checks do not replace qualified professional clinical review, comprehensive semantic-family signoff, licensed current AASM v3 validation, or real learner-history regression.'
};
const target=join(root,'rpsgt-v3/audit-output');
await mkdir(target,{recursive:true});
await writeFile(join(target,'rpsgt-seven-editorial-preflight-2026.json'),JSON.stringify(report,null,2)+'\n');
console.log('RPSGT seven-item unpublished editorial preflight PASS: 7 distinct four-choice, ID/key/task/source and release-hold assertions. No content activated.');
