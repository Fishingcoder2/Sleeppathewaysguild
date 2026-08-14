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

new Function(js);
assert.match(html,/data-glossary-games/);
for(const mode of ['match','forward','reverse','weak']) assert.match(html,new RegExp('data-glossary-mode="'+mode+'"'));
assert.match(html,/core\/glossary-games\.js/);
assert.match(html,/assets\/glossary-games\.css/);
assert.match(html,/Weak Glossary/);
assert.match(js,/RPSGTV2FlashcardLibrary/);
assert.match(js,/data\/memory\/spg-glossary-config\.json/);
assert.match(js,/cardMemory/);
assert.match(js,/function weakness/);
assert.match(js,/recordRecall/);
assert.match(js,/memoryApi\.play/);
assert.match(js,/glossaryAnswered/);
assert.match(js,/glossaryCorrect/);

assert.equal(config.schemaVersion,1);
assert.ok(Array.isArray(config.includeCategories)&&config.includeCategories.length>=12);
assert.ok(config.includeCategories.includes('Core Sleep Terms'));
assert.ok(config.includeCategories.includes('Sleep Disorders & Clinical Terms'));
assert.ok(config.includeCategories.includes('Signals, Filters & Instrumentation'));
assert.ok(!config.includeCategories.includes('Exam Strategy & Question Traps'));
assert.ok(!config.includeCategories.includes('Italian-English Word Bridge'));
assert.ok(!config.includeCategories.includes('Report Math & Indexes'));
assert.equal(config.excludeQuestionFronts,true);
assert.equal(Object.hasOwn(config,'items'),false,'Glossary config must not duplicate a copyrighted terminology list.');
assert.match(config.sourcePolicy,/reused from existing Sleep Pathways Guild flashcards/i);
assert.equal(sourceMeta.currentAuthority,false);
assert.match(sourceMeta.copyrightUse,/original definitions/i);

const included=new Set(config.includeCategories);
const looksLikeQuestion=front=>/\?$/.test(front)||/^(what|which|how|when|why|who|calculate|select|identify|choose)\b/i.test(front);
const candidates=flashcards.cards.filter(card=>included.has(card.category)).filter(card=>String(card.front||'').trim().length<=config.maxFrontLength).filter(card=>String(card.back||'').trim().length>=config.minimumDefinitionLength).filter(card=>!config.excludeQuestionFronts||!looksLikeQuestion(String(card.front||'').trim()));
assert.ok(candidates.length>=100,'Expected at least 100 terminology candidates from the preserved SPG flashcards.');
for(const card of candidates.slice(0,20)){assert.ok(card.id&&card.front&&card.back);}

console.log('Glossary Games passed syntax, source-boundary, term inventory, bidirectional recall, and Weak Memory contracts with '+candidates.length+' archived terminology candidates.');
