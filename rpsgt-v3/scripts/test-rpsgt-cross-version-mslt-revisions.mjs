#!/usr/bin/env node
// No changes to V2 or V3: compare two targeted pending editorial revisions to original live pool records.
import {readFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const json=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const proposal=await json('rpsgt-v3/data/question-proposals/mslt-v2-v3-existing-item-revisions-2026-10-12.json');
const v3=await json('rpsgt-v3/data/question-bank/d2b.json');
const v2Html=await readFile(join(root,'RPSGTv2.2026.html'),'utf8');
const raw=v2Html.match(/<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
if(!raw)throw Error('Cannot find original V2 seed app-data.');
const v2=JSON.parse(raw).seed.questionBank;
const registered=await json('rpsgt-v3/data/study-sources/aasm-adult-mslt-mwt-2021.json');
if(registered.id!=='aasm-adult-mslt-mwt-2021')throw Error('Exact source key missing from Guild registry.');
const rows=[],errors=[],ids=new Set();
if(proposal.status!=='DRAFT — DO NOT APPLY OR PUBLISH; QUALIFIED EDITOR AND OWNER APPROVAL REQUIRED'||proposal.reviewGates.ownerApproval!=='NOT GRANTED'||proposal.reviewGates.releaseEligibility!==false)
 errors.push('Draft editorial release gates are not closed.');
if(proposal.authorityChain?.blueprint?.task!=='D2B'||proposal.authorityChain?.candidateHandbook?.id!=='brpt-handbook')
 errors.push('BRPT blueprint/candidate handbook grounding is missing.');
for(const item of proposal.items){
 if(ids.has(item.id))errors.push('Duplicate proposed item '+item.id);
 ids.add(item.id);
 const oldV2=v2.filter(q=>String(q.id)===item.id),oldV3=v3.questions.filter(q=>String(q.id)===item.id);
 if(oldV2.length!==1||oldV3.length!==1){errors.push('Missing/ambiguous V2 or V3 original '+item.id);continue;}
 const a=oldV2[0],b=oldV3[0];
 for(const key of ['prompt','answer','rationale','taskCode']){
  if(a[key]!==b[key])errors.push('V2 and V3 old '+key+' mismatch: '+item.id);
 }
 if(a.prompt!==item.existingQuestion||a.answer!==item.existingAnswer||a.rationale!==item.originalRationale||a.taskCode!=='D2B')
  errors.push('Staged revision no longer matches original source record: '+item.id);
 if(!a.referenceKeys?.includes('aasm-mslt-mwt'))
  errors.push('Expected legacy umbrella source not found: '+item.id);
 if(!item.proposedReferenceKeyAdditions.includes('aasm-adult-mslt-mwt-2021')||
    !item.proposedReferenceKeyAdditions.includes('fundamentals-sleep-technology-3e')||
    !item.proposedReferenceKeyAdditions.includes('brpt-handbook'))
  errors.push('Exact adult source/BRPT reading evidence missing: '+item.id);
 if(!/PSG|clinical|sleep/.test(item.proposedRationale)||!item.proposedRationale.includes('narcolepsy'))
  errors.push('Proposed rationale does not state diagnostic-context boundary: '+item.id);
 if(item.proposedRationale===a.rationale)errors.push('No actual text improvement: '+item.id);
 const stagedIds=v2.filter(q=>String(q.id).startsWith('SPG-GAP-2026-')||String(q.id).startsWith('SPG-SPRIGGS-2026-'));
 if(stagedIds.length)errors.push('Staged draft IDs entered V2 bank.');
 rows.push({id:item.id,task:'D2B',bothVersionsMatch:true,answerPreserved:true,originalBankUnchanged:true,exactCurrentMsltGuidelineProposed:true,ownerApproved:false});
}
if(proposal.items.length!==2)errors.push('Unexpected correction scope; revision review required before adding items.');
console.log(JSON.stringify({crossVersionRevisionCount:rows.length,v2EffectiveBank:v2.length,v3D2BSource:v3.questions.length,errors,rows},null,2));
if(errors.length)process.exitCode=1;
