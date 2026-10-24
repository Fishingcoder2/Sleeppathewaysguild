import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const review=await import('../core/report-question-review.js');
const engine=review.default||globalThis.RPSGTReportQuestionReview||review;
const question={
 id:'case-1',taskCode:'D3A',domain:'D3',prompt:'Which sleep event matches this complete pattern?',
 options:['Obstructive apnea','Central apnea','Hypopnea'],answer:'Central apnea',
 rationale:'Effort and airflow must be considered together.',topic:'Respiratory scoring',
 referenceKeys:['aasm-scoring'],studyRecommendationKeys:['fundamentals-scoring']
};
const saved={
 progress:{history:[{questionId:'case-1',taskCode:'D3A',correct:false,selectedAnswer:'Obstructive apnea',answeredAt:'2026-10-20T12:00:00Z'}]},
 review:{missedIds:['case-1','missing-archived']},
 readiness:{history:[{missedIds:['case-1'],completedAt:'2026-10-21T12:00:00Z'}]},
 mock:{history:[]},
 guidedStudy:{checkpointHistory:[{task:'D3A',responses:[{id:'case-1',selected:'Obstructive apnea',correct:false}]}]}
};
const index=[{id:'case-1',taskCode:'D3A',topic:'Respiratory scoring'},{id:'missing-archived',taskCode:'D3A'}];
const blueprint={domains:[{id:'D3',fullName:'Scoring',tasks:[{code:'D3A',title:'Score adult studies'}]}]};
const before=JSON.stringify(saved);
const summary=engine.build(saved,index,[question],blueprint);
assert.equal(summary.items.length,1);
assert.equal(summary.requested,2);
assert.equal(summary.unresolved,1);
assert.equal(summary.items[0].question,question.prompt);
assert.equal(summary.items[0].selectedAnswer,'Obstructive apnea');
assert.equal(summary.items[0].correctAnswer,'Central apnea');
assert.equal(summary.items[0].rationale,question.rationale);
assert.equal(summary.items[0].taskCode,'D3A');
assert.deepEqual(summary.items[0].modes,['Missed review','Practice','Readiness','Guided Study']);
assert.deepEqual(engine.taskCodes(saved,index),['D3A']);
assert.equal(JSON.stringify(saved),before,'Report construction must not alter saved progress');
const noSelection=JSON.parse(JSON.stringify(saved));
noSelection.progress.history=[];
noSelection.guidedStudy.checkpointHistory=[];
const missing=engine.build(noSelection,index,[question],blueprint);
assert.equal(missing.items[0].selectedAnswer,null,'Never guess unsaved learner responses.');
assert.equal(engine.build(saved,index,[],blueprint).items.length,0,'Never fabricate missing bank questions.');
const [html,reportCss,controller]=await Promise.all([
 readFile(join(root,'study-summary.html'),'utf8'),
 readFile(join(root,'assets/study-summary-reporting.css'),'utf8'),
 readFile(join(root,'core/study-summary.js'),'utf8')
]);
assert.match(html,/data-report-section="missed"/);
assert.doesNotMatch(html,/Privacy and content statement|data-summary-privacy|data-report-section="privacy"/);
assert.match(reportCss,/\[data-report-section="missed"\]\{break-inside:auto!important\}/);
assert.match(controller,/loadMissedQuestions/);
assert.match(controller,/renderMissedReview/);
assert.match(controller,/exportSummary/);
console.log('Missed-question report passed: real questions, selected and correct answers, rationales, task match, dedupe, missing response and source guards.');
