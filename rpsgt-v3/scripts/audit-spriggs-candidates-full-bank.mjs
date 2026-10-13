#!/usr/bin/env node
// Complete local bank audit of unreleased SPG Spriggs question candidates.
// This script DOES NOT update learner content, approve questions, or make clinical judgments.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const proposal=await read('rpsgt-v3/data/question-proposals/spriggs-modernized-2026-10-12.json');
const manifest=await read('rpsgt-v3/data/question-bank/manifest.json');
const release=await read('data/owner-approved-question-release.json');
const registry=await read('rpsgt-v3/data/study-sources/manifest.json');
const aliases=await read('rpsgt-v3/data/study-sources/source-key-aliases.json');
const known=new Set();
for(const file of registry.sourceFiles){
 const src=await read('rpsgt-v3/data/study-sources/'+file);
 known.add(src.id);
}
const validRef=new Set([...known,...Object.keys(aliases.verifiedAliases||{}),...(aliases.contextOnlyKeys||[])]);
const weakRef=new Set([...Object.keys(aliases.legacyUmbrellaKeys||{}),...Object.keys(aliases.conceptKeys||{}),...Object.keys(aliases.pendingSourceKeys||{})]);
const errors=[], warnings=[];
const tasks=new Set(['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C']);
const existing=[];
for(const e of manifest.modules){
 const data=await read('rpsgt-v3/data/question-bank/'+e.path);
 if(!Array.isArray(data.questions)||data.questions.length!==e.questionCount)errors.push('Module count: '+e.path);
 existing.push(...data.questions);
}
const additions=release.questions||[];
const pool=existing.concat(additions);
const poolIds=new Set(pool.map(q=>String(q.id)));
if(existing.length!==2920)errors.push('Expected 2,920 original records, found '+existing.length);
if(additions.length!==320)errors.push('Expected 320 approved additions, found '+additions.length);
if(pool.length!==3240||poolIds.size!==3240)errors.push('Expected 3,240 unique effective questions, found '+pool.length+' records/'+poolIds.size+' IDs');
if(proposal.questionCount!==proposal.questions.length)errors.push('Proposal count mismatch');
const candidateIds=new Set();
for(const q of proposal.questions){
 if(candidateIds.has(q.id)||poolIds.has(q.id))errors.push('Duplicate or released ID: '+q.id);
 candidateIds.add(q.id);
 if(!tasks.has(q.taskCode)||q.domain!==q.taskCode.slice(0,2))errors.push('Invalid task mapping: '+q.id);
 if(!Array.isArray(q.options)||q.options.length!==4||new Set(q.options).size!==4||q.options.filter(x=>x===q.answer).length!==1)errors.push('Invalid options/answer: '+q.id);
 if(!q.qa?.manualReviewRecommended||q.publicationStatus!=='proposed-not-learner-eligible')errors.push('Candidate not held: '+q.id);
 if(!q.rationale||!q.sourceCredit?.spriggs2015Chapter)errors.push('Missing explanation/chapter pointer: '+q.id);
 if(!Array.isArray(q.referenceKeys)||q.referenceKeys.length<2)errors.push('Insufficient references: '+q.id);
 for(const ref of new Set([...(q.referenceKeys||[]),...(q.studyRecommendationKeys||[])])){
  if(!validRef.has(ref))errors.push('Unresolved/unsupported exact key: '+q.id+' -> '+ref);
  if(weakRef.has(ref))errors.push('Ambiguous source key: '+q.id+' -> '+ref);
 }
 const clinical=(q.referenceKeys||[]).filter(k=>!(aliases.contextOnlyKeys||[]).includes(k));
 if(!clinical.length)errors.push('No exact non-context authority: '+q.id);
}
const stop=new Set('a an the and or is are was were to of for with on by in as at that this from into when then a patient what which should would most best first appropriate likely technologist study study sleep during during following after before from shows shows demonstrate under clinical current test testing rule rules do does using has have had an adult child pediatric patient patients technologists'.split(/\s+/));
const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
const tokens=s=>new Set(normalize(s).split(/\s+/).filter(x=>x.length>2&&!stop.has(x)));
const df=new Map();
for(const q of pool){
 for(const t of tokens(q.prompt))df.set(t,(df.get(t)||0)+1);
}
const wt=t=>1+Math.log((pool.length+1)/((df.get(t)||0)+1));
const overlap=(a,b)=>{
 let intersection=0,union=0;
 for(const t of a){const w=wt(t);union+=w;if(b.has(t))intersection+=w;}
 for(const t of b)if(!a.has(t))union+=wt(t);
 return union?intersection/union:0;
};
const bankTokens=pool.map(q=>tokens(q.prompt));
const audit=proposal.questions.map(q=>{
 const tok=tokens(q.prompt);
 const near=pool.map((p,i)=>({id:String(p.id),taskCode:p.taskCode,score:overlap(tok,bankTokens[i]),prompt:p.prompt}))
  .sort((a,b)=>b.score-a.score).slice(0,5)
  .map(x=>({...x,score:Math.round(x.score*1000)/1000,prompt:String(x.prompt).slice(0,250)}));
 const exact=pool.filter(p=>normalize(p.prompt)===normalize(q.prompt)).map(p=>String(p.id));
 if(exact.length)errors.push('Existing exact prompt duplicate: '+q.id+' matches '+exact.join(','));
 if(near[0]?.score>=0.27)warnings.push(q.id+' high token similarity: '+near[0].id+' ('+near[0].score+')');
 return {draftId:q.id,taskCode:q.taskCode,question:q.prompt,closestExisting:near,exactMatches:exact,editorialSignoff:"REQUIRED"};
});
const summary={
 auditDate:'2026-10-12',
 scope:'full original 2,920 + approved 320; prospective draft excluded',
 existingCount:existing.length,
 ownerAdditionCount:additions.length,
 effectiveCount:pool.length,
 candidateCount:proposal.questions.length,
 candidateStatusesHeld:proposal.questions.filter(q=>q.qa?.manualReviewRecommended).length,
 errors,warnings,results:audit
};
const outPath=join(root,'rpsgt-v3','audit-output','spriggs-full-bank-report.json');
await mkdir(dirname(outPath),{recursive:true});
await writeFile(outPath,JSON.stringify(summary,null,2)+'\n');
const escape=s=>String(s||'').replace(/[\r\n|]+/g,' ').slice(0,150);
const md=[
 '# Spriggs pilot: full-bank candidate overlap audit',
 '',
 '- Original question count: **'+existing.length+'**',
 '- Existing owner-approved additions: **'+additions.length+'**',
 '- Effective current pool: **'+pool.length+'**',
 '- Unreleased candidate questions: **'+proposal.questions.length+'**',
 '- Hard errors: **'+errors.length+'**',
 '- Similarity flags (token-weighted heuristic only): **'+warnings.length+'**',
 '',
 'This is not a clinical accuracy review, clinical authorization, or proof that concept-level duplicates are absent.',
 '',
 '| Draft candidate | Closest existing | Task | Similarity | Existing prompt (abbreviated) |',
 '| --- | --- | --- | ---: | --- |',
 ...audit.map(x=>{
  const best=x.closestExisting[0]||{};
  return '| '+x.draftId+' | '+(best.id||'')+' | '+(best.taskCode||'')+' | '+(best.score??0)+' | '+escape(best.prompt)+' |';
 }),
 '',
 '## Warnings and errors',...warnings.map(s=>'- WARNING: '+s),...errors.map(s=>'- ERROR: '+s),
 '',
 'Complete nearest-neighbor evidence is in the JSON audit artifact. Manual semantic/content review required.'
].join('\n')+'\n';
const reportPath=join(root,'rpsgt-v3','audit-output','spriggs-full-bank-report.md');
await writeFile(reportPath,md);
console.log(md);
if(process.env.GITHUB_STEP_SUMMARY){
 await writeFile(process.env.GITHUB_STEP_SUMMARY,md,{flag:'a'});
}
if(errors.length)process.exitCode=1;
