import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [engineJs,diversityJs,studyHtml]=await Promise.all([
  readFile(join(root,'core','guided-trail-engine.js'),'utf8'),
  readFile(join(root,'core','guided-question-diversity.js'),'utf8'),
  readFile(join(root,'study.html'),'utf8')
]);

new Function(diversityJs);
const explorerIndex=studyHtml.indexOf('core/guided-trail-explorer.js');
const diversityIndex=studyHtml.indexOf('core/guided-question-diversity.js');
const completionIndex=studyHtml.indexOf('core/guided-study-completion.js');
assert.ok(explorerIndex>=0&&diversityIndex>explorerIndex&&completionIndex>diversityIndex,'Question diversity guard must load after fresh rotation and before completion/retake wrapping.');

const recentRecord={
  id:'recent-a',taskCode:'D4A',topic:'PAP troubleshooting',
  prompt:'Practice item 41: A PAP patient reports a dry mouth and a large oral leak. Which interface issue should be addressed first?',
  options:['A','B','C','D'],answer:'A',rationale:'PAP interface troubleshooting starts with the leak source.'
};
const recentVariant={
  id:'recent-b',taskCode:'D4A',topic:'PAP troubleshooting',
  prompt:'Practice item 42: A PAP patient reports dry mouth with a large oral leak. Which interface issue should be addressed first?',
  options:['A','B','C','D'],answer:'A',rationale:'PAP interface troubleshooting starts with the leak source.'
};
const leakCluster=[
  {id:'leak-86',prompt:'Practice item 86: A PAP patient has loud mask leak and residual snoring. What should the technologist address first?'},
  {id:'leak-87',prompt:'Practice item 87: A PAP patient has loud mask leak and residual snoring. What should the technologist address first?'},
  {id:'leak-88',prompt:'Practice item 88: A PAP patient has a loud mask leak with residual snoring. What should the technologist address first during troubleshooting?'}
].map(item=>({...item,taskCode:'D4A',topic:'PAP troubleshooting',options:['A','B','C','D'],answer:'A',rationale:'Correct PAP mask/interface leak before assuming pressure failure.'}));

const distinctScenarios=[
  ['humidifier','A PAP humidifier is empty and the patient reports nasal dryness. Which support step fits the problem?'],
  ['strap','A PAP headgear strap is overtightened and leaves a pressure mark. What should be checked next?'],
  ['condensation','A PAP circuit develops rainout overnight. Which comfort factor should be reviewed?'],
  ['chinstrap','A PAP patient opens the mouth during sleep despite a stable nasal interface. Which support issue is most relevant?'],
  ['ramp','A PAP patient cannot tolerate pressure while first falling asleep. Which comfort feature may help acclimation?'],
  ['filter','A PAP device filter is visibly obstructed. Which equipment-maintenance concern should be corrected?'],
  ['tubing','A PAP tube disconnects during sleep. Which equipment connection should the technologist verify?'],
  ['exhalation','A PAP patient describes difficulty exhaling during acclimation. Which comfort concern should be assessed?'],
  ['skin','A PAP cushion causes localized skin irritation. Which interface-support action is appropriate to consider?'],
  ['noise','A PAP machine makes a new mechanical noise despite a sealed mask. Which equipment source should be checked?'],
  ['position','A PAP patient changes to a side-sleeping position and the mask shifts. Which fit issue should be reassessed?'],
  ['education','A PAP user removes the interface after awakening and forgets to replace it. Which adherence support need is most direct?'],
  ['cleaning','A PAP interface has visible residue that affects the seal. Which routine equipment-care issue should be addressed?'],
  ['nasal','A PAP patient reports new nasal congestion during therapy. Which comfort and humidification issue should be reviewed?'],
  ['pressureline','A PAP pressure line is kinked while the interface remains sealed. Which equipment-pathway problem should be corrected?'],
  ['claustrophobia','A PAP patient feels claustrophobic as soon as the mask is applied. Which acclimation approach best matches the barrier?'],
  ['bedpartner','A PAP patient reports the bed partner notices air blowing from the mask edge. Which interface finding should be verified?'],
  ['power','A PAP device repeatedly loses power overnight. Which equipment-supply issue requires verification?'],
  ['water','A PAP humidifier chamber is overfilled. Which setup issue should be corrected before therapy continues?'],
  ['swivel','A PAP mask swivel is blocked and the tubing pulls on the interface. Which mechanical connection should be inspected?'],
  ['size','A PAP mask is visibly too large for the patient. Which interface-selection issue should be corrected?'],
  ['seal','A PAP cushion seal worsens only after the patient lies supine. Which fit factor should be reassessed?'],
  ['routine','A PAP user has inconsistent nightly use because bedtime routines vary. Which adherence-support topic should be explored?'],
  ['education2','A PAP patient does not understand why the interface must stay on during sleep. Which educational need should be addressed?']
].map(([id,prompt])=>({id:'distinct-'+id,taskCode:'D4A',topic:'PAP support',prompt,options:['A','B','C','D'],answer:'A',rationale:'Use PAP support and troubleshooting principles.'}));

const excluded={id:'stage-only',taskCode:'D4A',topic:'Sleep Staging',prompt:'Which EEG finding defines N3 sleep?',options:['A','B'],answer:'A',rationale:'Sleep staging item.'};
const questions=[recentRecord,recentVariant,...leakCluster,...distinctScenarios,excluded];

const storage={load(){return {guidedStudy:{checkpointHistory:[{task:'D4A',questionIds:['recent-a']} ]}};}};
const context={globalThis:{RPSGTStorage:storage},Date,JSON,Map,Set,Math,Object,Array,String,Number,Boolean,console};
vm.createContext(context);
vm.runInContext(engineJs,context,{filename:'guided-trail-engine.js'});
vm.runInContext(diversityJs,context,{filename:'guided-question-diversity.js'});
const engine=context.globalThis.RPSGTGuidedTrailEngine;
const diversity=context.globalThis.RPSGTGuidedQuestionDiversity;
assert.ok(engine&&diversity);
assert.equal(diversity.VERSION,'1.0.0');

assert.equal(diversity.normalizeStem(leakCluster[0].prompt),diversity.normalizeStem(leakCluster[1].prompt),'Practice-item numbering must not make duplicate stems look unique.');
assert.ok(diversity.similarity(leakCluster[0].prompt,leakCluster[2].prompt)>=diversity.STRICT_SIMILARITY,'Near-identical PAP leak variants should be recognized as similar.');
assert.ok(diversity.similarity(recentRecord.prompt,recentVariant.prompt)>=diversity.STRICT_SIMILARITY,'Recent wording variants should be recognized as similar.');

const filter={includeAny:['pap'],excludeTopicAny:['sleep staging']};
const selected=engine.selectQuestions(questions,'D4A',15,'diversity-regression',filter);
assert.equal(selected.length,15,'A diverse checkpoint must still return all 15 required questions when enough candidates exist.');
assert.ok(selected.every(question=>engine.matchesQuestionFilter(question,filter)),'Semantic diversity must not bypass the concept filter.');
assert.equal(selected.filter(question=>question.id.startsWith('leak-')).length<=1,true,'Only one member of a near-duplicate leak cluster should appear when enough distinct questions exist.');
assert.ok(!selected.some(question=>question.id==='recent-a'||question.id==='recent-b'),'Recently served semantic variants should be held back when enough fresh questions exist.');
assert.equal(new Set(selected.map(question=>diversity.normalizeStem(question.prompt))).size,selected.length,'No normalized duplicate stems should remain in the checkpoint.');

console.log('Guided Study semantic question diversity, practice-item prefix normalization, recent-variant avoidance, concept-filter preservation, and 15-question fallback contracts passed.');
