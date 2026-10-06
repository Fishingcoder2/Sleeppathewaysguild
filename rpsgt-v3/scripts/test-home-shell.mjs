import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const html=await readFile(join(root,'index.html'),'utf8');
const css=await readFile(join(root,'assets','home.css'),'utf8');
const js=await readFile(join(root,'core','home-dashboard.js'),'utf8');
const shell=await readFile(join(root,'core','app-shell.js'),'utf8');
const guide=await readFile(join(root,'learner-guide.html'),'utf8');
const disclosures=await readFile(join(root,'sources-disclosures.html'),'utf8');
const referenceCss=await readFile(join(root,'assets','reference-center.css'),'utf8');
const referenceJs=await readFile(join(root,'core','reference-center.js'),'utf8');

for(const marker of [
  'Pick up where you left off.',
  'data-continue',
  'Your preparation at a glance',
  'home-destination-grid',
  '<h3>Study</h3>',
  '<h3>Practice</h3>',
  '<h3>Skills Labs</h3>',
  '<h3>Mock Exam</h3>',
  '<h3>Reports</h3>',
  'Respiratory/PAP Study Trail',
  'PSG Skills Workstation',
  'learner-guide.html',
  'sources-disclosures.html',
  'core/home-dashboard.js',
  'assets/home.css'
]){
  if(!html.includes(marker)) throw new Error(`RPSGT V3 compact home is missing ${marker}`);
}
for(const removed of [
  'How to use RPSGT V3',
  'Official BRPT RPSGT resources',
  'Coach Bob Exam Reasoning Compass',
  'Four checks before you commit to the answer',
  'data-brpt-resource-board',
  'data-home-question-count'
]){
  if(html.includes(removed)) throw new Error(`Dashboard simplification regressed; long-form content returned: ${removed}`);
}

if(!html.includes('coach-bob-avatar.jpg')) throw new Error('The RPSGT V3 front door does not use the Coach Bob character asset.');
if(!html.includes('meta name="robots" content="noindex,nofollow"')) throw new Error('Development noindex protection is missing from the RPSGT V3 front door.');
if(!js.includes('loadLearnerFlowNavigation')||!js.includes('normalizeAchievementCopy')) throw new Error('Compact home behavior is missing learner-flow or achievement normalization.');
if(!js.includes('suppressOptionalBookShelf')||!js.includes("getElementById('rpsgt-book-shelf')")||!js.includes('MutationObserver')) throw new Error('Learner-facing optional book shelf suppression is not protected.');
if(/data\/brpt-official-resources\.json|loadResources\(|insertFeaturedRespiratoryTrail|promotePrimaryDestinations/.test(js)) throw new Error('Dashboard should not inject the retired long-form resource/promo sections after load.');
if(!css.includes('.home-destination-grid')||!css.includes('.home-shortcuts')||!css.includes('.home-help')) throw new Error('Compact dashboard destination/help styling is missing.');
if(!css.includes('@media(min-width:821px) and (max-width:1050px)')||!css.includes('@media(max-width:760px)')) throw new Error('Compact dashboard responsive layout is missing.');

for(const marker of [
  'How to use the visuals and compare them with real examples',
  'What scores and progress records mean',
  'How references are shown',
  'Internal mapping labels, file names, data paths, branch names, and development notes are intentionally kept out',
  'One task at a time'
]){
  if(!guide.includes(marker)) throw new Error(`Learner Guide is missing ${marker}`);
}

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
  if(html.includes(phrase)||guide.includes(phrase)||disclosures.includes(phrase)) throw new Error(`Internal governance language is learner-facing: ${phrase}`);
}
if(/\bmapped resources\b|\bmapped records\b/i.test(html)) throw new Error('Dashboard still exposes mapping implementation language.');

for(const disclosure of [
  'Independence','Educational use','Scores &amp; readiness','Question origin','Copyright',
  'Affiliate disclosure','Privacy &amp; local learner data','External links','Content errors &amp; support'
]){
  if(!disclosures.includes(disclosure)) throw new Error(`References & Disclosures page is missing ${disclosure}`);
}
if(!shell.includes("href='sources-disclosures.html'")) throw new Error('Shared V3 shell does not expose References & Disclosures globally.');
if(!shell.includes('href="learner-guide.html"')) throw new Error('Shared V3 shell does not expose the centralized Learner Guide.');
if(!shell.includes('href="scoring-workstation.html"')) throw new Error('Shared V3 shell does not expose the PSG Skills Workstation.');

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
  compactFrontDoor:true,
  fivePrimaryDestinations:true,
  learnerGuide:true,
  psgWorkstationShortcut:true,
  respiratoryShortcut:true,
  longFormHomeContentRemoved:true,
  sourceGovernanceInternalOnly:true,
  apaStyleReferenceSurface:true,
  referencesSearchByDomainTaskTopic:true,
  disclosuresGlobal:true,
  referenceCenterReadOnly:true,
  optionalBookShelfSuppressed:true,
  developmentNoindex:true
},null,2));
