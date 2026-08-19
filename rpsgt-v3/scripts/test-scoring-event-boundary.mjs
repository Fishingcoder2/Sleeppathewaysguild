import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,controller,renderer,engineSource,css,pack]=await Promise.all([
  readFile(join(root,'lab-scoring.html'),'utf8'),
  readFile(join(root,'core','lab-scoring-event-boundary.js'),'utf8'),
  readFile(join(root,'core','scoring-event-boundary-renderer.js'),'utf8'),
  readFile(join(root,'core','scoring-event-boundary-engine.js'),'utf8'),
  readFile(join(root,'assets','scoring-event-boundary.css'),'utf8'),
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
if(pack.cases.map(item=>item.events.length).join(',')!=='1,2,2,3') throw new Error('Event-boundary pack must exercise one-, two-, and three-event counting.');
for(const item of pack.cases){
  const target=item.events[item.targetEventIndex];
  if(Math.floor(target.start/30)===Math.floor((target.end-.001)/30)) throw new Error(`${item.id} target must cross an epoch boundary.`);
}

const exact=Object.fromEntries(pack.cases.map(item=>{const target=item.events[item.targetEventIndex];return [item.id,{count:item.events.length,start:target.start,end:target.end}];}));
const perfect=engine.gradeEventBoundarySkill({cases:pack.cases,responses:exact,toleranceSeconds:pack.toleranceSeconds,passPercent:pack.passPercent,completedAt:'2026-08-18T12:00:00Z'});
if(!perfect.passed||perfect.correctParts!==8||perfect.percent!==100) throw new Error('Perfect event-boundary work must pass 8/8.');
const seven=clone(exact);seven[pack.cases[0].id].end+=10;
const sevenResult=engine.gradeEventBoundarySkill({cases:pack.cases,responses:seven,toleranceSeconds:pack.toleranceSeconds,passPercent:pack.passPercent});
if(!sevenResult.passed||sevenResult.correctParts!==7||sevenResult.percent!==88) throw new Error('Seven of eight boundary decisions must pass at 88%.');
const six=clone(seven);six[pack.cases[1].id].count=1;
const sixResult=engine.gradeEventBoundarySkill({cases:pack.cases,responses:six,toleranceSeconds:pack.toleranceSeconds,passPercent:pack.passPercent});
if(sixResult.passed||sixResult.correctParts!==6||sixResult.percent!==75) throw new Error('Six of eight boundary decisions must fail at 75%.');
const persisted=engine.applyEventBoundarySkill({},perfect);
if(!persisted.scoring.eventBoundarySkillPassed||persisted.scoring.eventBoundarySkillAttempts!==1||persisted.scoring.eventBoundarySkillBestPercent!==100) throw new Error('Event-boundary pass persistence failed.');
const preserved=engine.applyMultiEpochSkill(persisted,{id:'other'});
if(!preserved.scoring.eventBoundarySkillPassed||preserved.scoring.eventBoundarySkillHistory.length!==1) throw new Error('Later Scoring mutators must preserve boundary-event history.');

for(const selector of ['data-scoring-boundary-start','data-scoring-boundary-workspace']) if(!html.includes(selector)) throw new Error(`Scoring page is missing ${selector}.`);
for(const asset of ['assets/scoring-event-boundary.css','core/scoring-event-boundary-engine.js','core/scoring-event-boundary-renderer.js','core/lab-scoring-event-boundary.js']) if(!html.includes(asset)) throw new Error(`Scoring page is missing ${asset}.`);
if(html.indexOf('core/scoring-multi-epoch-engine.js')>html.indexOf('core/scoring-event-boundary-engine.js')||html.indexOf('core/scoring-event-boundary-engine.js')>html.indexOf('core/lab-scoring.js')) throw new Error('Event-boundary engine must extend Scoring after consecutive epochs and before the base controller renders summaries.');
for(const token of ['one continuous 90-second','does not turn one continuous event into two events','4 cases · 8 scored decisions','Seven of eight']) if(!html.includes(token)) throw new Error(`Learner-facing event-boundary explanation is missing: ${token}`);
for(const token of ['data-scoring-boundary-svg','data-scoring-boundary-count','data-scoring-boundary-mode','data-scoring-boundary-time','gradeEventBoundarySkill','applyEventBoundarySkill','First checked response counts','firstResponses','data-scoring-boundary-submit','Are you sure?','Review and try again.','data-scoring-boundary-prev','data-scoring-boundary-next','data-scoring-boundary-hint','data-scoring-boundary-fullscreen','AI-generated teaching schematic · Not a patient recording','scheduleSummarySync']) if(!controller.includes(token)) throw new Error(`Event-boundary controller is missing ${token}.`);
if(controller.includes('MutationObserver')) throw new Error('Event-boundary controller must remain event-driven and must not use MutationObserver.');
for(const token of ['DURATION=90','WIDTH=1580','Epoch ${i+1}','scoring-boundary-divider','activeEvent','eventProgress','hitTest','1800']) if(!renderer.includes(token)) throw new Error(`Event-boundary renderer is missing ${token}.`);
for(const token of ['eventBoundarySkillHistory','eventBoundarySkillBestPercent','latestBoundary','persistedLabs','applyMultiEpochSkill','DECISION_COUNT=CASE_COUNT*PARTS_PER_CASE']) if(!engineSource.includes(token)) throw new Error(`Event-boundary persistence/grading contract is missing ${token}.`);
for(const token of ['overflow-x:auto','-webkit-overflow-scrolling:touch','touch-action:pan-x pan-y','.scoring-boundary-divider','.scoring-boundary-marker','.scoring-boundary-target','body.scoring-boundary-modal-open','position:fixed','height:96dvh','.scoring-boundary-nav.complete','.scoring-boundary-nav.current','.scoring-boundary-nav.recommended','.scoring-boundary-nav.retry','.scoring-boundary-confirmation','orientation:landscape']) if(!css.includes(token)) throw new Error(`Event-boundary CSS is missing ${token}.`);
if(/localStorage\.(?:setItem|removeItem|clear)/.test(controller)) throw new Error('Event-boundary controller must write only through versioned RPSGT storage.');

console.log('Scoring Phase 3 event-boundary practice passed: continuous 90-second physiology, three display epochs, boundary-crossing targets, first-pass 1/2/3-event counting and span placement, 80% grading, correction mastery, confirmation, hint, Previous/Next, on-tracing fullscreen, AI disclosure, event-driven summary synchronization, persistence, mobile horizontal scrolling, and unchanged completion boundary are present.');
