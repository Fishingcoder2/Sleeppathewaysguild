#!/usr/bin/env node
// Development-only discovery of the CPSGT inline exam bank and RPSGT Guided/Practice source.
// It does not change any learner content, answers, IDs, or saved progress.
import {readFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(join(root,p),'utf8');
const html=await read('cpsgt-study-app.html');
console.log('CPSGT_HTML_BYTES',Buffer.byteLength(html));
const snippets=(pattern,limit=5)=>{
 const reg=new RegExp(pattern,'gi');const out=[];let m;
 while((m=reg.exec(html))&&out.length<limit){
  const at=m.index;
  out.push({at,match:html.slice(at,at+70).replace(/\s+/g,' '),excerpt:html.slice(Math.max(0,at-140),Math.min(html.length,at+310)).replace(/\s+/g,' ').slice(0,440)});
  if(reg.lastIndex<=at)reg.lastIndex=at+1;
 }
 return out;
};
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(m=>({attrs:m[1].slice(0,230),size:m[2].length,first:m[2].slice(0,130).replace(/\s+/g,' ')}));
console.log('SCRIPTS',JSON.stringify(scripts.slice(0,100)));
for(const [key,pat] of Object.entries({
 'APP_DATA':'id\\s*=\\s*["\\x27]app-data',
 'QUESTION_BANK':'questionBank',
 'QUESTION_BANK_SNAKE':'question_bank',
 'QUESTION_OBJECT':'["\\x27]questions["\\x27]\\s*:',
 'QUESTION_DECL':'(?:const|let|var)\\s+\\w*(?:question|bank|pool|data)\\w*\\s*=',
 'GUIDED_TRAIL':'guided.trail|guidedTrail|Guided Trail',
 'PRACTICE':'Practice Questions|practiceMode|startPractice',
 'TASKCODE':'taskCode',
 'DOMAIN':'["\\x27]domain["\\x27]\\s*:',
 'D1A_LITERAL':'["\\x27]D1A["\\x27]',
 'D3B_LITERAL':'["\\x27]D3B["\\x27]',
 'CPSGT':'cpsgt',
 'EVAL':'JSON.parse|JSON.stringify|atob',
 'ASSIGN':'(?:window|globalThis)\\.[A-Z_][A-Z_0-9]+\\s*='
})){
 console.log('PATTERN',key,JSON.stringify(snippets(pat,key==='QUESTION_DECL'?14:5)));
}
console.log('HTML_TAG_COUNTS',JSON.stringify({script:scripts.length,appData:(html.match(/id=["']app-data["']/g)||[]).length,buttons:(html.match(/<button/g)||[]).length}));
const manifest=JSON.parse(await read('rpsgt-v3/data/question-bank/manifest.json'));
const base=[];for(const entry of manifest.modules){const d=JSON.parse(await read('rpsgt-v3/data/question-bank/'+entry.path));base.push(...d.questions)}
const overlay=JSON.parse(await read('data/owner-approved-question-release.json')).questions;
const taskMap={};
for(const q of [...base,...overlay]){const task=q.taskCode||'UNMAPPED';const v=taskMap[task]||={total:0,held:0,eligible:0,topics:{},difficulty:{},types:{},uniquePrompts:new Set()};v.total++;const held=!!(q.qa?.manualReviewRecommended||q.manualReviewRecommended);v[held?'held':'eligible']++;const topic=String(q.topic||'unclassified');v.topics[topic]=(v.topics[topic]||0)+1;const d=String(q.difficulty||'unclassified');v.difficulty[d]=(v.difficulty[d]||0)+1;const qt=String(q.questionType||'unclassified');v.types[qt]=(v.types[qt]||0)+1;v.uniquePrompts.add(String(q.prompt||'').toLowerCase().replace(/\s+/g,' ').trim());}
for(const [task,v] of Object.entries(taskMap)){let top=Object.entries(v.topics).sort((a,b)=>b[1]-a[1]);console.log('RPSGT_TASK',JSON.stringify({task,total:v.total,eligible:v.eligible,held:v.held,uniquePrompts:v.uniquePrompts.size,uniqueTopicCount:top.length,topTopics:top.slice(0,7),difficulty:v.difficulty,types:v.types}));}


// Parse the CPSGT data package itself (the 4-MB literal APP_DATA object).
function extractJsonAssignment(full,variable){
 const p=full.indexOf('const '+variable+'=');
 if(p<0)throw Error('No '+variable+' assignment');
 let i=full.indexOf('{',p);
 if(i<0)throw Error('No object start');
 const start=i;let depth=0,quoted=false,escape=false;
 for(;i<full.length;i++){
  const ch=full[i];
  if(quoted){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')quoted=false;continue}
  if(ch==='"'){quoted=true;continue}
  if(ch==='{')depth++;
  if(ch==='}'&&--depth===0)return JSON.parse(full.slice(start,i+1));
 }
 throw Error('Unbalanced object '+variable);
}
const cpsgt=extractJsonAssignment(html,'APP_DATA');
const qC=Array.isArray(cpsgt.questions)?cpsgt.questions:[];
console.log('CPSGT_PACKAGE',JSON.stringify({
 manifest:{schemaVersion:cpsgt.manifest?.schemaVersion,title:cpsgt.manifest?.title,questionCount:cpsgt.manifest?.questionCount,blueprint:cpsgt.manifest?.blueprint},
 totalQuestions:qC.length,
 questionFields:Object.keys(qC[0]||{}),
 firstQuestion:{id:qC[0]?.id,topic:qC[0]?.topic,sub:qC[0]?.sub,difficulty:qC[0]?.difficulty,type:qC[0]?.type,alignment:qC[0]?.handbookAlignment},
 metadataKeys:Object.keys(cpsgt.manifest||{})
}));
const cpsgtTasks={};
for(const q of qC){
 const task=q.handbookAlignment?.taskCode||q.id?.match(/CPSGT-([D1-9][A-Z]+)-/)?.[1]||'UNMAPPED';
 const v=cpsgtTasks[task]||={total:0,topics:{},subs:{},difficulties:{},types:{},stems:new Set(),answers:{},style:{}};
 v.total++;
 const topic=String(q.topic||'unclassified'),sub=String(q.sub||'unclassified'),dif=String(q.difficulty||'unclassified'),type=String(q.type||'unclassified');
 for(const [k,key] of [['topics',topic],['subs',sub],['difficulties',dif],['types',type]])v[k][key]=(v[k][key]||0)+1;
 const stem=String(q.q||q.prompt||'').toLowerCase().replace(/^\s*(?:question|item)\s*\d+\W*/,'').replace(/\d+(?:\.\d+)?/g,'#').replace(/[^a-z# ]+/g,' ').replace(/\s+/g,' ').trim();
 v.stems.add(stem);
 const a=String(q.answer??q.correct??'none');v.answers[a]=(v.answers[a]||0)+1;
 const style=String(q.handbookAlignment?.questionStyle||'unclassified');v.style[style]=(v.style[style]||0)+1;
}
for(const [task,v] of Object.entries(cpsgtTasks)){
 const top=k=>Object.entries(v[k]).sort((a,b)=>b[1]-a[1]);
 console.log('CPSGT_TASK',JSON.stringify({task,total:v.total,uniqueNormalizedStems:v.stems.size,topicCount:top('topics').length,topTopics:top('topics').slice(0,8),topSubs:top('subs').slice(0,8),difficulty:top('difficulties'),types:top('types'),questionStyles:top('style').slice(0,8),answerIndexCounts:v.answers}));
}
const body=html.slice(html.indexOf('const BANK=APP_DATA.questions;'));
const terms=['function startPractice','function beginPractice','function openPractice','function renderPractice','function practice','function startTrail','function openTrail','const TRAIL','function choose','function select','const BANK','shuffle(BANK','shuffle(pool)','state.activePractice','function showTrail','function selectQuestions','state.stats.practiceByTask'];
for(const term of terms){
 let pos=body.indexOf(term),count=0;
 while(pos>=0 && count<3){
  console.log('CPSGT_LOGIC',JSON.stringify({term,at:pos,code:body.slice(Math.max(0,pos-140),pos+1700).replace(/\s+/g,' ').slice(0,1740)}));
  pos=body.indexOf(term,pos+term.length);count++;
 }
}

// Follow-up precise Guided Trail selection and eligible-only RPSGT educational variety.
for(const term of ['function taskQuestionPool','function startPracticeSession','const TRAIL=','const TRAIL =','function taskDetailsFromId','function renderTrail','function markTaskComplete']){
 const at=body.indexOf(term);
 if(at>=0)console.log('CPSGT_TARGETED',JSON.stringify({term,at,code:body.slice(Math.max(at-100,0),at+4000).replace(/\s+/g,' ').slice(0,4030)}));
}
for(const task of Object.keys(taskMap).sort()){
 const eligible=[...base,...overlay].filter(q=>q.taskCode===task && !q.qa?.manualReviewRecommended && !q.manualReviewRecommended);
 if(!eligible.length)continue;
 const diff={},types={},topics={},cat={calculation:0,directRecall:0,scenarioOrDecision:0,other:0};
 for(const q of eligible){
  const d=String(q.difficulty||'other'); diff[d]=(diff[d]||0)+1;
  const t=String(q.questionType||'other');types[t]=(types[t]||0)+1;
  const topic=String(q.topic||'unknown');topics[topic]=(topics[topic]||0)+1;
  if(/calculation|unit trap|math/i.test(t))cat.calculation++;
  else if(/concept|definition|recall|memory|recognition/i.test(t))cat.directRecall++;
  else if(/scenario|decision|next step|next action|best answer|interpretation|troubleshooting|first action/i.test(t))cat.scenarioOrDecision++;
  else cat.other++;
 }
 console.log('RPSGT_ELIGIBLE',JSON.stringify({task,total:eligible.length,difficulties:diff,typesTop:Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,12),topicsTop:Object.entries(topics).sort((a,b)=>b[1]-a[1]).slice(0,10),approxTypeBuckets:cat}));
}

for(const term of ['const TRAIL','let TRAIL','const DOMAIN_DATA','function taskCodeFromGuidedTaskId','const OFFICIAL_CPSGT_TASK_CODES','const TASK_FILTER_STOP_WORDS','function renderTrail','function taskHtml']){
 const at=html.indexOf(term);
 if(at>=0)console.log('CPSGT_TRAIL_IMPL',JSON.stringify({term,at,code:html.slice(Math.max(0,at-100),at+2400).replace(/\s+/g,' ').slice(0,2440)}));
}
