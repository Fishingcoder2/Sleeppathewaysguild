import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(join(root,'core','practice-subjects.js'),'utf8');
const context={globalThis:{},Map,Array,String,Boolean,RegExp,Object};
vm.createContext(context);
vm.runInContext(source,context,{filename:'practice-subjects.js'});
const subjects=context.globalThis.RPSGTPracticeSubjects;
assert.ok(subjects);

const manifest=JSON.parse(await readFile(join(root,'data','question-bank','manifest.json'),'utf8'));
const questions=[];
for(const module of manifest.modules||[]){
  if(module.taskCode==='D2A/D2C') continue;
  const pack=JSON.parse(await readFile(join(root,'data','question-bank',module.path),'utf8'));
  questions.push(...(pack.questions||[]).filter(question=>!(question&&question.qa&&question.qa.manualReviewRecommended)));
}

const byId=new Map(questions.map(question=>[String(question.id),question]));
const ekg=questions.filter(question=>subjects.matchesQuestion(question,'ekg'));
assert.ok(ekg.length>=15,'ECG subject must contain a useful learner-ready question pool.');
for(const id of ['ekg-001','ekg-006','ekg-008','case-009','boost-020']){
  assert.ok(byId.has(id),'Expected ECG regression question '+id+' is missing from the bank.');
  assert.equal(subjects.matchesQuestion(byId.get(id),'ekg'),true,'Expected ECG question '+id+' must stay in the ECG filter.');
}
for(const id of ['mb-chapter-6-3','mb-chapter-14-6','case-d3-005','imp-006','grow-020']){
  assert.ok(byId.has(id),'Expected non-ECG regression question '+id+' is missing from the bank.');
  assert.equal(subjects.matchesQuestion(byId.get(id),'ekg'),false,'Non-ECG question '+id+' must not leak into the ECG filter.');
}
assert.ok(ekg.every(question=>subjects.inferQuestion(question)?.id==='ekg'),'Every ECG-filtered record should infer back to ECG as its primary subject.');
console.log(JSON.stringify({learnerReadyQuestions:questions.length,ekgQuestions:ekg.length,falsePositiveRegressions:5,truePositiveRegressions:5},null,2));
