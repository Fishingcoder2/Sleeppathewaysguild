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
  ['central-sleep-apnea-pathophysiologic-classification-2023.json','central-sleep-apnea-pathophysiologic-classification-2023']
];

for(const [file,id] of imported){
  if(!manifest.sourceFiles.includes(file)) throw new Error(`Drive-audited source is not registered: ${file}`);
  const source=JSON.parse(await readFile(join(sourceRoot,file),'utf8'));
  if(source.id!==id) throw new Error(`${file} source id changed.`);
  if(source.currentAuthority!==false||source.sourceRole!=='studySupport') throw new Error(`${id} must remain supplemental study support, not current authority.`);
  if(!source.apaCitation) throw new Error(`${id} is missing its recorded APA citation.`);
  if(!/current AASM/i.test(source.authorityBoundary||'')) throw new Error(`${id} does not clearly defer rule-sensitive use to current AASM authority.`);
  if(!/Do not reproduce|do not reproduce/i.test(source.copyrightUse||'')) throw new Error(`${id} copyright-use boundary is missing.`);
  if(source.officialUrl&&/drive\.google\.com/i.test(source.officialUrl)) throw new Error(`${id} exposes a private Drive location as a learner-facing official URL.`);
}

const scoring=JSON.parse(await readFile(join(sourceRoot,'aasm-scoring-manual-v3.json'),'utf8'));
if(scoring.currentAuthority!==true||scoring.sourceRole!=='currentAuthority') throw new Error('AASM Scoring Manual Version 3 lost current-authority status.');

function family(list,id){return list.find(item=>item.id===id);}
function sourceOrder(item){return (item&&Array.isArray(item.recommendations)?item.recommendations:[]).map(row=>Array.isArray(row)?row[0]:'').filter(Boolean);}

const cardiac=sourceOrder(family(topicsA,'cardiac'));
if(cardiac[0]!=='aasm-scoring-manual-v3'||cardiac[1]!=='only-ekg-book-9e') throw new Error(`Cardiac source order must remain AASM first, EKG support second; got ${cardiac.join(', ')}.`);

const csa=sourceOrder(family(topicsA,'central-apnea'));
for(const required of ['aasm-scoring-manual-v3','icsd-3-tr','central-sleep-apnea-pathophysiologic-classification-2023']) if(!csa.includes(required)) throw new Error(`Central-apnea routing is missing ${required}.`);
if(csa.indexOf('central-sleep-apnea-pathophysiologic-classification-2023')<csa.indexOf('aasm-scoring-manual-v3')||csa.indexOf('central-sleep-apnea-pathophysiologic-classification-2023')<csa.indexOf('icsd-3-tr')) throw new Error('CSA review must not outrank AASM/ICSD current authority.');

const infant=sourceOrder(family(topicsB,'infant-psg'));
if(infant[0]!=='aasm-scoring-manual-v3'||infant[1]!=='atlas-infant-polysomnography-2003') throw new Error(`Infant PSG source order must remain AASM first, infant atlas second; got ${infant.join(', ')}.`);

if(manifest.sourceFiles.some(file=>/\.csv$/i.test(file)||/Webapp_Import/i.test(file))) throw new Error('Cumulative Drive import exports must not be registered as learner source files.');

console.log(JSON.stringify({
  driveAuditedSources:imported.length,
  supplementalOnly:true,
  aasmAuthorityPreserved:true,
  cardiacSpecialtyRouting:true,
  infantSpecialtyRouting:true,
  csaAuthorityOverlay:true,
  cumulativeCsvExcluded:true,
  privateDriveUrlsNotLearnerFacing:true
},null,2));
