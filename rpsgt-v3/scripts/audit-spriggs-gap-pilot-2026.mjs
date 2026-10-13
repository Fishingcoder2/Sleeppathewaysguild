#!/usr/bin/env node
// Validate wholly unreleased, original indexed-topic RPSGT gap candidates against existing bank and five-item pilot.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve,dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const load=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const gap=await load('rpsgt-v3/data/question-proposals/spriggs-gap-pilot-2026-10-12.json');
const pilot=await load('rpsgt-v3/data/question-proposals/spriggs-modernized-2026-10-12.json');
const manifest=await load('rpsgt-v3/data/question-bank/manifest.json');
const release=await load('data/owner-approved-question-release.json');
const sources=await load('rpsgt-v3/data/study-sources/manifest.json');
const aliases=await load('rpsgt-v3/data/study-sources/source-key-aliases.json');
const registry=new Set([...Object.keys(aliases.verifiedAliases||{}),...aliases.contextOnlyKeys]);
for(const p of sources.sourceFiles){const s=await load('rpsgt-v3/data/study-sources/'+p);registry.add(s.id);}
const current=[];
for(const m of manifest.modules){
 const d=await load('rpsgt-v3/data/question-bank/'+m.path);
 if(d.questions.length!==m.questionCount)throw Error('Mismatch module '+m.path);
 current.push(...d.questions);
}
current.push(...release.questions);
const existing=current.concat(pilot.questions);
if(current.length!==3240||pilot.questions.length!==5||gap.questions.length!==2)throw Error('Review bank/pilot counts before publication.');
if(!gap.status.includes('NOT IN LEARNER BANK')||gap.editorialGate?.ownerReleaseApproval!=='NOT GRANTED'||gap.editorialGate?.mergeStatus!=='DO NOT MERGE UNTIL FULL QA')throw Error('Release gate not closed.');
const normalized=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const stop=new Set('the from were have with into for and this that during after before when what which should would best most one who why how sleep study adult patient their through because reports following technologist approach appropriate'.split(' '));
const tokens=s=>new Set(normalized(s).split(/\s+/).filter(x=>x.length>2&&!stop.has(x)));
const df=new Map();
for(const q of existing)for(const t of tokens(q.prompt))df.set(t,(df.get(t)||0)+1);
const weight=t=>1+Math.log((existing.length+1)/((df.get(t)||0)+1));
const compare=(a,b)=>{
 let inter=0,uni=0;
 for(const t of a){const w=weight(t);uni+=w;if(b.has(t))inter+=w;}
 for(const t of b)if(!a.has(t))uni+=weight(t);
 return uni?inter/uni:0;
};
const errors=[],warnings=[],ids=new Set(existing.map(q=>String(q.id))), seen=new Set();
const expected={
'SPG-GAP-2026-001':{task:'D1A',chap:2,title:'Sleep Disorders',source:'aasm-rls-plmd-2025',doi:'10.5664/jcsm.11390'},
'SPG-GAP-2026-002':{task:'D2B',chap:11,title:'Performing Other Types of Sleep Studies',source:'aasm-adult-osa-diagnostic-testing-2017',doi:'10.5664/jcsm.6506'}
};
const matches=[];
const tokenBank=existing.map(q=>tokens(q.prompt));
for(const q of gap.questions){
 const exp=expected[q.id];
 if(!exp)errors.push('Unexpected ID: '+q.id);
 if(ids.has(q.id)||seen.has(q.id))errors.push('Duplicate ID: '+q.id);
 seen.add(q.id);
 if(!exp||q.taskCode!==exp.task||q.domain!==exp.task.slice(0,2))errors.push('Task mismatch: '+q.id);
 if(!Array.isArray(q.options)||q.options.length!==4||new Set(q.options).size!==4||q.options.filter(x=>x===q.answer).length!==1)errors.push('Four choice / unique-answer error: '+q.id);
 if(!q.rationale||!q.qa?.manualReviewRecommended||q.publicationStatus!=='proposed-not-learner-eligible'||!q.qa?.needsIndependentClinicalReview)errors.push('Publication gate/rationale missing: '+q.id);
 const loc=q.sourceCredit?.spriggs2015;
 if(!exp||loc?.chapter!==exp.chap||loc?.title!==exp.title||q.sourceCredit?.controllingSource?.id!==exp.source||q.sourceCredit?.controllingSource?.doi!==exp.doi)errors.push('Indexed chapter/current authority mismatch: '+q.id);
 if(!q.referenceKeys?.includes(exp.source)||!q.studyRecommendationKeys?.includes(exp.source))errors.push('Current authority not in references: '+q.id);
 for(const key of [...(q.referenceKeys||[]),...(q.studyRecommendationKeys||[])])if(!registry.has(key))errors.push('Unknown source key: '+q.id+'/'+key);
 const phrase=normalized(q.prompt);
 const duplicates=existing.filter(x=>normalized(x.prompt)===phrase);
 if(duplicates.length)errors.push('Exact duplicate prompt: '+q.id+' vs '+duplicates.map(x=>x.id).join(','));
 const t=tokens(q.prompt);
 const nearest=existing.map((x,i)=>({id:x.id,taskCode:x.taskCode,score:compare(t,tokenBank[i]),prompt:x.prompt})).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>({...x,score:Math.round(x.score*1000)/1000}));
 if(nearest[0]?.score>=.29)warnings.push('Similar prompt '+q.id+' / '+nearest[0].id+' score '+nearest[0].score);
 const family=q.id.endsWith('001')?/(RLS|restless legs|augmentation|pramipexole|ropinirole|dopamin)/i:/(HSAT|home sleep apnea|home sleep test|home apnea test|negative home study)/i;
 const related=current.filter(x=>family.test(String(x.prompt||'')+' '+String(x.topic||'')));
 matches.push({candidateId:q.id,familyContextCount:related.length,
  relatedExamples:related.slice(0,20).map(x=>({id:x.id,taskCode:x.taskCode,prompt:x.prompt})),
  nearest,editorialDisposition:'Independent clinical+concept-family review required; not eligible'});
}
const result={scannedExisting:current.length,priorPilot:pilot.questions.length,prospective:gap.questions.length,errors,warnings,matches};
const outDir=join(root,'rpsgt-v3/audit-output');await mkdir(outDir,{recursive:true});
await writeFile(join(outDir,'spriggs-gap-pilot-audit-2026.json'),JSON.stringify(result,null,2)+'\n');
const md=['# Spriggs gap pilot — two-question whole-bank audit','',
 '- '+current.length+' existing effective questions scanned; '+pilot.questions.length+' earlier held drafts checked for collisions.',
 '- '+gap.questions.length+' new gap candidates remain held; hard errors: '+errors.length+'; elevated weighted-word-overlap flags: '+warnings.length+'.',
 '','**These metrics cannot rule out equivalent decisions phrased differently.**',
 ...matches.map(x=>'## '+x.candidateId+'\nClosest by lexical overlap:\n'+x.nearest.map(e=>'- '+e.id+' ('+e.taskCode+', '+e.score+'): '+String(e.prompt).replace(/[\r\n]/g,' ').slice(0,240)).join('\n')+'\nRelated concept-family prompts: '+x.familyContextCount+'\n'+x.relatedExamples.map(e=>'- '+e.id+' ('+e.taskCode+'): '+String(e.prompt).replace(/[\r\n]/g,' ').slice(0,240)).join('\n')),
 '','## Audit errors',...errors.map(x=>'- '+x),'','## Warnings',...warnings.map(x=>'- '+x),''
].join('\n');
await writeFile(join(outDir,'spriggs-gap-pilot-audit-2026.md'),md);
console.log(md.slice(0,23000));
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,md.slice(0,15000),{flag:'a'});
if(errors.length)process.exitCode=1;
