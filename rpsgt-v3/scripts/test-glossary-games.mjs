import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const js=await readFile(join(root,'core','glossary-games.js'),'utf8');
const html=await readFile(join(root,'memory-games.html'),'utf8');
const config=JSON.parse(await readFile(join(root,'data','memory','spg-glossary-config.json'),'utf8'));
const sourceMeta=JSON.parse(await readFile(join(root,'data','study-sources','aast-terms-definitions.json'),'utf8'));
const flashcards=JSON.parse(await readFile(join(root,'data','flashcards-v2-extracted.json'),'utf8'));
const manifest=JSON.parse(await readFile(join(root,'data','terminology','manifest.json'),'utf8'));
const sourcePayloads=await Promise.all(manifest.files.map(async file=>JSON.parse(await readFile(join(root,'data','terminology',file),'utf8'))));
const learnerPayloads=await Promise.all(manifest.learnerFiles.map(async file=>JSON.parse(await readFile(join(root,'data','terminology',file),'utf8'))));

new Function(js);
assert.match(html,/data-glossary-games/);
for(const mode of ['match','forward','reverse','weak']) assert.match(html,new RegExp('data-glossary-mode="'+mode+'"'));
assert.match(html,/core\/glossary-games\.js/);
assert.match(html,/assets\/glossary-games\.css/);
assert.match(html,/Weak Glossary/);
assert.match(html,/AASM Scoring Manual Version 3/);
assert.match(html,/ICSD-3/);
assert.match(html,/AAST Terms and Definitions/);
assert.match(html,/data-glossary-source-summary/);
assert.match(js,/RPSGTV2FlashcardLibrary/);
assert.match(js,/data\/memory\/spg-glossary-config\.json/);
assert.match(js,/data\/terminology\/manifest\.json/);
assert.match(js,/function canonicalTerm/);
assert.match(js,/function mergeTerms/);
assert.match(js,/references/);
assert.match(js,/cardMemory/);
assert.match(js,/function weakness/);
assert.match(js,/recordRecall/);
assert.match(js,/memoryApi\.play/);
assert.match(js,/glossaryAnswered/);
assert.match(js,/glossaryCorrect/);

assert.equal(config.schemaVersion,2);
assert.ok(Array.isArray(config.includeCategories)&&config.includeCategories.length>=12);
assert.ok(config.includeCategories.includes('Core Sleep Terms'));
assert.ok(config.includeCategories.includes('Sleep Disorders & Clinical Terms'));
assert.ok(config.includeCategories.includes('Signals, Filters & Instrumentation'));
assert.ok(!config.includeCategories.includes('Exam Strategy & Question Traps'));
assert.ok(!config.includeCategories.includes('Italian-English Word Bridge'));
assert.ok(!config.includeCategories.includes('Report Math & Indexes'));
assert.equal(config.excludeQuestionFronts,true);
assert.equal(Object.hasOwn(config,'items'),false,'Glossary config must not duplicate a copyrighted terminology list.');
assert.match(config.sourcePolicy,/master terminology authority files/i);
assert.match(config.copyrightBoundary,/not reproduced/i);
assert.equal(config.masterTerminologyManifest,'data/terminology/manifest.json');
assert.equal(sourceMeta.currentAuthority,false);
assert.match(sourceMeta.copyrightUse,/original definitions/i);

assert.equal(manifest.schemaVersion,1);
assert.equal(manifest.auditSummary.aastTerms,225);
assert.equal(manifest.auditSummary.aasmScoringGlossaryTerms,67);
assert.equal(manifest.auditSummary.icsd3GlossaryTerms,54);
assert.equal(manifest.auditSummary.uniqueTermsAcrossThreeInventories,310);
assert.equal(manifest.auditSummary.studyReadyAuthorityAdditions,121);
assert.equal(manifest.files.length,6);
assert.equal(manifest.learnerFiles.length,5);
assert.match(manifest.copyrightBoundary,/do not reproduce/i);

const aast=sourcePayloads.find(payload=>payload.id==='aast-terms-2016');
assert.ok(aast,'AAST terminology inventory is required.');
assert.equal(aast.itemCount,225);
assert.equal(aast.items.length,aast.itemCount);
assert.ok(aast.items.every(item=>item.term&&!Object.hasOwn(item,'definition')),'AAST inventory must contain term metadata only, not published definitions.');
assert.match(aast.copyrightBoundary,/not reproduced/i);

const aasm=learnerPayloads.filter(payload=>payload.id==='aasm-scoring-v3');
const icsd=learnerPayloads.filter(payload=>payload.id==='icsd-3');
assert.equal(aasm.reduce((sum,payload)=>sum+payload.items.length,0),67);
assert.equal(icsd.reduce((sum,payload)=>sum+payload.items.length,0),54);
const learnerItems=learnerPayloads.flatMap(payload=>payload.items||[]);
assert.equal(learnerItems.length,121);
assert.ok(learnerItems.every(item=>item.id&&item.term&&item.definition&&item.category));
assert.ok(learnerItems.every(item=>item.definitionAuthorship==='Original Sleep Pathways Guild summary'));
assert.ok(learnerItems.every(item=>!Object.hasOwn(item,'publishedDefinition')&&!Object.hasOwn(item,'sourceDefinition')));
assert.ok(learnerItems.every(item=>Array.isArray(item.references)&&item.references.length>=1));
const looksApa=value=>/\((?:\d{4}|n\.d\.)\)\./i.test(String(value||''))&&/[.!?]$/.test(String(value||'').trim());
assert.ok(learnerItems.every(item=>item.references.every(looksApa)),'Learner terminology references must be APA-style citations.');

const canonical=value=>String(value||'').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const sourceTerms=[...aast.items.map(item=>item.term),...learnerItems.map(item=>item.term)];
const uniqueSourceTerms=new Set(sourceTerms.map(canonical).filter(Boolean));
assert.equal(uniqueSourceTerms.size,manifest.auditSummary.uniqueTermsAcrossThreeInventories);

const included=new Set(config.includeCategories);
const looksLikeQuestion=front=>/\?$/.test(front)||/^(what|which|how|when|why|who|calculate|select|identify|choose)\b/i.test(front);
const candidates=flashcards.cards.filter(card=>included.has(card.category)).filter(card=>String(card.front||'').trim().length<=config.maxFrontLength).filter(card=>String(card.back||'').trim().length>=config.minimumDefinitionLength).filter(card=>!config.excludeQuestionFronts||!looksLikeQuestion(String(card.front||'').trim()));
assert.ok(candidates.length>=100,'Expected at least 100 terminology candidates from the preserved SPG flashcards.');
for(const card of candidates.slice(0,20)){assert.ok(card.id&&card.front&&card.back);}

console.log('Glossary Games passed syntax, master terminology authority merge, source-boundary, APA reference, bidirectional recall, and Weak Memory contracts with '+aast.items.length+' AAST terms inventoried, '+learnerItems.length+' authority additions, and '+candidates.length+' archived SPG terminology candidates.');
