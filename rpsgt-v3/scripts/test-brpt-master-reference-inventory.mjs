import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
const inventory=JSON.parse(await readFile(join(sourceRoot,manifest.brptMasterReferenceInventoryFile),'utf8'));
const holdings=JSON.parse(await readFile(join(sourceRoot,manifest.libraryHoldingsAuditFile),'utf8'));

if(inventory.officialExamDocuments.length!==2) throw new Error('BRPT master inventory must keep Blueprint and Candidate Handbook as two separate official exam documents.');
if(inventory.primaryManualsAndClassification.length!==2) throw new Error('BRPT master inventory must include the AASM Scoring Manual and ICSD as separate core references.');
if(inventory.brptListedAasmGuidance.length!==13) throw new Error(`Expected 13 BRPT-listed AASM guidance records, found ${inventory.brptListedAasmGuidance.length}.`);
if(inventory.brptListedTextbooks.length!==5) throw new Error(`Expected 5 BRPT-listed textbook records, found ${inventory.brptListedTextbooks.length}.`);
if(inventory.auditSummary.brptRecommendedUniverseCountExcludingExamDocuments!==20) throw new Error('BRPT recommended-reading universe count must remain 20 unless the official BRPT page is re-verified and intentionally updated.');

const all=[...inventory.officialExamDocuments,...inventory.primaryManualsAndClassification,...inventory.brptListedAasmGuidance,...inventory.brptListedTextbooks];
const recommended=[...inventory.primaryManualsAndClassification,...inventory.brptListedAasmGuidance,...inventory.brptListedTextbooks];
const ids=new Set();
for(const item of all){
  if(!item.id||!item.title) throw new Error('Every master-inventory record requires id and title.');
  if(ids.has(item.id)) throw new Error(`Duplicate master-inventory id: ${item.id}`);
  ids.add(item.id);
}

for(const required of ['brpt-blueprint','brpt-handbook','aasm-scoring-manual-v3','icsd-3-tr','fundamentals-sleep-technology-3e','polysomnography-sleep-technologist-2014','pediatric-sleep-pearls-1e','clinical-guide-pediatric-sleep-3e','sleep-medicine-pearls-3e']){
  if(!ids.has(required)) throw new Error(`Core RPSGT reference missing from master inventory: ${required}`);
}

const pearls=inventory.brptListedTextbooks.find(item=>item.id==='sleep-medicine-pearls-3e');
if(!/2nd edition/i.test(pearls.libraryStatus||'')||!/wrong edition/i.test(pearls.editionStatus||'')) throw new Error('Sleep Medicine Pearls edition mismatch is no longer protected.');
const pediatricPearls=inventory.brptListedTextbooks.find(item=>item.id==='pediatric-sleep-pearls-1e');
if(!/not located/i.test(pediatricPearls.libraryStatus||'')) throw new Error('Pediatric Sleep Pearls library gap is no longer explicit.');
const icsd=inventory.primaryManualsAndClassification.find(item=>item.id==='icsd-3-tr');
if(!/older full ICSD-3 copy/i.test(icsd.libraryStatus||'')||!/ICSD-3-TR, 2023/i.test(icsd.currentIdentity||'')) throw new Error('ICSD-3 versus ICSD-3-TR currency boundary is missing.');
const rls=inventory.brptListedAasmGuidance.find(item=>item.id==='aasm-rls-plmd-2025');
if(!/2025/.test(rls.verifiedIdentity||'')||!/current/i.test(rls.role||'')) throw new Error('Current 2025 AASM RLS/PLMD guideline identity is not protected.');

const manifestIds=new Set(manifest.sourceFiles.map(file=>file.replace(/\.json$/,'')));
const structuredCurrent=recommended.filter(item=>manifestIds.has(item.sourceId||item.id)||manifestIds.has(item.id)).length;
const currentGaps=recommended.length-structuredCurrent;
if(structuredCurrent!==15) throw new Error(`Expected 15 currently structured BRPT recommended-reading sources after the adult OSA guideline integration, found ${structuredCurrent}.`);
if(currentGaps!==5) throw new Error(`Expected 5 remaining BRPT source/edition gaps after the adult OSA guideline integration, found ${currentGaps}.`);

const holdingById=new Map((holdings.verifiedHoldings||[]).map(item=>[item.sourceId,item]));
for(const sourceId of ['aasm-rls-plmd-2025','aasm-central-hypersomnolence-2021','aasm-osa-longitudinal-testing-2021']){
  const holding=holdingById.get(sourceId);
  if(!holding||holding.identityVerifiedFromContent!==true) throw new Error(`${sourceId} is missing content-verified Guild Drive provenance.`);
  if(!manifestIds.has(sourceId)) throw new Error(`${sourceId} has verified Drive provenance but is not integrated into the V3 source manifest.`);
}
for(const sourceId of ['aasm-pediatric-respiratory-psg-2011','aasm-pediatric-bedtime-behavior-2006']){
  const holding=holdingById.get(sourceId);
  if(!holding||holding.identityVerifiedFromContent!==true) throw new Error(`${sourceId} local holding is not protected as content-verified.`);
}

const osa2009=JSON.parse(await readFile(join(sourceRoot,'aasm-adult-osa-evaluation-management-2009.json'),'utf8'));
if(osa2009.currentAuthority!==false) throw new Error('The 2009 adult OSA guideline must remain explicitly non-current for superseded narrower guidance.');
if(!/2017 adult OSA diagnostic-testing guideline/.test(osa2009.authorityBoundary||'')||!/2021 longitudinal/.test(osa2009.authorityBoundary||'')) throw new Error('Adult OSA 2009 supersession boundaries are incomplete.');
if(!manifestIds.has('aasm-adult-osa-evaluation-management-2009')) throw new Error('Adult OSA 2009 source is not integrated into the source manifest.');

console.log(JSON.stringify({
  officialExamDocuments:inventory.officialExamDocuments.length,
  recommendedUniverse:inventory.auditSummary.brptRecommendedUniverseCountExcludingExamDocuments,
  aasmGuidance:inventory.brptListedAasmGuidance.length,
  textbooks:inventory.brptListedTextbooks.length,
  originalAuditGapSnapshot:inventory.auditSummary.knownPendingOrEditionGapAmongBrptRecommended,
  structuredCurrent,
  currentGaps,
  driveHoldingsVerified:true,
  adultOsa2009Integrated:true,
  icsdCurrencyBoundary:true,
  sleepMedicinePearlsEditionBoundary:true,
  pediatricSleepPearlsGapProtected:true,
  rls2025IdentityProtected:true
},null,2));
