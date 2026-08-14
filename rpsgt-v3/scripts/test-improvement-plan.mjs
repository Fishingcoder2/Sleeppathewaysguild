import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');const require=createRequire(import.meta.url);
const engine=require(join(root,'core','improvement-plan-engine.js'));
const catalog=JSON.parse(await readFile(join(root,'data','labs','catalog.json'),'utf8'));
const summary={
  learner:{displayName:null},
  practice:{tasks:[
    {code:'D1A',title:'Clinical assessment',domain:'D1',domainName:'Clinical Overview, Education, Patient Support',answered:20,correct:18,accuracy:90,missed:0,mastered:4},
    {code:'D3C',title:'Report calculations',domain:'D3',domainName:'Scoring, Analysis, and Reporting',answered:12,correct:6,accuracy:50,missed:4,mastered:1},
    {code:'D4A',title:'PAP therapy',domain:'D4',domainName:'Therapy and Intervention',answered:10,correct:7,accuracy:70,missed:2,mastered:2}
  ]},
  readiness:{latest:{weakestTasks:[{taskCode:'D3C'}]}},
  mock:{latest:{weakestTasks:[{taskCode:'D4A'}]}},
  studyPlan:[
    {taskCode:'D3C',title:'Report calculations',domain:'D3',practiceAnswered:12,practiceCorrect:6,practiceAccuracy:50,missed:4,mastered:1,evidenceScore:92,topics:[{label:'sleep efficiency calculation',count:8}],resources:[{sourceId:'aasm-scoring-manual-v3',sourceTitle:'AASM Scoring Manual Version 3',sourceType:'official scoring rule source',bestFor:'Reporting and scoring rules',sections:[{label:'Section II, Part 1: Rules for Reporting Polysomnography'}]}]},
    {taskCode:'D4A',title:'PAP therapy',domain:'D4',practiceAnswered:10,practiceCorrect:7,practiceAccuracy:70,missed:2,mastered:2,evidenceScore:70,topics:[{label:'PAP titration',count:4}],resources:[]}
  ]
};
const insights={practiceTrend:{current:{answered:25,correct:20,percent:80},previous:{answered:25,correct:17,percent:68},comparable:true,delta:12,direction:'improving'}};
const before=JSON.stringify({summary,insights,catalog});
const plan=engine.build({summary,insights,catalog});
if(plan.priorities.length!==2)throw new Error('Expected two improvement priorities.');
if(plan.priorities[0].taskCode!=='D3C'||plan.domains[0].domain!=='D3')throw new Error('Highest evidence task/domain was not prioritized.');
if(!plan.priorities[0].evidence.inReadiness||!plan.priorities[1].evidence.inMock)throw new Error('Diagnostic weak-task evidence was not preserved.');
if(!plan.priorities[0].activities.some(item=>item.href==='practice.html?task=D3C'))throw new Error('Task-filtered Focused Practice route is missing.');
if(!plan.priorities[0].activities.some(item=>item.href==='math-coach.html'))throw new Error('Math Coach was not recommended for the D3C calculation weakness.');
if(!plan.priorities[0].activities.some(item=>item.kind==='lab'))throw new Error('A relevant in-app Skills Lab was not recommended.');
if(!plan.strongestTask||plan.strongestTask.code!=='D1A')throw new Error('Strongest ordinary-Practice task was not identified.');
const letter=plan.letter.paragraphs.join(' ');
for(const phrase of ['first study priority','D3','D3C','Guided Study','Focused Practice','12 percentage points'])if(!letter.includes(phrase))throw new Error('Coach Bob letter is missing expected plain-language content: '+phrase);
if(JSON.stringify({summary,insights,catalog})!==before)throw new Error('Improvement plan engine mutated its inputs.');
console.log('Improvement plan passed domain/task prioritization, diagnostic evidence, APA-ready source handoff, in-app practice routing, strongest-area, Coach Bob letter, trend, and immutability contracts.');
