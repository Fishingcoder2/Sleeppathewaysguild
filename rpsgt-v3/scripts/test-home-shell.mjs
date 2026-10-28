import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const html=await readFile(join(root,'index.html'),'utf8');
const css=await readFile(join(root,'assets','home.css'),'utf8');
const js=await readFile(join(root,'core','home-dashboard.js'),'utf8');
const shell=await readFile(join(root,'core','app-shell.js'),'utf8');
const disclosures=await readFile(join(root,'sources-disclosures.html'),'utf8');
const referenceCss=await readFile(join(root,'assets','reference-center.css'),'utf8');
const referenceJs=await readFile(join(root,'core','reference-center.js'),'utf8');
const guide=await readFile(join(root,'learner-guide.html'),'utf8');

// The simplified dashboard keeps learning destinations prominent and moves guidance to Help.
for(const marker of [
  'data-continue', 'data-home-recommendation', 'data-stat="answered"',
  'data-stat="accuracy"', 'data-stat="missed"', 'data-stat="awards"',
  'front-door-destinations', 'home-destination-grid', 'home-shortcuts',
  'sources-disclosures.html', 'core/home-dashboard.js', 'assets/home.css'
]){
  if(!html.includes(marker)) throw new Error(`RPSGT V3 home is missing ${marker}`);
}
const destinations=Array.from(html.matchAll(/<article\b[^>]*class="[^"]*\bmodule-card\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g),match=>match[1]);
if(destinations.length!==5) throw new Error('Dashboard must expose five focused learning destinations.');
for(const route of ['study.html','practice.html','labs.html','mock.html','reports.html']){
  if(!destinations.some(card=>card.includes(`href="${route}"`))) throw new Error(`Dashboard learning destination is missing ${route}.`);
}
for(const route of ['learner-guide.html','study.html#respiratory-pap-trail','scoring-workstation.html']){
  if(!html.includes(`href="${route}"`)) throw new Error(`Dashboard support route is missing ${route}.`);
}
for(const boundary of ['teaching schematics','not an official BRPT score or prediction','facility policy','supervised clinical competency']){
  if(!guide.includes(boundary)) throw new Error(`Learner Guide is missing ${boundary}.`);
}
if(!html.includes('coach-bob-avatar.jpg')) throw new Error('The RPSGT V3 front door does not use the Coach Bob character asset.');
if(!html.includes('meta name="robots" content="noindex,nofollow"')) throw new Error('Development noindex protection is missing from the RPSGT V3 front door.');
if(!js.includes('normalizeAchievementCopy')||!js.includes('Task badges and domain medals')) throw new Error('Home dashboard does not normalize Guild task-badge and domain-medal terminology.');
if(!js.includes('suppressOptionalBookShelf')||!js.includes("getElementById('rpsgt-book-shelf')")||!js.includes('MutationObserver')) throw new Error('Learner-facing optional book shelf suppression is not protected.');
if(!css.includes('.front-door-destinations')||!css.includes('@media(min-width:821px) and (max-width:1050px)')) throw new Error('Compact tablet/desktop front-door destination layout is missing.');
if(!css.includes('.brpt-hero{grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr);align-items:start;min-height:0')) throw new Error('Home hero is not explicitly content-height and compact.');
new Function(js);

const forbiddenLearnerGovernance=[
  'How answers are governed',
  'No invented provenance',
  'authority-flow',
  'data-reference-authority',
  'audited authority registry',
  'audited authority rules',
  'Precedence:',
  'Authority / currency note:',
  'AI assistance &amp; human review',
  'Data &amp; migration tools',
  'Open private browser export utility',
  'Mapped study directions',
  'Reference Center mapping'
];
for(const phrase of forbiddenLearnerGovernance){
  if(html.includes(phrase)||disclosures.includes(phrase)) throw new Error(`Internal governance language is learner-facing: ${phrase}`);
}
if(/\bmapped resources\b|\bmapped records\b/i.test(html)) throw new Error('Dashboard still exposes mapping implementation language.');

for(const disclosure of [
  'Independence','Educational use','Scores &amp; readiness','Question origin','Copyright',
  'Affiliate disclosure','Privacy &amp; local learner data','External links','Content errors &amp; support'
]){
  if(!disclosures.includes(disclosure)) throw new Error(`References & Disclosures page is missing ${disclosure}`);
}
if(!shell.includes("href='sources-disclosures.html'")) throw new Error('Shared V3 shell does not expose References & Disclosures globally.');

for(const marker of [
  'RPSGT APA-Style Reference Center',
  'data-reference-domain',
  'data-reference-task',
  'data-reference-topic',
  'data-reference-results',
  'assets/reference-center.css',
  'core/reference-center.js',
  'Full Sources &amp; Disclosures'
]){
  if(!disclosures.includes(marker)) throw new Error(`RPSGT Reference Center is missing ${marker}`);
}
if(disclosures.includes('drive.google.com')||disclosures.includes('amazon.com')) throw new Error('Learner-facing Reference Center exposes a private-library or storefront destination.');
if(!referenceCss.includes('.reference-filter-grid')||!referenceCss.includes('@media(max-width:560px)')) throw new Error('Reference Center responsive filter layout is missing.');

for(const internalMarker of [
  'manifest.authorityRegistryFile',
  'authorityRulesBySource',
  'function authorityRank',
  'INTERNAL ONLY',
  'registerTaskPlanMappings',
  'sourceSectionsByTask'
]){
  if(!referenceJs.includes(internalMarker)) throw new Error(`Internal reference-governance protection is missing ${internalMarker}`);
}
for(const learnerSafeMarker of [
  'APA-style reference',
  'Helpful for:',
  'Relevant sections / chapters',
  'Open public source',
  'References ready.'
]){
  if(!referenceJs.includes(learnerSafeMarker)) throw new Error(`Reference Center learner rendering is missing ${learnerSafeMarker}`);
}
for(const forbiddenJsRender of [
  'data-reference-authority',
  'Recorded source citation',
  '<strong>Precedence:</strong>',
  '<strong>Authority / currency note:</strong>',
  'audited authority rules are available for learner lookup',
  'aria-label="Mapped RPSGT tasks"'
]){
  if(referenceJs.includes(forbiddenJsRender)) throw new Error(`Reference Center can still render internal governance language: ${forbiddenJsRender}`);
}
if(/driveUrl|libraryFile/.test(referenceJs)) throw new Error('Reference Center controller references private-library locators.');
if(/RPSGTStorage|localStorage\s*\.\s*(?:setItem|removeItem|clear)\s*\(/.test(referenceJs)) throw new Error('Reference Center controller must remain read-only and storage-independent.');
new Function(referenceJs);

console.log(JSON.stringify({
  focusedLearningDestinations:true,
  compactHero:true,
  primaryDestinationsPromoted:true,
  tabletTwoColumnHero:true,
  learnerGuideBoundaries:true,
  coachBobCharacter:true,
  respiratoryAndWorkstationShortcuts:true,
  sourceGovernanceInternalOnly:true,
  apaStyleReferenceSurface:true,
  referencesSearchByDomainTaskTopic:true,
  disclosuresGlobal:true,
  referenceCenter:true,
  referenceCenterReadOnly:true,
  referenceCenterPrivateLibraryHidden:true,
  guildAchievementTerminology:true,
  optionalBookShelfSuppressed:true,
  developmentNoindex:true
},null,2));