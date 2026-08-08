import {readFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceRoot=join(root,'data','study-sources');
const manifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
const topicsA=JSON.parse(await readFile(join(sourceRoot,'topic-families-a.json'),'utf8')).topicFamilies||[];
const topicsB=JSON.parse(await readFile(join(sourceRoot,'topic-families-b.json'),'utf8')).topicFamilies||[];

const imported=[
  ['only-ekg-book-9e.json','only-ekg-book-9e'],
  ['atlas-infant-polysomnography-2003.json','atlas-infant-polysomnography-2003'],
  ['central-sleep-apnea-pathophysiologic-classification-2023.json','central-sleep-apnea-pathophysiologic-classification-2023'],
  ['atlas-polysomnography-2e.json','atlas-polysomnography-2e'],
  ['sleep-technician-guide-2009.json','sleep-technician-guide-2009'],
  ['ers-handbook-respiratory-sleep-medicine-2e.json','ers-handbook-respiratory-sleep-medicine-2e'],
  ['principles-practice-sleep-medicine-7e.json','principles-practice-sleep-medicine-7e'],
  ['ats-diaphragm-pacing-phrenic-nerve-2016.json','ats-diaphragm-pacing-phrenic-nerve-2016'],
  ['aap-apnea-prematurity-2016.json','aap-apnea-prematurity-2016'],
  ['treating-apnea-prematurity-2022.json','treating-apnea-prematurity-2022'],
  ['pediatric-sleep-pearls-1e.json','pediatric-sleep-pearls-1e']
];

const docs=new Map();
for(const [file,id] of imported){
  if(!manifest.sourceFiles.includes(file)) throw new Error(`Drive-audited source is not registered: ${file}`);
  const source=JSON.parse(await readFile(join(sourceRoot,file),'utf8'));
  docs.set(id,source);
  if(source.id!==id) throw new Error(`${file} source id changed.`);
  if(source.currentAuthority!==false||source.sourceRole!=='studySupport') throw new Error(`${id} must remain supplemental study support, not current authority.`);
  if(!source.apaCitation) throw new Error(`${id} is missing its recorded APA citation.`);
  if(!/current AASM/i.test(source.authorityBoundary||'')) throw new Error(`${id} does not clearly defer rule-sensitive use to current AASM authority.`);
  if(!/Do not reproduce|do not reproduce/i.test(source.copyrightUse||'')) throw new Error(`${id} copyright-use boundary is missing.`);
  if(source.officialUrl&&/drive\.google\.com/i.test(source.officialUrl)) throw new Error(`${id} exposes a private Drive location as a learner-facing official URL.`);
}

const scoring=JSON.parse(await readFile(join(sourceRoot,'aasm-scoring-manual-v3.json'),'utf8'));
if(scoring.currentAuthority!==true||scoring.sourceRole!=='currentAuthority') throw new Error('AASM Scoring Manual Version 3 lost current-authority status.');

const atlas=docs.get('atlas-polysomnography-2e');
if(!Array.isArray(atlas.excludedLegacySections)||!atlas.excludedLegacySections.some(item=>/MSLT protocol/i.test(item))) throw new Error('Atlas of Polysomnography legacy protocol exclusions are not protected.');
const technician=docs.get('sleep-technician-guide-2009');
if(!Array.isArray(technician.excludedLegacySections)||technician.excludedLegacySections.length!==7||!technician.excludedLegacySections.every(item=>/AASM 2007/i.test(item))) throw new Error('Sleep Technician Guide AASM 2007 legacy-rule exclusions are not protected.');
for(const forbidden of ['STG-19','STG-20','STG-21','STG-22','STG-23','STG-24','STG-25']) if((technician.sections||[]).some(section=>section.id===forbidden)) throw new Error(`Legacy technician-guide scoring section leaked into learner routing: ${forbidden}`);

const ppsm=docs.get('principles-practice-sleep-medicine-7e');
const officialTasks=['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C'];
if(JSON.stringify(ppsm.mappedTaskCodes)!==JSON.stringify(officialTasks)) throw new Error('PPSM 7e no longer represents all 12 official RPSGT tasks from the Drive task-coverage map.');
if((ppsm.sections||[]).length!==23) throw new Error('PPSM 7e compact map must preserve the 23 verified book sections.');
if(!/exact local PDF page locators remain intentionally pending/i.test(ppsm.libraryStatus||'')) throw new Error('PPSM 7e must preserve the no-guessed-page-locators boundary.');
if((ppsm.sections||[]).some(section=>'pageStart' in section||'pageEnd' in section)) throw new Error('PPSM 7e compact map contains guessed page locators.');

const diaphragm=docs.get('ats-diaphragm-pacing-phrenic-nerve-2016');
if((diaphragm.sections||[]).length!==8) throw new Error('ATS diaphragm-pacing map must preserve all eight verified patient-education sections.');
if(!/distinct therapy from transvenous phrenic-nerve stimulation for adult central sleep apnea/i.test(diaphragm.therapyIdentityBoundary||'')) throw new Error('Diaphragm-pacing therapy identity boundary is missing.');

const aapAop=docs.get('aap-apnea-prematurity-2016');
if((aapAop.sections||[]).length!==9) throw new Error('2016 AAP apnea-of-prematurity map must preserve all nine staged sections.');
if(!/five years unless reaffirmed or revised/i.test(aapAop.currencyNote||'')) throw new Error('2016 AAP apnea-of-prematurity legacy-currentness warning is missing.');
if(!/NICU bedside-monitoring definitions.*not interchangeable with PSG scoring rules/i.test(aapAop.authorityBoundary||'')) throw new Error('AOP NICU-monitoring versus PSG-scoring boundary is missing.');
const aop2022=docs.get('treating-apnea-prematurity-2022');
if((aop2022.sections||[]).length!==10) throw new Error('2022 AOP treatment review must preserve all ten staged sections.');
if(!/narrative review, not a guideline/i.test(aop2022.currencyNote||'')) throw new Error('2022 AOP narrative-review boundary is missing.');

const psp=docs.get('pediatric-sleep-pearls-1e');
if(psp.mappedCaseCount!==96||psp.mappedThematicSectionCount!==18||(psp.sections||[]).length!==18) throw new Error('Pediatric Sleep Pearls must preserve the audited 96-case / 18-section aggregate map.');
for(const task of ['D1C','D2A','D3C','D4C']) if(!(psp.mappedTaskCodes||[]).includes(task)) throw new Error(`Pediatric Sleep Pearls deeper task coverage is missing ${task}.`);
if((psp.sections||[]).some(section=>/year-old|newborn infant with|girl with|boy with/i.test(section.label||''))) throw new Error('Pediatric Sleep Pearls learner metadata contains case-opening patient text instead of section-level mapping only.');
if(!/Do not reproduce patient cases, case-opening titles/i.test(psp.copyrightUse||'')) throw new Error('Pediatric Sleep Pearls case-content copyright boundary is missing.');

function family(list,id){return list.find(item=>item.id===id);}
function sourceOrder(item){return (item&&Array.isArray(item.recommendations)?item.recommendations:[]).map(row=>Array.isArray(row)?row[0]:'').filter(Boolean);}

const cardiac=sourceOrder(family(topicsA,'cardiac'));
if(cardiac[0]!=='aasm-scoring-manual-v3'||cardiac[1]!=='only-ekg-book-9e') throw new Error(`Cardiac source order must remain AASM first, EKG support second; got ${cardiac.join(', ')}.`);

const csa=sourceOrder(family(topicsA,'central-apnea'));
for(const required of ['aasm-scoring-manual-v3','icsd-3-tr','central-sleep-apnea-pathophysiologic-classification-2023','ers-handbook-respiratory-sleep-medicine-2e']) if(!csa.includes(required)) throw new Error(`Central-apnea routing is missing ${required}.`);
if(csa.includes('ats-diaphragm-pacing-phrenic-nerve-2016')) throw new Error('Diaphragm pacing must not be routed as adult central-apnea transvenous PNS support.');
if(csa.indexOf('central-sleep-apnea-pathophysiologic-classification-2023')<csa.indexOf('aasm-scoring-manual-v3')||csa.indexOf('central-sleep-apnea-pathophysiologic-classification-2023')<csa.indexOf('icsd-3-tr')) throw new Error('CSA review must not outrank AASM/ICSD current authority.');

const instrumentation=sourceOrder(family(topicsA,'instrumentation'));
if(instrumentation[0]!=='aasm-scoring-manual-v3'||instrumentation[1]!=='sleep-technician-guide-2009') throw new Error(`Instrumentation source order must remain AASM first, practical workflow support second; got ${instrumentation.join(', ')}.`);
const artifacts=sourceOrder(family(topicsA,'artifact-troubleshooting'));
if(artifacts[0]!=='aasm-scoring-manual-v3'||artifacts[1]!=='atlas-polysomnography-2e'||artifacts[2]!=='sleep-technician-guide-2009') throw new Error(`Artifact routing must remain AASM → PSG atlas → technician workflow; got ${artifacts.join(', ')}.`);

const physiology=sourceOrder(family(topicsA,'sleep-physiology'));
if(!physiology.includes('principles-practice-sleep-medicine-7e')) throw new Error('PPSM 7e is missing from broad sleep-physiology routing.');
const clinical=sourceOrder(family(topicsA,'clinical-disorders'));
if(clinical[0]!=='principles-practice-sleep-medicine-7e') throw new Error(`Clinical-disorder textbook routing should begin with PPSM 7e; got ${clinical.join(', ')}.`);

const infant=sourceOrder(family(topicsB,'infant-psg'));
if(infant[0]!=='aasm-scoring-manual-v3'||infant[1]!=='atlas-infant-polysomnography-2003') throw new Error(`Infant PSG source order must remain AASM first, infant atlas second; got ${infant.join(', ')}.`);
if(infant.includes('aap-apnea-prematurity-2016')||infant.includes('treating-apnea-prematurity-2022')) throw new Error('Apnea-of-prematurity clinical sources must stay in their dedicated neonatal topic rather than generic infant PSG routing.');
const aop=sourceOrder(family(topicsB,'apnea-of-prematurity'));
const expectedAop=['aasm-scoring-manual-v3','aap-apnea-prematurity-2016','treating-apnea-prematurity-2022','atlas-infant-polysomnography-2003'];
if(JSON.stringify(aop)!==JSON.stringify(expectedAop)) throw new Error(`AOP routing must remain AASM scoring context → 2016 AAP report → 2022 review → infant PSG atlas; got ${aop.join(', ')}.`);
const pediatric=sourceOrder(family(topicsB,'pediatric'));
if(pediatric[0]!=='aasm-scoring-manual-v3'||!pediatric.includes('pediatric-sleep-pearls-1e')||pediatric.indexOf('pediatric-sleep-pearls-1e')<pediatric.indexOf('aasm-scoring-manual-v3')) throw new Error(`Pediatric routing must preserve AASM authority and include Pediatric Sleep Pearls as case-based support; got ${pediatric.join(', ')}.`);
const gasExchange=sourceOrder(family(topicsB,'gas-exchange'));
if(gasExchange[0]!=='aasm-scoring-manual-v3'||gasExchange[1]!=='ers-handbook-respiratory-sleep-medicine-2e') throw new Error(`Gas-exchange routing must remain AASM first, ERS specialty support second; got ${gasExchange.join(', ')}.`);
const adultRespiratory=sourceOrder(family(topicsB,'adult-respiratory'));
if(adultRespiratory[0]!=='aasm-scoring-manual-v3'||adultRespiratory[1]!=='ers-handbook-respiratory-sleep-medicine-2e') throw new Error(`Adult respiratory routing must remain AASM first, ERS specialty support second; got ${adultRespiratory.join(', ')}.`);
const diaphragmTopic=sourceOrder(family(topicsB,'diaphragm-pacing'));
if(diaphragmTopic[0]!=='ats-diaphragm-pacing-phrenic-nerve-2016') throw new Error('Diaphragm-pacing topic must lead with the distinct ATS patient-education source.');

const existingEeg=JSON.parse(await readFile(join(sourceRoot,'atlas-electroencephalography-sleep-medicine-2012.json'),'utf8'));
if(!Array.isArray(existingEeg.editors)||!existingEeg.editors.includes('Magdy Y. Morgan')||existingEeg.editors.includes('Undevia')) throw new Error('Corrected Sleep EEG atlas identity regressed to the stale Drive-map attribution.');

if(manifest.sourceFiles.some(file=>/\.csv$/i.test(file)||/Webapp_Import/i.test(file))) throw new Error('Cumulative Drive import exports must not be registered as learner source files.');
if(manifest.sourceFiles.some(file=>/(?:aop|apnea).*2011|(?:aop|apnea).*2013|2011.*(?:aop|apnea)|2013.*(?:aop|apnea)/i.test(file))) throw new Error('Lower-priority 2011/2013 AOP historical reviews should not enter routine learner source routing without a specific gap justification.');

console.log(JSON.stringify({
  driveAuditedSources:imported.length,
  supplementalOnly:true,
  aasmAuthorityPreserved:true,
  cardiacSpecialtyRouting:true,
  infantSpecialtyRouting:true,
  pediatricPearlsSectionMerge:true,
  pediatricPearlsCasesNotCopied:true,
  apneaPrematurityDedicatedRouting:true,
  aopNicuVsPsgBoundary:true,
  lowerPriorityAopHistoryExcluded:true,
  csaAuthorityOverlay:true,
  workflowAndArtifactRouting:true,
  respiratorySpecialtyRouting:true,
  ppsmAllOfficialTasks:true,
  ppsmVerifiedSections:23,
  ppsmNoGuessedPages:true,
  diaphragmPacingIdentityProtected:true,
  legacyScoringSectionsExcluded:true,
  correctedEegAtlasIdentityProtected:true,
  cumulativeCsvExcluded:true,
  privateDriveUrlsNotLearnerFacing:true
},null,2));
