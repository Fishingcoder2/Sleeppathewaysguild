import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const read=async path=>JSON.parse(await readFile(join(root,path),'utf8'));
const evidence=await read('data/study-sources/question-page-evidence.json');
const schema=await read('data/study-sources/question-page-evidence.schema.json');
const bank=await read('data/question-bank/manifest.json');
const sourceManifest=await read('data/study-sources/manifest.json');
const sources=new Map();
for(const path of sourceManifest.sourceFiles){
  const source=await read('data/study-sources/'+path);
  assert(source.id&&!sources.has(source.id), 'Missing/duplicate study source id: '+path);
  sources.set(source.id,source);
}
assert.equal(evidence.schemaVersion,1);
assert.equal(schema.properties?.links?.items?.$ref,'#/$defs/link');
assert.equal(evidence.bankSnapshot.manifestPath,'data/question-bank/manifest.json');
assert.equal(evidence.bankSnapshot.questionCount,bank.meta.questionCount);
assert.equal(evidence.bankSnapshot.questionBankCanonicalSha256,bank.meta.questionBankCanonicalSha256);
assert(Array.isArray(evidence.links), 'Page evidence links must be an array.');

const questionIds=new Set();
for(const entry of bank.modules){
  const doc=await read('data/question-bank/'+entry.path);
  assert.equal(doc.questions.length,entry.questionCount);
  for(const q of doc.questions){
    assert(q.id&&!questionIds.has(q.id),'Duplicate question id: '+q.id);
    questionIds.add(q.id);
  }
}
assert.equal(questionIds.size,bank.meta.questionCount);

function validateLink(link){
  assert(link&&typeof link==='object'&&typeof link.id==='string'&&link.id.trim(),'Evidence id missing');
  assert(questionIds.has(link.questionId),'No question in this exact bank snapshot: '+link.questionId);
  const source=sources.get(link.sourceId);
  assert(source,'Unknown reference source: '+link.sourceId);
  const identities=[source.edition,source.publicationYear,source.year].filter(x=>x!==undefined).map(String);
  assert(identities.includes(String(link.edition)),'Edition/year does not match source record: '+link.id);
  assert(['reading-navigation','answer-support','rationale-support','current-authority'].includes(link.evidenceRole),'Invalid evidence role: '+link.id);
  const check=link.verification||{};
  assert(['pending','verified','rejected'].includes(check.status),'Invalid verification status: '+link.id);
  if(check.status!=='verified'){
    assert(!link.locator,'Unverified/rejected citation must not display a page or location: '+link.id);
    return;
  }
  assert(check.directSourceChecked===true&&check.exactEditionChecked===true,'Exact edition and original source must be directly inspected: '+link.id);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(check.verifiedAt||'')&&typeof check.reviewer==='string'&&check.reviewer.trim(),'Date and reviewer required: '+link.id);
  assert(typeof check.evidenceNote==='string'&&check.evidenceNote.trim(),'Original non-quoted evidence explanation required: '+link.id);
  const locator=link.locator;
  assert(locator&&['printed-page','pdf-viewer-page','ebook-location','section-heading'].includes(locator.kind),'Explicit locator type required: '+link.id);
  if(['printed-page','pdf-viewer-page'].includes(locator.kind)){
    assert(Number.isInteger(locator.start)&&locator.start>=1,'Page must be a 1-based positive integer: '+link.id);
    assert(locator.end===undefined||(Number.isInteger(locator.end)&&locator.end>=locator.start),'Invalid page range: '+link.id);
  }else{
    assert(typeof locator.start==='string'&&locator.start.trim(),'E-book/section locator must be a text location, not an invented page number: '+link.id);
  }
  if(['answer-support','rationale-support','current-authority'].includes(link.evidenceRole)){
    assert(source.mappingEnabled!==false,'Outline-only edition cannot prove a question: '+link.id);
    assert(check.authorityReview&&check.authorityReview!=='requires-current-rule-review','Rule authority review pending: '+link.id);
  }
  if(link.evidenceRole==='current-authority') assert(source.currentAuthority===true,'Current-authority evidence requires current-authority source: '+link.id);
}

const uniqueIds=new Set();
for(const link of evidence.links){
  assert(!uniqueIds.has(link.id),'Duplicate evidence link id: '+link.id);
  uniqueIds.add(link.id);
  validateLink(link);
}

// Validate the safeguards even before the first human-reviewed citation is entered.
const firstQuestionId=questionIds.values().next().value;
const demo={id:'validation-only',questionId:firstQuestionId,sourceId:'sleep-medicine-pearls-3e',edition:'3rd ed.',evidenceRole:'answer-support',locator:{kind:'printed-page',start:15},verification:{status:'verified',verifiedAt:'2026-11-21',reviewer:'test',directSourceChecked:true,exactEditionChecked:true,evidenceNote:'test',authorityReview:'not-applicable'}};
assert.throws(()=>validateLink(demo),/Outline-only edition/);
assert.throws(()=>validateLink({...demo,verification:{status:'pending'}}),/Unverified\/rejected/);
assert.throws(()=>validateLink({...demo,sourceId:'unknown-source'}),/Unknown reference source/);

console.log(JSON.stringify({
  bankSnapshotCount:questionIds.size,
  registeredSources:sources.size,
  pageEvidenceLinks:evidence.links.length,
  verifiedQuestionEvidence:evidence.links.filter(e=>e.verification.status==='verified'&&e.evidenceRole!=='reading-navigation').length,
  note:'Chapter starting pages and PDF chapter ranges are navigational until individual question answers are directly verified.'
},null,2));