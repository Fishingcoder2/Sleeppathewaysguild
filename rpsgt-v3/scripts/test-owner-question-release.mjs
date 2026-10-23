import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { splitOwnerReleaseQuestions } from './source-question-package.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const releaseApi=require(join(root,'core','owner-question-release.js'));
const readiness=require(join(root,'core','readiness-engine.js'));
const mock=require(join(root,'core','mock-engine.js'));
const guided=require(join(root,'core','guided-trail-engine.js'));
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const release=await readJson(join(root,'..','data','owner-approved-question-release.json'));
releaseApi.validateRelease(release);
assert.equal(release.questions.length,320);
assert.equal(release.rpsgtMatched.length,29);
assert.equal(release.programCounts.RPSGT,349);

const baseManifest=await readJson(join(root,'data','question-bank','manifest.json'));
const baseManifestSnapshot=JSON.stringify(baseManifest);
const manifest=releaseApi.decorate('data/question-bank/manifest.json',baseManifest,release);
assert.equal(manifest.meta.questionCount,3240);
assert.equal(manifest.meta.sourceQuestionCount,2920);
assert.equal(manifest.meta.developmentOnly,true);
assert.equal(manifest.integritySummary.manualReviewRecommendedCount,560);
assert.equal(manifest.meta.questionBankCanonicalSha256,baseManifest.meta.questionBankCanonicalSha256);
assert.equal(JSON.stringify(baseManifest),baseManifestSnapshot);
assert.equal(releaseApi.decorate('data/question-bank/manifest.json',manifest,release),manifest,'runtime decoration is idempotent');

const baseBank=[],effectiveBank=[],responses=new Map();
for(const entry of baseManifest.modules){
  const text=await readFile(join(root,'data','question-bank',entry.path),'utf8');
  assert.equal(createHash('sha256').update(text).digest('hex'),entry.sha256,'source module hash stays valid');
  const data=JSON.parse(text),snapshot=JSON.stringify(data),path='data/question-bank/'+entry.path;
  const effective=releaseApi.decorate(path,data,release);
  assert.deepEqual(effective.questions.slice(0,data.questions.length),data.questions,'every original question remains unchanged');
  assert.deepEqual(effective.sourceIndices,data.sourceIndices,'original reconstruction indices remain unchanged');
  assert.equal(JSON.stringify(data),snapshot,'source module objects are not mutated');
  assert.equal(manifest.modules.find(module=>module.path===entry.path).questionCount,effective.questions.length);
  baseBank.push(...data.questions);effectiveBank.push(...effective.questions);responses.set(path,data);
}
assert.equal(baseBank.length,2920);
assert.equal(effectiveBank.length,3240);
assert.equal(new Set(effectiveBank.map(question=>String(question.id))).size,3240);
const effectiveById=new Map(effectiveBank.map(question=>[String(question.id),question]));
for(const question of release.questions) assert.deepEqual(effectiveById.get(String(question.id)),question,'approved source content survives runtime adaptation');
for(const match of release.rpsgtMatched) assert.ok(effectiveById.has(String(match.publicId)),'already-live approved records remain available');
assert.equal(effectiveBank.filter(question=>question.qa?.manualReviewRecommended).length,560);
assert.equal(effectiveBank.filter(readiness.isEligible).length,3235,'all direct-task records are readiness-eligible after owner approval; five cross-task records remain outside direct-task readiness routing');
assert.ok(release.questions.every(question=>guided.eligibleQuestion(question,question.taskCode)),'all approved additions are selectable in learner practice and task checkpoints');

const v2Html=await readFile(join(root,'..','RPSGTv2.2026.html'),'utf8');
const v2Package=JSON.parse(v2Html.match(/<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
const split=splitOwnerReleaseQuestions(v2Package.seed.questionBank);
assert.equal(split.sourceQuestions.length,2920,'future extraction must keep the original source layer');
assert.equal(split.ownerReleaseQuestions.length,320,'future extraction must not duplicate approved runtime additions');
const baseById=new Map(baseBank.map(question=>[String(question.id),question]));
for(const question of split.sourceQuestions) assert.deepEqual(question,baseById.get(String(question.id)),'future extraction preserves each original record');
assert.deepEqual(splitOwnerReleaseQuestions(baseBank).sourceQuestions,baseBank,'older V2 source packages still extract unchanged');

const baseIndex=await readJson(join(root,'data','question-bank','feedback-index.json'));
const index=releaseApi.decorate('data/question-bank/feedback-index.json',baseIndex,release);
assert.equal(index.meta.questionCount,3240);
assert.equal(index.meta.learnerEligibleCount,2680);
assert.equal(index.meta.qualityReviewCount,560);
assert.deepEqual(index.records.slice(0,2920),baseIndex.records);
assert.equal(new Set(index.records.map(record=>String(record.id))).size,3240);
for(const record of index.records.slice(2920)){
  assert.ok(!('prompt' in record)&&!('options' in record)&&!('answer' in record)&&!('rationale' in record),'feedback remains a compact index');
  assert.equal(record.manualReviewRecommended,false);
}
assert.equal(Object.values(index.taskCounts).reduce((total,count)=>total+count,0),3240);
responses.set('data/question-bank/feedback-index.json',baseIndex);
responses.set('data/question-bank/manifest.json',baseManifest);
const blueprint=await readJson(join(root,'data','blueprint.json'));
const effectiveBlueprint=releaseApi.decorate('data/blueprint.json',blueprint,release);
assert.equal(effectiveBlueprint.domains.flatMap(domain=>domain.tasks).reduce((total,task)=>total+task.questionCount,0),3235,'guided map counts direct tasks separately from five cross-task records');
responses.set('data/blueprint.json',blueprint);

let seed=384712;const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const readinessSession=readiness.buildSession(release.questions,100,blueprint.domains,rng);
assert.equal(readinessSession.questions.length,100);
assert.ok(readinessSession.questions.every(question=>question.ownerReleaseApproved===true),'readiness can select the new approved questions');
const mockCandidates=mock.mockEligiblePool(effectiveBank);
assert.ok(mockCandidates.some(question=>question.ownerReleaseApproved===true),'appropriate approved additions enter the existing mock-style eligibility rules');
const mockSession=mock.buildSession(effectiveBank,rng);
assert.equal(mockSession.items.length,175,'mock size and domain allocation remain intact');
assert.ok(Object.values(mockSession.questionsById).every(question=>mock.baseEligible(question)),'mock items still satisfy direct-task, structural, and explicit mock-exclusion rules after owner approval');
assert.deepEqual(mockSession.blueprintCounts,{D1:30,D2:41,D3:38,D4:41});

const fetchCalls=[];
const context={fetch:async path=>{
  fetchCalls.push(path);
  const payload=path===releaseApi.RELEASE_PATH?release:responses.get(path);
  assert.ok(payload,'unexpected runtime fetch '+path);
  return {ok:true,status:200,json:async()=>structuredClone(payload)};
}};
vm.createContext(context);
vm.runInContext(await readFile(join(root,'core','owner-question-release.js'),'utf8'),context);
const loaded=await Promise.all(['data/question-bank/manifest.json','data/question-bank/feedback-index.json','data/blueprint.json',...baseManifest.modules.map(entry=>'data/question-bank/'+entry.path)].map(path=>context.RPSGTOwnerQuestionRelease.loadJson(path)));
assert.equal(loaded[0].meta.questionCount,3240);
assert.equal(loaded[1].records.length,3240);
assert.equal(fetchCalls.filter(path=>path===releaseApi.RELEASE_PATH).length,1,'concurrent loaders fetch the approved release once');

const bankControllers=[];
for(const file of await readdir(join(root,'core'))){
  if(!file.endsWith('.js')||file==='owner-question-release.js') continue;
  const source=await readFile(join(root,'core',file),'utf8');
  if(!source.includes('data/question-bank/')) continue;
  bankControllers.push(file);
  assert.ok(source.includes('RPSGTOwnerQuestionRelease.loadJson'),'bank controller uses the approved runtime loader: '+file);
}
let pages=0;
for(const file of (await readdir(root)).filter(file=>file.endsWith('.html'))){
  const html=await readFile(join(root,file),'utf8');
  const controllers=bankControllers.filter(controller=>html.includes('core/'+controller));
  if(!controllers.length) continue;
  pages++;
  const loader=html.indexOf('src="core/owner-question-release.js"');
  assert.ok(loader>=0,'page includes approved loader: '+file);
  assert.ok(controllers.every(controller=>loader<html.indexOf('src="core/'+controller+'"')),'approved loader precedes bank consumers: '+file);
  assert.match(html,/noindex/i,'development version remains unlisted: '+file);
}
assert.throws(()=>releaseApi.validateRelease({...release,rpsgtAddedCount:319}),/count/);
assert.throws(()=>releaseApi.validateRelease({...release,questions:[{...release.questions[0],ownerReleaseApproved:false}]}),/incomplete/);
for (const unsafe of [
  {qa:{...release.questions[0].qa,manualReviewRecommended:true}},
  {qa:{...release.questions[0].qa,learnerExcluded:true}},
  {publicationStatus:'proposed-not-learner-eligible'}
]) {
  assert.throws(
    ()=>releaseApi.validateRelease({...release,questions:[{...release.questions[0],...unsafe}]}),
    /not been released for learner practice/,
    'V3 must reject held or learner-excluded candidate'
  );
}
console.log(JSON.stringify({sourceQuestions:2920,approvedAdditions:320,effectiveQuestions:3240,readinessEligibleDirectTask:3235,releasedManualReviewFlags:560,bankControllers:bankControllers.length,integratedPages:pages,mockCandidates:mockCandidates.length},null,2));
