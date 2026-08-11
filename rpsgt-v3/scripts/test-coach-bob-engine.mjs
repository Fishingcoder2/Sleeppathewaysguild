import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const here=path.dirname(fileURLToPath(import.meta.url));
const engine=require(path.resolve(here,'../core/coach-bob-engine.js'));

assert.equal(typeof engine.build,'function');
assert.equal(typeof engine.compassFor,'function');
assert.equal(typeof engine.containsAnswerLeak,'function');

const scoringQuestion={
  id:'bob-test-scoring',taskCode:'D3A',task:'Score adult studies',topic:'Adult Sleep Staging',questionType:'Scoring',
  answer:'N2',rationale:'The scored epoch meets the current rule for N2.',whyTricky:'A nearby stage feature can look attractive if the full epoch is not checked.',
  qa:{scoringRuleRelated:true}
};
const pre=engine.build({question:scoringQuestion,phase:'pre',resources:['AASM Scoring Manual Version 3']});
assert.equal(pre.phase,'pre');
assert.equal(pre.answerLeakFree,true);
assert.equal(engine.containsAnswerLeak(pre.mentorMessage,scoringQuestion),false);
assert.equal(pre.rationale,'');
assert.equal(pre.whyTricky,'');
assert.ok(['PATIENT FIRST','SIGNAL FAMILY','CROSS-CHECK','PROOF CLUE'].includes(pre.compass.label));
assert.match(pre.examTrap,/current scoring authority/i);
assert.ok(pre.nextAction.length>20);

const shortAnswerQuestion={id:'bob-test-rem',taskCode:'D3A',topic:'Sleep Staging',questionType:'Concept',answer:'REM'};
const shortPre=engine.build({question:shortAnswerQuestion,phase:'pre'});
assert.equal(shortPre.answerLeakFree,true,'short answer token detection should not mistake words such as remove for REM');
assert.equal(engine.containsAnswerLeak('Remove choices that do not fit.',shortAnswerQuestion),false);
assert.equal(engine.containsAnswerLeak('The answer is REM.',shortAnswerQuestion),true);

const customLeak={...shortAnswerQuestion,coachBobPreAnswer:'Pick REM because the stem says dream sleep.'};
const customSafe=engine.build({question:customLeak,phase:'pre'});
assert.equal(customSafe.answerLeakFree,true);
assert.doesNotMatch(customSafe.mentorMessage,/\bREM\b/i);

const correct=engine.build({question:scoringQuestion,phase:'correct',resources:['AASM Scoring Manual Version 3']});
const incorrect=engine.build({question:scoringQuestion,phase:'incorrect',resources:['AASM Scoring Manual Version 3'],priorMisses:0});
assert.notEqual(correct.headline,incorrect.headline);
assert.notEqual(correct.mentorMessage,incorrect.mentorMessage);
assert.equal(correct.rationale,scoringQuestion.rationale);
assert.equal(incorrect.whyTricky,scoringQuestion.whyTricky);
assert.match(incorrect.nextAction,/AASM Scoring Manual Version 3/);
assert.match(correct.nextAction,/one sentence/i);

const repeat=engine.build({question:scoringQuestion,phase:'incorrect',priorMisses:2,resources:['AASM Scoring Manual Version 3']});
assert.equal(repeat.repeatPattern,true);
assert.match(repeat.headline,/repeat pattern/i);
assert.match(repeat.mentorMessage,/missed this item before/i);
assert.match(repeat.nextAction,/retry a similar question/i);

const patient=engine.build({question:{taskCode:'D1A',topic:'Medication Effects',questionType:'Concept',answer:'SSRIs'},phase:'pre'});
assert.equal(patient.compass.label,'PATIENT FIRST');
const signal=engine.build({question:{taskCode:'D3B',topic:'Respiratory Signal Artifact',questionType:'Scoring',answer:'Artifact'},phase:'pre'});
assert.equal(signal.compass.label,'SIGNAL FAMILY');
const cross=engine.build({question:{taskCode:'D3C',topic:'Report Math',questionType:'Calculation',answer:'10'},phase:'pre'});
assert.equal(cross.compass.label,'CROSS-CHECK');
const proof=engine.build({question:{taskCode:'D4B',topic:'Alternative Therapy',questionType:'Concept',answer:'Referral'},phase:'pre'});
assert.equal(proof.compass.label,'PROOF CLUE');

const customQuestion={
  taskCode:'D2C',topic:'Artifact',answer:'Reconnect electrode',
  coachBobCorrect:'That cross-check is exactly the habit to keep.',
  coachBobIncorrect:'Start by deciding whether the problem is physiologic or technical.',
  examTrap:'Do not treat every flat signal as a physiologic event.',
  practiceConnection:'Check the patient and related channels before touching the equipment.',
  nextAction:'Retry one artifact question after reviewing the signal family.'
};
assert.equal(engine.build({question:customQuestion,phase:'correct'}).mentorMessage,customQuestion.coachBobCorrect);
assert.equal(engine.build({question:customQuestion,phase:'incorrect'}).mentorMessage,customQuestion.coachBobIncorrect);
assert.equal(engine.build({question:customQuestion,phase:'incorrect'}).examTrap,customQuestion.examTrap);
assert.equal(engine.build({question:customQuestion,phase:'incorrect'}).practiceConnection,customQuestion.practiceConnection);
assert.equal(engine.build({question:customQuestion,phase:'incorrect'}).nextAction,customQuestion.nextAction);

assert.deepEqual(
  engine.build({question:scoringQuestion,phase:'incorrect',resources:['AASM Scoring Manual Version 3'],priorMisses:1}),
  engine.build({question:scoringQuestion,phase:'incorrect',resources:['AASM Scoring Manual Version 3'],priorMisses:1}),
  'Coach Bob output must be deterministic for the same input'
);

console.log(JSON.stringify({
  coachBobEngine:true,
  deterministic:true,
  preAnswerLeakProtected:true,
  shortAnswerTokensProtected:true,
  correctIncorrectDiffer:true,
  reasoningCompass:true,
  currentAuthorityTrap:true,
  repeatMissReinforcement:true,
  futureAuthoredFieldsSupported:true
},null,2));
