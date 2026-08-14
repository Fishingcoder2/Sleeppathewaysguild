import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const require=createRequire(import.meta.url);
const insights=require(join(root,'core','report-insights-engine.js'));
const blueprint=JSON.parse(await readFile(join(root,'data','blueprint.json'),'utf8'));

const history=[];
for(let i=0;i<25;i+=1) history.push({source:'v3-practice-full-bank',correct:i<15,answeredAt:`2026-08-01T${String(i%24).padStart(2,'0')}:00:00.000Z`});
for(let i=0;i<25;i+=1) history.push({source:i%2?'v3-practice-full-bank':'v3-review-missed',correct:i<20,answeredAt:`2026-08-10T${String(i%24).padStart(2,'0')}:00:00.000Z`});
history.push({source:'some-other-history',correct:false,answeredAt:'2026-08-12T00:00:00.000Z'});

const saved={
  progress:{byDomain:{D1:{answered:12,correct:9},D4:{answered:10,correct:6}},history},
  readiness:{history:[
    {completedAt:'2026-08-14T08:00:00.000Z',byDomain:{D1:{total:5,correct:4,percent:80},D4:{total:7,correct:4,percent:57}}},
    {completedAt:'2026-08-01T08:00:00.000Z',byDomain:{D1:{total:5,correct:2,percent:40}}}
  ]},
  mock:{history:[
    {completedAt:'2026-08-02T08:00:00.000Z',byDomain:{D1:{total:30,correct:18,percent:60}}},
    {completedAt:'2026-08-13T08:00:00.000Z',byDomain:{D1:{total:30,correct:24,percent:80},D4:{total:41,correct:31,percent:76}}}
  ]},
  guidedStudy:{checkpointHistory:[{completedAt:'2026-08-14T09:00:00.000Z'}]},
  labs:{pap:{completedAt:'2026-08-14T10:00:00.000Z'}}
};

const before=JSON.stringify(saved);
const report=insights.build(saved,blueprint);
if(report.domainEvidence.length!==4) throw new Error('Expected four domain evidence rows.');
const d1=report.domainEvidence.find(row=>row.id==='D1');
const d4=report.domainEvidence.find(row=>row.id==='D4');
if(!d1||d1.practice.percent!==75||d1.readiness.percent!==80||d1.mock.percent!==80) throw new Error('D1 evidence separation failed.');
if(!d4||d4.practice.percent!==60||d4.readiness.percent!==57||d4.mock.percent!==76) throw new Error('D4 evidence separation failed.');
if(report.practiceTrend.current.percent!==80||report.practiceTrend.previous.percent!==60||report.practiceTrend.delta!==20||report.practiceTrend.direction!=='improving') throw new Error('Recent ordinary-answer trend failed.');
if(report.practiceTrend.eligibleHistoryCount!==50) throw new Error('Non-Practice history leaked into the recent-answer trend.');
if(report.readinessTrend.at(-1).percent===undefined) throw new Error('Readiness trend rows were not compacted.');
if(report.mockTrend.at(-1).scoredPercent!==0) throw new Error('Mock trend defaults must remain numeric when score data is missing.');
if(report.activity.firstAt!=='2026-08-01T00:00:00.000Z'||report.activity.lastAt!=='2026-08-14T10:00:00.000Z') throw new Error(`Activity range failed: ${JSON.stringify(report.activity)}`);
if(JSON.stringify(saved)!==before) throw new Error('Report insights engine mutated learner data.');

console.log('Report insights passed domain separation, recent-answer trend, latest diagnostic ordering, activity range, and source immutability contracts.');
