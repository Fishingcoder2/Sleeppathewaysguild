import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,controller,dragController,renderer,engineSource,css,dragCss,pack]=await Promise.all([
  readFile(join(root,'lab-scoring.html'),'utf8'),
  readFile(join(root,'core','lab-scoring-event-boundary.js'),'utf8'),
  readFile(join(root,'core','scoring-event-boundary-drag.js'),'utf8'),
  readFile(join(root,'core','scoring-event-boundary-renderer.js'),'utf8'),
  readFile(join(root,'core','scoring-event-boundary-engine.js'),'utf8'),
  readFile(join(root,'assets','scoring-event-boundary.css'),'utf8'),
  readFile(join(root,'assets','scoring-event-boundary-drag.css'),'utf8'),
  readFile(join(root,'data','scoring','event-boundary-cases.json'),'utf8').then(JSON.parse)
]);

const clone=value=>JSON.parse(JSON.stringify(value||{}));
globalThis.RPSGTScoringLabEngine={
  HISTORY_LIMIT:20,
  VERSION:'test',
  summary:()=>({}),
  start:value=>clone(value),
  setStation:value=>clone(value),
  applySession:value=>clone(value),
  applyStageSkill:value=>clone(value),
  applyEventSkill:value=>clone(value),
  applyContextSkill:value=>clone(value),
  applyMultiEpochSkill:value=>clone(value)
};
globalThis.RPSGTStorage={load:()=>({labs:{}})};
await import(pathToFileURL(join(root,'core','scoring-event-boundary-engine.js')).href+'?test='+Date.now());
const engine=globalThis.RPSGTScoringLabEngine;

const validation=engine.validateEventBoundaryPack(pack);
if(!validation.valid) throw new Error('Event-boundary pack failed validation: '+validation.errors.join(', '));
if(pack.durationSeconds!==90||pack.epochSeconds!==30||pack.cases.length!==4) throw new Error('Event-boundary pack must be four continuous 90-second / three-epoch cases.');
if(pack.cases.map(item=>item.events.length).join(',')!=='1,2,2,3') throw new Error('Event-boundary pack must exercise one-, two-, and three-event annotation.');
const totalEvents=pack.cases.reduce((sum,item)=>sum+item.events.length,0);
if(totalEvents!==8) throw new Error(`Event-boundary pack must contain eight total event spans; found ${totalEvents}.`);
for(const item of pack.cases){
  const target=item.events[item.targetEventIndex];
  if(Math.floor(target.start/30)===Math.floor((target.end-.001)/30)) throw new Error(`${item.id} target must cross an epoch boundary.`);
}

const exact=Object.fromEntries(pack.cases.map(item=>{const target=item.events[item.targetEventIndex];return [item.id,{count:item.events.length,start:target.start,end:target.end}];}));
const perfect=engine.gradeEventBoundarySkill({cases:pack.cases,responses:exact,toleranceSeconds:pack.toleranceSeconds,passPercent:pack.passPercent,completedAt:'2026-08-18T12:00:00Z'});
if(!perfect.passed||perfect.correctParts!==8||perfect.percent!==100) throw new Error('Legacy event-boundary grading compatibility must still pass 8/8.');
const seven=clone(exact);seven[pack.cases[0].id].end+=10;
const sevenResult=engine.gradeEventBoundarySkill({cases:pack.cases,responses:seven,toleranceSeconds:pack.toleranceSeconds,passPercent:pack.passPercent});
if(!sevenResult.passed||sevenResult.correctParts!==7||sevenResult.percent!==88) throw new Error('Legacy seven-of-eight compatibility must still pass at 88%.');
const six=clone(seven);six[pack.cases[1].id].count=1;
const sixResult=engine.gradeEventBoundarySkill({cases:pack.cases,responses:six,toleranceSeconds:pack.toleranceSeconds,passPercent:pack.passPercent});
if(sixResult.passed||sixResult.correctParts!==6||sixResult.percent!==75) throw new Error('Legacy six-of-eight compatibility must still fail at 75%.');
const persisted=engine.applyEventBoundarySkill({},perfect);
if(!persisted.scoring.eventBoundarySkillPassed||persisted.scoring.eventBoundarySkillAttempts!==1||persisted.scoring.eventBoundarySkillBestPercent!==100) throw new Error('Event-boundary pass persistence failed.');
const preserved=engine.applyMultiEpochSkill(persisted,{id:'other'});
if(!preserved.scoring.eventBoundarySkillPassed||preserved.scoring.eventBoundarySkillHistory.length!==1) throw new Error('Later Scoring mutators must preserve boundary-event history.');

for(const selector of ['data-scoring-boundary-start','data-scoring-boundary-workspace']) if(!html.includes(selector)) throw new Error(`Scoring page is missing ${selector}.`);
for(const asset of ['assets/scoring-event-boundary.css','core/scoring-event-boundary-engine.js','core/scoring-event-boundary-renderer.js','core/lab-scoring-event-boundary.js','core/scoring-event-boundary-drag.js']) if(!html.includes(asset)) throw new Error(`Scoring page is missing ${asset}.`);
if(html.indexOf('core/scoring-event-boundary-drag.js')<html.indexOf('core/lab-scoring-event-boundary.js')) throw new Error('PSG-style drag controller must load after the legacy boundary controller so capture-phase actions can replace the old marker UI.');
if(html.indexOf('core/scoring-multi-epoch-engine.js')>html.indexOf('core/scoring-event-boundary-engine.js')||html.indexOf('core/scoring-event-boundary-engine.js')>html.indexOf('core/lab-scoring.js')) throw new Error('Event-boundary engine must extend Scoring after consecutive epochs and before the base controller renders summaries.');
for(const token of ['one continuous 90-second','does not turn one continuous event into two events','4 cases · 8 event annotations','If there are two events, place two event bars','Seven of the eight first-pass event annotations']) if(!html.includes(token)) throw new Error(`Learner-facing PSG-style event-boundary explanation is missing: ${token}`);

for(const token of ['data-scoring-boundary-svg','data-scoring-boundary-count','data-scoring-boundary-mode','data-scoring-boundary-time','gradeEventBoundarySkill','applyEventBoundarySkill','First checked response counts','firstResponses','data-scoring-boundary-submit','Are you sure?','Review and try again.','data-scoring-boundary-prev','data-scoring-boundary-next','data-scoring-boundary-hint','data-scoring-boundary-fullscreen','AI-generated teaching schematic · Not a patient recording','scheduleSummarySync']) if(!controller.includes(token)) throw new Error(`Legacy event-boundary controller compatibility is missing ${token}.`);
if(controller.includes('MutationObserver')) throw new Error('Legacy event-boundary controller must remain event-driven and must not use MutationObserver.');

for(const token of ['data-boundary-drag-channel="nasal"','data-boundary-drag-channel="thermal"','Nasal pressure','Thermistor','data-boundary-drag-tool="mark"','data-boundary-drag-tool="pan"','pointerDown','pointerMove','pointerEnd','renderer.ROWS[channel]','Math.abs(point.y-row)>34','annotationsFor(item).push(span)','greedyGrade','selected.length===truth.length&&matches===truth.length','state.firstResponses','totalParts===8','Seven of the eight first-pass event annotations','Are you sure?','data-boundary-drag-submit','Review and try again.','data-boundary-drag-prev','data-boundary-drag-next','data-scoring-boundary-fullscreen','AI-generated teaching schematic · Not a patient recording','Pinned until case complete','refreshCaseChrome','data-boundary-drag-handle',"mode:'edit'",'editIndex']) if(!dragController.includes(token)) throw new Error(`PSG-style drag controller is missing ${token}.`);
if(dragController.includes('MutationObserver')) throw new Error('PSG-style drag controller must remain event-driven and must not use MutationObserver.');
if(/addEventListener\(\s*['"]resize['"]/.test(dragController)) throw new Error('PSG-style drag controller must not use a continuous resize redraw loop.');
if(/localStorage\.(?:setItem|removeItem|clear)/.test(dragController)) throw new Error('PSG-style drag controller must write only through versioned RPSGT storage.');
const pointerEndStart=dragController.indexOf('function pointerEnd');
const pointerEndStop=dragController.indexOf('function removeAnnotation');
const pointerEndBody=dragController.slice(pointerEndStart,pointerEndStop);
if(pointerEndStart<0||pointerEndStop<=pointerEndStart) throw new Error('Could not inspect the event-bar pointer-end controller.');
if(pointerEndBody.includes('renderCase()')) throw new Error('Completing or adjusting one event bar must not rebuild/reopen the pinned modal.');
if(!pointerEndBody.includes('refreshCaseChrome()')||!pointerEndBody.includes('renderAnnotations(svg,item,null)')) throw new Error('Completing an event bar must update annotations and controls in place.');

for(const token of ['DURATION=90','WIDTH=1580','Epoch ${i+1}','scoring-boundary-divider','activeEvent','eventProgress','hitTest','1800','ROWS:{...ROWS}']) if(!renderer.includes(token)) throw new Error(`Event-boundary renderer is missing ${token}.`);
for(const token of ['eventBoundarySkillHistory','eventBoundarySkillBestPercent','latestBoundary','persistedLabs','applyMultiEpochSkill','DECISION_COUNT=CASE_COUNT*PARTS_PER_CASE']) if(!engineSource.includes(token)) throw new Error(`Event-boundary persistence/grading contract is missing ${token}.`);
for(const token of ['overflow-x:auto','-webkit-overflow-scrolling:touch','touch-action:pan-x pan-y','.scoring-boundary-divider','body.scoring-boundary-modal-open','position:fixed','height:96dvh','.scoring-boundary-nav.complete','.scoring-boundary-nav.current','.scoring-boundary-nav.recommended','.scoring-boundary-nav.retry','.scoring-boundary-confirmation','orientation:landscape']) if(!css.includes(token)) throw new Error(`Event-boundary base CSS is missing ${token}.`);
for(const token of ['.scoring-boundary-drag-tools','.tool-mark .scoring-boundary-svg{touch-action:none','.tool-pan .scoring-boundary-svg{touch-action:pan-x pan-y','.scoring-boundary-event-bar','.scoring-boundary-event-chip','.scoring-boundary-event-handle-hit','overscroll-behavior:none','.scoring-boundary-confirmation{position:fixed!important','orientation:landscape']) if(!dragCss.includes(token)) throw new Error(`PSG-style event annotation CSS is missing ${token}.`);

console.log('Scoring Phase 3 event-boundary practice passed: continuous 90-second physiology, three display epochs, pinned PSG-style drag annotations on nasal-pressure or thermistor rows, adjustable start/end handles, no modal rebuild after each drag, 1/2/2/3 event-bar cases totaling eight scored first-pass annotations, 7/8 pass math, correction mastery, popout confirmation, hint, Previous/Next, fullscreen, AI disclosure, persistence, pan-versus-mark mobile interaction, and unchanged completion boundary are present.');
