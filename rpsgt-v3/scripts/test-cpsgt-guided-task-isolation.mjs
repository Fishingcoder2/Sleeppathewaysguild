// Offline regression: executes source functions with disposable state and no browser/storage access.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../../cpsgt-study-app.html',import.meta.url),'utf8');
const data=JSON.parse(html.match(/^const APP_DATA=(.*);$/m)[1]);
const domains=JSON.parse(html.match(/^const DOMAIN_DATA=(.*);$/m)[1]);
const trail=JSON.parse(html.match(/const TRAIL=(\[[\s\S]*?\]);\s*const BANK=APP_DATA\.questions/)[1]);
const declaration=name=>html.match(new RegExp('^const '+name+'=.*;$','m'))[0];
function source(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);const end=html.indexOf('\n}',start);assert(end>=0,name);return html.slice(start,end+2);}
const guard='  const officialCode=taskCodeFromGuidedTaskId(taskId);\n  if(!OFFICIAL_CPSGT_TASK_CODES.includes(officialCode))return [];\n  pool=pool.filter(q=>q.handbookAlignment?.taskCode===officialCode);\n';
function harness(seed,baseline=false){
 let value=seed;const math=Object.create(Math);math.random=()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/2**32);
 const history={badges:{'d1-0-0':true},answers:{old:{correct:true}},completed:[{id:'old',score:80}],savedSession:{id:'old-session',items:[{id:'old'}]}};
 const c={Math:math,DOMAIN_DATA:domains,BANK:data.questions,BY_ID:Object.fromEntries(data.questions.map(q=>[q.id,q])),state:{...structuredClone(history),activePractice:null},selectedPractice:null,save(){},openPracticeQuestionModal(){},alert(){},showPage(){},history};
 vm.createContext(c);
 vm.runInContext(declaration('TASK_FILTER_STOP_WORDS')+'\n'+declaration('OFFICIAL_CPSGT_TASK_CODES'),c);
 for(const name of ['taskDetailsFromId','taskCodeFromGuidedTaskId','taskQuestionPool','shuffle','makePrepared','questionTaskCode','startPracticeSession'])vm.runInContext(baseline&&name==='taskQuestionPool'?source(name).replace(guard,''):source(name),c);
 return c;
}
function unchangedHistory(c){for(const key of Object.keys(c.history))assert.equal(JSON.stringify(c.state[key]),JSON.stringify(c.history[key]),key);}
const bankBefore=JSON.stringify(data.questions);let sessions=0;
for(const [id] of trail){
 const c=harness(1),code=c.taskCodeFromGuidedTaskId(id),pool=c.taskQuestionPool(id,data.questions);
 assert(pool.length>=5,id);assert(pool.every(q=>q.handbookAlignment?.taskCode===code),id);assert.equal(new Set(pool.map(q=>q.id)).size,pool.length);
 for(let seed=1;seed<=100;seed++)for(const retry of ['none','some','all']){
  const x=harness(seed);const excluded=retry==='none'?[]:pool.slice(0,retry==='some'?5:pool.length).map(q=>q.id);
  x.startPracticeSession({mode:'quick',taskId:id,excludeIds:excluded});
  const s=x.state.activePractice;assert.equal(s.items.length,5);assert.equal(new Set(s.items.map(q=>q.id)).size,5);
  for(const item of s.items){const q=x.BY_ID[item.id];assert.equal(q.handbookAlignment.taskCode,code);assert.equal(item.order[item.correct],q.answer);}
  if(retry==='some'&&pool.length-5>=5)assert(s.items.every(item=>!excluded.includes(item.id)));
  unchangedHistory(x);sessions++;
 }
 console.log(`${id}: ${pool.length} isolated candidates; 300 sessions passed`);
}
const c=harness(1),wrong=data.questions.filter(q=>q.handbookAlignment.taskCode==='D2A');
for(const n of [0,1,2,3,4,5,41]){
 const same=Array.from({length:n},(_,i)=>({...data.questions.find(q=>q.handbookAlignment.taskCode==='D2B'),id:`fixture-${i}`,topic:'',sub:'',task:'',q:''}));
 for(const matching of [false,true]){
  const mixed=[...same.map(q=>({...q,q:matching?'respiratory event index apnea hypopnea calculation summary':''})),...wrong,{id:'unmapped'}];
  const selected=c.taskQuestionPool('d2-1-2',mixed);assert(selected.every(q=>q.handbookAlignment?.taskCode==='D2B'));assert.equal(selected.length,matching&&n>=5?Math.min(40,n):n);
 }
 const x=harness(1);x.BANK=same;x.BY_ID=Object.fromEntries(same.map(q=>[q.id,q]));x.startPracticeSession({mode:'quick',taskId:'d2-1-2'});
 assert.equal(x.state.activePractice?.items.length||0,Math.min(5,n));unchangedHistory(x);
}
for(const id of ['', 'bogus','d2-99-0'])assert.equal(c.taskQuestionPool(id,data.questions).length,0);
// The identical source caller and seeded RNG must preserve ordinary focused/topic Practice.
for(let seed=1;seed<=50;seed++)for(const config of [{mode:'task',taskCode:'D2B'},{mode:'quick',domain:'2'},{mode:'quick',topic:data.questions[0].topic}]){
 const a=harness(seed,true),b=harness(seed);a.startPracticeSession(config);b.startPracticeSession(config);assert.equal(JSON.stringify(a.state.activePractice?.items),JSON.stringify(b.state.activePractice?.items));
}
assert.equal(JSON.stringify(data.questions),bankBefore,'Question records mutated');
console.log(`PASS: ${sessions} Guided Trail sessions, ranking/fallback boundaries, sparse sessions, retry exclusions, history fixtures, 150 non-trail comparisons, and bank immutability.`);
