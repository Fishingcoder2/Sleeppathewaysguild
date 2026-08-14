import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const source=JSON.parse(await readFile(join(root,'data','study-sources','principles-practice-sleep-medicine-7e.json'),'utf8'));

if(source.id!=='principles-practice-sleep-medicine-7e'||source.edition!=='7th ed.'||source.isbn13!=='9780323661898') throw new Error('PPSM 7e verified identity changed.');
if(source.currentAuthority!==false||source.sourceRole!=='studySupport') throw new Error('PPSM 7e must remain textbook study support rather than governing authority.');
if(source.driveFileId!=='1U_vo1DLKt_jPceP7Jpn6xIq4lTQoHh1-') throw new Error('PPSM 7e verified Guild Drive identity changed.');
if(!(source.editors||[]).includes('Cathy A. Goldstein')||(source.editors||[]).some(name=>/Clete/i.test(name))) throw new Error('PPSM 7e editor identity regressed.');
if(!/AASM Scoring Manual Version 3 controls scoring and technical rules/i.test(source.authorityBoundary||'')||!/ICSD-3-TR controls diagnostic classification/i.test(source.authorityBoundary||'')) throw new Error('PPSM 7e current-authority boundary is incomplete.');

const expected=new Map([
  [1,3],[45,453],[65,623],[89,823],[111,1021],[115,1067],[123,1141],
  [124,1145],[125,1155],[126,1171],[127,1185],[131,1245],[132,1261],[134,1295],[138,1339],[140,1365],
  [143,1407],[168,1611],[177,1699],[196,1837],[197,1841],[198,1849],[199,1859],[200,1869],[201,1883]
]);
const locators=source.verifiedChapterLocators||[];
if(locators.length!==expected.size) throw new Error(`PPSM 7e should preserve exactly ${expected.size} selectively verified chapter starts; found ${locators.length}.`);
const byChapter=new Map(locators.map(item=>[item.chapter,item]));
for(const [chapter,page] of expected){
  const locator=byChapter.get(chapter);
  if(!locator) throw new Error(`PPSM 7e chapter ${chapter} locator is missing.`);
  if(locator.printedStartPage!==page) throw new Error(`PPSM 7e chapter ${chapter} printed start page changed: expected ${page}, got ${locator.printedStartPage}.`);
  if(!Array.isArray(locator.taskCodes)||!locator.taskCodes.length) throw new Error(`PPSM 7e chapter ${chapter} lacks task routing.`);
}

for(const chapter of [124,125,132,138,140,200]){
  if(!byChapter.has(chapter)) throw new Error(`High-value respiratory/PAP locator missing: chapter ${chapter}.`);
}
if(!byChapter.get(132).taskCodes.includes('D4A')||!byChapter.get(132).taskCodes.includes('D1C')) throw new Error('OSA PAP chapter 132 must support D4A treatment execution and D1C therapy support.');
if(!byChapter.get(138).taskCodes.includes('D4C')||!byChapter.get(140).taskCodes.includes('D4A')) throw new Error('Hypoventilation/NIV locator routing is incomplete.');
if(!byChapter.get(200).taskCodes.includes('D2A')||!byChapter.get(200).taskCodes.includes('D2B')||!byChapter.get(200).taskCodes.includes('D2C')) throw new Error('Respiratory-monitoring chapter 200 must support acquisition/testing/response tasks.');

const boundaries=source.versionSensitiveLocatorBoundary||[];
if(boundaries.length<4) throw new Error('PPSM 7e version-sensitive locator boundaries are incomplete.');
if(!boundaries.some(item=>/2025 AASM central sleep apnea treatment guideline controls current treatment recommendations/i.test(item))) throw new Error('PPSM CSA chapters do not defer current treatment to the 2025 AASM guideline.');
if(!boundaries.some(item=>/current AASM scoring, diagnostic-testing, PAP-treatment, and manual-titration guidance/i.test(item))) throw new Error('PPSM OSA/PAP chapters do not defer rule-sensitive content to current professional guidance.');
if(!boundaries.some(item=>/physician order, facility policy, and manufacturer instructions/i.test(item))) throw new Error('PPSM NIV chapters do not preserve order/facility/manufacturer execution boundaries.');
if((source.sections||[]).some(section=>'pageStart' in section||'pageEnd' in section)) throw new Error('PPSM broad section map must not contain inferred blanket page ranges.');

console.log(JSON.stringify({
  sourceId:source.id,
  verifiedPrintedChapterStarts:locators.length,
  respiratoryPapLocatorExpansion:true,
  csa2025TreatmentBoundaryProtected:true,
  osaPapCurrentGuidanceBoundaryProtected:true,
  nivExecutionBoundaryProtected:true,
  methodologyMonitoringLocatorsProtected:true,
  blanketSectionRangesRejected:true
},null,2));
