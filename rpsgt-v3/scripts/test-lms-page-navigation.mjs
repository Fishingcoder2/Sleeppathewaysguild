import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const [engineJs,uiJs,css,workspaceJs,workspaceCss,studyHtml,trailJs,trailCss]=await Promise.all([
  'core/respiratory-timeline-engine.js','core/respiratory-timeline-ui.js','assets/respiratory-timeline.css',
  'core/study-workspace.js','assets/study-workspace.css','study.html',
  'core/respiratory-study-trail.js','assets/respiratory-study-trail.css'
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
for(const token of ['scroll-snap-type:x','respiratory-phase-navigation','data-active-phase="learn"','data-active-phase="check"']) assert.ok(trailCss.includes(token),`Lesson rail layout lacks ${token}`);
new Function(workspaceJs);
new Function(trailJs);
console.log('RPSGT V3 compact learning pages, interactive pathway, 30s/60s/full tracing time, arrow navigation, and evidence time mapping passed.');
