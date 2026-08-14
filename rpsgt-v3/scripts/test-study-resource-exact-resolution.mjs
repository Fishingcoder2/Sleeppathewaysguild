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
for(const [key,sourceId] of Object.entries(aliases.verifiedAliases||{})) if(!sourceIds.has(sourceId)) throw new Error(`Verified exact alias points to an unknown source: ${key} -> ${sourceId}`);
for(const key of ['brpt-blueprint','brpt-handbook','brpt-refs']) if(!(aliases.contextOnlyKeys||[]).includes(key)) throw new Error(`${key} must remain context-only for learner-facing exact recommendations.`);
if(Object.keys(aliases.pendingSourceKeys||{}).length!==0) throw new Error('There should be no unresolved source identities after the current source-key audit.');
for(const key of ['aasm-mslt-mwt','aasm-pap-titration']) if(!Object.prototype.hasOwnProperty.call(aliases.legacyUmbrellaKeys||{},key)) throw new Error(`${key} must be preserved as a legacy umbrella key rather than guessed into one exact source.`);
for(const key of ['report-math','pediatric-psg','pap-troubleshooting','patient-safety','aast-abg','aast-safety-infection']) if(!Object.prototype.hasOwnProperty.call(aliases.conceptKeys||{},key)) throw new Error(`${key} must be classified as a learning/concept key rather than missing provenance.`);
for(const resolvedKey of ['principles-practice-pediatric-sleep','atlas-eeg-sleep','sleep-medicine-essentials-review','aap-pediatric-osa']) if(Object.prototype.hasOwnProperty.call(aliases.legacyUmbrellaKeys||{},resolvedKey)||Object.prototype.hasOwnProperty.call(aliases.pendingSourceKeys||{},resolvedKey)) throw new Error(`${resolvedKey} should resolve through a verified source package.`);

const previousFetch=globalThis.fetch;
const previousCatalog=globalThis.RPSGTStudyResourceCatalog;
globalThis.fetch=async input=>{
  const raw=typeof input==='string'?input:String(input&&input.url||'');
  const relative=raw.replace(/^\/+/, '').split('?')[0];
  try{
    const body=await readFile(join(appRoot,relative),'utf8');
    return {ok:true,status:200,json:async()=>JSON.parse(body)};
  }catch(error){return {ok:false,status:404,json:async()=>{throw error;}};}
};
delete globalThis.RPSGTStudyResourceCatalog;

try{
  const catalogCode=await readFile(join(appRoot,'core','study-resource-catalog.js'),'utf8');
  vm.runInThisContext(catalogCode,{filename:'study-resource-catalog.js'});
  const catalog=globalThis.RPSGTStudyResourceCatalog;
  if(!catalog||typeof catalog.load!=='function'||typeof catalog.resolveQuestion!=='function') throw new Error('Study resource catalog does not expose the exact-resolution API.');
  await catalog.load();

  const scoringQuestion={taskCode:'D3A',topic:'',studyRecommendationKeys:['fundamentals-scoring','brpt-handbook','aasm-scoring-current'],referenceKeys:['brpt-blueprint','brpt-refs']};
  const scoring=catalog.resolveQuestion(scoringQuestion);
  if(scoring.level!=='exact'||scoring.sourceIds[0]!=='aasm-scoring-manual-v3'||!scoring.sourceIds.includes('fundamentals-sleep-technology-3e')) throw new Error('Exact scoring resolution/current-authority ordering changed.');
  for(const forbidden of ['brpt-blueprint','brpt-handbook','brpt-refs']) if(scoring.sourceIds.includes(forbidden)) throw new Error(`${forbidden} leaked into learner-facing exact recommendations.`);
  if(JSON.stringify(catalog.titlesForQuestion(scoringQuestion))!==JSON.stringify(scoring.titles)) throw new Error('titlesForQuestion compatibility no longer matches resolveQuestion().');

  const exactCases=[
    ['pediatric-sleep-pearls','D3B','pediatric-sleep-pearls-1e'],
    ['principles-practice-pediatric-sleep','D3B','principles-practice-pediatric-sleep-2e'],
    ['atlas-eeg-sleep','D3A','atlas-electroencephalography-sleep-medicine-2012'],
    ['sleep-medicine-essentials-review','D1A','sleep-medicine-essentials-review-2008'],
    ['aap-pediatric-osa','D3B','aap-childhood-osa-guideline-2012'],
    ['aasm-child-respiratory-psg','D2B','aasm-pediatric-respiratory-psg-2011'],
    ['icsd','D1A','icsd-3-tr']
  ];
  for(const [key,taskCode,expected] of exactCases){
    const result=catalog.resolveQuestion({taskCode,studyRecommendationKeys:[key],referenceKeys:[]});
    if(result.level!=='exact'||result.sourceIds[0]!==expected) throw new Error(`${key} does not resolve exactly to ${expected}.`);
  }

  const atlasSource=JSON.parse(await readFile(join(sourceRoot,'atlas-electroencephalography-sleep-medicine-2012.json'),'utf8'));
  if(atlasSource.currentAuthority!==false||atlasSource.sourceRole!=='studySupport'||!atlasSource.editors.includes('Magdy Y. Morgan')||atlasSource.editors.includes('Undevia')) throw new Error('Sleep EEG atlas authority/editor metadata is not protected.');
  if(!/AASM Scoring Manual Version 3 controls sleep staging/i.test(atlasSource.authorityBoundary||'')) throw new Error('Sleep EEG atlas does not defer staging/scoring authority to AASM Version 3.');

  const essentialsSource=JSON.parse(await readFile(join(sourceRoot,'sleep-medicine-essentials-review-2008.json'),'utf8'));
  if(essentialsSource.currentAuthority!==false||essentialsSource.sourceRole!=='studySupport'||essentialsSource.printIsbn!=='9780195306590'||essentialsSource.publicationYear!==2008) throw new Error('Sleep Medicine: Essentials and Review identity/authority boundary changed.');
  if(!/No exact full Guild Drive copy was located/i.test(essentialsSource.libraryStatus||'')) throw new Error('Sleep Medicine: Essentials and Review must not be represented as a verified local full-text holding.');

  const aapSource=JSON.parse(await readFile(join(sourceRoot,'aap-childhood-osa-guideline-2012.json'),'utf8'));
  if(aapSource.currentAuthority!==false||aapSource.sourceRole!=='legacyGuidance'||aapSource.doi!=='10.1542/peds.2012-1671'||!/uncomplicated childhood OSA in primary care/i.test(aapSource.authorityBoundary||'')) throw new Error('AAP childhood OSA identity/scope boundary changed.');

  const topic=catalog.resolveQuestion({taskCode:'D2A',topic:'electrode impedance and amplifier setup',referenceKeys:['unverified-example-key'],studyRecommendationKeys:[]});
  if(topic.level!=='topic'||topic.sourceIds[0]!=='aasm-scoring-manual-v3'||!topic.unresolvedKeys.includes('unverified-example-key')) throw new Error('Topic-family fallback or unknown-key QA changed.');

  for(const legacyKey of ['aasm-mslt-mwt','aasm-pap-titration']){
    const legacy=catalog.resolveQuestion({taskCode:legacyKey==='aasm-mslt-mwt'?'D2B':'D4A',topic:'',referenceKeys:[legacyKey],studyRecommendationKeys:[]});
    if(legacy.level!=='task') throw new Error(`${legacyKey} should fall through to task-level verified resources when it is the only key.`);
    if(!legacy.legacyKeys.includes(legacyKey)) throw new Error(`${legacyKey} was not surfaced as a legacy umbrella key.`);
    if(legacy.unresolvedKeys.includes(legacyKey)) throw new Error(`${legacyKey} was incorrectly counted as unresolved provenance.`);
  }

  for(const conceptKey of ['report-math','aast-abg','aast-safety-infection']){
    const concept=catalog.resolveQuestion({taskCode:conceptKey==='report-math'?'D3C':'D4C',topic:'',referenceKeys:[conceptKey],studyRecommendationKeys:[]});
    if(concept.level!=='task'||!concept.conceptKeys.includes(conceptKey)||concept.unresolvedKeys.includes(conceptKey)) throw new Error(`${conceptKey} concept handling changed.`);
  }

  const contextOnly=catalog.resolveQuestion({taskCode:'D1A',topic:'',referenceKeys:['brpt-blueprint','brpt-refs'],studyRecommendationKeys:['brpt-handbook']});
  if(contextOnly.level!=='task') throw new Error(`BRPT context-only keys must not trigger exact learner recommendations; got ${contextOnly.level}.`);
  for(const forbidden of ['brpt-blueprint','brpt-handbook','brpt-refs']) if(contextOnly.sourceIds.includes(forbidden)) throw new Error(`${forbidden} leaked into task fallback recommendations.`);

  console.log(JSON.stringify({
    exactResolution:true,
    currentAuthorityRanksFirst:true,
    contextOnlyKeysSuppressed:true,
    conceptKeysSeparatedFromProvenance:true,
    legacyUmbrellaKeysSeparatedFromProvenance:true,
    pendingSourceIdentities:0,
    pediatricSleepPearlsExact:true,
    pediatricPrinciplesExact:true,
    sleepEegAtlasExact:true,
    sleepMedicineEssentialsExact:true,
    aapChildhoodOsaExact:true,
    topicFallback:true,
    taskFallback:true,
    legacyUmbrellaKeysNeverGuessed:true,
    unknownSourceKeysExposedForQa:true
  },null,2));
}finally{
  if(previousFetch===undefined) delete globalThis.fetch; else globalThis.fetch=previousFetch;
  if(previousCatalog===undefined) delete globalThis.RPSGTStudyResourceCatalog; else globalThis.RPSGTStudyResourceCatalog=previousCatalog;
}
