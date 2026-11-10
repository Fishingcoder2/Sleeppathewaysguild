import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const manifest=JSON.parse(read('data/math-coach/manifest.json'));
const skills=manifest.skillFiles.map(file=>JSON.parse(read('data/math-coach/'+file)));
const catalog={...manifest,skills};
const context={globalThis:{},Date,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);
vm.runInContext(read('core/math-coach-engine.js'),context,{filename:'math-coach-engine.js'});
const engine=context.globalThis.RPSGTMathCoachEngine;

const evaluation=engine.validateCatalog(catalog);
assert.equal(evaluation.valid,true,JSON.stringify(evaluation.issues));
assert.equal(evaluation.count,12);

let tested=0;
const ids=new Set();
for(const skill of skills){
  for(const group of ['guided','independent','mastery']){
    for(const question of skill[group]){
      assert.ok(!ids.has(question.id),'Duplicate question: '+question.id);
      ids.add(question.id);
      assert.equal(question.calculation && typeof question.calculation,'object',question.id);
      assert.match(question.calculation.equation,/=/,question.id+' missing worked equation');
      const calculation=engine.calculationResult(question);
      assert.equal(calculation.valid,true,question.id+' '+JSON.stringify(calculation));
      assert.ok(Math.abs(calculation.value-Number(question.answer))<0.000001,question.id+' wrong answer key');
      assert.equal(engine.numericResult(question,question.answer).correct,true,question.id+' rejects correct answer');
      assert.equal(engine.numericResult(question,'').answered,false,question.id+' accepts empty input');
      assert.equal(engine.numericResult(question,Number(question.answer)+20).correct,false,question.id+' accepts clearly incorrect input');
      assert.ok(question.prompt.length>30,question.id+' incomplete prompt');
      if(group==='mastery'){
        assert.ok(/\?|calculate|convert|what|report/i.test(question.prompt),question.id+' missing an ask');
      }
      tested++;
    }
  }
}
assert.equal(tested,120);
assert.equal(ids.size,120);

const clock=skills.find(s=>s.id==='total-recording-time');
assert.equal(engine.calculationResult(clock.guided[0]).value,480,'23:00 to 07:00 must be 480 minutes');
assert.equal(engine.calculationResult(clock.guided[1]).value,450,'22:45 to 06:15 must be 450 minutes');
assert.equal(engine.numericResult(clock.guided[0],480).correct,true);
assert.equal(engine.numericResult(clock.guided[0],8).correct,false,'hours cannot be accepted as minutes');

const efficiency=skills.find(s=>s.id==='sleep-efficiency');
const rounded=efficiency.guided.find(q=>q.calculation.roundTo===1);
assert.ok(rounded,'Missing one-decimal rounding question');
assert.equal(engine.numericResult(rounded,rounded.answer).correct,true);
const unrounded=rounded.calculation.part/rounded.calculation.whole*100;
if(Math.abs(unrounded-rounded.answer)>rounded.tolerance){
  assert.equal(engine.numericResult(rounded,unrounded).correct,false,'Did not enforce requested rounding');
}

for(const mutation of [
  question=>question.answer+=11,
  question=>question.calculation.sleepMinutes=0,
  question=>question.calculation.equation='',
]){
  const skill=structuredClone(skills[0]);
  mutation(skill.guided[0]);
  const result=engine.validateCatalog({...manifest,skills:[skill]});
  assert.equal(result.valid,false,'Incorrect question was not rejected');
}
const duplicate=structuredClone(skills[0]);
duplicate.mastery[1].id=duplicate.mastery[0].id;
assert.equal(engine.validateCatalog({...manifest,skills:[duplicate]}).valid,false,'Duplicate question passed');

const view=read('core/math-coach-view-practice.js');
const controller=read('core/math-coach.js');
for(const token of [
  'data-math-continue-independent',
  'data-math-retry-set',
  'data-math-finish-skill',
  'math-answer-review',
  'Worked equation',
  'Correct answer',
  'Your answer',
]){
  assert.ok(view.includes(token),'Math Coach review UI missing '+token);
}
assert.match(controller,/saveMath\(engine\.setStage\(state\.saved\.mathCoach,state\.catalog,state\.currentSkill,kind/,'Retries must restore correct stage');
assert.match(controller,/state\.pendingMathAward/,'Award should wait until feedback is reviewed');
console.log('Math Coach: verified '+tested+' calculation questions, overnight clocks, rounded efficiency, invalid keys, duplicate IDs, answer review and retry contracts.');
