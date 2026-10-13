#!/usr/bin/env node
// Draft only: enforce Guild indexed BRPT library + candidate handbook + task scope as input requirements.
// Deliberately does NOT treat chapter-level mapping as proof of clinical answer accuracy or publisher endorsement.
import {readFile} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const sourceBase='rpsgt-v3/data/study-sources/';
const registry=await read(sourceBase+'manifest.json');
const records=new Map();
for(const p of registry.sourceFiles){
 const src=await read(sourceBase+p);
 records.set(src.id,src);
}
const recommendedBooks=new Set([
 'fundamentals-sleep-technology-3e',
 'polysomnography-sleep-technologist-2014',
 'pediatric-sleep-pearls-1e',
 'clinical-guide-pediatric-sleep-3e',
 'sleep-medicine-pearls-3e'
]);
const proposals=[
 'rpsgt-v3/data/question-proposals/spriggs-modernized-2026-10-12.json',
 'rpsgt-v3/data/question-proposals/spriggs-gap-pilot-2026-10-12.json'
];
const errors=[],rows=[],seen=new Set();
for(const p of proposals){
 const draft=await read(p);
 const policy=draft.sourcePriorityPolicy;
 if(policy?.examScope!=='brpt-blueprint'||policy?.examFormatAndPolicies!=='brpt-handbook'||policy?.recommendedReadings!=='brpt-refs'||policy?.recommendedBookFirst!==true)
  errors.push('Library-first policy missing on '+p);
 for(const q of draft.questions){
  const evidence=q.libraryEvidence;
  if(seen.has(q.id))errors.push('Duplicate staged draft ID: '+q.id);
  seen.add(q.id);
  if(!evidence||!q.qa?.manualReviewRecommended||q.publicationStatus!=='proposed-not-learner-eligible') {
   errors.push('Missing held status / library evidence: '+q.id);
   continue;
  }
  const brpt=evidence.brptBlueprint,handbook=evidence.brptCandidateHandbook,brptList=evidence.brptRecommendedReadingIndex;
  const expectedTask='brpt-'+q.taskCode;
  if(brpt?.sourceId!=='brpt-blueprint'||brpt?.sectionId!==expectedTask||!records.get('brpt-blueprint')?.sections?.some(s=>s.id===expectedTask))
    errors.push('Invalid blueprint domain/task anchor: '+q.id);
  if(handbook?.sourceId!=='brpt-handbook'||!records.get('brpt-handbook')?.sections?.some(s=>s.id===handbook.sectionId))
    errors.push('Missing candidate handbook source: '+q.id);
  if(brptList?.sourceId!=='brpt-refs'||brptList?.sectionId!=='brpt-refs-textbooks')
    errors.push('Missing BRPT recommended book-list anchor: '+q.id);
  if(!Array.isArray(evidence.brptRecommendedBooks)||evidence.brptRecommendedBooks.length===0)
    errors.push('No Guild-indexed BRPT recommended reading: '+q.id);
  const mapped=(evidence.brptRecommendedBooks||[]).filter(item=>{
   const src=records.get(item.sourceId);
   const section=src?.sections?.find(s=>s.id===item.sectionId);
   if(!src||!section||!recommendedBooks.has(item.sourceId)||item.chapterOrSection!==section.label)
    errors.push('Unrecognized/mismatched recommended-book section: '+q.id+' '+item.sourceId+'/'+item.sectionId);
   if(item.evidenceLevel!=='indexed-chapter-or-section-only'||item.answerClaimTextVerified!==false)
    errors.push('Overstated source-verification level: '+q.id+' '+item.sourceId);
   if(item.apa7!==src?.apaCitation)errors.push('APA citation not canonical registry citation: '+q.id+' '+item.sourceId);
   if(!q.referenceKeys.includes(item.sourceId)||!q.studyRecommendationKeys.includes(item.sourceId))
    errors.push('Recommended reading omitted from source keys: '+q.id+' '+item.sourceId);
   return Boolean(section?.taskCodes?.includes(q.taskCode));
  });
  if(mapped.length===0)errors.push('No listed textbook section maps to blueprint task '+q.taskCode+' for '+q.id);
  if(!q.referenceKeys.includes('brpt-blueprint')||!q.referenceKeys.includes('brpt-handbook')||!q.referenceKeys.includes('brpt-refs'))
    errors.push('Required exam-scoping sources not in question metadata: '+q.id);
  if(!evidence.evidenceBoundary?.includes('Do not claim statement-level'))errors.push('No chapter-vs-passage evidence warning: '+q.id);
  // For the two gap pilots we have now inspected the original Guild-owned book pages.
  // Preserve the limited scope of that review and the current-treatment override.
  if(q.id.startsWith('SPG-GAP-2026-')){
    const p=evidence.directBookPassageReview;
    const exp=q.id.endsWith('001')?{chapter:19,page:14,volume:'Fundamentalssleep(2).PDF'}:{chapter:44,page:185,volume:'Fundamentalssleep(3).PDF'};
    if(!p||!p.chapter?.startsWith(String(exp.chapter)+' ')||p.localPdfPage!==exp.page||p.localVolume!==exp.volume||
       p.sourceId!=='fundamentals-sleep-technology-3e'||!p.verificationLevel?.includes('direct PDF page checked')||
       !p.passageDoesNotEstablish?.includes('technologist')) {
      errors.push('Missing direct book-passage review or current-authority boundary: '+q.id);
    }
    if(q.id.endsWith('001')&&!p?.criticalSupersession?.includes('first-line'))
      errors.push('Missing historical dopamine-agonist first-line treatment warning for '+q.id);
  }
  rows.push({id:q.id,task:q.taskCode,bookSections:evidence.brptRecommendedBooks.map(x=>x.sourceId+'#'+x.sectionId),
    mappedTaskSections:mapped.length,held:true,sourceCheck:evidence.directBookPassageReview?
      'Specified Guild textbook passage checked; current clinical rule and editorial approval still required':
      'Indexed chapter only; direct passage and independent content validation still required'});
 }
}
if(rows.length!==7)errors.push('Expected seven staged candidates, received '+rows.length);
console.log(JSON.stringify({checked:rows.length,errors,rows},null,2));
if(errors.length)process.exitCode=1;
