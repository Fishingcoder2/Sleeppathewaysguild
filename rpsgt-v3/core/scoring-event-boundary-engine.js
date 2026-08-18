(function(){
'use strict';
const base=globalThis.RPSGTScoringLabEngine;
if(!base)return;
const VERSION='1.0.0';
const CASE_COUNT=4;
const PARTS_PER_CASE=2;
const DECISION_COUNT=CASE_COUNT*PARTS_PER_CASE;
const PASS_PERCENT=80;
const HISTORY_LIMIT=Number(base.HISTORY_LIMIT||20);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const mutatorNames=['start','setStation','applySession','applyStageSkill','applyEventSkill','applyContextSkill','applyMultiEpochSkill'];
const original={summary:base.summary.bind(base)};
mutatorNames.forEach(name=>{if(typeof base[name]==='function')original[name]=base[name].bind(base);});
function rawRecord(value){return isObject(value)&&isObject(value.scoring)?value.scoring:{};}
function boundaryState(value){
  const source=rawRecord(value),history=Array.isArray(source.eventBoundarySkillHistory)?source.eventBoundarySkillHistory.filter(isObject).map(clone):[];
  const latest=isObject(source.eventBoundarySkillLatest)?clone(source.eventBoundarySkillLatest):history[0]||null;
  return {
    eventBoundarySkillPassed:source.eventBoundarySkillPassed===true||history.some(item=>item&&item.passed===true),
    eventBoundarySkillAttempts:Math.max(history.length,safeNumber(source.eventBoundarySkillAttempts,history.length)),
    eventBoundarySkillBestPercent:Math.max(0,Math.min(100,safeNumber(source.eventBoundarySkillBestPercent,0))),
    eventBoundarySkillLatest:latest,
    eventBoundarySkillHistory:history
  };
}
function persistedLabs(){try{const store=globalThis.RPSGTStorage;if(store&&typeof store.load==='function'){const saved=store.load();return isObject(saved&&saved.labs)?saved.labs:null;}}catch(error){}return null;}
function latestBoundary(value){
  const local=boundaryState(value),persisted=persistedLabs(),remote=persisted?boundaryState(persisted):null;
  if(!remote)return local;
  const localTime=Date.parse(local.eventBoundarySkillLatest&&local.eventBoundarySkillLatest.completedAt||0)||0;
  const remoteTime=Date.parse(remote.eventBoundarySkillLatest&&remote.eventBoundarySkillLatest.completedAt||0)||0;
  if(remote.eventBoundarySkillAttempts>local.eventBoundarySkillAttempts||remoteTime>localTime)return remote;
  return local;
}
function restoreBoundary(value,state){
  const out=isObject(value)?clone(value):{};out.scoring=isObject(out.scoring)?out.scoring:{};
  Object.entries(state||{}).forEach(([key,val])=>{out.scoring[key]=clone(val);});return out;
}
function wrapMutator(name){
  if(typeof original[name]!=='function'||typeof base[name]!=='function')return;
  base[name]=function(value,...args){const prior=latestBoundary(value),result=original[name](value,...args);return restoreBoundary(result,prior);};
}
function crossesEpochBoundary(event,epochSeconds){
  const start=safeNumber(event&&event.start,-1),end=safeNumber(event&&event.end,-1),step=Math.max(1,safeNumber(epochSeconds,30));
  return start>=0&&end>start&&Math.floor(start/step)!==Math.floor((end-.001)/step);
}
function validateEventBoundaryPack(pack){
  const errors=[],cases=Array.isArray(pack&&pack.cases)?pack.cases:[],duration=safeNumber(pack&&pack.durationSeconds),epochSeconds=safeNumber(pack&&pack.epochSeconds),tolerance=safeNumber(pack&&pack.toleranceSeconds);
  if(!pack||!pack.meta||pack.meta.appAuthored!==true)errors.push('Event-boundary pack must be app-authored.');
  if(cases.length!==CASE_COUNT)errors.push(`Expected ${CASE_COUNT} event-boundary cases; found ${cases.length}.`);
  if(duration!==90||epochSeconds!==30)errors.push('Event-boundary practice must use one continuous 90-second strip divided into three 30-second display epochs.');
  if(!(tolerance>0&&tolerance<=5))errors.push('Event-boundary tolerance must be greater than 0 and no more than 5 seconds.');
  const ids=new Set();
  cases.forEach((item,index)=>{
    if(!item||!item.id)errors.push(`Case ${index+1} is missing an id.`);else if(ids.has(String(item.id)))errors.push(`Duplicate event-boundary case id ${item.id}.`);else ids.add(String(item.id));
    const events=Array.isArray(item&&item.events)?item.events:[];
    if(!events.length||events.length>3)errors.push(`Case ${item&&item.id||index+1} must contain one to three physiologic events.`);
    events.forEach((event,eventIndex)=>{const start=safeNumber(event&&event.start,-1),end=safeNumber(event&&event.end,-1);if(start<0||end<=start||end>duration)errors.push(`Case ${item&&item.id||index+1} event ${eventIndex+1} has an invalid span.`);});
    const targetIndex=Number(item&&item.targetEventIndex),target=events[targetIndex];
    if(!Number.isInteger(targetIndex)||!target)errors.push(`Case ${item&&item.id||index+1} has an invalid target event.`);
    else if(!crossesEpochBoundary(target,epochSeconds))errors.push(`Case ${item&&item.id||index+1} target event must cross a 30-second display boundary.`);
    if(!String(item&&item.rationale||'').trim())errors.push(`Case ${item&&item.id||index+1} is missing learner feedback.`);
  });
  return {valid:errors.length===0,errors,caseCount:cases.length,decisionCount:cases.length*PARTS_PER_CASE};
}
function gradeEventBoundarySkill(input){
  const cases=Array.isArray(input&&input.cases)?input.cases:[],responses=isObject(input&&input.responses)?input.responses:{},tolerance=Math.max(0,safeNumber(input&&input.toleranceSeconds,4)),completedAt=input&&input.completedAt||new Date().toISOString();
  const graded=cases.map(item=>{
    const selected=isObject(responses[item.id])?responses[item.id]:{},events=Array.isArray(item.events)?item.events:[],target=events[Number(item.targetEventIndex)]||{};
    const selectedCount=safeNumber(selected.count,-1),start=safeNumber(selected.start,NaN),end=safeNumber(selected.end,NaN);
    const countCorrect=selectedCount===events.length;
    const startCorrect=Number.isFinite(start)&&Math.abs(start-safeNumber(target.start))<=tolerance;
    const endCorrect=Number.isFinite(end)&&Math.abs(end-safeNumber(target.end))<=tolerance;
    const spanCorrect=startCorrect&&endCorrect&&end>start;
    return {id:item.id,selectedCount,answerCount:events.length,selectedStart:Number.isFinite(start)?start:null,selectedEnd:Number.isFinite(end)?end:null,answerStart:target.start,answerEnd:target.end,countCorrect,spanCorrect,correctParts:Number(countCorrect)+Number(spanCorrect)};
  });
  const correctParts=graded.reduce((sum,item)=>sum+item.correctParts,0),totalParts=graded.length*PARTS_PER_CASE,percent=totalParts?Math.round(correctParts/totalParts*100):0,passPercent=safeNumber(input&&input.passPercent,PASS_PERCENT);
  return {id:'scoring-event-boundary-skill-'+completedAt,source:'v3-lab-scoring-event-boundary-skill',labId:'scoring',taskCode:'D3B',correctParts,totalParts,percent,passed:cases.length===CASE_COUNT&&totalParts===DECISION_COUNT&&percent>=passPercent,passPercent,toleranceSeconds:tolerance,completedAt,responses:graded};
}
function applyEventBoundarySkill(value,session){
  const prior=latestBoundary(value),safe=clone(session),time=safe.completedAt||new Date().toISOString();
  let out=typeof original.start==='function'?original.start(value,time):clone(value);out=restoreBoundary(out,prior);out.scoring=isObject(out.scoring)?out.scoring:{};
  const record=out.scoring,history=Array.isArray(record.eventBoundarySkillHistory)?record.eventBoundarySkillHistory:[],already=history.some(item=>item&&item.id===safe.id);
  record.eventBoundarySkillLatest=safe;record.eventBoundarySkillHistory=[safe,...history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);
  if(!already)record.eventBoundarySkillAttempts=Math.max(0,safeNumber(record.eventBoundarySkillAttempts,0))+1;
  record.eventBoundarySkillBestPercent=Math.max(safeNumber(record.eventBoundarySkillBestPercent,0),safeNumber(safe.percent,0));
  record.eventBoundarySkillPassed=record.eventBoundarySkillPassed===true||safe.passed===true;return out;
}
mutatorNames.forEach(wrapMutator);
base.summary=function(value){const summary=original.summary(value);Object.assign(summary,boundaryState(value));return clone(summary);};
base.VERSION='1.5.0';
base.EVENT_BOUNDARY_EXTENSION_VERSION=VERSION;
base.EVENT_BOUNDARY_CASE_COUNT=CASE_COUNT;
base.EVENT_BOUNDARY_DECISION_COUNT=DECISION_COUNT;
base.EVENT_BOUNDARY_PASS_PERCENT=PASS_PERCENT;
base.validateEventBoundaryPack=validateEventBoundaryPack;
base.gradeEventBoundarySkill=gradeEventBoundarySkill;
base.applyEventBoundarySkill=applyEventBoundarySkill;
})();
