import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const engine=require('../core/guided-study-completion.js');

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
assert.deepEqual(ceremonies.map(item=>item.kind),['task','domain']);
assert.deepEqual(engine.awardCeremonies(saved,'D1C',{task:true,domain:true}),[],'existing awards must not replay');
const seen=engine.markCeremonySeen(saved,'guided-task:D1C');
assert.deepEqual(engine.unseenCeremonies(seen,ceremonies).map(item=>item.kind),['domain']);

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
assert.equal(engine.VERSION,'1.0.0');
console.log('Guided Study completion system contract passed.');
