#!/usr/bin/env node
/**
 * Sleep Pathways Guild: audited RPSGT V3 question dispatch.
 *
 * Usage:
 *   node rpsgt-v3/scripts/dispatch-owner-questions.mjs --check
 *   node rpsgt-v3/scripts/dispatch-owner-questions.mjs --publish
 *
 * Owner clinical signoff is NOT publication authorization. Publish requires every
 * separately evidenced QA gate in owner-question-dispatch.json to be true.
 * This command never modifies extracted source modules, base 320-question release,
 * CPSGT content, V2 learner data, or existing learner answers.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async path=>JSON.parse(await readFile(join(root,path),'utf8'));
const write=async(path,value)=>writeFile(join(root,path),JSON.stringify(value,null,2)+'\n','utf8');
const dispatchPath='data/owner-question-dispatch.json';
const mandatoryGates=[
  'ownerClinicalApproved','sourcePassagesReviewed','semanticFamilyReviewCompleted',
  'blueprintTaskPlacementConfirmed','representativeLearnerHistoryRegressionPassed','ownerPublicationAuthorized'
];
const requested=process.argv.slice(2);
if(requested.length!==1||!['--check','--publish'].includes(requested[0])){
  console.error('Usage: node rpsgt-v3/scripts/dispatch-owner-questions.mjs --check|--publish');
  process.exitCode=2;
}else{
  await main(requested[0]);
}

async function main(mode){
  const [dispatch,base,proposal,approval,manifest]=await Promise.all([
    read(dispatchPath),read('data/owner-approved-question-release.json'),
    read('data/question-proposals/plms-pap-titration-2026-10-25.json'),
    read('data/question-proposals/OWNER-PLMS-PAP-CLINICAL-APPROVAL-2026-10-25.json'),
    read('data/question-bank/manifest.json')
  ]);
  assert.equal(dispatch.schemaVersion,1);
  assert.equal(dispatch.program,'RPSGT');
  assert.equal(dispatch.approvalId,approval.approvalId);
  assert.equal(approval.ownerClinicalApprovalStatus,'OWNER_RPSGT_APPROVED');
  assert.equal(proposal.questionCount,4);
  assert.equal(proposal.questions.length,4);
  assert.deepEqual(dispatch.pendingQuestionIds,proposal.questions.map(q=>q.id));
  const recorded=new Map(approval.approvedItems.map(item=>[item.id,item]));
  assert.equal(recorded.size,4);
  const originalIds=new Set(base.questions.map(q=>String(q.id)));
  const originalPrompts=new Set(base.questions.map(q=>String(q.prompt).trim().toLowerCase()));
  for(const module of manifest.modules){
    const source=await read('data/question-bank/'+module.path);
    for(const q of source.questions){
      assert.ok(!originalIds.has(String(q.id)),'Existing baseline/source ID collision');
      originalIds.add(String(q.id));
      originalPrompts.add(String(q.prompt).trim().toLowerCase());
    }
  }
  for(const q of proposal.questions){
    const item=recorded.get(q.id);
    assert.ok(item,'Missing signed question '+q.id);
    const material=Object.fromEntries(approval.snapshotFields.map(key=>[key,q[key]]));
    const digest=createHash('sha256').update(JSON.stringify(material)).digest('hex');
    assert.equal(digest,item.approvedContentSHA256,'Clinical approval hash changed: '+q.id);
    assert.equal(q.qa.approvedContentSHA256,digest);
    assert.equal(q.qa.ownerClinicalApprovalId,approval.approvalId);
    assert.equal(q.qa.ownerProfessionalClinicalReviewApproved,true);
    assert.equal(q.domain,item.mapping.domain);
    assert.equal(q.taskCode,item.mapping.taskCode);
    assert.ok(!originalIds.has(String(q.id)),'Release would replace legacy question '+q.id);
    assert.ok(!originalPrompts.has(String(q.prompt).trim().toLowerCase()),'Duplicate exact question text '+q.id);
    assert.ok(q.options.includes(q.answer));
    assert.equal(q.options.length,4);
    assert.equal(new Set(q.options).size,4);
    assert.equal(Object.keys(q.distractorRationales).length,3);
    assert.ok(q.referencesAPA.length>=2);
  }
  const missing=mandatoryGates.filter(key=>dispatch.qaGates?.[key]!==true);
  if(mode==='--check'){
    console.log(JSON.stringify({
      dispatchId:dispatch.dispatchId,status:dispatch.status,proposedQuestions:proposal.questions.length,
      servedQuestions:dispatch.questions.length,ownerClinicalApproved:true,
      missingReleaseGates:missing,sourceIdsPreserved:true,dispatchPath
    },null,2));
    return;
  }
  if(dispatch.status==='published')throw new Error('Already published; use --check, do not duplicate.');
  assert.equal(dispatch.status,'held','Only held batches can be dispatched.');
  assert.deepEqual(dispatch.questions,[],'Held manifest must not carry learner payload.');
  assert.deepEqual(missing,[],'Publication blocked by missing release gates: '+missing.join(', '));
  const questions=proposal.questions.map(q=>{
    const data=structuredClone(q);
    data.ownerReleaseApproved=true;
    data.publicationStatus='published-learner-eligible';
    data.qa={...data.qa,manualReviewRecommended:false,needsSemanticFamilyReview:false,
      fullBankComparisonPending:false,learnerHistoryRegressionPending:false,
      needsBlueprintTaskReview:false,ownerProfessionalClinicalReviewApproved:true,
      qaStatus:'Owner clinically approved; independent QA and release authorization completed per dispatch gate record'};
    // Exam-mock eligibility is independently curated; serve in Study/Practice/Readiness first.
    data.mockEligible=false;
    return data;
  });
  const published={...dispatch,status:'published',publishedAt:new Date().toISOString(),
    questions,note:'Dispatched to RPSGT V3 module/manifest/feedback/blueprint loader. Source questions and previous learner records preserved.'};
  await write(dispatchPath,published);
  console.log(JSON.stringify({status:'published',dispatched:questions.length,path:dispatchPath,ids:questions.map(q=>q.id)},null,2));
}
