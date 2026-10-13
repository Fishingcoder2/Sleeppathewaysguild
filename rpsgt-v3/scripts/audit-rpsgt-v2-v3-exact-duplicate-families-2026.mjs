#!/usr/bin/env node
// Read-only exact duplicate and answer-conflict inventory across RPSGT V2 + V3.
// Duplicate membership is not permission to retire content.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const manifest=await read('rpsgt-v3/data/question-bank/manifest.json');
const release=await read('data/owner-approved-question-release.json');
const base=[];
for(const m of manifest.modules){
 const d=await read('rpsgt-v3/data/question-bank/'+m.path);
 base.push(...d.questions);
}
if(base.length!==2920||release.questions.length!==320)throw Error('Source bank counts changed; re-scope audit.');
const v3=base.concat(release.questions);
const html=await readFile(join(root,'RPSGTv2.2026.html'),'utf8');
const raw=html.match(/<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
if(!raw)throw Error('No canonical V2 app-data found.');
const v2=JSON.parse(raw).seed.questionBank;
if(v2.length!==3240||v3.length!==3240)throw Error('Unexpected 3,240-item source count.');
const id=x=>String(x?.id);
const normalize=x=>String(x==null?'':x).normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const options=x=>JSON.stringify((Array.isArray(x.options)?x.options:[]).map(normalize).sort());
const literal=x=>JSON.stringify([x.prompt,x.options,x.answer,x.rationale]);
const normalized=x=>JSON.stringify([normalize(x.prompt),options(x),normalize(x.answer),normalize(x.rationale)]);
const v2Map=new Map(v2.map(q=>[id(q),q])),v3Map=new Map(v3.map(q=>[id(q),q]));
if(v2Map.size!==3240||v3Map.size!==3240)throw Error('Duplicate exact IDs.');
const differences=[];
for(const [name,q] of v3Map){
 const match=v2Map.get(name);
 if(!match){differences.push({id:name,issue:'absent V2'});continue;}
 const fields=['prompt','options','answer','rationale','taskCode'].filter(k=>JSON.stringify(q[k])!==JSON.stringify(match[k]));
 if(fields.length)differences.push({id:name,issue:'content difference',fields});
}
for(const name of v2Map.keys())if(!v3Map.has(name))differences.push({id:name,issue:'absent V3'});
function group(fn){
 const groups=new Map();
 v3.forEach(q=>{const key=fn(q);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q);});
 return [...groups.values()].filter(g=>g.length>1)
 .sort((a,b)=>b.length-a.length||String(a[0].taskCode).localeCompare(String(b[0].taskCode))||id(a[0]).localeCompare(id(b[0])));
}
const sameLiteral=group(literal),sameNormalized=group(normalized),sameStem=group(x=>normalize(x.prompt));
function meta(g){return {count:g.length,ids:g.map(id),tasks:[...new Set(g.map(q=>q.taskCode))],
 eligibleCount:g.filter(q=>!q.qa?.manualReviewRecommended).length,prompt:g[0].prompt,
 answers:[...new Set(g.map(q=>normalize(q.answer)))],
 answerConflict:new Set(g.map(q=>normalize(q.answer))).size>1,
 sameOptions:new Set(g.map(options)).size===1,
 reviewedSourceRecords:g.map(q=>({id:q.id,prompt:q.prompt,answer:q.answer,options:q.options,rationale:q.rationale,taskCode:q.taskCode})),
 manualReviewRequired:true};}
const conflicts=sameStem.filter(g=>new Set(g.map(q=>normalize(q.answer))).size>1).map(meta);
const families=sameNormalized.map(meta);
const extra=arr=>arr.reduce((v,g)=>v+g.length-1,0);
const result={
 date:'2026-10-12',status:'NON-PUBLISHING EDITORIAL INVENTORY',
 v2Total:v2.length,v3Total:v3.length,sourceIdentityDifferences:differences.length,
 sourceIdentityDifferenceSamples:differences.slice(0,200),
 literalDuplicateFamilies:sameLiteral.length,literalRedundantCopies:extra(sameLiteral),
 normalizedDuplicateFamilies:sameNormalized.length,normalizedRedundantCopies:extra(sameNormalized),
 identicalPromptFamilies:sameStem.length,identicalPromptAnswerConflictFamilies:conflicts.length,
 normalizedGroups:families,conflictGroups:conflicts,
 note:'Exact string similarity alone is not a clinical error or authorization to change live learner eligibility. Requires contextual item review, qualified clinical QA and owner approval.'
};
const dir=join(root,'rpsgt-v3/audit-output');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'rpsgt-v2-v3-exact-duplicate-families-2026.json'),JSON.stringify(result,null,2)+'\n');
const md=[
 '# RPSGT V2/V3 exact duplicate and recorded-answer-conflict inventory','',
 '**Read-only — original question IDs, answer keys and historical learner records untouched.**','',
 '| Audit measure | Result |','|---|---:|',
 '| V2 source records | '+result.v2Total+' |',
 '| V3 source plus owner-approved overlay records | '+result.v3Total+' |',
 '| V2/V3 mismatched IDs or fields | '+result.sourceIdentityDifferences+' |',
 '| Literal duplicate families | '+result.literalDuplicateFamilies+' |',
 '| Literal redundant copies | '+result.literalRedundantCopies+' |',
 '| Normalized duplicate families | '+result.normalizedDuplicateFamilies+' |',
 '| Normalized redundant copies | '+result.normalizedRedundantCopies+' |',
 '| Identical-stem families | '+result.identicalPromptFamilies+' |',
 '| Identical stems with different recorded correct answers | '+result.identicalPromptAnswerConflictFamilies+' |',
 '','## Largest duplicate families',
 ...families.slice(0,30).map((g,i)=>(i+1)+'. '+g.ids.join(', ')+' ('+g.count+' records; '+g.eligibleCount+' eligible; task '+g.tasks.join('/')+'): '+g.prompt+' **Recorded answer:** '+g.reviewedSourceRecords[0].answer),
 '','## Same-stem recorded-answer conflicts — editor review only',
 ...(conflicts.length?conflicts.slice(0,30).flatMap(g=>['- '+g.ids.join(', ')+': '+g.prompt+' (recorded correct answers differ; review complete choices and question rationale)',...g.reviewedSourceRecords.map(q=>'  - '+q.id+' **Answer:** '+q.answer+' **Choices:** '+q.options.join(' | ')+' **Rationale:** '+q.rationale)]):['No identical-stem different-answer families were detected.']),
 '','## Interpretation',
 'V3 Mock already consolidates normalized question families at selection time. This audit does **not** mean every copy is shown in a single mock exam. Prioritize quality in Practice/Guided Study/Readiness and actual V2 browser routing.',
 'Do not auto-retire copies, renumber IDs, or replace scoring thresholds from an unrelated diagnostic source. Qualified editorial/clinical review, owner approval and saved-progress regression come first.'
].join('\n');
await writeFile(join(dir,'rpsgt-v2-v3-exact-duplicate-families-2026.md'),md+'\n');
console.log(md.slice(0,18000));
if(differences.length)process.exitCode=1;
