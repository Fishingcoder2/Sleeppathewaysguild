#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const appPath=join(root,'RPSGTv2.2026.html');
const queuePath=join(root,'rpsgt-v3/data/question-proposals/v2-v3-duplicate-consolidation-queue-2026-10-12.json');
const outDir=join(root,'rpsgt-v3/data/eligibility');
const require=createRequire(import.meta.url);
const readiness=require(join(root,'rpsgt-v3/core/readiness-engine.js'));
const mock=require(join(root,'rpsgt-v3/core/mock-engine.js'));

const queue=JSON.parse(await readFile(queuePath,'utf8'));
const duplicateExclusions=queue.families.flatMap(f=>f.proposedExclusionIds||[]).map(String);
const explicitExclusions=[...new Set(['imp-046',...duplicateExclusions])];
const exclusionSet=new Set(explicitExclusions);

function findFunction(source,name){
  const marker='function '+name+'(';
  const start=source.indexOf(marker);
  if(start<0) throw new Error('Missing V2 function '+name);
  const open=source.indexOf('{',start);
  let depth=0,quote=null,escape=false;
  for(let i=open;i<source.length;i++){
    const ch=source[i];
    if(quote){
      if(escape){escape=false;continue;}
      if(ch==='\\\\'){escape=true;continue;}
      if(ch===quote)quote=null;
      continue;
    }
    if(ch==='"'||ch==="'"||ch==='\`'){quote=ch;continue;}
    if(ch==='{')depth++;
    if(ch==='}'){depth--;if(depth===0)return {start,open,end:i+1,text:source.slice(start,i+1)};}
  }
  throw new Error('Unterminated V2 function '+name);
}
function insertAtFunctionStart(source,name,line){
  const fn=findFunction(source,name);
  if(fn.text.includes(line.trim())) return source;
  return source.slice(0,fn.open+1)+'\n  '+line+'\n'+source.slice(fn.open+1);
}

let html=await readFile(appPath,'utf8');
const registryMarker='const SPG_SESSION_EXCLUDED_IDS_V20261026=';
if(!html.includes(registryMarker)){
  const fn=findFunction(html,'examEligibleQuestions');
  const helper=`const SPG_SESSION_EXCLUDED_IDS_V20261026=new Set(${JSON.stringify(explicitExclusions)});
function spgApplyOwnerEligibilityV20261026(pool){
  return (Array.isArray(pool)?pool:[]).filter(q=>q&&!SPG_SESSION_EXCLUDED_IDS_V20261026.has(String(q.id))&&q.learnerExcluded!==true&&!(q.qa&&q.qa.learnerExcluded===true)&&q.reviewStatus!=='retired'&&q.publicationStatus!=='proposed-not-learner-eligible').map(q=>{
    if((q.manualReviewRecommended===true||(q.qa&&q.qa.manualReviewRecommended===true))&&q.learnerExcluded!==true&&!(q.qa&&q.qa.learnerExcluded===true)&&q.reviewStatus!=='retired'){
      return {...q,manualReviewRecommended:false,qa:{...(q.qa||{}),manualReviewRecommended:false}};
    }
    return q;
  });
}
`;
  html=html.slice(0,fn.start)+helper+html.slice(fn.start);
}
html=insertAtFunctionStart(html,'examEligibleQuestions','pool=spgApplyOwnerEligibilityV20261026(pool);');
html=insertAtFunctionStart(html,'spgMockEligibleQuestionsV1266','pool=spgApplyOwnerEligibilityV20261026(pool);');
const filtered=findFunction(html,'filteredPool').text;
if(/manualReviewRecommended/.test(filtered)) throw new Error('filteredPool contains a direct manual-review exclusion; inspect before release');
if(!/examEligibleQuestions\s*\(/.test(filtered)) throw new Error('filteredPool no longer routes through examEligibleQuestions');

const pkgMatch=html.match(/<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i);
if(!pkgMatch) throw new Error('V2 app-data missing');
const pkg=JSON.parse(pkgMatch[1]);
const questions=pkg.seed.questionBank;
if(questions.length!==3240) throw new Error('Expected 3240 effective V2 questions, got '+questions.length);

function fnText(name){return findFunction(html,name).text;}
const names=[
  'isVisualPlaceholderQuestion','examEligibleQuestions','practiceDifficultyMatches',
  'isHardExamStylePracticeQuestion','isTrickyBestAnswerPracticeQuestion','filteredPool',
  'spgDisplayPromptV1328','spgNormalizeQuestionFamilyV1328','spgDedupeByQuestionFamilyV1328',
  'spgQuestionDifficultyBlobV1266','spgMockDifficultyScoreV1266','spgIsSimpleRecallForMockV1266',
  'spgIsMockStyleCandidateV1266','spgD4TreatmentBoostV1326','spgMockDifficultySortScoreV1326',
  'spgSortMockDifficultyV1266','spgMockEligibleQuestionsV1266'
];
const state={filters:{domain:'All',task:'All',topic:'All',difficulty:'All',mode:'All'},seenIds:[],missedIds:[],flaggedIds:[]};
const context=vm.createContext({
  questions,state,SPG_EXAM_MODE_V1266:{BRPT:'BRPT',STUDY:'STUDY'},shuffle:pool=>[...pool],
  SPG_SESSION_EXCLUDED_IDS_V20261026:exclusionSet,
  spgApplyOwnerEligibilityV20261026:pool=>(Array.isArray(pool)?pool:[]).filter(q=>q&&!exclusionSet.has(String(q.id))&&q.learnerExcluded!==true&&!(q.qa&&q.qa.learnerExcluded===true)&&q.reviewStatus!=='retired'&&q.publicationStatus!=='proposed-not-learner-eligible').map(q=>((q.manualReviewRecommended===true||(q.qa&&q.qa.manualReviewRecommended===true))?{...q,manualReviewRecommended:false,qa:{...(q.qa||{}),manualReviewRecommended:false}}:q))
});
vm.runInContext(names.map(fnText).join('\n'),context);
const practiceIds=new Set(vm.runInContext('filteredPool()',context).map(q=>String(q.id)));
const annotated=questions.map(q=>exclusionSet.has(String(q.id))?{...q,learnerExcluded:true,reviewStatus:'retired',qa:{...(q.qa||{}),learnerExcluded:true}}:q);
const readinessIds=new Set(annotated.filter(readiness.isEligible).map(q=>String(q.id)));
const mockIds=new Set(mock.mockEligiblePool(annotated).map(q=>String(q.id)));
const familyById=new Map();
for(const fam of queue.families)for(const id of fam.ids||[])familyById.set(String(id),fam.familyId);

const rows=questions.map(q=>{
  const id=String(q.id);
  const taskCode=String(q.taskCode||'');
  const sessionExcluded=exclusionSet.has(id)||q.learnerExcluded===true||q.qa?.learnerExcluded===true||q.reviewStatus==='retired'||q.publicationStatus==='proposed-not-learner-eligible';
  const d2=q.domain==='D2'||taskCode.startsWith('D2');
  return {
    id,
    domain:q.domain||null,
    taskCode:taskCode||null,
    manualReviewRecommended:Boolean(q.manualReviewRecommended===true||q.qa?.manualReviewRecommended===true),
    sourceVerificationHold:Boolean(q.ownerRelease?.sourceHold===true||q.ownerRelease?.sourceHoldResolved===false),
    duplicateFamily:familyById.get(id)||null,
    newSessionExcluded:sessionExcluded,
    exclusionReason:exclusionSet.has(id)?(id==='imp-046'?'malformed-item-retirement':'owner-approved-duplicate-consolidation'):sessionExcluded?'existing-explicit-hold':null,
    practiceEligible:practiceIds.has(id),
    readinessEligible:readinessIds.has(id),
    mockCandidate:mockIds.has(id),
    lmsD2SyncRequired:d2,
    lmsD2Disposition:d2?(taskCode==='D2A/D2C'?'manual-task-resolution-required':sessionExcluded?'exclude-from-new-lms-sessions-preserve-history':'sync-current-webapp-eligibility'):null
  };
});
const count=predicate=>rows.filter(predicate).length;
const ledger={
  schemaVersion:1,
  generatedOn:'2026-10-26',
  authority:'Sleep Pathways Guild owner-approved RPSGT V2/V3 eligibility ledger',
  effectiveQuestionCount:rows.length,
  policies:{
    manualReviewRecommended:'Owner-approved legacy review flags do not by themselves block learner use.',
    learnerExcluded:'Explicit learnerExcluded/retired/unpublished records remain blocked.',
    duplicateConsolidation:'Fifteen approved redundant IDs are excluded from new sessions without deleting or renumbering source IDs.',
    malformedRetirement:'imp-046 remains excluded.',
    lmsD2:'Domain 2 LMS synchronization must mirror this ledger. Private LMS storage/authentication is outside the public repository.'
  },
  counts:{
    manualReviewFlagged:count(r=>r.manualReviewRecommended),
    explicitNewSessionExclusions:count(r=>r.newSessionExcluded),
    practiceEligible:count(r=>r.practiceEligible),
    readinessEligible:count(r=>r.readinessEligible),
    mockCandidates:count(r=>r.mockCandidate),
    d2Records:count(r=>r.lmsD2SyncRequired),
    d2EligibleForSync:count(r=>r.lmsD2SyncRequired&&!r.newSessionExcluded&&r.taskCode!=='D2A/D2C'),
    d2ManualTaskResolution:count(r=>r.taskCode==='D2A/D2C')
  },
  rows
};
await mkdir(outDir,{recursive:true});
await writeFile(join(outDir,'rpsgt-eligibility-ledger.json'),JSON.stringify(ledger,null,2)+'\n');
const md=[
  '# RPSGT V2/V3 eligibility ledger',
  '',
  '**Generated:** 2026-10-26',
  '',
  `- Effective questions: **${ledger.counts?rows.length:rows.length}**`,
  `- Manual-review flags retained as provenance: **${ledger.counts.manualReviewFlagged}**`,
  `- Explicit new-session exclusions: **${ledger.counts.explicitNewSessionExclusions}**`,
  `- Practice eligible: **${ledger.counts.practiceEligible}**`,
  `- Readiness eligible: **${ledger.counts.readinessEligible}**`,
  `- Mock candidates before 175-item selection: **${ledger.counts.mockCandidates}**`,
  `- Domain 2 records tracked for private LMS synchronization: **${ledger.counts.d2Records}**`,
  `- Domain 2 direct-task records eligible for LMS sync: **${ledger.counts.d2EligibleForSync}**`,
  `- D2A/D2C records requiring manual task resolution: **${ledger.counts.d2ManualTaskResolution}**`,
  '',
  'The ledger contains IDs and routing/eligibility metadata only. It does not contain private LMS credentials or learner data.',
  ''
].join('\n');
await writeFile(join(outDir,'README.md'),md);
await writeFile(appPath,html,'utf8');
console.log(JSON.stringify({questionCount:rows.length,...ledger.counts,duplicateExclusions:duplicateExclusions.length,explicitExclusions:explicitExclusions.length},null,2));
