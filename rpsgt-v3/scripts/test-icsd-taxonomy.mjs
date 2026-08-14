import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
if(manifest.diagnosticTaxonomyFile!=='icsd-diagnostic-taxonomy.json') throw new Error('ICSD diagnostic taxonomy is not registered in the source manifest.');
const taxonomy=JSON.parse(await readFile(join(sourceRoot,manifest.diagnosticTaxonomyFile),'utf8'));
const icsd=JSON.parse(await readFile(join(sourceRoot,'icsd-3-tr.json'),'utf8'));

if(taxonomy.meta?.sourceId!=='icsd-3-tr') throw new Error('ICSD taxonomy is not anchored to the ICSD-3-TR source record.');
if(taxonomy.meta?.primaryBrptTask!=='D1A') throw new Error('ICSD taxonomy primary BRPT mapping must remain D1A until secondary task mappings receive SME review.');
if(taxonomy.meta?.secondaryTaskMappingStatus!=='needs SME review before learner-facing use') throw new Error('ICSD secondary task mapping gate is missing.');
if(!/Do not store or display complete diagnostic criteria/i.test(taxonomy.meta?.copyrightBoundary||'')) throw new Error('ICSD taxonomy copyright boundary is missing.');
if(!/AASM Scoring Manual controls PSG event scoring/i.test(taxonomy.meta?.authorityBoundary||'')) throw new Error('ICSD taxonomy scoring-authority boundary is missing.');
if(!/not full-book ICSD-3-TR page numbers/i.test(taxonomy.meta?.locatorBoundary||'')) throw new Error('ICSD supplemental-versus-full-book locator boundary is missing.');

if(icsd.currentAuthority!==true||icsd.sourceRole!=='currentAuthority'||icsd.publicationYear!==2023) throw new Error('ICSD-3-TR source identity/current-authority status changed.');
if(icsd.libraryAvailability?.currentFullTextVerifiedInLibrary!==false) throw new Error('ICSD-3-TR full licensed text must remain unverified until an exact current copy is actually located.');
if(icsd.libraryAvailability?.currentSupplementalMaterialPageCount!==8||icsd.libraryAvailability?.currentSupplementalMaterialIdentityVerified!==true) throw new Error('ICSD-3-TR 8-page supplemental material identity is not protected.');
if(!/no separate full licensed ICSD-3-TR text was verified/i.test(icsd.libraryAvailability?.fullTextSearchStatus||'')) throw new Error('ICSD-3-TR Drive search/full-text gap status is missing.');
if(!/not page numbers from the full licensed ICSD-3-TR book/i.test(icsd.supplementalLocatorPolicy||'')) throw new Error('ICSD supplemental locator policy could be mistaken for full-book page mapping.');

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

const expectedPages=new Map([
  ['Chronic Insomnia Disorder',2],
  ['Short-Term Insomnia Disorder',2],
  ['Obstructive Sleep Apnea (Adult)',2],
  ['Obstructive Sleep Apnea (Pediatric)',3],
  ['Central Sleep Apnea Disorders',3],
  ['Central Sleep Apnea Due to High-Altitude Periodic Breathing',4],
  ['Primary Central Sleep Apnea of Infancy',4],
  ['Primary Central Sleep Apnea of Prematurity',4],
  ['Treatment-Emergent Central Sleep Apnea',5],
  ['Congenital Central Alveolar Hypoventilation Syndrome',5],
  ['Sleep-Related Hypoxemia Disorder',5],
  ['Narcolepsy Type 1',6],
  ['Idiopathic Hypersomnia',6],
  ['Kleine-Levin Syndrome',6],
  ['Hypersomnia Associated with a Medical Disorder',7],
  ['Circadian Rhythm Sleep-Wake Disorders documentation',7],
  ['Sleep-Related Urologic Dysfunction',7],
  ['Nocturnal Muscle Cramps',8],
  ['Sleep-Related Bruxism',8]
]);

const changes=(taxonomy.categories||[]).flatMap(category=>category.changeWatch||[]);
if(changes.length!==expectedPages.size) throw new Error(`Expected ${expectedPages.size} ICSD change-watch topics, found ${changes.length}.`);
for(const [topic,page] of expectedPages){
  const change=changes.find(item=>item.topic===topic);
  if(!change) throw new Error(`ICSD change-watch taxonomy is missing ${topic}.`);
  if(change.reviewLegacyContent!==true) throw new Error(`${topic} is not protected by legacy-content review.`);
  if(change.supplementalPdfPage!==page) throw new Error(`${topic} supplemental page changed: expected ${page}, got ${change.supplementalPdfPage}.`);
  if(!new RegExp(`ICSD-3-TR supplemental PDF p\\. ${page}`).test(change.locator||'')) throw new Error(`${topic} lacks its exact supplemental PDF page locator.`);
}

const sourceLocators=icsd.supplementalChangeLocators||[];
if(sourceLocators.length!==expectedPages.size) throw new Error(`ICSD source record must preserve all ${expectedPages.size} exact supplemental change locators.`);
for(const [topic,page] of expectedPages){
  const locator=sourceLocators.find(item=>item.topic===topic);
  if(!locator||locator.pdfPage!==page) throw new Error(`ICSD source record locator mismatch for ${topic}.`);
}

for(const category of taxonomy.categories||[]){
  if(!Array.isArray(category.studyTargets)||category.studyTargets.length<2) throw new Error(`${category.label} needs original SPG study targets.`);
}

for(const rule of [
  'older textbook classification label',
  'Do not use ICSD-3-TR to override the current AASM Scoring Manual',
  'exact supplemental PDF-page locators',
  'must not reproduce proprietary criteria verbatim'
]){
  if(!(taxonomy.reviewRules||[]).some(item=>item.includes(rule))) throw new Error(`ICSD taxonomy review rule missing: ${rule}`);
}

console.log(JSON.stringify({
  diagnosticTaxonomy:true,
  sourceId:taxonomy.meta.sourceId,
  categoryCount:actual.length,
  changeWatchCount:changes.length,
  supplementalExactPageLocators:sourceLocators.length,
  supplementalPageRange:[Math.min(...sourceLocators.map(item=>item.pdfPage)),Math.max(...sourceLocators.map(item=>item.pdfPage))],
  primaryBrptTask:taxonomy.meta.primaryBrptTask,
  secondaryTaskMappingGated:true,
  copyrightBoundaryProtected:true,
  scoringAuthorityBoundaryProtected:true,
  fullBookExactPageGapStillOpen:true
},null,2));
