#!/usr/bin/env node
// NON-PUBLISHING simulation: tests eligibility/175-item mock continuity if the four
// exact D3B copies were ever owner-approved for retirement. Never edits source files.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
const read=async path=>JSON.parse(await readFile(join(root,path),'utf8'));
const mock=require(join(root,'rpsgt-v3/core/mock-engine.js'));
const practice=require(join(root,'rpsgt-v3/core/guided-trail-engine.js'));
const rotation=require(join(root,'rpsgt-v3/core/question-rotation-engine.js'));
const proposal=await read('rpsgt-v3/data/question-proposals/pediatric-v2-v3-repair-review-2026-10-12.json');
const manifest=await read('rpsgt-v3/data/question-bank/manifest.json');
const release=await read('data/owner-approved-question-release.json');
const html=await readFile(join(root,'RPSGTv2.2026.html'),'utf8');
const seed=html.match(/<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(seed,'Canonical V2 app-data must be present');
const v2=JSON.parse(seed).seed.questionBank;
const base=[];
for(const entry of manifest.modules) {
 const file=await read('rpsgt-v3/data/question-bank/'+entry.path);
 assert.equal(file.questions.length,entry.questionCount,'Original V3 module count mismatch '+entry.path);
 base.push(...file.questions);
}
assert.equal(base.length,2920);
assert.equal(release.questions.length,320);
assert.equal(v2.length,3240);
const v3=[...base,...release.questions];
const ids=v3.map(q=>String(q.id));
assert.deepEqual(ids.slice().sort(),v2.map(q=>String(q.id)).sort(),'Effective V2/V3 question ID sets must match');
assert.equal(new Set(ids).size,3240,'Original ID uniqueness check');
const group=proposal.confirmedExactDuplicateFamily;
const allIds=group.existingIds;
const keep=group.recommendedRetentionCandidate;
const excluded=group.proposedReviewForFutureDuplicateExclusion;
assert.deepEqual(allIds,['v1264-0161','v1264-0162','v1264-0163','v1264-0164','v1264-0165']);
assert.deepEqual(excluded,allIds.slice(1));
assert.equal(keep,allIds[0]);
assert.equal(proposal.releaseGates.publish,false,'No authority to actually publish retirement');
assert.equal(proposal.releaseGates.ownerApproval,'NOT GRANTED','Owner approval not granted');
const sourceSnapshots={v2:JSON.stringify(v2),v3:JSON.stringify(v3)};
const lookupV2=new Map(v2.map(q=>[String(q.id),q]));
const lookupV3=new Map(v3.map(q=>[String(q.id),q]));
for(const id of allIds){
 assert.ok(lookupV2.has(id)&&lookupV3.has(id),'Retirement dry-run cannot lose source identity '+id);
 assert.equal(lookupV2.get(id).prompt,lookupV3.get(id).prompt);
 assert.equal(lookupV2.get(id).answer,lookupV3.get(id).answer);
 assert.equal(lookupV2.get(id).qa?.manualReviewRecommended,false,'Target family already differs in eligibility');
}
const signatures=allIds.map(id=>{
 const q=lookupV3.get(id);
 return JSON.stringify([q.prompt,q.options,q.answer,q.rationale]);
});
assert.equal(new Set(signatures).size,1,'Target family must be exact duplicates, not semantically similar cases');
const retired=new Set(excluded);
function annotateCopy(question){
 if(!retired.has(String(question.id))) return question; 
 return {...question,qa:{...(question.qa||{}),manualReviewRecommended:true,learnerExcluded:true,retirementId:'proposed-pediatric-identical-family-2026-10-12'},
   manualReviewRecommended:true,reviewStatus:'retired'};
}
const v2Simulation=v2.map(annotateCopy);
const v3Simulation=v3.map(annotateCopy);
assert.equal(JSON.stringify(v2),sourceSnapshots.v2,'Cannot mutate original V2 source');
assert.equal(JSON.stringify(v3),sourceSnapshots.v3,'Cannot mutate original V3 source');
assert.deepEqual(v2Simulation.map(q=>String(q.id)),v2.map(q=>String(q.id)),'Never reindex existing IDs in simulated V2');
assert.deepEqual(v3Simulation.map(q=>String(q.id)),ids,'Never reindex existing IDs in simulated V3');
assert.equal(v2Simulation.length,v2.length);
assert.equal(v3Simulation.length,v3.length);
const originalEligible=v3.filter(q=>practice.eligibleQuestion(q,q.taskCode));
const afterEligible=v3Simulation.filter(q=>practice.eligibleQuestion(q,q.taskCode));
const excludedV3=v3Simulation.filter(q=>retired.has(String(q.id)));
assert.equal(originalEligible.length-afterEligible.length,4,'Only the four candidate copies should cease practice eligibility');
assert.equal(excludedV3.length,4);
assert.ok(excludedV3.every(q=>q.reviewStatus==='retired'&&q.qa.learnerExcluded===true&&q.qa.manualReviewRecommended===true));
assert.ok(practice.eligibleQuestion(v3Simulation.find(q=>String(q.id)===keep),'D3B'),'Retain canonical eligible question');
assert.ok(excludedV3.every(q=>mock.baseEligible(q)===false),'V3 mock rejects simulated retirements');
assert.ok(excludedV3.every(q=>rotation.safeEligible(q)===false),'Question rotation rejects simulated retirements');
assert.ok(excludedV3.every(q=>practice.eligibleQuestion(q,'D3B')===false),'V3 practice rejects simulated retirements');
function rngFor(seed){let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
const sampleSessions=[];
for(const num of [1,17,302,20261012,983721]){
 const baseline=mock.buildSession(v3,rngFor(num));
 const revised=mock.buildSession(v3Simulation,rngFor(num));
 for(const [kind,session] of [['baseline',baseline],['simulated',revised]]){
  assert.equal(session.items.length,175,num+' '+kind+' lost 175 exam items');
  assert.equal(session.items.filter(q=>q.role==='scored').length,150);
  assert.equal(session.items.filter(q=>q.role==='pretest').length,25);
  const seen=new Set(session.items.map(q=>String(q.id)));
  assert.equal(seen.size,175,'Duplicate mock IDs');
  const families=session.items.map(q=>mock.normalizeFamily(session.questionsById[String(q.id)]));
  assert.equal(new Set(families).size,175,'Mock has repeated question families');
  const counts={};
  session.items.filter(q=>q.role==='scored').forEach(q=>{const domain=session.questionsById[String(q.id)].domain;counts[domain]=(counts[domain]||0)+1});
  assert.deepEqual(counts,mock.SCORED_DOMAIN_COUNTS,'Scored domain balance changed');
  if(kind==='simulated')assert.equal(session.items.some(q=>retired.has(String(q.id))),false,'Retired ID appeared in simulated mock');
  const selected=allIds.filter(id=>seen.has(id)).length;
  assert.ok(selected<=1,'Mock engine did not dedupe identical five-question family');
  sampleSessions.push({seed:num,scenario:kind,total:session.items.length,scored:150,pretest:25,selectedExactFamily: selected,eligiblePool:session.eligibleCount});
 }
}
const result={
 type:'simulation-only-no-learner-changes',date:'2026-10-12',
 effectiveQuestionIdsPreserved:3240,
 originalBaseQuestionCount:base.length,ownerApprovedAdditions:release.questions.length,
 exactFamilyIds:allIds,retainedCandidate:keep,proposedExclusions:excluded,
 originalPracticeEligible:originalEligible.length,simulatedPracticeEligible:afterEligible.length,
 directEligibilityDifference:originalEligible.length-afterEligible.length,
 originalBytesUnchanged:true,mockBuildsTested:sampleSessions.length,
 allExamQuotaTestsPassed:true,allMockFamilyUniquenessTestsPassed:true,
 v2SelectionNotProven:'Actual V2 mock/practice selection and saved-history navigation were not executed in this simulation; browser regression and owner approval still needed.',
 rows:sampleSessions,
 blockers:['Explicit owner release approval for retirement IDs','Saved-progress and report-link regression for V2 and V3','Actual V2 browser practice/mock flow comparison','Licensed current AASM scoring-manual verification of independent pediatric scoring corrections']
};
const dir=join(root,'rpsgt-v3/audit-output');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'rpsgt-pediatric-duplicate-retirement-dry-run-2026.json'),JSON.stringify(result,null,2)+'\n');
const md=[
'# Pediatric D3B five-copy retirement: NON-PUBLISHING dry run','',
'The five identical questions are preserved in the source bank and no retirement is activated. IDs and original records are unchanged.',
'',
'- Eligible V3 original/effective-practice questions: '+originalEligible.length+' before, '+afterEligible.length+' with four proposed exclusions (simulation only)',
'- Original question IDs preserved: '+result.effectiveQuestionIdsPreserved,
'- V3 mock sessions tested: '+sampleSessions.length+' (5 deterministic seeds, baseline vs proposed eligibility)',
'- Every simulated exam retains 175 unique questions, 150 scored, 25 pretest, unchanged scored-domain counts, and unique mock prompt families.',
'- V3 mock already reduces the five exact copies to at most one per exam at baseline; the duplicate cleanup primarily benefits the broader bank/practice surfaces.',
'- Historical V2 and V3 question IDs are not removed, but **actual V2 UI/browser history behavior has not been validated**.',
'',
'**No approval** to retire or publish questions. This is a pre-release impact simulation. All four exclusions require explicit approval and live flow/migration tests first.'
].join('\n');
await writeFile(join(dir,'rpsgt-pediatric-duplicate-retirement-dry-run-2026.md'),md+'\n');
console.log(md);
