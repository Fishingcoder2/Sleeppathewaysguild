(function(){
'use strict';
const base=globalThis.RPSGTScoringLabEngine;
if(!base)return;
const VERSION='1.0.0';
const MULTI_EPOCH_RUN_COUNT=4;
const MULTI_EPOCH_EPOCHS_PER_RUN=3;
const MULTI_EPOCH_DECISION_COUNT=MULTI_EPOCH_RUN_COUNT*MULTI_EPOCH_EPOCHS_PER_RUN;
const MULTI_EPOCH_PASS_PERCENT=80;
const HISTORY_LIMIT=Number(base.HISTORY_LIMIT||20);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const original={
  summary:base.summary.bind(base),
  start:base.start.bind(base),
  setStation:base.setStation.bind(base),
  applySession:base.applySession.bind(base),
  applyStageSkill:base.applyStageSkill.bind(base),
  applyEventSkill:base.applyEventSkill.bind(base),
  applyContextSkill:typeof base.applyContextSkill==='function'?base.applyContextSkill.bind(base):null
};
function rawRecord(value){return isObject(value)&&isObject(value.scoring)?value.scoring:{};}
function multiState(value){
  const source=rawRecord(value);
  const history=Array.isArray(source.multiEpochSkillHistory)?source.multiEpochSkillHistory.filter(isObject).map(clone):[];
  const latest=isObject(source.multiEpochSkillLatest)?clone(source.multiEpochSkillLatest):history[0]||null;
  return {
    multiEpochSkillPassed:source.multiEpochSkillPassed===true||history.some(item=>item&&item.passed===true),
    multiEpochSkillAttempts:Math.max(history.length,0,safeNumber(source.multiEpochSkillAttempts,history.length)),
    multiEpochSkillBestPercent:Math.max(0,Math.min(100,safeNumber(source.multiEpochSkillBestPercent,0))),
    multiEpochSkillLatest:latest,
    multiEpochSkillHistory:history
  };
}
function persistedLabs(){
  try{
    const store=globalThis.RPSGTStorage;
    if(store&&typeof store.load==='function'){
      const saved=store.load();
      return isObject(saved&&saved.labs)?saved.labs:null;
    }
  }catch(error){}
  return null;
}
function latestMulti(value){
  const local=multiState(value),persisted=persistedLabs(),remote=persisted?multiState(persisted):null;
  if(!remote)return local;
  const localTime=Date.parse(local.multiEpochSkillLatest&&local.multiEpochSkillLatest.completedAt||0)||0;
  const remoteTime=Date.parse(remote.multiEpochSkillLatest&&remote.multiEpochSkillLatest.completedAt||0)||0;
  if(remote.multiEpochSkillAttempts>local.multiEpochSkillAttempts||remoteTime>localTime)return remote;
  return local;
}
function restoreMulti(value,state){
  const out=isObject(value)?clone(value):{};
  out.scoring=isObject(out.scoring)?out.scoring:{};
  for(const [key,val] of Object.entries(state||{}))out.scoring[key]=clone(val);
  return out;
}
function wrapMutator(name){
  if(typeof original[name]!=='function'||typeof base[name]!=='function')return;
  base[name]=function(value,...args){
    const prior=latestMulti(value);
    const result=original[name](value,...args);
    return restoreMulti(result,prior);
  };
}
function validateMultiEpochPack(pack){
  const errors=[],runs=Array.isArray(pack&&pack.runs)?pack.runs:[],options=Array.isArray(pack&&pack.options)?pack.options:[];
  if(runs.length!==MULTI_EPOCH_RUN_COUNT)errors.push(`Expected ${MULTI_EPOCH_RUN_COUNT} consecutive-epoch runs; found ${runs.length}.`);
  if(options.length!==5||!['W','N1','N2','N3','R'].every(stage=>options.includes(stage)))errors.push('The consecutive-epoch pack must offer W, N1, N2, N3, and R.');
  const runIds=new Set(),decisionIds=new Set(),stageSet=new Set();
  runs.forEach((run,runIndex)=>{
    if(!run||!run.id)errors.push(`Run ${runIndex+1} is missing an id.`);
    else if(runIds.has(String(run.id)))errors.push(`Duplicate consecutive-epoch run id ${run.id}.`);
    else runIds.add(String(run.id));
    const epochs=Array.isArray(run&&run.epochs)?run.epochs:[];
    if(epochs.length!==MULTI_EPOCH_EPOCHS_PER_RUN)errors.push(`Run ${run&&run.id||runIndex+1} must contain exactly ${MULTI_EPOCH_EPOCHS_PER_RUN} epochs.`);
    epochs.forEach((epoch,epochIndex)=>{
      const key=`${run&&run.id||runIndex}::${epochIndex}`;
      if(decisionIds.has(key))errors.push(`Duplicate consecutive-epoch decision id ${key}.`);
      decisionIds.add(key);
      if(!epoch||!epoch.studyId)errors.push(`Run ${run&&run.id||runIndex+1} epoch ${epochIndex+1} is missing a studyId.`);
      if(!epoch||!options.includes(epoch.answer))errors.push(`Run ${run&&run.id||runIndex+1} epoch ${epochIndex+1} has an invalid answer.`);
      else stageSet.add(epoch.answer);
      if(!epoch||!String(epoch.rationale||'').trim())errors.push(`Run ${run&&run.id||runIndex+1} epoch ${epochIndex+1} is missing learner feedback.`);
    });
  });
  if(decisionIds.size!==MULTI_EPOCH_DECISION_COUNT)errors.push(`Expected ${MULTI_EPOCH_DECISION_COUNT} total epoch decisions; found ${decisionIds.size}.`);
  for(const stage of ['W','N1','N2','N3','R'])if(!stageSet.has(stage))errors.push(`Consecutive-epoch pack does not include stage ${stage}.`);
  return {valid:errors.length===0,errors,runCount:runs.length,decisionCount:decisionIds.size,stages:[...stageSet]};
}
function gradeMultiEpochSkill(input){
  const runs=Array.isArray(input&&input.runs)?input.runs:[];
  const answers=isObject(input&&input.answers)?input.answers:{};
  const completedAt=input&&input.completedAt||new Date().toISOString();
  const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):MULTI_EPOCH_PASS_PERCENT;
  const responses=[];
  runs.forEach(run=>{
    (Array.isArray(run&&run.epochs)?run.epochs:[]).forEach((epoch,epochIndex)=>{
      const id=`${run.id}::${epochIndex}`,selected=answers[id]??null;
      responses.push({id,runId:run.id,epochIndex,studyId:epoch.studyId||null,selected,answer:epoch.answer,correct:base.answersMatch(selected,epoch.answer)});
    });
  });
  const correct=responses.filter(item=>item.correct).length,total=responses.length,percent=total?Math.round(correct/total*100):0;
  return {
    id:'scoring-multi-epoch-skill-'+completedAt,
    source:'v3-lab-scoring-multi-epoch-skill',
    labId:'scoring',
    taskCode:'D3A',
    correct,total,percent,
    passed:runs.length===MULTI_EPOCH_RUN_COUNT&&total===MULTI_EPOCH_DECISION_COUNT&&percent>=passPercent,
    passPercent,completedAt,
    runIds:runs.map(run=>run.id),
    responses
  };
}
function applyMultiEpochSkill(value,session){
  const prior=latestMulti(value),safe=clone(session),time=safe.completedAt||new Date().toISOString();
  let out=original.start(value,time);
  out=restoreMulti(out,prior);
  out.scoring=isObject(out.scoring)?out.scoring:{};
  const record=out.scoring,history=Array.isArray(record.multiEpochSkillHistory)?record.multiEpochSkillHistory:[],already=history.some(item=>item&&item.id===safe.id);
  record.multiEpochSkillLatest=safe;
  record.multiEpochSkillHistory=[safe,...history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);
  if(!already)record.multiEpochSkillAttempts=Math.max(0,safeNumber(record.multiEpochSkillAttempts,0))+1;
  record.multiEpochSkillBestPercent=Math.max(safeNumber(record.multiEpochSkillBestPercent,0),safeNumber(safe.percent,0));
  record.multiEpochSkillPassed=record.multiEpochSkillPassed===true||safe.passed===true;
  return out;
}
for(const name of ['start','setStation','applySession','applyStageSkill','applyEventSkill','applyContextSkill'])wrapMutator(name);
base.summary=function(value){
  const summary=original.summary(value);
  Object.assign(summary,multiState(value));
  return clone(summary);
};
base.VERSION='1.4.0';
base.MULTI_EPOCH_EXTENSION_VERSION=VERSION;
base.MULTI_EPOCH_RUN_COUNT=MULTI_EPOCH_RUN_COUNT;
base.MULTI_EPOCH_EPOCHS_PER_RUN=MULTI_EPOCH_EPOCHS_PER_RUN;
base.MULTI_EPOCH_DECISION_COUNT=MULTI_EPOCH_DECISION_COUNT;
base.MULTI_EPOCH_PASS_PERCENT=MULTI_EPOCH_PASS_PERCENT;
base.validateMultiEpochPack=validateMultiEpochPack;
base.gradeMultiEpochSkill=gradeMultiEpochSkill;
base.applyMultiEpochSkill=applyMultiEpochSkill;
})();
