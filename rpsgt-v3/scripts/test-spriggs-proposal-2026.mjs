#!/usr/bin/env node
// Draft content gate: only a full owner-reviewed release may enter learner pools.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const path=fileURLToPath(new URL('../data/question-proposals/spriggs-modernized-2026-10-12.json',import.meta.url));
const packageData=JSON.parse(fs.readFileSync(path,'utf8'));
const validTasks=new Set(['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C']);
if(!packageData.status.includes('NOT RELEASED') && !packageData.status.includes('NOT IN LEARNER'))throw Error('Proposal lacks explicit non-release status.');
if(packageData.questionCount!==packageData.questions.length)throw Error('Question count mismatch.');
const ids=new Set(),prompts=new Set();
for(const q of packageData.questions){
 if(ids.has(q.id))throw Error('Duplicate candidate id: '+q.id);
 ids.add(q.id);
 if(!validTasks.has(q.taskCode)||q.domain!==q.taskCode.slice(0,2))throw Error('Invalid task: '+q.id);
 if(!Array.isArray(q.options)||q.options.length!==4||new Set(q.options).size!==4)throw Error('Must have four distinct choices: '+q.id);
 if(q.options.filter(x=>x===q.answer).length!==1)throw Error('Answer not uniquely in options: '+q.id);
 if(!q.rationale||!q.sourceCredit?.spriggs2015Chapter||!q.sourceCredit?.authority?.length)throw Error('Missing evidence context: '+q.id);
 if(!q.qa?.manualReviewRecommended||q.publicationStatus!=='proposed-not-learner-eligible')throw Error('Premature release risk: '+q.id);
 if(!Array.isArray(q.referenceKeys)||q.referenceKeys.length<2)throw Error('Insufficient references: '+q.id);
 const normalized=q.prompt.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 if(prompts.has(normalized))throw Error('Exact duplicate candidate prompt: '+q.id);
 prompts.add(normalized);
}
// Record-identity, source-locator and publication-gate contract.
const retained=new Set([
 'SPG-SPRIGGS-2026-003','SPG-SPRIGGS-2026-005','SPG-SPRIGGS-2026-006','SPG-SPRIGGS-2026-008','SPG-SPRIGGS-2026-009'
]);
if(packageData.questionCount!==5||packageData.questions.some(q=>!retained.has(q.id)))throw Error('Unexpected staged candidate count/IDs; require editorial reconfirmation.');
if(packageData.editorialReview?.manualApproval!=='OWNER_RPSGT_APPROVED_2026-10-13'||packageData.editorialReview?.releaseApproval!=='NOT GRANTED')throw Error('Owner clinical review must be approved but learner publication held.');
const mapped2015={
 '003':{chapter:6,title:'Patient Hookup Procedures',pages:'65–81'},
 '005':{chapter:11,title:'Performing Other Types of Sleep Studies',pages:'153–156'},
 '006':{chapter:11,title:'Performing Other Types of Sleep Studies',pages:'153–156'},
 '008':{chapter:16,title:'Pediatric Sleep Medicine',pages:'234–237'},
 '009':{chapter:15,title:'Scoring and Reporting',pages:'225–233'}
};
for(const q of packageData.questions){
 const short=String(q.id).slice(-3), expected=mapped2015[short], book=q.sourceCredit?.chapter2015;
 if(!book||book.chapterNumber!==expected.chapter||book.title!==expected.title||book.printedPageRange!==expected.pages)throw Error('Incorrect indexed Spriggs chapter/range: '+q.id);
 if(!book.evidenceBoundary?.includes('Chapter-level map ONLY'))throw Error('Source provenance level overstated: '+q.id);
 if(q.editorialChecks?.needsIndependentClinicalReview!==false||q.editorialChecks?.ownerClinicalReviewApproved!==true||q.editorialDisposition!=='hold-for-source-duplicates-and-history-release-qa')throw Error('Owner clinical signoff or technical gate invalid: '+q.id);
}
const adult=packageData.questions.find(q=>q.id.endsWith('006'));
const child=packageData.questions.find(q=>q.id.endsWith('005'));
const pediatricResp=packageData.questions.find(q=>q.id.endsWith('008'));
if(!adult.referenceKeys.includes('aasm-adult-mslt-mwt-2021')||!child.referenceKeys.includes('aasm-pediatric-mslt-mwt-2024'))throw Error('Adult and pediatric MSLT source identities must not be mixed.');
if(!pediatricResp.editorialChecks?.needsCurrentManualLicensedRuleReview)throw Error('Pediatric scoring item missing licensed scoring-rule review gate.');
if(!packageData.provenanceIdentityPolicy?.idRenumberingOccurredInFirstPilot)throw Error('Historic draft ID renumbering must be disclosed.');

console.log('Validated '+packageData.questionCount+' owner-RPSGT-clinically-approved, UNPUBLISHED Spriggs candidates. A second clinician is not required; scoring/manual, semantic-family and learner-history release checks remain.');
