(function(){
'use strict';
const base=globalThis.RPSGTScoringLabEngine;
if(!base)return;
const VERSION='1.0.0';
const STAGE_COUNT=12;
const CONTEXT_COUNT=3;
const DECISION_COUNT=STAGE_COUNT+CONTEXT_COUNT;
const PASS_PERCENT=80;
const HISTORY_LIMIT=Number(base.HISTORY_LIMIT||20);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const mutatorNames=['start','setStation','applySession','applyStageSkill','applyEventSkill','applyContextSkill','applyMultiEpochSkill','applyEventBoundarySkill'];
const original={summary:base.summary.bind(base)};
mutatorNames.forEach(name=>{if(typeof base[name]==='function')original[name]=base[name].bind(base);});
function rawRecord(value){return isObject(value)&&isObject(value.scoring)?value.scoring:{};}
function miniState(value){
  const source=rawRecord(value),history=Array.isArray(source.miniStudySkillHistory)?source.miniStudySkillHistory.filter(isObject).map(clone):[];
  const latest=isObject(source.miniStudySkillLatest)?clone(source.miniStudySkillLatest):history[0]||null;
  return {
    miniStudySkillPassed:source.miniStudySkillPassed===true||history.some(item=>item&&item.passed===true),
    miniStudySkillAttempts:Math.max(history.length,safeNumber(source.miniStudySkillAttempts,history.length)),
    miniStudySkillBestPercent:Math.max(0,Math.min(100,safeNumber(source.miniStudySkillBestPercent,0))),
    miniStudySkillLatest:latest,
    miniStudySkillHistory:history
  };
}
function persistedLabs(){try{const store=globalThis.RPSGTStorage;if(store&&typeof store.load==='function'){const saved=store.load();return isObject(saved&&saved.labs)?saved.labs:null;}}catch(error){}return null;}
function latestMini(value){
  const local=miniState(value),persisted=persistedLabs(),remote=persisted?miniState(persisted):null;
  if(!remote)return local;
  const localTime=Date.parse(local.miniStudySkillLatest&&local.miniStudySkillLatest.completedAt||0)||0;
  const remoteTime=Date.parse(remote.miniStudySkillLatest&&remote.miniStudySkillLatest.completedAt||0)||0;
  if(remote.miniStudySkillAttempts>local.miniStudySkillAttempts||remoteTime>localTime)return remote;
  return local;
}
function restoreMini(value,state){const out=isObject(value)?clone(value):{};out.scoring=isObject(out.scoring)?out.scoring:{};Object.entries(state||{}).forEach(([key,val])=>{out.scoring[key]=clone(val);});return out;}
function wrapMutator(name){if(typeof original[name]!=='function'||typeof base[name]!=='function')return;base[name]=function(value,...args){const prior=latestMini(value),result=original[name](value,...args);return restoreMini(result,prior);};}
function validateMiniStudyPack(pack,contextCases){
  const errors=[],epochs=Array.isArray(pack&&pack.epochs)?pack.epochs:[],stops=Array.isArray(pack&&pack.contextStops)?pack.contextStops:[],options=Array.isArray(pack&&pack.options)?pack.options:[],contexts=Array.isArray(contextCases)?contextCases:[];
  if(!pack||!pack.meta||pack.meta.appAuthored!==true)errors.push('Mini-study pack must be app-authored.');
  if(epochs.length!==STAGE_COUNT)errors.push(`Expected ${STAGE_COUNT} mini-study stage epochs; found ${epochs.length}.`);
  if(stops.length!==CONTEXT_COUNT)errors.push(`Expected ${CONTEXT_COUNT} mini-study context stops; found ${stops.length}.`);
  if(options.length!==5||!['W','N1','N2','N3','R'].every(stage=>options.includes(stage)))errors.push('Mini-study stage choices must include W, N1, N2, N3, and R.');
  const epochIds=new Set(),stageSet=new Set();
  epochs.forEach((epoch,index)=>{if(!epoch||!epoch.id)errors.push(`Epoch ${index+1} is missing an id.`);else if(epochIds.has(String(epoch.id)))errors.push(`Duplicate mini-study epoch id ${epoch.id}.`);else epochIds.add(String(epoch.id));if(!epoch||!epoch.studyId)errors.push(`Epoch ${index+1} is missing a studyId.`);if(!epoch||!options.includes(epoch.answer))errors.push(`Epoch ${index+1} has an invalid stage answer.`);else stageSet.add(epoch.answer);if(!String(epoch&&epoch.rationale||'').trim())errors.push(`Epoch ${index+1} is missing learner feedback.`);});
  for(const stage of ['W','N1','N2','N3','R'])if(!stageSet.has(stage))errors.push(`Mini-study does not include stage ${stage}.`);
  const stopIds=new Set(),caseIds=new Set(contexts.map(item=>String(item&&item.id||'')));
  stops.forEach((stop,index)=>{if(!stop||!stop.id)errors.push(`Context stop ${index+1} is missing an id.`);else if(stopIds.has(String(stop.id)))errors.push(`Duplicate mini-study context stop id ${stop.id}.`);else stopIds.add(String(stop.id));const after=Number(stop&&stop.afterEpoch);if(!Number.isInteger(after)||after<1||after>STAGE_COUNT)errors.push(`Context stop ${stop&&stop.id||index+1} has an invalid afterEpoch.`);if(!stop||!caseIds.has(String(stop.caseId||'')))errors.push(`Context stop ${stop&&stop.id||index+1} references a missing context case.`);});
  return {valid:errors.length===0,errors,stageCount:epochs.length,contextCount:stops.length,decisionCount:epochs.length+stops.length,stages:[...stageSet]};
}
function gradeMiniStudySkill(input){
  const epochs=Array.isArray(input&&input.epochs)?input.epochs:[],contextStops=Array.isArray(input&&input.contextStops)?input.contextStops:[],contextById=isObject(input&&input.contextById)?input.contextById:{},stageAnswers=isObject(input&&input.stageAnswers)?input.stageAnswers:{},contextAnswers=isObject(input&&input.contextAnswers)?input.contextAnswers:{},completedAt=input&&input.completedAt||new Date().toISOString(),passPercent=safeNumber(input&&input.passPercent,PASS_PERCENT);
  const stageResponses=epochs.map(epoch=>{const selected=stageAnswers[String(epoch.id)]??null;return {id:epoch.id,type:'stage',studyId:epoch.studyId||null,selected,answer:epoch.answer,correct:base.answersMatch(selected,epoch.answer)};});
  const contextResponses=contextStops.map(stop=>{const item=contextById[String(stop.caseId)]||{},selected=contextAnswers[String(stop.id)]??null;return {id:stop.id,type:'context',caseId:stop.caseId||null,selected,answer:item.answer??null,correct:base.answersMatch(selected,item.answer)};});
  const responses=[...stageResponses,...contextResponses],correct=responses.filter(item=>item.correct).length,total=responses.length,percent=total?Math.round(correct/total*100):0;
  return {id:'scoring-mini-study-skill-'+completedAt,source:'v3-lab-scoring-mini-study-skill',labId:'scoring',taskCodes:['D3A','D3B','D3C'],correct,total,percent,passed:epochs.length===STAGE_COUNT&&contextStops.length===CONTEXT_COUNT&&total===DECISION_COUNT&&percent>=passPercent,passPercent,completedAt,stageCorrect:stageResponses.filter(item=>item.correct).length,stageTotal:stageResponses.length,contextCorrect:contextResponses.filter(item=>item.correct).length,contextTotal:contextResponses.length,responses};
}
function applyMiniStudySkill(value,session){
  const prior=latestMini(value),safe=clone(session),time=safe.completedAt||new Date().toISOString();let out=typeof original.start==='function'?original.start(value,time):clone(value);out=restoreMini(out,prior);out.scoring=isObject(out.scoring)?out.scoring:{};
  const record=out.scoring,history=Array.isArray(record.miniStudySkillHistory)?record.miniStudySkillHistory:[],already=history.some(item=>item&&item.id===safe.id);
  record.miniStudySkillLatest=safe;record.miniStudySkillHistory=[safe,...history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!already)record.miniStudySkillAttempts=Math.max(0,safeNumber(record.miniStudySkillAttempts,0))+1;record.miniStudySkillBestPercent=Math.max(safeNumber(record.miniStudySkillBestPercent,0),safeNumber(safe.percent,0));record.miniStudySkillPassed=record.miniStudySkillPassed===true||safe.passed===true;return out;
}
mutatorNames.forEach(wrapMutator);
base.summary=function(value){const summary=original.summary(value);Object.assign(summary,miniState(value));return clone(summary);};
base.VERSION='1.6.0';
base.MINI_STUDY_EXTENSION_VERSION=VERSION;
base.MINI_STUDY_STAGE_COUNT=STAGE_COUNT;
base.MINI_STUDY_CONTEXT_COUNT=CONTEXT_COUNT;
base.MINI_STUDY_DECISION_COUNT=DECISION_COUNT;
base.MINI_STUDY_PASS_PERCENT=PASS_PERCENT;
base.validateMiniStudyPack=validateMiniStudyPack;
base.gradeMiniStudySkill=gradeMiniStudySkill;
base.applyMiniStudySkill=applyMiniStudySkill;
})();
