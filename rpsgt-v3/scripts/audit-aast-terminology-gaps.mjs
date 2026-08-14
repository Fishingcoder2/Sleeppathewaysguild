import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const readJson=async (...parts)=>JSON.parse(await readFile(join(root,...parts),'utf8'));
const canonical=value=>String(value||'')
  .toLowerCase()
  .replace(/rem-without\s+atonia/g,'rem sleep without atonia')
  .replace(/\([^)]*\)/g,' ')
  .replace(/[^a-z0-9]+/g,' ')
  .trim()
  .replace(/\s+/g,' ');

const manifest=await readJson('data','terminology','manifest.json');
const aast=await readJson('data','terminology','aast-terms-2016.json');
const config=await readJson('data','memory','spg-glossary-config.json');
const flashcards=await readJson('data','flashcards-v2-extracted.json');
const learnerPayloads=await Promise.all(manifest.learnerFiles.map(file=>readJson('data','terminology',file)));
const supplements=learnerPayloads.filter(payload=>/^aast-.+supplement/i.test(String(payload.id||'')));

const included=new Set(config.includeCategories||[]);
const looksLikeQuestion=front=>/\?$/.test(front)||/^(what|which|how|when|why|who|calculate|select|identify|choose)\b/i.test(front);
const legacyTerms=(flashcards.cards||[])
  .filter(card=>included.has(card.category))
  .filter(card=>String(card.front||'').trim().length<=Number(config.maxFrontLength||90))
  .filter(card=>String(card.back||'').trim().length>=Number(config.minimumDefinitionLength||12))
  .filter(card=>!config.excludeQuestionFronts||!looksLikeQuestion(String(card.front||'').trim()))
  .map(card=>String(card.front||'').trim());

const learnerTerms=learnerPayloads.flatMap(payload=>(payload.items||[]).map(item=>String(item.term||'').trim()));
const legacySet=new Set(legacyTerms.map(canonical).filter(Boolean));
const learnerSet=new Set(learnerTerms.map(canonical).filter(Boolean));
const aastRows=(aast.items||[]).map(item=>({term:item.term,key:canonical(item.term)})).filter(row=>row.key);
const coveredByLegacy=aastRows.filter(row=>legacySet.has(row.key));
const coveredByLearner=aastRows.filter(row=>learnerSet.has(row.key));
const coveredUnion=aastRows.filter(row=>legacySet.has(row.key)||learnerSet.has(row.key));
const uncovered=aastRows.filter(row=>!legacySet.has(row.key)&&!learnerSet.has(row.key));

assert.equal(aastRows.length,manifest.auditSummary.aastTerms);
assert.ok(supplements.length>=2,'Expected both AAST terminology gap-repair supplements.');
const supplementItems=supplements.flatMap(payload=>payload.items||[]);
assert.equal(supplementItems.length,Number(manifest.auditSummary.aastTechnicalSupplementTerms||0)+Number(manifest.auditSummary.aastCorePsgSupplementTerms||0));
assert.ok(supplementItems.length>=60,'Expected substantial AAST terminology gap-repair coverage across the first two batches.');
const aastSet=new Set(aastRows.map(row=>row.key));
for(const item of supplementItems){
  assert.ok(item.id&&item.term&&item.definition&&item.category&&item.memoryClue,'Every AAST supplement item needs learner-ready fields.');
  assert.ok(aastSet.has(canonical(item.term)),`Supplement term must originate in the AAST term inventory: ${item.term}`);
  assert.ok(String(item.definition).length>=25,`Definition is too short for ${item.term}`);
  assert.equal(item.definitionAuthorship,'Original Sleep Pathways Guild summary',`Definition authorship is required for ${item.term}`);
  assert.ok(!Object.hasOwn(item,'publishedDefinition')&&!Object.hasOwn(item,'sourceDefinition'),'Published source definitions must not be stored in learner data.');
}
for(const supplement of supplements) assert.match(supplement.copyrightBoundary,/original Sleep Pathways Guild/i);
assert.ok(coveredUnion.length>coveredByLegacy.length,'Authority learner files should close terminology gaps beyond legacy flashcards.');
assert.ok(uncovered.length<aastRows.length,'Gap audit should identify at least some AAST coverage.');

console.log(`AAST terminology gap audit: ${aastRows.length} source terms; ${coveredByLegacy.length} covered by legacy glossary candidates; ${coveredByLearner.length} covered by authority learner files; ${coveredUnion.length} covered by either route; ${uncovered.length} still unmatched.`);
for(const supplement of supplements){
  console.log(`${supplement.title}: ${(supplement.items||[]).length} original SPG learner definitions.`);
}
if(uncovered.length){
  console.log('Next unmatched AAST terms (first 30): '+uncovered.slice(0,30).map(row=>row.term).join(' | '));
}
