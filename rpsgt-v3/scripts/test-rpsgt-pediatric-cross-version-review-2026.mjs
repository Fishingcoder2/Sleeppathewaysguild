#!/usr/bin/env node
// Non-destructive editorial QA for V2/V3 RPSGT: check original D3B records and held repair proposals.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const staged=await read('rpsgt-v3/data/question-proposals/pediatric-v2-v3-repair-review-2026-10-12.json');
const draft=await read('rpsgt-v3/data/question-proposals/spriggs-modernized-2026-10-12.json');
const v3=await read('rpsgt-v3/data/question-bank/d3b.json');
const html=await readFile(join(root,'RPSGTv2.2026.html'),'utf8');
const payload=html.match(/<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
if(!payload)throw Error('V2 embedded app-data not found.');
const v2=JSON.parse(payload).seed.questionBank;
const v2Index=new Map(v2.map(q=>[String(q.id),q]));
const v3Index=new Map(v3.questions.map(q=>[String(q.id),q]));
const errors=[],rows=[];
if(staged.publicationStatus!=='editorial-review-only-not-owner-approved'||staged.releaseGates?.publish!==false||
   staged.releaseGates?.ownerApproval!=='NOT GRANTED'||staged.releaseGates?.licensedAASMv3RuleVerification!=='PENDING')
 errors.push('Pediatric proposals must remain under explicit owner and licensed-rule verification hold.');
if(staged.sourceHierarchy?.blueprint!=='brpt-blueprint D3B'||!staged.sourceHierarchy?.recommendedBooks?.some(x=>x.id==='fundamentals-sleep-technology-3e'&&x.chapter===61))
 errors.push('BRPT D3B / Guild recommended-reading anchor is absent.');
for(const p of staged.proposedRuleSensitiveRevisions||[]){
 const a=v2Index.get(String(p.id)),b=v3Index.get(String(p.id));
 if(!a||!b){errors.push('Missing V2/V3 original: '+p.id);continue;}
 for(const field of ['prompt','options','answer','rationale','taskCode'])
  if(JSON.stringify(a[field])!==JSON.stringify(b[field]))
   errors.push('Original source content mismatch for '+p.id+': '+field);
 for(const [field,originalField] of [['prompt','prompt'],['options','options'],['answer','answer'],['rationale','rationale']])
  if(JSON.stringify(a[field])!==JSON.stringify(p.existing[originalField]))
   errors.push('Repair proposal is stale vs canonical original '+p.id+': '+field);
 if(p.proposedAnswer!==a.answer&&p.id!=='mb-pediatric-mixed-4')
   errors.push('Unexpected answer change beyond threshold correction: '+p.id);
 if(p.id==='mb-pediatric-mixed-4'&&(!p.proposedAnswer.includes('more than 25%')||!a.answer.includes('at least 25%')))
   errors.push('Boundary threshold precision edit not explicitly captured.');
 if(p.id==='boost-039'&&(!p.proposedPrompt.includes('two missed breaths')||!p.proposedPrompt.includes('less than 20 seconds')))
   errors.push('Missing pediatric central-apnea two-breath duration qualifier.');
 if(p.id==='imp-050'&&(!p.proposedRationale.includes('duration')||p.proposedAnswer!=='3%'))
   errors.push('Pediatric hypopnea proposal must retain answer and add duration context.');
 if(p.reviewComplete!==false||!p.referenceKeyAdditions.includes('aasm-scoring-manual-v3'))
   errors.push('Clinical review/current-source gate missing for '+p.id);
 rows.push({id:p.id,task:p.taskCode,v2v3OriginalUnchanged:true,disposition:p.disposition,approved:false});
}
const ids=['v1264-0161','v1264-0162','v1264-0163','v1264-0164','v1264-0165'];
const dup=staged.confirmedExactDuplicateFamily;
if(JSON.stringify(dup?.existingIds)!==JSON.stringify(ids)||dup?.recommendedRetentionCandidate!==ids[0])
 errors.push('Unexpected duplicate group or retention candidate.');
const signatures=[];
for(const id of ids){
 const a=v2Index.get(id),b=v3Index.get(id);
 if(!a||!b){errors.push('Missing duplicate member in V2/V3: '+id);continue;}
 const signature=JSON.stringify([a.prompt,a.options,a.answer,a.rationale]);
 signatures.push(signature);
 if(JSON.stringify([b.prompt,b.options,b.answer,b.rationale])!==signature)
  errors.push('V2 vs V3 duplicated question content changed: '+id);
 if(a.qa?.manualReviewRecommended)errors.push('Unexpected QA eligibility change in existing duplicate '+id);
}
if(signatures.length!==5||new Set(signatures).size!==1)errors.push('Expected exactly five literal duplicate prompts/options/answers/rationales.');
if(dup?.proposedReviewForFutureDuplicateExclusion?.length!==4)
 errors.push('Four duplicate IDs should await distinct editorial dispositions.');
const nearby=staged.nearDuplicateDecisionFamily?.existingIds||[];
if(nearby.length!==3||!nearby.every(id=>v3Index.has(id)))errors.push('Near-duplicate central apnea decision family not fully grounded.');
const pediatricMslt=draft.questions.find(q=>q.id==='SPG-SPRIGGS-2026-005');
const loc=pediatricMslt?.libraryEvidence?.directCurrentSourcePassageReview;
if(!pediatricMslt?.qa?.manualReviewRecommended||pediatricMslt?.publicationStatus!=='proposed-not-learner-eligible'||
 loc?.sourceId!=='aasm-pediatric-mslt-mwt-2024'||loc?.localPdfPage!==4||!loc.locator?.includes('Box 2')||
 !loc.findings?.some(s=>s.includes('8 hours')&&s.includes('7 hours'))||
 !loc.findings?.some(s=>s.includes('split-night')))
 errors.push('Missing source-verified 2024 pediatric MSLT Box 2 and hold evidence.');
if((staged.proposedRuleSensitiveRevisions||[]).length!==3)errors.push('Expected three focused pediatric repair proposals.');
const result={checkedAt:'2026-10-12',scope:'RPSGT V2 and V3 held pediatric D3B review',effectiveV2QuestionCount:v2.length,
 sourceV3D3BCount:v3.questions.length,
 repairProposalCount:rows.length,exactDuplicateGroup:{size:signatures.length,ids,verified:signatures.length===5&&new Set(signatures).size===1},
 centralApneaNearDuplicateGroup:nearby,pediatricMsltBox2Located:!errors.some(e=>e.includes('MSLT')),errors,rows,
 note:'No changes to V2/V3 bank records. Source passage checks do not replace current licensed AASM v3 rule verification. Future corrections require clinical and owner approval.'};
const dir=join(root,'rpsgt-v3/audit-output');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'rpsgt-pediatric-cross-version-review-2026.json'),JSON.stringify(result,null,2)+'\n');
const md=['# RPSGT V2/V3 pediatric-source editorial audit','','Original bank remains unchanged. Proposed repairs are **held**.','',
'- Existing V2 records: '+v2.length+'; V3 D3B source records: '+v3.questions.length,
'- Literal age-five scoring duplicates: '+signatures.length+' records, '+new Set(signatures).size+' unique wording+answer signature(s)',
'- Three staged D3B corrections: '+rows.map(r=>r.id).join(', '),
'- Overlapping central-apnea decision family: '+nearby.join(', '),
'- 2024 pediatric MSLT Box 2 passage link: '+(result.pediatricMsltBox2Located?'present':'MISSING'),
'- Errors: '+errors.length, ...errors.map(x=>'  - '+x),'',
'**Editorial cautions:** FST3 Chapter 61 contains older reproduced scoring rules. Its split PDF volume 4 pages 35–40 support a source-concept review but **do not establish Version 3 scoring text**. The threshold case must remain held for licensed AASM v3 confirmation. Avoid retiring duplicate IDs without storage/progress impact review.'].join('\n');
await writeFile(join(dir,'rpsgt-pediatric-cross-version-review-2026.md'),md+'\n');
console.log(md+'\n'+JSON.stringify(rows,null,2));
if(errors.length)process.exitCode=1;
