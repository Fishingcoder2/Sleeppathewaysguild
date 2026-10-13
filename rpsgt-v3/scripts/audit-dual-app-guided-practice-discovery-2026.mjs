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
