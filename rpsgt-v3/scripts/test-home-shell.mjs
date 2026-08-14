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

if(!html.includes('assets/coach-bob-rpsgt.webp')) throw new Error('The RPSGT V3 front door does not use the local Coach Bob character asset.');
if(!html.includes('meta name="robots" content="noindex,nofollow"')) throw new Error('Development noindex protection is missing from the RPSGT V3 front door.');
if(html.includes('migration-export.html')||html.includes('Data & migration tools')||html.includes('Open private browser export utility')) throw new Error('Developer migration utility is exposed on the learner-facing front door.');
if(!js.includes("data/brpt-official-resources.json")) throw new Error('Home dashboard does not load the verified BRPT resource catalog.');
if(!js.includes("data/question-bank/manifest.json")) throw new Error('Home dashboard does not refresh the deployed question-bank count from the manifest.');
if(!js.includes('promotePrimaryDestinations')||!js.includes("insertAdjacentElement('afterend',destinationSection)")) throw new Error('Primary learning destinations are not promoted directly below the hero.');
if(!js.includes('normalizeAchievementCopy')||!js.includes('Task badges and domain medals')||!js.includes('Sleep Pathways Guild educational achievements')) throw new Error('Home dashboard does not normalize Guild task-badge and domain-medal terminology.');
if(!js.includes('suppressOptionalBookShelf')||!js.includes("getElementById('rpsgt-book-shelf')")||!js.includes('MutationObserver')) throw new Error('Learner-facing optional book shelf suppression is not protected.');
if(!css.includes('.official-resource-grid')||!css.includes('.reasoning-compass')) throw new Error('BRPT resource board or Coach Bob compass styles are missing.');
if(!css.includes('.front-door-destinations')||!css.includes('@media(min-width:821px) and (max-width:1050px)')) throw new Error('Compact tablet/desktop front-door destination layout is missing.');
if(!css.includes('.brpt-hero{grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr);align-items:start;min-height:0')) throw new Error('Home hero is not explicitly content-height and compact.');

const hierarchy=[
  'BRPT official exam information',
  'Current AASM scoring &amp; applicable guidance',
  'Applicable AAST guidance',
  'BRPT-listed textbooks &amp; core references',
  'Supplemental educational resources'
];
let previous=-1;
for(const label of hierarchy){
  const position=html.indexOf(label);
  if(position<0) throw new Error(`Authority hierarchy is missing: ${label}`);
  if(position<=previous) throw new Error(`Authority hierarchy order is incorrect at: ${label}`);
  previous=position;
}
if(html.includes('Official source first, textbook second')) throw new Error('Outdated textbook-before-AAST authority wording remains on the dashboard.');

for(const disclosure of [
  'Independence','Educational use','Scores &amp; readiness','Question origin','Copyright',
  'Affiliate disclosure','Privacy &amp; local learner data','External links','AI assistance &amp; human review','Content errors &amp; support'
]){
  if(!disclosures.includes(disclosure)) throw new Error(`Sources & Disclosures page is missing ${disclosure}`);
}
if(!shell.includes("href='sources-disclosures.html'")) throw new Error('Shared V3 shell does not expose Sources & Disclosures globally.');

for(const marker of [
  'RPSGT APA-Style Reference Center',
  'data-reference-domain',
  'data-reference-task',
  'data-reference-topic',
  'data-reference-authority',
  'data-reference-results',
  'assets/reference-center.css',
  'core/reference-center.js',
  'Full Sources &amp; Disclosures',
  'BRPT · Exam framework',
  '1 · AASM scoring / technical',
  '2 · AASM accreditation / protocol',
  '3 · AASM clinical / protocol / classification',
  '4 · AAST technical / competency / scope',
  '5 · Core references',
  '6 · Supplemental',
  'Local and device-specific overlay',
  'must not invent a universal oxygen titration protocol',
  'OSA PAP/CPAP-BPAP, adult CSA/ASV, and hypoventilation/NIV',
  'AAST Standard PSG is not presented as pediatric PSG authority'
]){
  if(!disclosures.includes(marker)) throw new Error(`RPSGT Reference Center is missing ${marker}`);
}
if(disclosures.includes('drive.google.com')||disclosures.includes('amazon.com')) throw new Error('Learner-facing Reference Center exposes a private-library or storefront destination.');
if(!referenceCss.includes('.reference-filter-grid')||!referenceCss.includes('@media(max-width:560px)')) throw new Error('Reference Center responsive filter layout is missing.');
if(!referenceCss.includes('.reference-authority-note')) throw new Error('Reference Center authority/currency note styling is missing.');
for(const marker of [
  "data/study-sources/manifest.json",
  "data/blueprint.json",
  'manifest.taskPlanFile',
  'manifest.sourceFiles',
  'manifest.authorityRegistryFile',
  'authorityRulesBySource',
  'Promise.allSettled',
  "label:'BRPT exam framework'",
  "1:'AASM scoring / technical'",
  "2:'AASM accreditation / protocol'",
  "3:'AASM clinical / protocol'",
  "4:'AAST technical / competency'",
  "label:'Core reference'",
  "label:'Supplemental'",
  "label:'APA citation'",
  "label:'Recorded source citation'",
  'source.authorityBoundary',
  'Precedence:',
  'Authority / currency note:',
  'audited authority rules are available for learner lookup'
]){
  if(!referenceJs.includes(marker)) throw new Error(`Reference Center controller is missing ${marker}`);
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
  authorityHierarchy:hierarchy.length,
  auditedReferenceAuthorityLevels:6,
  brptExamFrameworkSeparate:true,
  localDeviceOverlayProtected:true,
  oxygenUniversalProtocolBlocked:true,
  papPathwaysSeparated:true,
  pediatricStandardPsgExclusion:true,
  disclosuresGlobal:true,
  referenceCenter:true,
  referenceCenterReadOnly:true,
  referenceCenterPrivateLibraryHidden:true,
  referenceAuthorityNotes:true,
  guildAchievementTerminology:true,
  optionalBookShelfSuppressed:true,
  developmentNoindex:true
},null,2));