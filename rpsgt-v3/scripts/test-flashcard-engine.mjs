import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const source=await readFile(join(root,'core','flashcard-engine.js'),'utf8');
const context={globalThis:{},Date,JSON,Map,Set,Math,Object,Array,String,Number,Boolean};
vm.createContext(context);
vm.runInContext(source,context,{filename:'flashcard-engine.js'});
const engine=context.globalThis.RPSGTFlashcardEngine;
assert.ok(engine);

const question={
  id:'rpsgt-q-1',
  prompt:'Which signal is used to identify rapid eye movements?',
  answer:'EOG',
  rationale:'The EOG channels display eye movements used during sleep-stage scoring.',
  whyTricky:'EEG and EOG both contribute to staging, but they measure different physiologic signals.',
  coachBobNote:'Name the signal before you compare the choices.',
  domain:'D3',
  task:'Score adult studies',
  taskCode:'D3A',
  topic:'Sleep-stage scoring',
  referenceKeys:['internal-key-must-not-store'],
  studyRecommendationKeys:['another-internal-key']
};

const first=engine.addQuestionCard({},question,{
  domainTitle:'Study Analysis and Reporting',
  taskTitle:'Score adult studies',
  sourceContext:'Guided Study',
  recommendedResources:['Fundamentals of Sleep Technology','AASM Scoring Manual']
},'2026-08-05T12:00:00.000Z');
assert.equal(first.created,true);
assert.equal(first.card.id,'question:rpsgt-q-1');
assert.equal(first.card.questionId,'rpsgt-q-1');
assert.equal(first.card.front,question.prompt);
assert.equal(first.card.back,'EOG');
assert.deepEqual(first.card.recommendedResources,['Fundamentals of Sleep Technology','AASM Scoring Manual']);
assert.equal(Object.hasOwn(first.card,'referenceKeys'),false);
assert.equal(Object.hasOwn(first.card,'studyRecommendationKeys'),false);

const duplicate=engine.addQuestionCard(first.store,question,{
  domainTitle:'Study Analysis and Reporting',
  taskTitle:'Score adult studies',
  sourceContext:'Practice',
  recommendedResources:['Fundamentals of Sleep Technology']
},'2026-08-05T12:05:00.000Z');
assert.equal(duplicate.created,false);
assert.equal(duplicate.store.order.length,1);
assert.equal(Object.keys(duplicate.store.cards).length,1);
assert.equal(duplicate.card.createdAt,'2026-08-05T12:00:00.000Z');
assert.equal(duplicate.card.updatedAt,'2026-08-05T12:05:00.000Z');

const flagged=engine.setFlag(duplicate.store,duplicate.card.id,true,'2026-08-05T12:06:00.000Z');
assert.equal(flagged.updated,true);
assert.equal(flagged.card.flagged,true);
const mastered=engine.setMastery(flagged.store,duplicate.card.id,'mastered','2026-08-05T12:07:00.000Z');
assert.equal(mastered.card.masteryStatus,'mastered');
assert.equal(mastered.card.reviewAgain,false);
assert.equal(mastered.card.flagged,true);
const reviewAgain=engine.setMastery(mastered.store,duplicate.card.id,'review-again','2026-08-05T12:08:00.000Z');
assert.equal(reviewAgain.card.reviewAgain,true);
assert.equal(reviewAgain.card.flagged,true);

const custom=engine.upsertCard(reviewAgain.store,{
  front:'What is the AHI formula?',
  back:'Apneas plus hypopneas divided by total sleep time in hours.',
  explanation:'Use sleep time in hours for the denominator.',
  domain:'D3',
  task:'Generate and verify report',
  taskCode:'D3C',
  topic:'Report calculations',
  custom:true
},'2026-08-05T12:10:00.000Z');
assert.equal(custom.created,true);
assert.match(custom.card.id,/^custom:/);
assert.equal(custom.store.order.length,2);

const customDuplicate=engine.upsertCard(custom.store,{
  front:'  What is the AHI formula? ',
  back:'Apneas plus hypopneas divided by total sleep time in hours.',
  topic:'Report calculations',
  custom:true
},'2026-08-05T12:11:00.000Z');
assert.equal(customDuplicate.created,false);
assert.equal(customDuplicate.store.order.length,2);

const missed=engine.filterCards(customDuplicate.store,{status:'missed'},{missedIds:['rpsgt-q-1']});
assert.equal(missed.length,1);
assert.equal(missed[0].questionId,'rpsgt-q-1');
const flaggedCards=engine.filterCards(customDuplicate.store,{status:'flagged'},{flaggedIds:[]});
assert.equal(flaggedCards.length,1);
const customCards=engine.filterCards(customDuplicate.store,{status:'custom'},{});
assert.equal(customCards.length,1);
const topicCards=engine.filterCards(customDuplicate.store,{topic:'Sleep-stage scoring'},{});
assert.equal(topicCards.length,1);

const removed=engine.removeCard(customDuplicate.store,custom.card.id,'2026-08-05T12:12:00.000Z');
assert.equal(removed.removed,true);
assert.equal(removed.store.order.length,1);
assert.equal(Boolean(removed.store.cards[custom.card.id]),false);

console.log('RPSGT flashcard stable-ID, duplicate-prevention, field-boundary, filtering, and mastery contracts passed.');
