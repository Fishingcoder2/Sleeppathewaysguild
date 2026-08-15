import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const guardSource=await readFile(join(root,'core','learner-surface-guard.js'),'utf8');
const d3a=JSON.parse(await readFile(join(root,'data','question-bank','d3a.json'),'utf8'));

const matchesMbm=question=>{
  const prompt=String(question&&question.prompt||'').toLowerCase().replace(/\s+/g,' ').trim();
  return prompt.includes('major body movement (mbm) artifact')&&
    prompt.includes('obscures the eeg')&&
    prompt.includes('more than 15 seconds')&&
    prompt.includes('should be scored as');
};

const matches=(d3a.questions||[]).filter(matchesMbm);
assert.equal(matches.length,1,'Exactly one malformed MBM learner item should match the retirement rule.');
const target=matches[0];
assert.equal(target.taskCode,'D3A');
assert.ok(Array.isArray(target.options)&&target.options.some(option=>/both\s+a\s+and\s+b\s+are\s+correct/i.test(String(option))), 'The retired MBM item should retain the malformed self-referential answer construction in the source bank for audit history.');

const normal=(d3a.questions||[]).find(question=>question!==target&&!matchesMbm(question));
assert.ok(normal,'A non-retired D3A comparison question is required.');
const payload={meta:{taskCode:'D3A'},questions:[target,normal]};
const nativeFetch=async()=>new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}});
const documentStub={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelectorAll(){return[];},body:{}};
const context={console,URL,Headers,Response,fetch:nativeFetch,location:{href:'https://example.test/rpsgt-v3/practice.html'},document:documentStub};
vm.createContext(context);
vm.runInContext(guardSource,context,{filename:'learner-surface-guard.js'});

const policy=context.RPSGTLearnerSurfaceGuard;
assert.ok(policy,'Learner surface guard must expose its retirement policy.');
assert.equal(policy.isRetiredQuestion(target),true);
assert.equal(policy.isRetiredQuestion(normal),false);

const response=await context.fetch('data/question-bank/d3a.json');
const filtered=await response.json();
const retired=filtered.questions.find(question=>String(question.id)===String(target.id));
const untouched=filtered.questions.find(question=>String(question.id)===String(normal.id));
assert.ok(retired,'The retired question remains preserved in the loaded package for ID/history continuity.');
assert.equal(retired.reviewStatus,'retired');
assert.equal(retired.manualReviewRecommended,true);
assert.equal(retired.qa?.manualReviewRecommended,true);
assert.equal(retired.qa?.learnerExcluded,true);
assert.equal(retired.qa?.retirementId,'malformed-mbm-scoring-item');
assert.equal(Boolean(untouched.qa?.learnerExcluded),false,'Unrelated D3A questions must not be changed.');

const surfaces=['practice.html','study.html','review.html','readiness.html','mock.html','lab-scoring.html'];
for(const page of surfaces){
  const html=await readFile(join(root,page),'utf8');
  assert.match(html,/core\/learner-surface-guard\.js/,`${page} must load the learner retirement guard.`);
}

console.log(`Learner question retirement policy passed. Retired malformed MBM question ID: ${target.id}.`);
