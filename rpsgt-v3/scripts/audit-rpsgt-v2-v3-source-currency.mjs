#!/usr/bin/env node
// Editorial REVIEW screen shared by V2 (canonical app-data) and V3 (effective modular bank).
// Never edits a learner pool; a phrase match is NOT an incorrect-question verdict.
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
 if(d.questions.length!==m.questionCount)throw Error('Unexpected module counts at '+m.path);
 base.push(...d.questions);
}
if(base.length!==2920||release.questions.length!==320)throw Error('Source bank changed; rescope cross-version audit.');
const bank=[...base,...release.questions];
if(new Set(bank.map(q=>String(q.id))).size!==bank.length)throw Error('Duplicate RPSGT ID.');
const patterns=[
 {id:'rls-dopamine-old-first-line',name:'RLS dopamine agonist treatment preference may be from old textbook',domain:'D1A',severity:'CURRENTNESS REVIEW',re:/(?:ropinirole|pramipexole|dopaminergic|dopamine agonists?)[\s\S]{0,125}(?:first.line|first.choice|preferred|standard of care)|(?:first.line|first.choice|preferred|standard of care)[\s\S]{0,125}(?:ropinirole|pramipexole|dopaminergic|dopamine agonists?)/i,source:'Guild FST3 Chapter 19, volume 2 PDF page 14 reflects old first-line advice; AASM 2025 RLS/PLMD treatment guideline supersedes.'},
 {id:'rls-plmd-simplification',name:'RLS vs PLMD diagnosis and PSG role may be conflated',domain:'D1A',severity:'CLINICAL REVIEW',re:/(?:RLS|restless legs|PLMD|periodic limb movement disorder)[\s\S]{0,140}(?:diagnosed solely|diagnosed from PSG|only PSG|PSG alone|PSG confirms RLS)|(?:PSG alone)[\s\S]{0,140}(?:PLMD|RLS)/i,source:'Guild FST3 Ch.19 introduction distinguishes RLS interview diagnosis from PLMD requiring clinical context and PSG evidence; current ICSD-3-TR controls diagnosis.'},
 {id:'negative-hsat-false-reassurance',name:'Negative home apnea test framed as definitive OSA exclusion',domain:'D2B',severity:'CLINICAL REVIEW',re:/(?:negative|normal)[\s\S]{0,75}(?:HSAT|home sleep apnea test|home apnea test)[\s\S]{0,120}(?:rule[s]? out|exclude[s]?|definitiv|no OSA)|(?:HSAT|home sleep apnea test)[\s\S]{0,80}negative[\s\S]{0,120}(?:rule[s]? out|exclude[s]?|definitiv|no OSA)/i,source:'Guild FST3 Ch.44, volume 3 PDF p.185, high-suspicion negative HSAT → PSG; AASM 2017 adult diagnostic testing guideline controls.'},
 {id:'mslt-narcolepsy-sole-diagnosis',name:'MSLT metrics presented as sole sufficient narcolepsy diagnosis',domain:'D2B',severity:'DIAGNOSTIC CONTEXT REVIEW',re:/(?:MSLT|mean sleep latency|SOREMPs?)[\s\S]{0,150}(?:proves narcolepsy|diagnoses narcolepsy|definitively narcolepsy|always narcolepsy)|(?:narcolepsy)[\s\S]{0,110}(?:MSLT alone|MSLT proves)/i,source:'Guild FST3 Ch.16/43 and ICSD-3-TR; current AASM MSLT protocol and adequate preceding PSG/sleep context.'},
 {id:'hsat-suspicion-intersection',name:'HSAT clinical suspicion / false negative concept-family overlap',domain:'D2B',severity:'FAMILY REVIEW',re:/(?:HSAT|home sleep apnea|home apnea|home sleep test|portable sleep test)[\s\S]{0,135}(?:negative|false.negative|suspicion|inconclusive|technically inadequate)|(?:negative|false.negative|suspicion|inconclusive)[\s\S]{0,135}(?:HSAT|home sleep apnea|home sleep test|portable sleep test)/i,source:'Guild FST3 Ch.44; see clinical diagnostic guideline.'},
 {id:'rls-augmentation-intersection',name:'RLS augmentation progression / medication concept-family overlap',domain:'D1A',severity:'FAMILY REVIEW',re:/(?:RLS|restless legs|ropinirole|pramipexole|dopamine agonists?)[\s\S]{0,150}(?:augmentation|symptoms earlier|symptoms spread|arm involvement)|(?:augmentation)[\s\S]{0,125}(?:RLS|restless|dopamin)/i,source:'Guild FST3 Ch.19; verify with AASM 2025 RLS/PLMD treatment guidance.'}
];
const flagged=patterns.map(p=>{
 const matched=bank.filter(q=>p.re.test([q.prompt,q.answer,q.rationale].join(' ')));
 const response=matched.map(q=>({
  id:q.id,taskCode:q.taskCode,topic:q.topic,
  learnerEligible:q.qa?.manualReviewRecommended!==true,
  prompt:String(q.prompt||'').slice(0,280),
  answer:String(q.answer||'').slice(0,180),
  rationale:String(q.rationale||'').slice(0,340)
 }));
 return {id:p.id,name:p.name,scope:p.domain,severity:p.severity,source:p.source,matchCount:matched.length,matches:response,reviewRule:'Screen only: manually compare each matched decision and source. Do not auto-retire or change an answer.'};
});
const output={audit:"RPSGT V2/V3 shared effective-bank targeted currentness screen",date:"2026-10-12",baseCount:base.length,approvedReleaseCount:release.questions.length,total:bank.length,source:"User-supplied indexed FST3 actual page checks + BRPT blueprint/handbook/catalog and current-source registry",noAutomaticCorrection:true,
 groups:flagged,
 notes:["These patterns search stem, correct answer and rationale; matches can be innocent mentions, negations, old/current comparisons or correct answer options. Do not interpret as bad questions without reading full options and verifying the current primary standard.","The same effective bank drives V2 and V3 per the existing owner-release tests; corrections still require controlled explicit owner approval in each release path."]};
const dir=join(root,'rpsgt-v3/audit-output');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'rpsgt-v2-v3-source-currency-screen.json'),JSON.stringify(output,null,2)+'\n');
const md=['# Guild library-first V2/V3 question-currentness screen','',
'Existing V2/V3 shared effective RPSGT bank: **'+bank.length+'** (2,920 base + 320 approved). **No changes to questions.**',
'Screening source: inspected FST3 Ch.19 PDF volume 2 p.14; Ch.44 PDF volume 3 p.185; BRPT official task/handbook/catalog and current AASM/ICSD registry for verification.',
'**Counts are pattern matches, not a count of incorrect questions.**','',
'| Pattern family | Matches | Verification priority |',
'|---|---:|---|',...flagged.map(x=>'| '+x.name+' | '+x.matchCount+' | '+x.severity+' |'),
'','## Candidate records for qualified human review',
...flagged.map(x=>'### '+x.id+'\n'+(x.matches.length?x.matches.map(q=>'- '+q.id+' / '+q.taskCode+' / '+q.topic+' / eligible='+q.learnerEligible+': '+q.prompt+' **Answer:** '+q.answer+' **Rationale:** '+q.rationale).join('\n'):'No literal matches; this does not establish absence of the concept.')+'\n'),
'## Required release control','Do not change V2 or V3 based solely on this lexical screen. Check original library passage + latest applicable clinical/scoring rule, independently review, preserve learner IDs, obtain owner approval, then test both versions.'
].join('\n');
await writeFile(join(dir,'rpsgt-v2-v3-source-currency-screen.md'),md);
console.log(md.slice(0,25000));
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,md.slice(0,16000),{flag:'a'});
