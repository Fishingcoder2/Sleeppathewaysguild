import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const [engineJs,uiJs,css,workspaceJs,workspaceCss,studyHtml,trailJs,trailCss,respLabJs,respLabCss,respLabHtml,studyController,studyGuideJs,studyGuideCss,trailData,bookData]=await Promise.all([
  'core/respiratory-timeline-engine.js','core/respiratory-timeline-ui.js','assets/respiratory-timeline.css',
  'core/study-workspace.js','assets/study-workspace.css','study.html',
  'core/respiratory-study-trail.js','assets/respiratory-study-trail.css',
  'core/respiratory-lab-workspace.js','assets/respiratory-lab-workspace.css','lab-respiratory.html',
  'core/study.js','core/respiratory-study-guide.js','assets/respiratory-study-guide.css',
  'data/learner-trails/respiratory-pap.json','data/study-sources/principles-practice-sleep-medicine-7e.json'
].map(file=>readFile(join(root,file),'utf8')));
const context={};
vm.createContext(context);
vm.runInContext(engineJs,context,{filename:'respiratory-timeline-engine.js'});
const engine=context.RPSGTRespiratoryTimelineEngine;
assert.ok(engine,'respiratory timeline engine must load');
const events={};
const host={innerHTML:'',addEventListener(type,cb){events[type]=cb;},querySelector(selector){return selector==='[data-resp-page-viewport]'?{focus(){}}:null;}};
const buttons=['long','evidence'].map(mode=>({
  dataset:{respiratoryTimelineMode:mode},classList:{toggle(){}},setAttribute(){},
  addEventListener(type,cb){if(type==='click')this.click=cb;}
}));
const document={
  querySelector(selector){return selector==='[data-respiratory-timeline-workspace]'?host:null;},
  querySelectorAll(selector){return selector==='[data-respiratory-timeline-mode]'?buttons:[];}
};
vm.runInNewContext(uiJs,{document,window:{RPSGTRespiratoryTimelineEngine:engine}},{filename:'respiratory-timeline-ui.js'});
assert.match(host.innerHTML,/Page time/);
assert.match(host.innerHTML,/5-minute full-pattern view/i);
assert.match(host.innerHTML,/Keyboard shortcuts/);
buttons[1].click();
assert.match(host.innerHTML,/2:30 click-the-evidence/);
const plainTarget={closest(){return null;}};
const key=name=>events.keydown({key:name,target:plainTarget,preventDefault(){},defaultPrevented:false,altKey:false,ctrlKey:false,metaKey:false,isComposing:false});
key('1');
assert.ok(host.innerHTML.includes('Showing <strong>0:00–0:30</strong>'),'1 selects a 30s page');
key('ArrowRight');
assert.ok(host.innerHTML.includes('Showing <strong>0:30–1:00</strong>'),'Right arrow advances one page');
key('ArrowLeft');
assert.ok(host.innerHTML.includes('Showing <strong>0:00–0:30</strong>'),'Left arrow returns');
key('2');
assert.ok(host.innerHTML.includes('Showing <strong>0:00–1:00</strong>'),'2 selects 60s');
key('End');
assert.ok(host.innerHTML.includes('Showing <strong>1:30–2:30</strong>'),'End jumps to last 60s view');
key('Home');
assert.ok(host.innerHTML.includes('Showing <strong>0:00–1:00</strong>'),'Home returns to first page');
key('1');
key('ArrowRight');
const svg={getBoundingClientRect(){return {width:1000,height:495,left:0,top:0};}};
events.click({target:{closest(selector){return selector==='[data-respiratory-evidence-svg]'?svg:null;}},clientX:142+25/30*832,clientY:208});
assert.match(host.innerHTML,/Evidence found/,'Click maps to absolute time in zoomed view');
key('3');
assert.ok(host.innerHTML.includes('Showing <strong>0:00–2:30</strong>'),'3 restores full trace');

for(const token of ['resp-page-toolbar','resp-page-length.active','data-resp-page-viewport','@media(max-width:800px)']) assert.ok((css+uiJs).includes(token),`Missing page control ${token}`);
for(const token of ['core/study-workspace.js','assets/study-workspace.css']) assert.ok(studyHtml.includes(token),`Study workspace not loaded: ${token}`);
for(const token of ['[data-blueprint-map]','spg-study-chapter-button','spg-study-page-pager','spg-study-domain-nav','hashchange']) assert.ok(workspaceJs.includes(token),`Study navigation lacks ${token}`);
for(const token of ['spg-study-page[hidden]','spg-study-chapter-icon','spg-study-domain-nav']) assert.ok(workspaceCss.includes(token),`Study layout lacks ${token}`);
for(const token of ['lockedPreviewHtml','data-respiratory-return-current','data-respiratory-phase','data-respiratory-phase-move','completedThrough','conceptMastery']) assert.ok(trailJs.includes(token),`Lesson navigation lacks ${token}`);
for(const token of ['scroll-snap-type:none','max-height:none;overflow:visible;overscroll-behavior:auto','respiratory-lesson-selector','respiratory-path-stop.is-near','respiratory-phase-navigation','data-active-phase="learn"','data-active-phase="check"']) assert.ok(trailCss.includes(token),`Single-scroll lesson layout lacks ${token}`);
assert.ok(!trailCss.includes('scroll-snap-type:x'),'Nine-lesson bar must not use a horizontal snap scrollbar.');
for(const token of ['showAllLessons:false','data-respiratory-toggle-lessons','is-near','data-respiratory-jump-actions','Find activity buttons']) assert.ok(trailJs.includes(token),`Compact lesson controls lack ${token}`);
assert.ok(workspaceJs.includes('nav.after(pager)'),'Section navigation must stay above its content.');
assert.ok(!workspaceCss.includes('position:sticky;bottom:8px'),'Sticky section controls must not obscure lesson actions.');
for(const token of ['core/respiratory-lab-workspace.js','assets/respiratory-lab-workspace.css']) assert.ok(respLabHtml.includes(token),`Respiratory Lab did not load ${token}`);
for(const token of ['data-resp-lab-chapter','data-resp-lab-previous','data-resp-lab-next','data-respiratory-start','data-respiratory-visual-start','window.addEventListener']) assert.ok(respLabJs.includes(token),`Respiratory Lab chapter navigation lacks ${token}`);
for(const token of ['spg-resp-lab-pane[hidden]','spg-resp-lab-chapter-buttons','spg-resp-lab-pager']) assert.ok(respLabCss.includes(token),`Respiratory Lab chapter styling lacks ${token}`);
new Function(respLabJs);
new Function(workspaceJs);
new Function(trailJs);

assert.ok(studyController.includes("new CustomEvent('rpsgt:checkpoint-closed'"),'Scored checkpoint must emit completion after results are closed');
assert.ok(studyGuideJs.includes('data-respiratory-study-start')&&studyGuideJs.includes('Start / Continue guided walkthrough'),'Seven-station guide must have one-click start / resume');
assert.ok(studyGuideCss.includes('.respiratory-study-start'),'Walkthrough launcher must be styled');

const dataMap={
  'data/learner-trails/respiratory-pap.json':JSON.parse(trailData),
  'data/study-sources/principles-practice-sleep-medicine-7e.json':JSON.parse(bookData)
};
let saved={guidedStudy:{checkpointHistory:[]}};
const stageEvents={},documentEvents={},queued=[];
const stageHost={
  innerHTML:'',
  addEventListener(type,callback){stageEvents[type]=callback;},
  querySelector(selector){return selector==='#respiratory-trail-title'?{setAttribute(){},focus(){}}:null;}
};
const doc={
  querySelector(selector){return selector==='[data-respiratory-study-trail]'?stageHost:null;},
  getElementById(){return null;},
  addEventListener(type,callback){documentEvents[type]=callback;},
  body:{}
};
const storage={
  load(){return saved;},
  save(next){saved=next;return next;}
};
const contextStage={
  document:doc,
  window:{RPSGTStorage:storage,RPSGTGuidedTrailEngine:{queueQuestionFilter(...args){queued.push(args);return {};}}},
  fetch:async path=>({ok:true,json:async()=>dataMap[path]}),
  URLSearchParams,
  console
};
vm.runInNewContext(trailJs,contextStage,{filename:'respiratory-study-trail.js'});
for(let n=0;n<15;n++)await Promise.resolve();
const stageClick=matches=>stageEvents.click({target:{closest(selector){return matches[selector]||null;}}});
assert.ok(stageHost.innerHTML.includes('data-active-phase="learn"'),'Study trail must start on Learn');
assert.ok(stageHost.innerHTML.includes('data-respiratory-toggle-lessons'),'Learner must be able to expand compact lesson selector.');
assert.ok(stageHost.innerHTML.includes('data-respiratory-jump-actions'),'Learner needs a visible route to activity controls.');
const compactBefore=(stageHost.innerHTML.match(/class="respiratory-path-stop[^"]* is-near"/g)||[]).length;
assert.equal(compactBefore,3,'Only three neighboring lessons are visible by default.');
stageClick({'[data-respiratory-toggle-lessons]':{dataset:{}}});
assert.ok(stageHost.innerHTML.includes('is-expanded'),'Expanding the lesson selector must reveal the full nine-lesson map.');
stageClick({'[data-respiratory-toggle-lessons]':{dataset:{}}});
assert.ok(!stageHost.innerHTML.includes('respiratory-trail-shell is-expanded'),'Collapsed selector must return to focused three-lesson display.');
assert.ok(stageHost.innerHTML.includes('data-respiratory-phase="apply" aria-pressed="false" disabled'),'Apply cannot be opened before Learn');
stageClick({'[data-respiratory-phase]':{dataset:{respiratoryPhase:'check'}}});
assert.ok(stageHost.innerHTML.includes('data-active-phase="learn"'),'Check cannot be skipped to by clicking a locked tab');
stageClick({'[data-respiratory-phase-move]':{dataset:{respiratoryPhaseMove:'1'}}});
assert.ok(stageHost.innerHTML.includes('data-active-phase="apply"'),'Finishing Learn should automatically open Apply');
assert.equal(saved.guidedStudy.respiratoryStudyTrail.activityProgress['osa-scoring'].learn,true,'Learn completion must be saved');
stageClick({'[data-respiratory-phase-move]':{dataset:{respiratoryPhaseMove:'1'}}});
assert.ok(stageHost.innerHTML.includes('data-active-phase="check"'),'Finishing Apply should automatically open Check');
assert.equal(saved.guidedStudy.respiratoryStudyTrail.activityProgress['osa-scoring'].apply,true,'Apply completion must be saved');
const first=dataMap['data/learner-trails/respiratory-pap.json'].steps[0];
stageClick({'[data-checkpoint-start][data-checkpoint-concept]':{dataset:{checkpointConcept:first.id}}});
assert.equal(queued.length,1,'Check must launch the concept-matched 15-question checkpoint');
documentEvents['rpsgt:checkpoint-closed']({detail:{record:{conceptId:first.id,task:first.taskCode,passed:false}}});
assert.ok(stageHost.innerHTML.includes('Lesson 1 of 9'),'Failed check stays on this chapter');
documentEvents['rpsgt:checkpoint-closed']({detail:{record:{conceptId:'not-this-lesson',task:first.taskCode,passed:true}}});
assert.ok(stageHost.innerHTML.includes('Lesson 1 of 9'),'Unrelated checkpoint never changes chapter');
saved.guidedStudy.checkpointHistory=[{conceptId:first.id,task:first.taskCode,passed:true,total:15,score:87}];
documentEvents['rpsgt:checkpoint-closed']({detail:{record:{conceptId:first.id,task:first.taskCode,passed:true}}});
assert.ok(stageHost.innerHTML.includes('Lesson 2 of 9'),'Passed Check advances after results close');
assert.equal(saved.guidedStudy.respiratoryStudyTrail.completedThroughStepId,first.id,'The completed chapter must be persisted');
assert.ok(stageHost.innerHTML.includes('data-active-phase="learn"'),'Next chapter must restart at Learn');

console.log('RPSGT V3 LMS navigation checks passed: responsive tracing, one-click station start, gated Learn → Apply → Check, persisted stages, concept-matched checkpoint, failure stays on Check and pass automatically unlocks the next chapter.');

