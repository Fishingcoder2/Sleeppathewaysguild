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

for(const marker of [
  'id="exam-map"',
  'id="official-brpt-resources"',
  'data-brpt-resource-board',
  'data-brpt-verified-date',
  'data-home-question-count',
  'Coach Bob Exam Reasoning Compass',
  'Patient First',
  'Signal Family',
  'Cross-Check',
  'Proof Clue',
  'sources-disclosures.html',
  'core/home-dashboard.js',
  'assets/home.css'
]){
  if(!html.includes(marker)) throw new Error(`RPSGT V3 home is missing ${marker}`);
}

if(!html.includes('coach-bob-avatar.jpg')) throw new Error('The RPSGT V3 front door does not use the Coach Bob character asset.');
if(!html.includes('meta name="robots" content="noindex,nofollow"')) throw new Error('Development noindex protection is missing from the RPSGT V3 front door.');
if(!js.includes("data/brpt-official-resources.json")) throw new Error('Home dashboard does not load the verified BRPT resource catalog.');
if(!js.includes("data/question-bank/manifest.json")) throw new Error('Home dashboard does not refresh the deployed question-bank count from the manifest.');
if(!js.includes('promotePrimaryDestinations')||!js.includes("insertAdjacentElement('afterend',destinationSection)")) throw new Error('Primary learning destinations are not promoted directly below the hero.');
if(!js.includes('normalizeAchievementCopy')||!js.includes('Task badges and domain medals')||!js.includes('Sleep Pathways Guild educational achievements')) throw new Error('Home dashboard does not normalize Guild task-badge and domain-medal terminology.');
if(!js.includes('suppressOptionalBookShelf')||!js.includes("getElementById('rpsgt-book-shelf')")||!js.includes('MutationObserver')) throw new Error('Learner-facing optional book shelf suppression is not protected.');
if(!css.includes('.official-resource-grid')||!css.includes('.reasoning-compass')) throw new Error('BRPT resource board or Coach Bob compass styles are missing.');
if(!css.includes('.front-door-destinations')||!css.includes('@media(min-width:821px) and (max-width:1050px)')) throw new Error('Compact tablet/desktop front-door destination layout is missing.');
if(!css.includes('.brpt-hero{grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr);align-items:start;min-height:0')) throw new Error('Home hero is not explicitly content-height and compact.');

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
  brptFrontDoor:true,
  compactHero:true,
  primaryDestinationsPromoted:true,
  tabletTwoColumnHero:true,
  officialResourceBoard:true,
  coachBobCharacter:true,
  reasoningCompass:true,
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