import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile('rpsgt-v3/core/owner-question-release.js','utf8');
const baseQuestion={id:'base-d2b',domain:'D2',taskCode:'D2B',task:'Procedure',topic:'Signals',prompt:'Which signal is best?',options:['A','B'],answer:'A',rationale:'Because A.',referenceKeys:['ref'],studyRecommendationKeys:['ref']};
const addQuestion={id:'add-d2b',domain:'D2',taskCode:'D2B',task:'Procedure',topic:'Signals',prompt:'Which next step is best?',options:['A','B'],answer:'B',rationale:'Because B.',referenceKeys:['ref'],studyRecommendationKeys:['ref'],ownerReleaseApproved:true};
const release={releaseId:'spg-owner-question-release-2026-10-11',rpsgtAddedCount:1,effectiveRpsgtCount:2,programCounts:{RPSGT:1,CPSGT:0},questions:[addQuestion]};
const dispatch={schemaVersion:1,program:'RPSGT',dispatchId:'test-dispatch',status:'held',pendingQuestionIds:[],questions:[]};
const staticModule={meta:{taskCode:'D2B',questionCount:1},questions:[baseQuestion]};
const apiPayload={program:'RPSGT',taskCode:'D2B',format:'source',questions:[baseQuestion,addQuestion]};

function response(status,data){return {ok:status>=200&&status<300,status,json:async()=>data};}
function makeApi(apiOk){
  const calls=[];
  const context={
    console:{warn:(...args)=>calls.push(['warn',...args])},
    location:{protocol:'https:',hostname:'sleeppathwaysguild.com'},
    fetch:async path=>{
      calls.push(['fetch',String(path)]);
      if(path==='data/question-bank/d2b.json') return response(200,staticModule);
      if(path==='data/owner-approved-question-release.json') return response(200,release);
      if(path==='data/owner-question-dispatch.json') return response(200,dispatch);
      if(String(path).startsWith('/api/questions?')) return apiOk?response(200,apiPayload):response(503,{error:'offline'});
      return response(404,{});
    }
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'owner-question-release.js'});
  return {api:context.RPSGTOwnerQuestionRelease,calls};
}

const live=makeApi(true);
const fromD1=await live.api.loadJson('data/question-bank/d2b.json');
assert.equal(fromD1.questions.length,2);
assert.equal(fromD1.d1QuestionBank?.enabled,true);
assert.equal(fromD1.meta.questionSource,'Cloudflare D1 with static module fallback');
assert.ok(live.calls.some(row=>String(row[1]).includes('format=source')));

const offline=makeApi(false);
const fallback=await offline.api.loadJson('data/question-bank/d2b.json');
assert.equal(fallback.questions.length,2,'Static base plus approved overlay must remain usable when D1 is unavailable');
assert.equal(Boolean(fallback.d1QuestionBank),false);
assert.ok(offline.calls.some(row=>row[0]==='warn'),'D1 failure should be observable while falling back');

console.log('RPSGT V3 D1-first loader passed: exact task payload with validated static fallback.');
