import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const files=[
  'scoring-workstation.html',
  'core/scoring-workstation-html5.js',
  'lab-pediatric.html',
  'mock.html',
  'review-queue.html',
  'mentoring-diagnostic.html',
  'math-coach.html',
  'flashcards.html',
  'core/practice-learner-repair.js',
  'migration-export.html',
  'core/guided-trail-explorer.js'
];
const content=Object.fromEntries(await Promise.all(files.map(async path=>[path,await readFile(join(root,path),'utf8')])));
function expectNo(path,patterns){
  for(const pattern of patterns){
    assert.doesNotMatch(content[path],pattern,`Learner copy in ${path} contains obsolete technical or developer language: ${pattern}`);
  }
}
const workstation=content['scoring-workstation.html'];
const controller=content['core/scoring-workstation-html5.js'];
assert.match(workstation,/<title>PSG Scoring Workstation \| Sleep Pathways Guild<\/title>/);
assert.match(workstation,/<strong>PSG Scoring Workstation<\/strong>/);
assert.match(workstation,/not patient recordings/i,'Safety disclosure should remain visible.');
assert.match(workstation,/core\/scoring-workstation-html5\.js/,'The technical script path must remain intact.');
assert.match(controller,/data-html5-psg-workstation/,'Internal selectors must remain unchanged.');
assert.match(controller,/PSG Scoring Workstation/,'Learners should see a clinical practice title.');
expectNo('scoring-workstation.html',[/RPSGT HTML5 PSG Workstation/i,/Loading HTML5/i]);
expectNo('core/scoring-workstation-html5.js',[/class="eyebrow">HTML5 PSG Workstation/i]);
for(const path of ['mock.html','review-queue.html','mentoring-diagnostic.html','math-coach.html']){
  expectNo(path,[/Development branch only/i,/browser regression is required before merge/i]);
}
expectNo('lab-pediatric.html',[/Stored in spg_rpsgt_v3\.labs/i]);
expectNo('flashcards.html',[/internal source keys/i,/Legacy study cards use the verified V2/i,/current V3 authority controls/i]);
expectNo('core/practice-learner-repair.js',[/records reserved for internal repair/i]);
expectNo('migration-export.html',[/Development dashboard/i,/Development validation utility/i]);
expectNo('core/guided-trail-explorer.js',[/<strong>Fresh-question rotation:<\/strong>/]);
assert.match(content['lab-pediatric.html'],/Progress saved automatically/);
assert.match(content['math-coach.html'],/worked example through practice and a mastery check/);
assert.match(content['flashcards.html'],/current AASM guidance/);
assert.match(content['core/practice-learner-repair.js'],/complete questions with validated answer choices/);
assert.match(content['migration-export.html'],/Keep downloaded files secure/i,'Privacy safeguards must remain visible.');
assert.match(content['mentoring-diagnostic.html'],/not an official score or passing prediction/i,'Diagnostic boundaries must remain visible.');
console.log('Learner interface copy passed: no HTML5 branding, build-only footers, raw storage keys, or V2/V3 migration notes; technical IDs and safety disclosures preserved.');
