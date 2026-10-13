#!/usr/bin/env node
// NON-PUBLISHING QA: model six candidate duplicate-family consolidations across V2/V3.
// No learner-bank edits, no deletion, no actual retirement is authorized.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const mock=require(join(root,'rpsgt-v3/core/mock-engine.js'));
const practice=require(join(root,'rpsgt-v3/core/guided-trail-engine.js'));
const rotation=require(join(root,'rpsgt-v3/core/question-rotation-engine.js'));
const queue=await read('rpsgt-v3/data/question-proposals/v2-v3-duplicate-consolidation-queue-2026-10-12.json');
assert.equal(queue.releaseGate.publish,false);
assert.equal(queue.releaseGate.ownerApproval,'NOT GRANTED');
assert.equal(queue.totals.families,6);
assert.equal(queue.totals.proposedExclusionCandidates,15);
const manifest=await read('rpsgt-v3/data/question-bank/manifest.json');
const release=await read('data/owner-approved-question-release.json');
let base=[];for(const entry of manifest.modules){const pkg=await read('rpsgt-v3/data/question-bank/'+entry.path);base=base.concat(pkg.questions);}
assert.equal(base.length,2920);assert.equal(release.questions.length,320);
const v3=base.concat(release.questions);
const html=await readFile(join(root,'RPSGTv2.2026.html'),'utf8');
const raw=html.match(/<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(raw,'V2 app-data missing');
const v2=JSON.parse(raw).seed.questionBank;
assert.equal(v2.length,3240);
const v2ById=new Map(v2.map(q=>[String(q.id),q])),v3ById=new Map(v3.map(q=>[String(q.id),q]));
assert.equal(v2ById.size,3240);assert.equal(v3ById.size,3240);
const excluded=new Set(),retained=new Set(),details=[];
for(const f of queue.families){
 assert.equal(f.stageOnly,true,'Review family must not imply a released retirement.');
 assert.equal(f.ownerApproved,false);
 assert.equal(f.ids.length>=2,true);
 assert.deepEqual(f.proposedExclusionIds,f.ids.filter(id=>id!==f.retentionCandidate));
 const prompts=new Set();
 const signatures=new Set();
 for(const id of f.ids){
  const x=v2ById.get(id),y=v3ById.get(id);
  assert.ok(x&&y,'Missing cross-version source ID '+id);
  for(const fld of ['prompt','options','answer','rationale','taskCode'])
   assert.deepEqual(x[fld],y[fld],'V2/V3 original source mismatch '+id+'/'+fld);
  assert.equal(y.taskCode,f.task,'Proposed family task mismatch '+id);
  assert.notEqual(y.qa?.manualReviewRecommended,true,'Already-held item wrongly treated as newly eligible '+id);
  prompts.add(y.prompt.toLowerCase().replace(/\s+/g,' ').trim());
  signatures.add(JSON.stringify([y.prompt,y.options,y.answer,y.rationale]));
 }
 assert.equal(prompts.size,1,'Same-stem family changed: '+f.familyId);
 if(f.category==='exact')assert.equal(signatures.size,1,'Literal duplicate family differs in options/answers '+f.familyId);
 if(f.category==='same-stem-equivalent-decision')assert.ok(signatures.size>1,'Semantic family unexpectedly literal duplicates');
 retained.add(f.retentionCandidate);
 f.proposedExclusionIds.forEach(id=>{assert.ok(!excluded.has(id),'Double-proposed retirement '+id);excluded.add(id);});
 details.push({family:f.familyId,task:f.task,originalIds:f.ids.length,retained:f.retentionCandidate,simulatedExclusions:f.proposedExclusionIds.length,category:f.category});
}
assert.equal(excluded.size,15);
assert.equal(retained.size,6);
const sourceIds=v3.map(q=>String(q.id));
const beforeV2Json=JSON.stringify(v2),beforeV3Json=JSON.stringify(v3);
function annotate(q){return !excluded.has(String(q.id))?q:{...q,manualReviewRecommended:true,reviewStatus:'retired',
 qa:{...(q.qa||{}),manualReviewRecommended:true,learnerExcluded:true,retirementId:'DRAFT-UNAPPROVED-'+String(q.id)}};}
const simulatedV2=v2.map(annotate),simulatedV3=v3.map(annotate);
assert.equal(JSON.stringify(v2),beforeV2Json);
assert.equal(JSON.stringify(v3),beforeV3Json);
assert.deepEqual(simulatedV2.map(q=>String(q.id)),v2.map(q=>String(q.id)));
assert.deepEqual(simulatedV3.map(q=>String(q.id)),sourceIds);
const eligibleBefore=v3.filter(q=>practice.eligibleQuestion(q,q.taskCode));
const eligibleAfter=simulatedV3.filter(q=>practice.eligibleQuestion(q,q.taskCode));
assert.equal(eligibleBefore.length-eligibleAfter.length,excluded.size,'Eligibility should change for only the 15 candidate copies');
for(const id of excluded){
 const q=simulatedV3.find(row=>String(row.id)===id);
 assert.ok(q&&q.qa.learnerExcluded===true&&q.reviewStatus==='retired');
 assert.equal(practice.eligibleQuestion(q,q.taskCode),false);
 assert.equal(mock.baseEligible(q),false);
 assert.equal(rotation.safeEligible(q),false);
}
for(const id of retained)assert.ok(eligibleAfter.some(q=>String(q.id)===id),'Retained source item missing '+id);
const seeds=[1,17,302,983721,20261012];
const domain=mock.SCORED_DOMAIN_COUNTS;
const exams=[];
function rngFor(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
for(const s of seeds){
 for(const [state,records] of [['baseline',v3],['proposed-only',simulatedV3]]){
  const session=mock.buildSession(records,rngFor(s));
  assert.equal(session.items.length,175,'Mock size');
  assert.equal(session.items.filter(x=>x.role==='scored').length,150);
  assert.equal(session.items.filter(x=>x.role==='pretest').length,25);
  assert.equal(new Set(session.items.map(x=>String(x.id))).size,175);
  assert.equal(new Set(session.items.map(x=>mock.normalizeFamily(session.questionsById[String(x.id)]))).size,175);
  const counts={};for(const item of session.items.filter(x=>x.role==='scored')){
   const domainId=session.questionsById[String(item.id)].domain;counts[domainId]=(counts[domainId]||0)+1;
  }
  assert.deepEqual(counts,domain);
  if(state==='proposed-only')assert.equal(session.items.some(x=>excluded.has(String(x.id))),false,'Simulated excluded copy in new session');
  const selectedByFamily=details.map(f=>{
   const source=queue.families.find(g=>g.familyId===f.family);
   return session.items.filter(x=>source.ids.includes(String(x.id))).length;
  });
  assert.ok(selectedByFamily.every(n=>n<=1),'Repeated identical/semantic family in a mock');
  exams.push({seed:s,state,items:session.items.length,scored:150,pretest:25,selectedFamilyMax:Math.max(...selectedByFamily)});
 }
}
const result={date:'2026-10-12',scope:'Six exact/same-stem equivalent-answer families (V2+V3); simulation only',
 sourceQuestionRecordsPreserved:3240,originalLearnerPracticeEligible:eligibleBefore.length,
 hypotheticalPracticeEligible:eligibleAfter.length,hypotheticallyExcluded:excluded.size,
 uniqueFamilyRetentionCandidates:retained.size,simulatedMockRuns:exams.length,
 all175ItemExamsValid:true,allExamDomainQuotasPreserved:true,
 originalV2AndV3Unchanged:true,details,exams,
 importantLimitations:['No live V2 browser/practice/mock implementation was exercised; this uses V3 mock/practice engines.','No existing V2 or V3 storage migration, history lookup, reports or flashcard state were altered or tested.','Neither licensed AASM scoring-rule verification nor owner clinical/editorial release signoff is conferred.','Do not publish this proposed exclusion set from a test result.']};
const dir=join(root,'rpsgt-v3/audit-output');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'rpsgt-v2-v3-six-family-consolidation-dry-run-2026.json'),JSON.stringify(result,null,2)+'\n');
const md=[
 '# Shared V2/V3 six-family consolidation — NON-PUBLISHING impact simulation','',
 '- Original records and IDs preserved: '+result.sourceQuestionRecordsPreserved,
 '- Families: '+queue.families.length+' (three literal five-copy groups; three same-stem equivalent-decision pairs)',
 '- Exclusion candidates: '+result.hypotheticallyExcluded+'; retained canonical candidates: '+result.uniqueFamilyRetentionCandidates,
 '- Practice-eligible items using actual V3 eligibility rules: '+eligibleBefore.length+' baseline; '+eligibleAfter.length+' simulated',
 '- Deterministic V3 mock builds: '+exams.length+' (all 175 questions; 150 scored/25 pretest; blueprint domain counts intact)',
 '- Original V2, V3 question records, learner IDs and owner-release file: **untouched**',
 '','## Family list',
 ...details.map(x=>'- '+x.family+': '+x.originalIds+' existing, '+x.simulatedExclusions+' proposed exclusions, keep '+x.retained),
 '','## NOT certified',
 'V2 browser test flows and report-history lookups, user storage/progress migrations, current AASM licensed scoring specifics and explicit owner publication approval remain **unverified**. This exercise tests the proposal in memory only and does not retire anything.'
].join('\n');
await writeFile(join(dir,'rpsgt-v2-v3-six-family-consolidation-dry-run-2026.md'),md+'\n');
console.log(md);
