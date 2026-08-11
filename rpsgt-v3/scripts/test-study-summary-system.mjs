import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');const require=createRequire(import.meta.url);const engine=require(join(root,'core','study-summary-engine.js'));
const [blueprint,index,catalog,studyManifest]=await Promise.all([
  readFile(join(root,'data','blueprint.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','question-bank','feedback-index.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','labs','catalog.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','study-sources','manifest.json'),'utf8').then(JSON.parse)
]);
const studySources={
  sources:await Promise.all((studyManifest.sourceFiles||[]).map(file=>readFile(join(root,'data','study-sources',file),'utf8').then(JSON.parse))),
  taskPlans:(await readFile(join(root,'data','study-sources',studyManifest.taskPlanFile),'utf8').then(JSON.parse)).taskPlans||{},
  topicFamilies:(await Promise.all((studyManifest.topicFamilyFiles||[]).map(file=>readFile(join(root,'data','study-sources',file),'utf8').then(JSON.parse)))).flatMap(pkg=>pkg.topicFamilies||[])
};
const d3a=index.records.find(record=>record.taskCode==='D3A'&&!record.manualReviewRecommended);const d4a=index.records.find(record=>record.taskCode==='D4A'&&!record.manualReviewRecommended);if(!d3a||!d4a)throw new Error('Summary test could not find learner-eligible D3A and D4A records.');
const saved={
  learner:{displayName:'Private Learner Name',settings:{theme:'private'}},
  progress:{answered:20,correct:14,byTask:{D3A:{answered:10,correct:6},D4A:{answered:10,correct:8}},history:[{questionId:d3a.id,taskCode:'D3A',correct:false},{questionId:d4a.id,taskCode:'D4A',correct:false}]},
  review:{missedIds:[d3a.id],masteredIds:[d4a.id],flaggedIds:[d3a.id]},
  readiness:{history:[
    {completedAt:'2026-08-03T10:00:00.000Z',size:50,answered:50,correct:20,percent:40,weightedPercent:42,weakestTasks:[{taskCode:'D3A',title:'Adult scoring',total:10,correct:4,missed:6,percent:40,topics:['staging']}],missedIds:[d3a.id]},
    {completedAt:'2026-08-01T10:00:00.000Z',size:25,answered:25,correct:20,percent:80,weightedPercent:82,weakestTasks:[{taskCode:'D4A'}]}
  ]},
  mock:{history:[
    {completedAt:'2026-08-01T12:00:00.000Z',answeredTotal:170,scoredCorrect:100,scoredPercent:67,weightedPercent:69,unansweredCount:5,weakestTasks:[{taskCode:'D3A'}]},
    {version:2,completedAt:'2026-08-03T12:00:00.000Z',timed:true,elapsedMs:7200000,answeredTotal:175,scoredCount:150,pretestCount:25,scoredCorrect:120,scoredPercent:80,weightedPercent:83,unansweredCount:0,weakestTasks:[{taskCode:'D4A',title:'PAP',total:15,correct:8,missed:7,percent:53}],scoredMissedIds:[d4a.id],flaggedIds:[d4a.id],details:[{id:d4a.id,flagged:true,selectedIndex:1,correct:false,role:'scored'}]}
  ]},
  guidedStudy:{trailAwards:{tasks:{D3A:{score:80}},domains:{}},trailStudyMarks:{D3A:{completed:true},D4A:true},trailFocus:{domain:'D3',task:'D3A'},checkpointHistory:[{id:'trail-d3a',task:'D3A',domain:'D3',completedAt:'2026-08-03T09:00:00.000Z',percent:80,correct:4,total:5,passed:true,responses:[{selected:'PRIVATE ANSWER'}]}]},
  labs:{completed:['hookup'],started:{pap:true},lastLab:'pap',hookup:{completed:true,history:[{percent:90}]},pap:{history:[{percent:70}]}},
  notes:{general:'PRIVATE NOTE SENTINEL',searches:{refs:'PRIVATE SEARCH SENTINEL'}},
  migration:{privateUrl:'https://drive.google.com/private-sentinel'},
  privatePrompt:'PRIVATE QUESTION PROMPT SENTINEL'
};
const before=JSON.stringify(saved);const summary=engine.buildSummary({saved,blueprint,questionIndex:index,catalog,studySources,generatedAt:'2026-08-03T15:00:00.000Z'});
if(summary.schema!==engine.SCHEMA||summary.engineVersion!==engine.VERSION)throw new Error('Study summary schema metadata failed.');
if(summary.learner.displayName!==null||summary.privacy.learnerNameIncluded!==false)throw new Error('Learner name must be omitted by default.');
if(summary.snapshot.practiceAnswered!==20||summary.snapshot.practiceAccuracy!==70)throw new Error('Practice snapshot aggregation failed.');
if(summary.practice.tasks.length!==12)throw new Error(`Expected 12 task rows; got ${summary.practice.tasks.length}.`);
const d3aRow=summary.practice.tasks.find(row=>row.code==='D3A');if(!d3aRow||d3aRow.accuracy!==60||d3aRow.missed!==1)throw new Error('D3A task summary failed.');
if(summary.readiness.latest.percent!==40)throw new Error('Newest-first Readiness ordering was not preserved.');
if(summary.mock.latest.scoredPercent!==80||summary.mock.latest.flaggedCount!==1||summary.mock.latest.detailAvailable!==true)throw new Error('Oldest-first Mock ordering or compact detail counts failed.');
if(summary.guidedTrail.counts.studyMarks!==2||summary.guidedTrail.counts.taskAwards!==1||summary.guidedTrail.counts.checkpoints!==1)throw new Error('Guided Trail summary failed.');
if(summary.labs.counts.total!==12||summary.labs.counts.completed!==1||summary.labs.counts.started!==1)throw new Error('Laboratory summary failed.');
if(!summary.labs.rows.some(row=>row.id==='visual'))throw new Error('Visual Skills Lab is missing from the printable laboratory summary.');
if(!summary.labs.rows.some(row=>row.id==='mentoring-diagnostic'))throw new Error('Mentoring Diagnostic is missing from the printable laboratory summary.');
if(!summary.studyPlan.length||summary.studyPlan[0].taskCode!=='D4A')throw new Error('Combined study-plan weighting failed to prioritize the latest Mock weakness.');
if(!summary.studyPlan[0].topics.length)throw new Error('Study plan did not preserve interaction-derived topic evidence.');
if(!summary.studyPlan[0].resources.length||!summary.studyPlan[0].resources.some(group=>group.sections&&group.sections.length))throw new Error('Study plan did not include mapped study resources.');
if(!summary.studyPlan[0].resources.some(group=>/AASM/i.test(group.sourceTitle)))throw new Error('Official AASM resource was not prioritized when mapped to the weak task.');
const serialized=JSON.stringify(summary);for(const forbidden of ['Private Learner Name','PRIVATE NOTE SENTINEL','PRIVATE SEARCH SENTINEL','private-sentinel','PRIVATE QUESTION PROMPT SENTINEL','PRIVATE ANSWER'])if(serialized.includes(forbidden))throw new Error(`Summary leaked forbidden content: ${forbidden}`);
for(const field of ['containsQuestionText','containsAnswerText','containsRationales','containsNotes','containsSearches','containsPrivateLinks','containsRawBrowserState'])if(summary.privacy[field]!==false)throw new Error(`Privacy flag ${field} must be false.`);
const named=engine.buildSummary({saved,blueprint,questionIndex:index,catalog,studySources,generatedAt:'2026-08-03T15:00:00.000Z',includeLearnerName:true});if(named.learner.displayName!=='Private Learner Name'||named.privacy.learnerNameIncluded!==true)throw new Error('Opt-in learner-name inclusion failed.');
const csv=engine.toCsv(summary);if(!csv.startsWith('section,code,title,metric,value,detail'))throw new Error('CSV header failed.');if(!csv.includes('practice-task,D3A')||!csv.includes('lab,hookup')||!csv.includes('lab,visual')||!csv.includes('lab,mentoring-diagnostic')||!csv.includes('study-resource,D4A'))throw new Error('CSV task, laboratory, Visual Skills, Mentoring Diagnostic, or mapped study-resource rows are missing.');for(const forbidden of ['Private Learner Name','PRIVATE NOTE SENTINEL','PRIVATE SEARCH SENTINEL','drive.google.com','PRIVATE QUESTION PROMPT SENTINEL'])if(csv.includes(forbidden))throw new Error(`CSV leaked forbidden content: ${forbidden}`);
if(JSON.stringify(saved)!==before)throw new Error('Study summary engine mutated its source learner record.');
console.log('Study summary engine passed privacy, ordering, interaction evidence, mapped resources, task, diagnostic, Trail, twelve-laboratory, CSV, learner-name opt-in, weighting, and source-immutability contracts.');
