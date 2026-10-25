import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async relative=>JSON.parse(await readFile(join(root,relative),'utf8'));
const approved=await read('data/question-proposals/OWNER-PLMS-PAP-CLINICAL-APPROVAL-2026-10-25.json');
const draft=await read('data/question-proposals/plms-pap-titration-2026-10-25.json');
const release=await read('data/owner-approved-question-release.json');
const dispatch=await read('data/owner-question-dispatch.json');
assert.equal(dispatch.approvalId,approved.approvalId);

assert.equal(approved.ownerClinicalApprovalStatus,'OWNER_RPSGT_APPROVED');
assert.equal(approved.approvedOn,'2026-10-25');
assert.equal(draft.questions.length,4);
assert.equal(approved.approvedItems.length,4);
assert.equal(draft.questionCount,4);
const frozenFields=approved.snapshotFields;
assert.deepEqual(frozenFields,[
  'id','domain','taskCode','task','topic','prompt','options','answer','rationale',
  'distractorRationales','referenceKeys','referencesAPA'
]);
const approvals=new Map(approved.approvedItems.map(item=>[item.id,item]));
assert.equal(approvals.size,4);
const existingIDs=new Set(release.questions.map(item=>String(item.id)));
for(const question of draft.questions){
  const item=approvals.get(question.id);
  assert.ok(item,'Every new question must have item-specific approval: '+question.id);
  assert.ok(!existingIDs.has(question.id),'Draft must not silently replace an existing owner-release item');
  const content=Object.fromEntries(frozenFields.map(key=>[key,question[key]]));
  const digest=createHash('sha256').update(JSON.stringify(content)).digest('hex');
  assert.equal(digest,item.approvedContentSHA256,'Material revision needs renewed owner clinical approval: '+question.id);
  assert.equal(question.qa.approvedContentSHA256,digest);
  assert.equal(question.qa.ownerClinicalApprovalId,approved.approvalId);
  assert.equal(question.qa.ownerProfessionalClinicalReviewApproved,true);
  assert.equal(question.ownerReleaseApproved,false);
  assert.equal(question.qa.manualReviewRecommended,true);
  assert.equal(question.publicationStatus,'proposed-not-learner-eligible');
  assert.equal(question.mockEligible,false);
  assert.equal(question.domain,item.mapping.domain);
  assert.equal(question.taskCode,item.mapping.taskCode);
  assert.equal(question.answer,item.answer);
  assert.equal(question.options.length,4);
  assert.equal(new Set(question.options).size,4);
  assert.ok(question.options.includes(question.answer));
  assert.equal(Object.keys(question.distractorRationales).length,3);
  assert.ok(question.options.filter(option=>option!==question.answer).every(option=>question.distractorRationales[option]));
  assert.ok(question.referencesAPA.length>=2,'Every item needs APA-formatted learner references');
  assert.equal(question.qa.needsSemanticFamilyReview,true,'Semantic audit remains an independent release gate');
  assert.equal(question.qa.learnerHistoryRegressionPending,true,'Saved-history regression remains an independent release gate');
}
assert.match(draft.status,/RELEASE QA PENDING/i);
if(dispatch.status==='held'){
  assert.deepEqual(dispatch.questions,[],'No public question payload until release gates pass');
  assert.ok(Object.values(dispatch.qaGates).some(value=>value!==true),'Held queue must still show a named release blocker');
}else if(dispatch.status==='published'){
  assert.equal(dispatch.questions.length,4,'Only these four version-approved questions may be dispatched');
  assert.ok(Object.values(dispatch.qaGates).every(value=>value===true),'Published batch requires every QA gate');
  for(const question of dispatch.questions){
    const item=approvals.get(question.id);
    assert.ok(item,'Unapproved question in learner dispatch: '+question.id);
    const content=Object.fromEntries(frozenFields.map(key=>[key,question[key]]));
    const digest=createHash('sha256').update(JSON.stringify(content)).digest('hex');
    assert.equal(digest,item.approvedContentSHA256,'Published content drift requires fresh owner approval');
    assert.equal(question.qa.approvedContentSHA256,digest);
    assert.equal(question.publicationStatus,'published-learner-eligible');
    assert.equal(question.ownerReleaseApproved,true);
    assert.equal(question.qa.manualReviewRecommended,false);
    assert.equal(question.qa.learnerHistoryRegressionPending,false);
    assert.equal(question.qa.needsSemanticFamilyReview,false);
    assert.equal(question.qa.needsBlueprintTaskReview,false);
  }
}else throw new Error('Unknown PLMS/PAP dispatch status: '+dispatch.status);
console.log('Validated four version-pinned clinical approvals and separately gated '+dispatch.status+' dispatch.');
