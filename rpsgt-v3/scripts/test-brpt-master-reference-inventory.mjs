import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,manifestFileName()),'utf8'));
function manifestFileName(){return 'manifest.json';}
const inventory=JSON.parse(await readFile(join(sourceRoot,manifest.brptMasterReferenceInventoryFile),'utf8'));
const holdings=JSON.parse(await readFile(join(sourceRoot,manifest.libraryHoldingsAuditFile),'utf8'));
const userAccess=JSON.parse(await readFile(join(sourceRoot,manifest.userAccessHoldingsFile),'utf8'));

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
if(!/2nd edition/i.test(pearls.libraryStatus||'')||!/Kindle/i.test(pearls.libraryStatus||'')) throw new Error('Sleep Medicine Pearls 3e access plus provisional 2e holding are not both documented in the master inventory.');
if(pearls.sourceId!=='sleep-medicine-pearls-3e'||!/bibliographic source record registered/i.test(pearls.v3Status||'')||!/content outline.*pending/i.test(pearls.v3Status||'')) throw new Error('Sleep Medicine Pearls 3e bibliographic registration is not clearly separated from pending content mapping.');
const userPearls=(userAccess.userConfirmedAccess||[]).find(item=>item.sourceId==='sleep-medicine-pearls-3e');
if(!userPearls||!/Kindle/i.test(userPearls.platform||'')||userPearls.bibliographicIdentityVerifiedByV3!==true||userPearls.contentVerifiedByV3!==false||userPearls.structuredInV3!==false) throw new Error('User-confirmed Kindle access to Sleep Medicine Pearls 3e is not correctly separated from bibliographic verification and V3 content structuring.');

const pediatricPearls=inventory.brptListedTextbooks.find(item=>item.id==='pediatric-sleep-pearls-1e');
if(!/content-verified/i.test(pediatricPearls.libraryStatus||'')||pediatricPearls.sourceId!=='pediatric-sleep-pearls-1e'||!/structured/i.test(pediatricPearls.v3Status||'')) throw new Error('Pediatric Sleep Pearls verified Drive holding and structured V3 package are not documented.');
const icsd=inventory.primaryManualsAndClassification.find(item=>item.id==='icsd-3-tr');
if(!/older full ICSD-3 copy/i.test(icsd.libraryStatus||'')||!/ICSD-3-TR, 2023/i.test(icsd.currentIdentity||'')) throw new Error('ICSD-3 versus ICSD-3-TR currency boundary is missing.');
if(!/19 exact public-supplement change locators/i.test(icsd.v3Status||'')||!/supplemental PDF page locators explicitly separate from full-book pages/i.test(icsd.nextAction||'')) throw new Error('ICSD-3-TR supplemental locator progress or full-book boundary is stale in the master inventory.');
const rls=inventory.brptListedAasmGuidance.find(item=>item.id==='aasm-rls-plmd-2025');
if(!/2025/.test(rls.verifiedIdentity||'')||!/current/i.test(rls.role||'')) throw new Error('Current 2025 AASM RLS/PLMD guideline identity is not protected.');

const manifestIds=new Set(manifest.sourceFiles.map(file=>file.replace(/\.json$/,'')));
const manifestRepresented=recommended.filter(item=>manifestIds.has(item.sourceId||item.id)||manifestIds.has(item.id)).length;
const contentStructured=recommended.filter(item=>item.id!=='sleep-medicine-pearls-3e'&&(manifestIds.has(item.sourceId||item.id)||manifestIds.has(item.id))).length;
const contentGaps=recommended.length-contentStructured;
if(manifestRepresented!==20) throw new Error(`Expected all 20 BRPT recommended-reading identities to be represented in the manifest, found ${manifestRepresented}.`);
if(contentStructured!==19) throw new Error(`Expected 19 BRPT recommended-reading sources with content-level structuring, found ${contentStructured}.`);
if(contentGaps!==1) throw new Error(`Expected one remaining BRPT content-outline gap, found ${contentGaps}.`);
if(inventory.auditSummary.manifestRepresentedAmongBrptRecommended!==20||inventory.auditSummary.knownCurrentV3StructuredAmongBrptRecommended!==19||inventory.auditSummary.knownPendingOrEditionGapAmongBrptRecommended!==1) throw new Error('Master inventory audit summary does not separate 20-of-20 manifest representation from 19-of-20 content structuring.');

for(const item of inventory.brptListedAasmGuidance){
  if(!item.sourceId||!manifestIds.has(item.sourceId)) throw new Error(`BRPT-listed AASM guidance is not structurally represented in the manifest: ${item.id}`);
}

const holdingById=new Map((holdings.verifiedHoldings||[]).map(item=>[item.sourceId,item]));
for(const sourceId of ['aasm-rls-plmd-2025','aasm-central-hypersomnolence-2021','aasm-osa-longitudinal-testing-2021','aasm-pediatric-respiratory-psg-2011','aasm-pediatric-nonresp-psg-mslt-2012','aasm-pediatric-bedtime-behavior-2006','pediatric-sleep-pearls-1e']){
  const holding=holdingById.get(sourceId);
  if(!holding||holding.identityVerifiedFromContent!==true) throw new Error(`${sourceId} is missing content-verified Guild Drive provenance.`);
  if(!manifestIds.has(sourceId)) throw new Error(`${sourceId} has verified Drive provenance but is not integrated into the V3 source manifest.`);
}

const ppsm=inventory.addedValueHighPriority.find(item=>item.id==='principles-practice-sleep-medicine-7e');
if(!ppsm||ppsm.sourceId!=='principles-practice-sleep-medicine-7e'||!/25 directly verified printed chapter start pages/i.test(ppsm.v3Status||'')) throw new Error('Principles and Practice 7e verified locator progress is stale in the master inventory.');

const osa2009=JSON.parse(await readFile(join(sourceRoot,'aasm-adult-osa-evaluation-management-2009.json'),'utf8'));
if(osa2009.currentAuthority!==false) throw new Error('The 2009 adult OSA guideline must remain explicitly non-current for superseded narrower guidance.');
if(!/2017 adult OSA diagnostic-testing guideline/.test(osa2009.authorityBoundary||'')||!/2021 longitudinal/.test(osa2009.authorityBoundary||'')) throw new Error('Adult OSA 2009 supersession boundaries are incomplete.');
if(!manifestIds.has('aasm-adult-osa-evaluation-management-2009')) throw new Error('Adult OSA 2009 source is not integrated into the source manifest.');

console.log(JSON.stringify({
  officialExamDocuments:inventory.officialExamDocuments.length,
  recommendedUniverse:inventory.auditSummary.brptRecommendedUniverseCountExcludingExamDocuments,
  aasmGuidance:inventory.brptListedAasmGuidance.length,
  textbooks:inventory.brptListedTextbooks.length,
  manifestRepresented,
  contentStructured,
  contentGaps,
  allThirteenBrptAasmFamiliesStructured:true,
  pediatricPackageIntegrated:true,
  driveHoldingsVerified:true,
  sleepMedicinePearls3eUserAccess:true,
  sleepMedicinePearls3eBibliographicRecordRegistered:true,
  sleepMedicinePearls3eOnlyRemainingContentOutlineGap:true,
  principlesPractice7eLocatorProgressRecorded:true,
  icsdSupplementalLocatorProgressRecorded:true,
  adultOsa2009Integrated:true,
  icsdCurrencyBoundary:true,
  rls2025IdentityProtected:true
},null,2));
