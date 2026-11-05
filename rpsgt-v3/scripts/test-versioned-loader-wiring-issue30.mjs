// Audit Issue #30: repeatable full-bank regression of review-branch loader wiring.
// This test never connects to a database, production site, or real learner storage.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(join(root,path),'utf8');
const readJson=async path=>JSON.parse(await read(path));
const require=createRequire(import.meta.url);
const registry=require(join(root,'core','versioned-question-registry.js'));
const readinessEngine=require(join(root,'core','readiness-engine.js'));
const mockEngine=require(join(root,'core','mock-engine.js'));
const manifest=await readJson('data/question-bank/manifest.json');
const blueprint=await readJson('data/blueprint.json');
const packages={};
for(const meta of manifest.modules) packages[meta.path]=await readJson('data/question-bank/'+meta.path);
const source=Object.values(packages).flatMap(pkg=>pkg.questions);
assert.equal(source.length,2920);
assert.equal(manifest.meta.questionCount,2920);
const readinessJs=await read('core/readiness.js');
const mockJs=await read('core/mock.js');
const originalIds=['RPSGT-B2-M057','SPG-RPSGT-B003-074','case-d4-014'];
const originals=originalIds.map(id=>source.find(q=>String(q.id)===id));
assert.ok(originals.every(Boolean),'All three original Issue #30 questions must exist');

function instrument(script,exportNames){
  const close=script.lastIndexOf('})();');
  assert.ok(close>=0,'Expected closed source-module IIFE');
  return script.slice(0,close)+'\nwindow.__issue30Test={'+exportNames+'};\n'+script.slice(close);
}
function wire(kind,api=registry){
  const loader={loadJson:async path=>{
    if(path==='data/question-bank/manifest.json') return manifest;
    if(path==='data/blueprint.json') return blueprint;
    const data=packages[path.slice('data/question-bank/'.length)];
    assert.ok(data,'Missing question source: '+path);
    return data;
  }};
  const window={
    RPSGTVersionedQuestionRegistry:api,
    RPSGTOwnerQuestionRelease:loader,
    RPSGTReadinessEngine:readinessEngine,
    RPSGTMockEngine:mockEngine
  };
  const document={readyState:'loading',addEventListener(){}};
  const src=kind==='readiness'?readinessJs:mockJs;
  const names=kind==='readiness'?'state,loadLearnerBank,sessionQuestionsFromIds':'state,loadBank';
  return new Function('window','document',
    instrument(src,names)+'\nreturn window.__issue30Test;')(window,document);
}
function prng(number){
  let seed=number>>>0;
  return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
}
async function inspect(api,expectPublished){
  const rd=wire('readiness',api);
  rd.state.manifest=manifest;
  await rd.loadLearnerBank();
  const mk=wire('mock',api);
  await mk.loadBank();
  assert.equal(rd.state.bank.length,2915);
  assert.equal(mk.state.bank.length,2915);
  assert.equal(rd.state.historicalQuestionMap.size,expectPublished?2918:2915);
  assert.equal(mk.state.questionMap.size,expectPublished?2918:2915);
  const saved=rd.sessionQuestionsFromIds(originalIds.slice().reverse());
  assert.deepEqual(saved.map(q=>q.answer),originals.slice().reverse().map(q=>q.answer));
  assert.deepEqual(originalIds.map(id=>mk.state.questionMap.get(id).answer),
    originals.map(q=>q.answer));
  for(const id of originalIds){
    assert.equal(rd.state.bank.some(q=>String(q.id)===id),!expectPublished,
      'Old readiness version must be new-selectable only before replacement');
    assert.equal(mk.state.bank.some(q=>String(q.id)===id),!expectPublished,
      'Old mock version must be new-selectable only before replacement');
  }
  if(expectPublished){
    for(const i of [0,1,2]){
      const id='SPG-ISSUE30-FICTIONAL-'+(i+1);
      assert.ok(rd.state.bank.some(q=>q.id===id),'New ID absent from readiness selection');
      assert.ok(mk.state.bank.some(q=>q.id===id),'New ID absent from mock selection');
      assert.ok(rd.state.historicalQuestionMap.has(id),'New ID absent from history');
    }
  }
  const results=[];
  for(const seed of [20260801,20261105,5,14,42]){
    const mock=mockEngine.buildSession(mk.state.bank,prng(seed));
    const readiness=readinessEngine.buildSession(rd.state.bank,50,blueprint.domains,prng(seed));
    assert.equal(mock.items.length,175);
    assert.equal(readiness.questions.length,50);
    assert.equal(new Set(mock.items.map(item=>String(item.id))).size,175);
    assert.equal(new Set(readiness.questions.map(q=>String(q.id))).size,50);
    for(const item of mock.items) assert.ok(mk.state.questionMap.has(String(item.id)));
    const restored=rd.sessionQuestionsFromIds(readiness.questions.map(q=>q.id));
    assert.deepEqual(restored.map(q=>q.id),readiness.questions.map(q=>q.id));
    const expected=mockEngine.SCORED_DOMAIN_COUNTS;
    for(const [domain,count] of Object.entries(expected))
      assert.equal(mock.items.filter(item=>item.role==='scored'&&
        mock.questionsById[String(item.id)].domain===domain).length,count);
    const responses=Object.fromEntries(mock.items.map(item=>[
      String(item.id),mock.questionsById[String(item.id)].answer
    ]));
    assert.equal(mockEngine.summarize(mock.items,mock.questionsById,responses).scoredPercent,100);
    results.push({seed,mock:mock.items.length,readiness:readiness.questions.length});
  }
  return results;
}
const held=await inspect(registry,false);
const gates=Object.fromEntries(registry.REQUIRED_GATES.map(key=>[key,true]));
const versions=originals.map((q,i)=>({
  status:'published',supersedesId:String(q.id),qaGates:gates,
  question:{...q,id:'SPG-ISSUE30-FICTIONAL-'+(i+1),revisionOf:String(q.id),
    prompt:'Synthetic versioning regression; not a clinical question',
    answer:'Synthetic answer '+i,
    options:['Synthetic answer '+i,'Synthetic distractor '+i],
    ownerReleaseApproved:true,publicationStatus:'published-learner-eligible',
    referencesAPA:['Synthetic ref 1','Synthetic ref 2'],
    qa:{manualReviewRecommended:false,learnerExcluded:false}}
}));
const fakePublished={
  ...registry,
  buildView:(original,ignored)=>registry.buildView(original,versions)
};
const published=await inspect(fakePublished,true);
assert.ok(originals.every((q,i)=>source.find(r=>String(r.id)===String(q.id))?.answer===q.answer));
console.log(JSON.stringify({
  status:'PASS - review-branch simulated, not deployed',sourceCount:source.length,
  heldRuns:held,publishedVersionRuns:published,historicalIdsRetained:3
},null,2));
