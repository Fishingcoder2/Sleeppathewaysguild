import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async(path)=>readFile(join(root,path),'utf8');
const json=async(path)=>JSON.parse(await read(path));
const require=createRequire(import.meta.url);
const engine=require(join(root,'core/practice-difficulty.js'));
const manifest=await json('data/question-bank/manifest.json');
const release=await json('../data/owner-approved-question-release.json');
const bank=[];
for(const module of manifest.modules){
 const source=await json('data/question-bank/'+module.path);
 bank.push(...source.questions);
}
bank.push(...release.questions);
assert.equal(bank.length,3240);
const eligible=bank.filter(q=>!q.qa?.manualReviewRecommended);
assert.equal(eligible.length,2680,'Held questions must never become learner-eligible through this filter');
const byTag={};
for(const q of eligible){
 const key=engine.normalize(q.difficulty);
 byTag[key]=(byTag[key]||0)+1;
 assert.ok(engine.groupFor(q),'Unmapped author difficulty label: '+String(q.difficulty)+' / '+q.id);
}
const allGroups={};
for(const key of ['easy','intermediate','hard','exam']){
 allGroups[key]=eligible.filter(q=>engine.matches(q,key));
 assert.ok(allGroups[key].length,'Empty Practice difficulty group: '+key);
 assert.ok(allGroups[key].every(q=>!q.qa?.manualReviewRecommended));
}
assert.equal(Object.values(allGroups).reduce((sum,group)=>sum+group.length,0),2680,'Difficulty groups must neither omit nor duplicate eligible questions');
assert.equal(byTag.hard,3,'Original source literal Hard tag count expected to remain unchanged');
const advancedTagged=(byTag.advanced||0)+(byTag.tricky||0)+(byTag.hard||0);
assert.equal(allGroups.hard.length,advancedTagged);
assert.ok(allGroups.hard.length>25,'Hard should include a useful pool of Advanced and Tricky items, not only three literal Hard labels');
assert.ok(allGroups.hard.some(q=>engine.normalize(q.difficulty)==='advanced'));
assert.ok(!allGroups.hard.some(q=>engine.normalize(q.difficulty)==='exam'),'Exam-style metadata does not prove a question is hard');
assert.ok(!allGroups.hard.some(q=>engine.normalize(q.difficulty)==='intermediate'));
assert.equal(engine.matches({difficulty:'  HARD  '},'hard'),true);
assert.equal(engine.matches({difficulty:' Advanced '},'hard'),true);
assert.equal(engine.matches({difficulty:'Tricky'},'hard'),true);
assert.equal(engine.matches({difficulty:'Exam'},'exam'),true);
assert.equal(engine.matches({difficulty:'Exam'},'hard'),false);
assert.equal(engine.matches({difficulty:'Beginner'},'easy'),true);
assert.equal(engine.matches({difficulty:'Foundation'},'easy'),true);
assert.equal(engine.matches({difficulty:'Core'},'easy'),true);
assert.equal(engine.matches({difficulty:'Intermediate'},'intermediate'),true);
assert.equal(engine.matches({difficulty:'Hard'},'unknown'),false,'Unexpected filter values must never silently broaden selection');
const html=await read('practice.html');
const js=await read('core/practice.js');
const loader=html.indexOf('src="core/practice-difficulty.js"'),controller=html.indexOf('src="core/practice.js"');
assert.ok(loader>=0&&controller>loader,'Load the centralized difficulty grouping before Practice');
for(const key of ['easy','intermediate','hard','exam'])assert.ok(html.includes('value="'+key+'"'),'Difficulty UI missing '+key);
assert.ok(js.includes('difficultyEngine.matches(question,difficulty)'),'Practice selection must use tested difficulty grouping');
assert.ok(js.includes('data-session-availability-note'),'Too-small filtered pools need clear user feedback');
const hardByTask={};
for(const q of allGroups.hard){hardByTask[q.taskCode]=(hardByTask[q.taskCode]||0)+1;}
console.log(JSON.stringify({effectiveRecords:bank.length,learnerEligible:eligible.length,originalHardTagCount:byTag.hard,advancedTagCount:byTag.advanced||0,trickyTagCount:byTag.tricky||0,hardFilteredPool:allGroups.hard.length,groupCounts:Object.fromEntries(Object.entries(allGroups).map(([k,v])=>[k,v.length])),hardByTask},null,2));
