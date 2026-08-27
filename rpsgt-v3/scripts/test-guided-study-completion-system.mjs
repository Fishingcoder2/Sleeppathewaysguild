import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const engine=require('../core/guided-study-completion.js');
const storageGuard=require('../core/guided-study-storage-guard.js');
const coachSafety=require('../core/guided-study-coach-safety.js');

const saved={
  review:{missedIds:['old']},
  awards:{seenCeremonyIds:[]},
  guidedStudy:{trailAwards:{tasks:{D1C:{earnedAt:'2026-08-05T00:00:00Z'}},domains:{D1:{earnedAt:'2026-08-05T00:00:00Z'}}}}
};
const record={
  id:'attempt-1',task:'D1C',completedAt:'2026-08-05T00:00:00Z',
  responses:[{id:'q1',correct:false},{id:'q2',correct:true},{id:'q3',correct:false}]
};
const updated=engine.updateMissedReview(saved,record);
assert.deepEqual(updated.review.missedIds,['old','q1','q3']);
assert.deepEqual(updated.guidedStudy.lastCheckpointReview.missedIds,['q1','q3']);
assert.equal(saved.guidedStudy.lastCheckpointReview,undefined,'input state must remain unchanged');

const ceremonies=engine.awardCeremonies(saved,'D1C',{task:false,domain:false});
assert.deepEqual(ceremonies.map(item=>item.kind),['task'],'a task that also completes its domain should produce one combined accomplishment modal');
assert.equal(ceremonies[0].domainEarned,true,'the combined task accomplishment must carry the newly completed domain');
assert.deepEqual(engine.awardCeremonies(saved,'D1C',{task:true,domain:true}),[],'existing awards must not replay');
const seen=engine.markCeremonySeen(saved,'guided-task:D1C');
assert.deepEqual(engine.unseenCeremonies(seen,ceremonies),[],'a combined accomplishment already seen must not replay');
const domainOnly=engine.awardCeremonies(saved,'D1C',{task:true,domain:false});
assert.deepEqual(domainOnly.map(item=>item.kind),['domain'],'legacy or recovered domain-only completion may still produce one domain accomplishment');

const blueprint={domains:[
  {id:'D1',fullName:'Clinical Overview',tasks:[{code:'D1A',title:'A'},{code:'D1B',title:'B'},{code:'D1C',title:'C'}]},
  {id:'D2',fullName:'Study Performance',tasks:[{code:'D2A',title:'A'},{code:'D2B',title:'B'},{code:'D2C',title:'C'}]}
]};
assert.equal(engine.nextTaskRoute(blueprint,'D1B').label,'Continue to the next task');
assert.equal(engine.nextTaskRoute(blueprint,'D1C').label,'Begin the next domain');
assert.equal(engine.nextTaskRoute(blueprint,'D2C').label,'Return to Guided Study map');
assert.equal(engine.nextTaskRoute(blueprint,'D1C').next.code,'D2A');

const records=[{id:'q1'},{id:'q2'},{id:'q3'},{id:'q4'},{id:'q5'},{id:'q6'}];
assert.deepEqual(engine.filterRetakeRecords(records,['q1','q2'],5).map(item=>item.id),['q3','q4','q5','q6']);

assert.deepEqual(engine.XP_REWARDS,{taskBadge:100,domainMedal:250});
assert.equal(engine.soundEnabled({learner:{settings:{soundEffects:true}}}),true);
assert.equal(engine.soundEnabled({learner:{settings:{soundEffects:false}}}),false);
assert.equal(engine.soundEnabled({}),false,'celebration sounds must remain off by default');
let contextConstructed=false;
const silentWin={AudioContext:class{constructor(){contextConstructed=true;}}};
assert.equal(engine.playFanfare(silentWin,{},'task'),false,'sound-off learners must not create an AudioContext');
assert.equal(contextConstructed,false,'sound-off learners must remain silent');

const before={review:{flaggedIds:['q1']},flashcards:{cards:{one:{id:'one'}}},awards:{seenCeremonyIds:['guided-task:D1A']},guidedStudy:{checkpointHistory:[]}};
const after={review:{flaggedIds:[]},flashcards:{cards:{}},awards:{seenCeremonyIds:[]},guidedStudy:{checkpointHistory:[record]}};
const reconciled=storageGuard.reconcile(before,after);
assert.deepEqual(reconciled.review.flaggedIds,['q1'],'review state must survive a Guided Study save');
assert.ok(reconciled.flashcards.cards.one,'flashcards must survive a Guided Study save');
assert.deepEqual(reconciled.awards.seenCeremonyIds,['guided-task:D1A'],'ceremony history must survive a Guided Study save');
assert.deepEqual(reconciled.guidedStudy.checkpointHistory,[record],'the newest Guided Study branch must be retained');

const safe=coachSafety.safePreAnswer('Start by identifying the signal family.','N2','Use the evidence in the stem.');
assert.equal(safe,'Start by identifying the signal family.');
const blocked=coachSafety.safePreAnswer('Choose N2 because it is correct.','N2','Use the evidence in the stem.');
assert.equal(blocked,'Use the evidence in the stem.','pre-score safety must replace answer-leaking guidance');
assert.equal(coachSafety.containsAnswer('Remove choices that do not fit.','REM'),false,'short answer tokens must not match inside unrelated words');
assert.equal(coachSafety.containsAnswer('The answer is REM.','REM'),true);
assert.equal(engine.VERSION,'1.2.0');
assert.deepEqual(engine.DOMAIN_AWARD_NAMES,{
  D1:'Clinical Guide',
  D2:'Study Signal Scout',
  D3:'Scoring Pathfinder',
  D4:'Therapy Trail Guide'
});
assert.equal(storageGuard.VERSION,'1.1.0');
assert.equal(coachSafety.VERSION,'2.0.0');
console.log('Guided Study automatic accomplishment, XP, opt-in sound, and safety contracts passed.');