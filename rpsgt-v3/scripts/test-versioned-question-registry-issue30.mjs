// Issue #30 regression harness — fictional *revised* answers, real historical IDs.
// Never publish these synthetic revised questions or bypass the clinical/source gates.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const policy=require(join(root,'core','versioned-question-registry.js'));
const readiness=require(join(root,'core','readiness-engine.js'));
const mock=require(join(root,'core','mock-engine.js'));
const ids=[
  ['d2b.json','RPSGT-B2-M057'],
  ['d3b.json','SPG-RPSGT-B003-074'],
  ['d4a.json','case-d4-014']
];
const oldRecords=[];
for(const [file,id] of ids){
  const moduleData=JSON.parse(await readFile(join(root,'data','question-bank',file),'utf8'));
  const original=moduleData.questions.find(q=>String(q.id)===id);
  assert.ok(original,'Missing historical record '+id);
  oldRecords.push(original);
}
const baseline=JSON.stringify(oldRecords);
const held=policy.buildView(oldRecords,ids.map(([,id])=>({supersedesId:id,status:'held'})));
assert.equal(held.publishedRevisions,0);
assert.deepEqual(held.newSessionBank,oldRecords);
assert.deepEqual(held.historicalBank,oldRecords);

const allGates=Object.fromEntries(policy.REQUIRED_GATES.map(key=>[key,true]));
const requests=oldRecords.map((original,i)=>{
  const revised={...original,id:'SPG-ISSUE30-FICTIONAL-REV-'+(i+1),
    revisionOf:String(original.id),
    prompt:'Fictional compatibility test '+i+' — not learner material',
    answer:'Synthetic revised answer '+i,
    options:['Synthetic revised answer '+i,'Synthetic distractor '+i],
    ownerReleaseApproved:true,
    publicationStatus:'published-learner-eligible',
    referencesAPA:['Synthetic test citation 1','Synthetic test citation 2'],
    qa:{manualReviewRecommended:false,learnerExcluded:false}};
  return {supersedesId:String(original.id),status:'published',qaGates:allGates,question:revised};
});
assert.throws(()=>policy.buildView(oldRecords,requests.map((r,i)=>
  i===0?{...r,qaGates:{...allGates,ownerClinicalApproved:false}}:r)),/incomplete release gates/);
assert.throws(()=>policy.buildView(oldRecords,
  requests.map((r,i)=>i===0?{...r,question:{...r.question,id:r.supersedesId}}:r)),/new and unique/);

const published=policy.buildView(oldRecords,requests);
assert.equal(published.publishedRevisions,3);
assert.equal(published.newSessionBank.length,3);
assert.equal(published.historicalBank.length,6);
assert.equal(new Set(published.historicalBank.map(q=>String(q.id))).size,6);
assert.ok(published.newSessionBank.every(q=>q.id.startsWith('SPG-ISSUE30-FICTIONAL-REV')));
assert.ok(published.newSessionBank.every(q=>readiness.isEligible(q) && mock.baseEligible(q)));
assert.deepEqual(published.resolveSavedIds(oldRecords.map(q=>q.id)),oldRecords,
  'Saved historical IDs must resolve the unchanged source answer keys');
assert.deepEqual(published.resolveSavedIds(requests.map(q=>q.question.id)),
  requests.map(q=>q.question));
assert.throws(()=>published.resolveSavedIds(['missing-old-question']),/Unresolved historical/);
assert.equal(JSON.stringify(oldRecords),baseline,'Source questions must not be mutated');
for(const original of oldRecords){
  const old=published.resolveSavedIds([original.id])[0];
  assert.equal(old.answer,original.answer,'Old completed attempt must keep original key');
  assert.ok(!published.newSessionBank.some(q=>String(q.id)===String(original.id)),
    'A superseded question must not enter a new session');
}
// Simulated saved readiness and mock IDs can be resolved *from the archive*,
// even when originals are excluded from the next new-session selection.
const savedReadiness={questionIds:[oldRecords[0].id,requests[1].question.id],
  answers:{[String(oldRecords[0].id)]:oldRecords[0].answer}};
const savedMock={items:[{id:oldRecords[1].id,role:'scored'},
  {id:requests[2].question.id,role:'pretest'}]};
assert.equal(published.resolveSavedIds(savedReadiness.questionIds).length,2);
assert.equal(published.resolveSavedIds(savedMock.items.map(item=>item.id)).length,2);
assert.equal(savedReadiness.answers[String(oldRecords[0].id)],oldRecords[0].answer);
console.log(JSON.stringify({
  status:'PASS — prototype-only regression, not integrated or released',
  originalIdsPreserved:3,newSessionRevisionIds:3,
  historicalIdsResolvable:6,heldReleaseSafe:true,
  missingGateRejected:true,collisionRejected:true
},null,2));
