import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const subject=require(join(root,'core/practice-subjects.js'));
const difficulty=require(join(root,'core/practice-difficulty.js'));
const manifest=JSON.parse(await readFile(join(root,'data/question-bank/manifest.json'),'utf8'));
const approved=JSON.parse(await readFile(join(root,'../data/owner-approved-question-release.json'),'utf8'));
const records=[];
for(const mod of manifest.modules){
 const pack=JSON.parse(await readFile(join(root,'data/question-bank',mod.path),'utf8'));
 for(const q of pack.questions)records.push({q,pack:mod.path});
}
for(const q of approved.questions)records.push({q,pack:'owner-approved-question-release.json'});
const unique=new Map(),issues=[],rows=[],subjectCounts={};
for(const {q,pack} of records){
 const id=String(q.id),task=String(q.taskCode||''),domain=String(q.domain||'');
 if(unique.has(id))issues.push({type:'duplicate-id',id,pack,other:unique.get(id)});
 else unique.set(id,pack);
 if(!/^D[1-4][A-C]$/.test(task)&&task!=='D2A/D2C')issues.push({type:'unrecognized-task',id,task,pack});
 if(task.match(/^D[1-4]/)?.[0]!==domain)issues.push({type:'task-domain-mismatch',id,task,domain,pack});
 if(!Array.isArray(q.options)||!q.options.includes(q.answer))issues.push({type:'answer-not-in-options',id,pack});
 const eligible=!q.qa?.manualReviewRecommended;
 const matches=subject.definitions.filter(x=>subject.matchesQuestion(q,x.id)).map(x=>x.id);
 const group=difficulty.groupFor(q);
 if(eligible&&!group)issues.push({type:'unmapped-difficulty',id,tag:q.difficulty,pack});
 if(eligible&&matches.length===0)issues.push({type:'no-subject-match',id,topic:q.topic,task,pack});
 if(eligible&&matches.length>=4)issues.push({type:'broad-subject-overlap',id,matches,topic:q.topic,task,pack});
 if(eligible)for(const m of matches)subjectCounts[m]=(subjectCounts[m]||0)+1;
 rows.push({id,pack,task,domain,eligible,topic:q.topic||'',difficulty:q.difficulty||'',difficultyGroup:group||'',subjects:matches,primaryInferred:subject.inferQuestion(q)?.id||null});
}
const eligible=rows.filter(x=>x.eligible);
const report={generatedAt:'2026-10-13',scope:'RPSGT V3 canonical bank plus approved overlay',total:rows.length,eligible:eligible.length,held:rows.length-eligible.length,uniqueIds:unique.size,subjectCounts,issuesByType:Object.fromEntries([...new Set(issues.map(x=>x.type))].map(type=>[type,issues.filter(x=>x.type===type).length])),issues,records:rows,notes:['Regex subjects are heuristic: flags require editorial confirmation, not automatic question retagging.','V2 and CPSGT single-file bank extraction requires separate audit; this report does not certify them.']};
assert.equal(report.total,3240,'Unexpected effective question count');
assert.equal(report.eligible,2680,'Unexpected learner-ready question count');
assert.equal(report.held,560,'QA-held records changed');
assert.equal(report.uniqueIds,3240,'Duplicate exact IDs');
console.log(JSON.stringify({total:report.total,eligible:report.eligible,held:report.held,uniqueIds:report.uniqueIds,subjectCounts,issuesByType:report.issuesByType,exampleIssues:issues.slice(0,25)},null,2));
if(process.argv.includes('--json'))console.log(JSON.stringify(report));
