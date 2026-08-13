import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const source=await readFile(join(root,'core','hookup-lab-engine.js'),'utf8');
const [d2a,d2b]=await Promise.all(['d2a','d2b'].map(name=>readFile(join(root,'data','question-bank',name+'.json'),'utf8').then(JSON.parse)));
const bank=[...(d2a.questions||[]),...(d2b.questions||[])];
const context={globalThis:{},Date,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);
vm.runInContext(source,context,{filename:'hookup-lab-engine.js'});
const engine=context.globalThis.RPSGTHookupLabEngine;
assert.ok(engine);
assert.equal(engine.VERSION,'2.0.1');
assert.equal(engine.STATIONS.length,6);
assert.ok(engine.STATIONS.every(station=>Array.isArray(station.options)&&station.options.length===4&&station.options.includes(station.answer)&&station.rationale));

const before=JSON.stringify(bank);
const eligible=engine.eligibleQuestions(bank);
assert.ok(eligible.length>=engine.SESSION_SIZE,'D2A/D2B must contain at least ten learner-eligible hookup questions.');
assert.ok(eligible.every(item=>engine.TASK_CODES.includes(item.taskCode)&&!(item.qa&&item.qa.manualReviewRecommended)&&item.options.includes(item.answer)));
assert.equal(new Set(eligible.map(item=>item.prompt.trim().toLowerCase().replace(/\s+/g,' '))).size,eligible.length);
assert.equal(JSON.stringify(bank),before,'Question selection must not mutate the bank.');

const first=engine.selectQuestions(bank,engine.SESSION_SIZE,'fixed-hookup');
const second=engine.selectQuestions(bank,engine.SESSION_SIZE,'fixed-hookup');
assert.deepEqual(first.map(item=>item.id),second.map(item=>item.id));
assert.equal(first.length,engine.SESSION_SIZE);
assert.ok(new Set(first.map(item=>item.taskCode)).size>=2,'A standard Hookup checkpoint should cover D2A and D2B when both pools are available.');

const initial={completed:['math-coach'],started:{pap:{startedAt:'2026-08-02'}},other:{preserve:true}};
const initialBefore=JSON.stringify(initial);
let labs=engine.start(initial,'2026-08-02T20:00:00.000Z');
assert.equal(JSON.stringify(initial),initialBefore);
assert.equal(labs.lastLab,'hookup');
assert.equal(labs.hookup.status,'in-progress');
assert.deepEqual(labs.other,{preserve:true});

const answers=Object.fromEntries(first.map((question,index)=>[question.id,index<8?question.answer:'__wrong__']));
const passed=engine.gradeSession({questions:first,answers,completedAt:'2026-08-02T20:05:00.000Z'});
assert.equal(passed.percent,80);
assert.equal(passed.passed,true);
labs=engine.applySession(labs,passed);
let summary=engine.summary(labs);
assert.equal(summary.quizPassed,true);
assert.equal(summary.completed,false,'Checkpoint alone must not complete the Hookup lab.');
assert.equal(summary.stationsComplete,0);

for(const station of engine.STATIONS){
  const wrongOption=station.options.find(option=>option!==station.answer);
  const wrong=engine.gradeSkill(station.id,wrongOption,'2026-08-02T20:08:00.000Z');
  assert.equal(wrong.correct,false);
  labs=engine.applySkillAttempt(labs,wrong);
  const afterWrong=engine.summary(labs);
  assert.equal(afterWrong.skills[station.id].mastered,false,'A wrong skill decision must not earn station completion.');
  const wrongAttempts=afterWrong.skills[station.id].attempts;
  labs=engine.applySkillAttempt(labs,wrong);
  assert.equal(engine.summary(labs).skills[station.id].attempts,wrongAttempts,'Reapplying the same skill attempt ID must not double count.');

  const correct=engine.gradeSkill(station.id,station.answer,'2026-08-02T20:10:00.000Z');
  assert.equal(correct.correct,true);
  labs=engine.applySkillAttempt(labs,correct);
  summary=engine.summary(labs);
  assert.equal(summary.skills[station.id].mastered,true);
}

summary=engine.summary(labs);
assert.equal(summary.stationsComplete,engine.STATIONS.length);
assert.equal(summary.skillsCompleted,true);
assert.equal(summary.completed,true);
assert.ok(labs.completed.includes('hookup'));
assert.equal(summary.skillAttempts,12);

const failed=engine.gradeSession({questions:first,answers:{},completedAt:'2026-08-02T20:15:00.000Z'});
labs=engine.applySession(labs,failed);
summary=engine.summary(labs);
assert.equal(summary.completed,true,'A failed checkpoint retry must not erase previously demonstrated skill or checkpoint completion.');
assert.equal(summary.bestPercent,80);
assert.equal(summary.attempts,2);
assert.equal(summary.history[0].passed,false);

assert.throws(()=>engine.gradeSkill('not-a-station','anything'),/Unknown Hookup lab station/);
assert.throws(()=>engine.applySkillAttempt(labs,{stationId:'not-a-station'}),/Unknown Hookup lab station/);

const oldChecklist={
  completed:['hookup'],
  hookup:{
    completed:true,
    status:'completed',
    quizPassed:true,
    checklist:{
      'order-equipment':true,
      'patient-site':true,
      'landmark-plan':true,
      'application-impedance':true,
      calibrations:true,
      'signal-documentation':true
    }
  }
};
const upgraded=engine.start(oldChecklist,'2026-08-02T22:00:00.000Z');
const upgradedSummary=engine.summary(upgraded);
assert.equal(upgradedSummary.quizPassed,true,'A previously passed checkpoint can remain valid.');
assert.equal(upgradedSummary.stationsComplete,0,'Legacy checkboxes must not be converted into demonstrated skills.');
assert.equal(upgradedSummary.completed,false,'Legacy checklist completion must not satisfy the new skill-evidence standard.');
assert.ok(!upgraded.completed.includes('hookup'));

const cappedHistory=Array.from({length:engine.HISTORY_LIMIT},(_,index)=>({...failed,id:`historic-${index}`,completedAt:`2026-07-${String(index+1).padStart(2,'0')}T00:00:00.000Z`}));
const durable={hookup:{startedAt:'2026-07-01T00:00:00.000Z',quizPassed:true,skills:Object.fromEntries(engine.STATIONS.map(station=>[station.id,{mastered:true,attempts:1,masteredAt:'2026-07-01T00:00:00.000Z'}])),attempts:25,bestPercent:90,history:cappedHistory}};
const newAttempt={...passed,id:'new-hookup-attempt',completedAt:'2026-08-02T21:00:00.000Z'};
const withNew=engine.applySession(durable,newAttempt);
assert.equal(withNew.hookup.attempts,26);
assert.equal(withNew.hookup.history.length,engine.HISTORY_LIMIT);
assert.equal(withNew.hookup.history[0].id,newAttempt.id);
const reapplied=engine.applySession(withNew,newAttempt);
assert.equal(reapplied.hookup.attempts,26,'Reapplying the same checkpoint session ID must not double count.');

console.log(`Hookup lab engine passed with ${eligible.length} unique learner-eligible D2A/D2B questions, six graded skill checks, idempotent attempts, and bounded checkpoint history.`);
