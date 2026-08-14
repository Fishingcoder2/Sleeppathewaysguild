import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const js=await readFile(join(root,'core','question-option-order.js'),'utf8');
const surfaces=['practice.html','review.html','readiness.html','mock.html'];
const htmlBySurface=Object.fromEntries(await Promise.all(surfaces.map(async file=>[file,await readFile(join(root,file),'utf8')])));

new Function(js);
for(const [file,html] of Object.entries(htmlBySurface)){
  assert.ok(html.includes('core/question-option-order.js'),`${file} must load the shared answer-option ordering helper.`);
  const helperIndex=html.indexOf('core/question-option-order.js');
  const engineName=file.replace('.html','');
  const engineIndex=html.indexOf(`core/${engineName}.js`);
  assert.ok(helperIndex>=0&&engineIndex>=0&&helperIndex<engineIndex,`${file} must load answer-option ordering before its assessment engine.`);
}

const fakeWindow={
  fetch:async()=>new Response(JSON.stringify({questions:[]})),
  location:{href:'https://example.test/rpsgt-v3/practice.html'}
};
const context=vm.createContext({window:fakeWindow,Response,URL,Proxy,Reflect,Math,Object,String,Array,Number});
vm.runInContext(js,context,{filename:'question-option-order.js'});
const api=fakeWindow.RPSGTQuestionOptionOrder;
assert.ok(api&&typeof api.reorderPayload==='function','Shared option-order API was not exposed.');

const sourceQuestions=Array.from({length:40},(_,index)=>({
  id:`synthetic-${index+1}`,
  prompt:`Synthetic question ${index+1}`,
  options:[`Correct ${index+1}`,`Distractor B ${index+1}`,`Distractor C ${index+1}`,`Distractor D ${index+1}`],
  answer:`Correct ${index+1}`
}));
const sourceSnapshot=JSON.stringify(sourceQuestions);
const transformed=api.reorderPayload({questions:sourceQuestions},'data/question-bank/d4c.json').questions;

assert.equal(JSON.stringify(sourceQuestions),sourceSnapshot,'Presentation ordering must not mutate canonical question data.');
assert.equal(transformed.length,40);
const positions=[0,0,0,0];
for(let index=0;index<transformed.length;index+=1){
  const before=sourceQuestions[index];
  const after=transformed[index];
  assert.equal(after.answer,before.answer,`Answer text changed for ${before.id}.`);
  assert.deepEqual(new Set(after.options),new Set(before.options),`Choices are not a permutation for ${before.id}.`);
  assert.equal(after.options.filter(option=>option===after.answer).length,1,`Correct answer must appear exactly once for ${before.id}.`);
  const position=after.options.indexOf(after.answer);
  assert.ok(position>=0&&position<4,`Correct answer is missing for ${before.id}.`);
  positions[position]+=1;
}
assert.deepEqual(positions,[10,10,10,10],'A 40-question four-choice source set must counterbalance correct answers evenly across A/B/C/D.');

const threeChoice=Array.from({length:12},(_,index)=>({id:`three-${index}`,options:['A-correct',`B-${index}`,`C-${index}`],answer:'A-correct'}));
const threeTransformed=api.reorderPayload({questions:threeChoice},'data/question-bank/three.json').questions;
const threePositions=[0,0,0];
threeTransformed.forEach(question=>{threePositions[question.options.indexOf(question.answer)]+=1;});
assert.deepEqual(threePositions,[4,4,4],'Three-choice questions must also distribute correct positions evenly.');

assert.ok(/manifest\.json/.test(js)&&/!\/manifest/.test(js),'Manifest fetches must remain untouched.');
assert.ok(/question\.answer/.test(js)&&/Object\.assign\(\{\},question,\{options\}\)/.test(js),'Option ordering must preserve the answer key while replacing only presented options.');

console.log(`Question option ordering passed: canonical data unchanged; four-choice distribution A/B/C/D = ${positions.join('/')}; three-choice distribution = ${threePositions.join('/')}; Practice, Review, Readiness, and Mock are wired.`);
