import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const [engineJs,diversityJs,trailJson,studyJs]=await Promise.all([
  'core/guided-trail-engine.js','core/guided-question-diversity.js',
  'data/learner-trails/respiratory-pap.json','core/study.js'
].map(file=>readFile(join(root,file),'utf8')));
const trail=JSON.parse(trailJson);
const history=[];
const storage={load(){return {guidedStudy:{checkpointHistory:history}};}};
const context={globalThis:{RPSGTStorage:storage},Date,JSON,Map,Set,Math,Object,Array,String,Number,Boolean,console};
vm.createContext(context);
vm.runInContext(engineJs,context,{filename:'guided-trail-engine.js'});
vm.runInContext(diversityJs,context,{filename:'guided-question-diversity.js'});
const engine=context.globalThis.RPSGTGuidedTrailEngine;
const diversity=context.globalThis.RPSGTGuidedQuestionDiversity;
assert.ok(engine&&diversity);
assert.ok(studyJs.includes('record.questionFamilyKeys=state.checkpoint.questions.map'),'Scored checkpoint history must retain stem signatures.');
const banks=new Map();
for(const code of new Set(trail.steps.map(step=>step.taskCode))){
  const data=JSON.parse(await readFile(join(root,'data','question-bank',code.toLowerCase()+'.json'),'utf8'));
  assert.ok(Array.isArray(data.questions),code+' must have a question bank');
  banks.set(code,data.questions);
}

function keys(selected){
  return selected.map(item=>diversity.familyKey(item.prompt));
}
function checkUnique(selected,step,label){
  assert.equal(selected.length,15,`${step.id}: ${label} must have 15 unique eligible questions; got ${selected.length}`);
  assert.equal(new Set(selected.map(item=>String(item.id))).size,15,`${step.id}: duplicate question IDs in ${label}`);
  assert.equal(new Set(keys(selected)).size,15,`${step.id}: duplicate or renumbered stems in ${label}`);
  assert.ok(selected.every(item=>item.taskCode===step.taskCode&&engine.matchesQuestionFilter(item,step.checkpointFilter)),
    `${step.id}: a question escaped its original concept filter`);
}
let runs=0,reuse=0;
for(const step of trail.steps){
  const bank=banks.get(step.taskCode);
  const recentKeys=new Set(history.slice(0,diversity.RECENT_WINDOW).flatMap(record=>record.questionFamilyKeys||[]));
  const eligible=bank.filter(question=>engine.eligibleQuestion(question,step.taskCode,step.checkpointFilter));
  const availableFresh=new Set(eligible.map(q=>diversity.familyKey(q.prompt)).filter(key=>!recentKeys.has(key)));
  const selected=engine.selectQuestions(bank,step.taskCode,15,'real-concept-sequential|'+step.id,step.checkpointFilter);
  checkUnique(selected,step,'first visit');
  const selectedKeys=keys(selected);
  const repeated=selectedKeys.filter(key=>recentKeys.has(key));
  // All 15 questions should be fresh when at least 15 unseen stems are available.
  if(availableFresh.size>=15) assert.equal(repeated.length,0,
    step.id+' reused a prior question despite at least 15 unused eligible stems');
  reuse+=repeated.length;
  history.unshift({task:step.taskCode,conceptId:step.id,questionIds:selected.map(q=>q.id),questionFamilyKeys:selectedKeys,total:15});
  runs++;
}

// Narrow CSA and advanced PAP concepts often have fewer than 30 fresh items.
// A retake must still yield 15 *different stems within that checkpoint* while
// preferring the unseen part of the pool before older items.
const narrow=trail.steps.find(step=>step.id==='csa-advanced-pap');
assert.ok(narrow,'Missing advanced PAP concept regression case');
const narrowRetake=engine.selectQuestions(banks.get(narrow.taskCode),narrow.taskCode,15,'advanced-csa-retake',narrow.checkpointFilter);
checkUnique(narrowRetake,narrow,'retake');
runs++;

// A cross-task record with the same stem must also be held back if enough
// alternatives exist, even when its question ID differs.
const globalHistory=history[0];
assert.ok(Array.isArray(globalHistory.questionFamilyKeys)&&globalHistory.questionFamilyKeys.length===15);
assert.ok(diversity.familyKey('Practice item 41: The airflow signal disappears during sleep.')===
  diversity.familyKey('Practice item 42: The airflow signal disappears during sleep.'));

console.log(`Real-bank respiratory checkpoint question rotation passed: ${runs} fifteen-question runs across ${trail.steps.length} concepts; zero same-session repeated stems; cross-chapter stem signature tracking active; ${reuse} older eligible stems reused only where concept pools were constrained.`);
