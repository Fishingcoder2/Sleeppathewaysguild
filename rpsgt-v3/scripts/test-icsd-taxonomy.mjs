import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
if(manifest.diagnosticTaxonomyFile!=='icsd-diagnostic-taxonomy.json') throw new Error('ICSD diagnostic taxonomy is not registered in the source manifest.');
const taxonomy=JSON.parse(await readFile(join(sourceRoot,manifest.diagnosticTaxonomyFile),'utf8'));

if(taxonomy.meta?.sourceId!=='icsd-3-tr') throw new Error('ICSD taxonomy is not anchored to the ICSD-3-TR source record.');
if(taxonomy.meta?.primaryBrptTask!=='D1A') throw new Error('ICSD taxonomy primary BRPT mapping must remain D1A until secondary task mappings receive SME review.');
if(taxonomy.meta?.secondaryTaskMappingStatus!=='needs SME review before learner-facing use') throw new Error('ICSD secondary task mapping gate is missing.');
if(!/Do not store or display complete diagnostic criteria/i.test(taxonomy.meta?.copyrightBoundary||'')) throw new Error('ICSD taxonomy copyright boundary is missing.');
if(!/AASM Scoring Manual controls PSG event scoring/i.test(taxonomy.meta?.authorityBoundary||'')) throw new Error('ICSD taxonomy scoring-authority boundary is missing.');

const expectedCategories=[
  'Insomnia Disorders',
  'Sleep-Related Breathing Disorders',
  'Central Disorders of Hypersomnolence',
  'Circadian Rhythm Sleep-Wake Disorders',
  'Parasomnias',
  'Sleep-Related Movement Disorders'
];
const actual=(taxonomy.categories||[]).map(category=>category.label);
if(JSON.stringify(actual)!==JSON.stringify(expectedCategories)) throw new Error(`ICSD category structure changed unexpectedly: ${actual.join(' | ')}`);

const requiredChangeTopics=[
  'Chronic Insomnia Disorder',
  'Obstructive Sleep Apnea (Adult)',
  'Obstructive Sleep Apnea (Pediatric)',
  'Treatment-Emergent Central Sleep Apnea',
  'Sleep-Related Hypoxemia Disorder',
  'Narcolepsy Type 1',
  'Idiopathic Hypersomnia',
  'Circadian Rhythm Sleep-Wake Disorders documentation',
  'Sleep-Related Urologic Dysfunction',
  'Sleep-Related Bruxism'
];
const changeTopics=(taxonomy.categories||[]).flatMap(category=>(category.changeWatch||[]).map(change=>change.topic));
for(const topic of requiredChangeTopics){if(!changeTopics.includes(topic)) throw new Error(`ICSD change-watch taxonomy is missing ${topic}.`);}

for(const category of taxonomy.categories||[]){
  if(!Array.isArray(category.studyTargets)||category.studyTargets.length<2) throw new Error(`${category.label} needs original SPG study targets.`);
  for(const change of category.changeWatch||[]){
    if(change.reviewLegacyContent!==true) throw new Error(`${change.topic} is not protected by legacy-content review.`);
    if(!/ICSD-3-TR/i.test(change.locator||'')) throw new Error(`${change.topic} lacks an ICSD-3-TR locator.`);
  }
}

for(const rule of [
  'older textbook classification label',
  'Do not use ICSD-3-TR to override the current AASM Scoring Manual',
  'must not reproduce proprietary criteria verbatim'
]){
  if(!(taxonomy.reviewRules||[]).some(item=>item.includes(rule))) throw new Error(`ICSD taxonomy review rule missing: ${rule}`);
}

console.log(JSON.stringify({
  diagnosticTaxonomy:true,
  sourceId:taxonomy.meta.sourceId,
  categoryCount:actual.length,
  changeWatchCount:changeTopics.length,
  primaryBrptTask:taxonomy.meta.primaryBrptTask,
  secondaryTaskMappingGated:true,
  copyrightBoundaryProtected:true,
  scoringAuthorityBoundaryProtected:true
},null,2));
