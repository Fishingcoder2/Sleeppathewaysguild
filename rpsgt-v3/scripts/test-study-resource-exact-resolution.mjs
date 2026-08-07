import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here=dirname(fileURLToPath(import.meta.url));
const appRoot=resolve(here,'..');
const sourceRoot=join(appRoot,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
if(manifest.sourceKeyAliasFile!=='source-key-aliases.json') throw new Error('Exact source-key alias registry is not registered in the study-source manifest.');
const aliases=JSON.parse(await readFile(join(sourceRoot,manifest.sourceKeyAliasFile),'utf8'));

const sourceIds=new Set();
for(const file of manifest.sourceFiles||[]){
  const source=JSON.parse(await readFile(join(sourceRoot,file),'utf8'));
  if(!source.id) throw new Error(`${file} is missing a source id.`);
  sourceIds.add(source.id);
}
for(const [key,sourceId] of Object.entries(aliases.verifiedAliases||{})){
  if(!sourceIds.has(sourceId)) throw new Error(`Verified exact alias points to an unknown source: ${key} -> ${sourceId}`);
}
for(const key of ['brpt-blueprint','brpt-handbook','brpt-refs']){
  if(!(aliases.contextOnlyKeys||[]).includes(key)) throw new Error(`${key} must remain context-only for learner-facing exact recommendations.`);
}
for(const key of ['aasm-mslt-mwt','aasm-pap-titration','sleep-medicine-essentials-review']){
  if(!Object.prototype.hasOwnProperty.call(aliases.pendingSourceKeys||{},key)) throw new Error(`${key} must remain pending source provenance until exact identity is verified.`);
}
for(const key of ['report-math','pediatric-psg','pap-troubleshooting','patient-safety']){
  if(!Object.prototype.hasOwnProperty.call(aliases.conceptKeys||{},key)) throw new Error(`${key} must be classified as a learning/concept key rather than missing provenance.`);
}
for(const resolvedKey of ['principles-practice-pediatric-sleep','atlas-eeg-sleep']){
  if(Object.prototype.hasOwnProperty.call(aliases.pendingSourceKeys||{},resolvedKey)) throw new Error(`${resolvedKey} should no longer be pending after verified source-package registration.`);
}

const previousFetch=globalThis.fetch;
const previousCatalog=globalThis.RPSGTStudyResourceCatalog;
globalThis.fetch=async input=>{
  const raw=typeof input==='string'?input:String(input&&input.url||'');
  const relative=raw.replace(/^\/+/, '').split('?')[0];
  try{
    const body=await readFile(join(appRoot,relative),'utf8');
    return {ok:true,status:200,json:async()=>JSON.parse(body)};
  }catch(error){
    return {ok:false,status:404,json:async()=>{throw error;}};
  }
};
delete globalThis.RPSGTStudyResourceCatalog;

try{
  const catalogCode=await readFile(join(appRoot,'core','study-resource-catalog.js'),'utf8');
  vm.runInThisContext(catalogCode,{filename:'study-resource-catalog.js'});
  const catalog=globalThis.RPSGTStudyResourceCatalog;
  if(!catalog||typeof catalog.load!=='function'||typeof catalog.resolveQuestion!=='function') throw new Error('Study resource catalog does not expose the exact-resolution API.');
  await catalog.load();

  const scoringQuestion={
    taskCode:'D3A',
    topic:'',
    studyRecommendationKeys:['fundamentals-scoring','brpt-handbook','aasm-scoring-current'],
    referenceKeys:['brpt-blueprint','brpt-refs']
  };
  const scoring=catalog.resolveQuestion(scoringQuestion);
  if(scoring.level!=='exact') throw new Error(`Expected exact scoring resolution, got ${scoring.level}.`);
  if(scoring.sourceIds[0]!=='aasm-scoring-manual-v3') throw new Error('Current AASM scoring authority must rank ahead of textbook support for exact scoring keys.');
  if(!scoring.sourceIds.includes('fundamentals-sleep-technology-3e')) throw new Error('Exact Fundamentals scoring support was not preserved alongside current AASM authority.');
  for(const forbidden of ['brpt-blueprint','brpt-handbook','brpt-refs']){
    if(scoring.sourceIds.includes(forbidden)) throw new Error(`${forbidden} leaked into learner-facing exact recommendations.`);
  }
  if(!scoring.matchedKeys.includes('aasm-scoring-current')||!scoring.matchedKeys.includes('fundamentals-scoring')) throw new Error('Exact matched-key evidence is incomplete.');
  if(JSON.stringify(catalog.titlesForQuestion(scoringQuestion))!==JSON.stringify(scoring.titles)) throw new Error('titlesForQuestion compatibility no longer matches resolveQuestion().');

  const pediatric=catalog.resolveQuestion({taskCode:'D3B',studyRecommendationKeys:['pediatric-sleep-pearls'],referenceKeys:[]});
  if(pediatric.level!=='exact'||pediatric.sourceIds[0]!=='pediatric-sleep-pearls-1e') throw new Error('Pediatric Sleep Pearls exact source key does not resolve to the verified BRPT-listed book.');

  const pediatricPrinciples=catalog.resolveQuestion({taskCode:'D3B',studyRecommendationKeys:['principles-practice-pediatric-sleep'],referenceKeys:[]});
  if(pediatricPrinciples.level!=='exact'||pediatricPrinciples.sourceIds[0]!=='principles-practice-pediatric-sleep-2e') throw new Error('Principles and Practice of Pediatric Sleep Medicine exact source key does not resolve to the verified 2nd-edition source package.');

  const atlas=catalog.resolveQuestion({taskCode:'D3A',studyRecommendationKeys:['atlas-eeg-sleep'],referenceKeys:[]});
  if(atlas.level!=='exact'||atlas.sourceIds[0]!=='atlas-electroencephalography-sleep-medicine-2012') throw new Error('Sleep EEG atlas exact source key does not resolve to the verified 2012 Attarian/Morgan atlas.');
  const atlasSource=JSON.parse(await readFile(join(sourceRoot,'atlas-electroencephalography-sleep-medicine-2012.json'),'utf8'));
  if(atlasSource.currentAuthority!==false||atlasSource.sourceRole!=='studySupport') throw new Error('Sleep EEG atlas must remain supplemental study support.');
  if(!/AASM Scoring Manual Version 3 controls sleep staging/i.test(atlasSource.authorityBoundary||'')) throw new Error('Sleep EEG atlas does not defer current staging/scoring authority to AASM Version 3.');
  if(!Array.isArray(atlasSource.editors)||!atlasSource.editors.includes('Magdy Y. Morgan')||atlasSource.editors.includes('Undevia')) throw new Error('Sleep EEG atlas verified editor metadata is not protected.');

  const childResp=catalog.resolveQuestion({taskCode:'D2B',referenceKeys:['aasm-child-respiratory-psg'],studyRecommendationKeys:[]});
  if(childResp.level!=='exact'||childResp.sourceIds[0]!=='aasm-pediatric-respiratory-psg-2011') throw new Error('Pediatric respiratory PSG exact alias does not resolve to the verified 2011 AASM source.');

  const icsd=catalog.resolveQuestion({taskCode:'D1A',referenceKeys:['icsd'],studyRecommendationKeys:[]});
  if(icsd.level!=='exact'||icsd.sourceIds[0]!=='icsd-3-tr') throw new Error('ICSD exact key does not resolve to the current ICSD-3-TR source record.');

  const topic=catalog.resolveQuestion({taskCode:'D2A',topic:'electrode impedance and amplifier setup',referenceKeys:['unverified-example-key'],studyRecommendationKeys:[]});
  if(topic.level!=='topic') throw new Error(`Expected topic-family fallback for instrumentation metadata, got ${topic.level}.`);
  if(topic.sourceIds[0]!=='aasm-scoring-manual-v3') throw new Error('Topic-family instrumentation fallback should preserve current AASM technical authority first.');
  if(!topic.unresolvedKeys.includes('unverified-example-key')) throw new Error('Unverified exact key was not surfaced for QA during topic fallback.');

  const ambiguous=catalog.resolveQuestion({taskCode:'D4C',topic:'',referenceKeys:['aasm-mslt-mwt'],studyRecommendationKeys:[]});
  if(ambiguous.level!=='task') throw new Error(`Ambiguous exact key should fall through to task-level mapping, got ${ambiguous.level}.`);
  if(!ambiguous.unresolvedKeys.includes('aasm-mslt-mwt')) throw new Error('Ambiguous AASM MSLT/MWT shorthand was not preserved as unresolved source evidence.');
  if(!ambiguous.sourceIds.length) throw new Error('Task fallback returned no verified resources.');

  const concept=catalog.resolveQuestion({taskCode:'D3C',topic:'',referenceKeys:['report-math'],studyRecommendationKeys:[]});
  if(concept.level!=='task') throw new Error(`Concept-only key should fall through to a verified study path, got ${concept.level}.`);
  if(!concept.conceptKeys.includes('report-math')) throw new Error('Report math was not surfaced as a learning/concept key.');
  if(concept.unresolvedKeys.includes('report-math')) throw new Error('Report math was incorrectly counted as unresolved provenance.');

  const contextOnly=catalog.resolveQuestion({taskCode:'D1A',topic:'',referenceKeys:['brpt-blueprint','brpt-refs'],studyRecommendationKeys:['brpt-handbook']});
  if(contextOnly.level!=='task') throw new Error(`BRPT context-only keys must not trigger exact learner recommendations; got ${contextOnly.level}.`);
  for(const forbidden of ['brpt-blueprint','brpt-handbook','brpt-refs']){
    if(contextOnly.sourceIds.includes(forbidden)) throw new Error(`${forbidden} leaked into task fallback recommendations.`);
  }

  console.log(JSON.stringify({
    exactResolution:true,
    currentAuthorityRanksFirst:true,
    contextOnlyKeysSuppressed:true,
    conceptKeysSeparatedFromProvenance:true,
    pediatricSleepPearlsExact:true,
    pediatricPrinciplesExact:true,
    sleepEegAtlasExact:true,
    sleepEegAtlasAuthorityBoundary:true,
    sleepEegAtlasEditorCorrectionProtected:true,
    pediatricRespiratoryAliasExact:true,
    icsdExact:true,
    topicFallback:true,
    taskFallback:true,
    ambiguousKeysNeverGuessed:true,
    unresolvedSourceKeysExposedForQa:true
  },null,2));
}finally{
  if(previousFetch===undefined) delete globalThis.fetch; else globalThis.fetch=previousFetch;
  if(previousCatalog===undefined) delete globalThis.RPSGTStudyResourceCatalog; else globalThis.RPSGTStudyResourceCatalog=previousCatalog;
}
