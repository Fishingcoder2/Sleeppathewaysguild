#!/usr/bin/env node
// Full-bank narrow topic-phrase coverage screen. This is NOT semantic gap proof or a release step.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const load=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const manifest=await load('rpsgt-v3/data/question-bank/manifest.json');
const release=await load('data/owner-approved-question-release.json');
const bank=[];
for(const m of manifest.modules){
 const file=await load('rpsgt-v3/data/question-bank/'+m.path);
 if(file.questions.length!==m.questionCount)throw Error('Module changed: '+m.path);
 bank.push(...file.questions);
}
if(bank.length!==2920||release.questions.length!==320)throw Error('Bank count changed, update scope.');
const all=bank.concat(release.questions);
const good=q=>!q.qa?.manualReviewRecommended;
const specs=[
 ['pediatric-mslt-sleep','Pediatric MSLT preceding PSG sleep sufficiency','D2B','11;16','AASM pediatric MSLT 2024',['(?:child|pediatric|adolescent|year.old)[^.?]{0,120}(?:MSLT|multiple sleep latency)[^.?]{0,100}(?:sleep|PSG|hours)','(?:MSLT|multiple sleep latency)[^.?]{0,110}(?:seven hours|7 hours|eight hours|8 hours|pediatric)']],
 ['adult-mslt-split','Adult MSLT after split night/PAP titration','D2B','11','AASM adult MSLT/MWT 2021',['(?:MSLT|multiple sleep latency)[^.?]{0,110}(?:split.night|titration|pressure adjustment)','(?:split.night|titration)[^.?]{0,110}(?:MSLT|multiple sleep latency)']],
 ['pediatric-co2-spo2','Pediatric CO2 monitoring versus SpO2','D3B','5;13;16','AASM v3 and AAST CO2 guidance',['(?:child|pediatric|infant)[^.?]{0,120}(?:CO2|capnograph|transcutaneous)[^.?]{0,120}(?:SpO2|oximetr|ventilat)','(?:CO2|capnograph|transcutaneous)[^.?]{0,110}(?:SpO2|oximetr)[^.?]{0,100}(?:child|pediatric|infant)']],
 ['co2-technique','ETCO2 vs TcCO2 artifact differentiation','D2C','5;8;16','AAST ETCO2 and TcCO2 guidance',['(?:end.tidal|ETCO2)[^.?]{0,110}(?:transcutaneous|TcCO2)','(?:transcutaneous|TcCO2)[^.?]{0,110}(?:end.tidal|ETCO2)','(?:CO2|capnograph|transcutaneous)[^.?]{0,100}(?:artifact|drift|sampling|calibrat)']],
 ['plms-plmd','PLMS finding versus PLMD exclusion','D1A','2;13','ICSD-3-TR and AASM RLS/PLMD 2025',['(?:PLMS|limb movement index)[^.?]{0,100}(?:PLMD|diagnos|exclude)','(?:PLMD|periodic limb movement disorder)[^.?]{0,100}(?:OSA|exclude|symptom|impair|PLMS)']],
 ['rls-augmentation','RLS augmentation symptom change','D1A','2;13','AASM RLS/PLMD 2025',['(?:augmentation|augmented)[^.?]{0,100}(?:RLS|restless|dopamin)','(?:RLS|restless legs)[^.?]{0,110}(?:earlier|spread|augment|worsen)','(?:pramipexole|ropinirole|dopamin)[^.?]{0,110}(?:earlier|spread|augment)']],
 ['hsat-inadequate','Negative or inconclusive HSAT with symptoms','D2B','11','AASM adult OSA diagnostic guideline 2017',['(?:HSAT|home sleep apnea test)[^.?]{0,110}(?:negative|inconclusive|inadequate)','(?:negative|inconclusive|inadequate)[^.?]{0,110}(?:HSAT|home sleep apnea)']],
 ['mslt-shiftwork','MSLT confounded by shift work/insufficient sleep','D1A','2;11','AASM adult MSLT 2021 and ICSD-3-TR',['(?:MSLT|sleep latency)[^.?]{0,120}(?:shift|insufficient sleep|sleep log|actigraph)','(?:shift work|rotating shifts|actigraph)[^.?]{0,120}(?:MSLT|sleep latency)']],
 ['signal-report','Timed respiratory signal loss in technical handoff','D3C','9;15','AAST Standard PSG 2021',['(?:signal loss|sensor loss|lost channel|disconnect)[^.?]{0,120}(?:report|document|log|time)','(?:report|document|log|time)[^.?]{0,120}(?:signal loss|sensor loss|lost channel|disconnect)']],
 ['pap-leak','PAP leak assessed before residual events','D4A','10','AAST PAP Titration 2021',['(?:PAP|CPAP|BPAP)[^.?]{0,100}leak[^.?]{0,110}(?:event|pressure|flow|residual)','(?:residual|apnea|hypopnea)[^.?]{0,100}leak[^.?]{0,110}(?:PAP|CPAP|BPAP)']],
 ['hsat-complex','HSAT appropriateness with complicated patient','D2B','11','AASM adult OSA diagnostic guideline 2017',['(?:HSAT|home sleep apnea)[^.?]{0,100}(?:hypoventilat|neuromuscular|opioid|severe insomnia)','(?:neuromuscular|opioid|hypoventilat|severe insomnia)[^.?]{0,100}(?:HSAT|home sleep apnea)']],
 ['accessibility','Mobility safety within PSG preparation','D2A','3;6;9','AAST PSG 2021 and local policy',['(?:PSG|sleep study)[^.?]{0,110}(?:wheelchair|fall risk|mobility|transfer)','(?:wheelchair|fall risk|mobility|transfer)[^.?]{0,110}(?:PSG|sleep study)']]
];
const coverage=specs.map(([id,label,task,chapters,authority,regex])=>{
 const patterns=regex.map(x=>new RegExp(x,'i'));
 const hits=all.filter(q=>patterns.some(rx=>rx.test(String(q.prompt||''))));
 return {id,label,task,chapters,authority,promptHits:hits.length,learnerEligible:hits.filter(good).length,held:hits.filter(q=>!good(q)).length,examples:hits.slice(0,5).map(q=>({id:q.id,taskCode:q.taskCode,prompt:q.prompt}))};
});
const drafts=await load('rpsgt-v3/data/question-proposals/spriggs-modernized-2026-10-12.json');
const output={method:'Limited high-precision regex over prompt only, not canonical concept IDs; zero is not proof of zero actual coverage',count:all.length,eligible:all.filter(good).length,held:all.filter(q=>!good(q)).length,draftCount:drafts.questions.length,spriggsSource:'2015 2e Guild chapter map; no book-passage attribution',families:coverage};
const dir=join(root,'rpsgt-v3/audit-output');
await mkdir(dir,{recursive:true});
await writeFile(join(dir,'spriggs-topic-coverage-2026.json'),JSON.stringify(output,null,2)+'\n');
const md=['# Spriggs topic-family coverage screen','',
'**Total:** '+all.length+' effective questions; **eligible:** '+output.eligible+'; **held:** '+output.held+'. Five previously staged drafts remain outside this bank.','',
'**Caution:** These are narrow prompt-text phrase counts, NOT verified gaps, semantic de-duplication or clinical accuracy. Sources below identify the modern controller; Spriggs chapter numbers identify only indexed learning topics.','',
'| Screened subfamily | Spriggs 2015 chapters | Target task | Authority | Prompt hits | Eligible | Held |','|---|---|---|---|---:|---:|---:|',
...coverage.map(f=>'| '+f.label+' | '+f.chapters+' | '+f.task+' | '+f.authority+' | '+f.promptHits+' | '+f.learnerEligible+' | '+f.held+' |'),
'','## Nearest exact-phrase examples',
...coverage.map(f=>'### '+f.id+'\n'+(f.examples.length?f.examples.map(e=>'- '+e.id+' ['+e.taskCode+'] '+String(e.prompt).replace(/[\r\n]/g,' ').slice(0,190)).join('\n'):'- No matching phrasing; manually review synonyms and concept family.')+'\n')
].join('\n');
await writeFile(join(dir,'spriggs-topic-coverage-2026.md'),md);
console.log(md.slice(0,23000));
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,md.slice(0,16000),{flag:'a'});
