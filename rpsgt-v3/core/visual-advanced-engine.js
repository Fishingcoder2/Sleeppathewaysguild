(function(){
'use strict';
const base=globalThis.RPSGTVisualLabEngine;
if(!base)return;
const VERSION='1.0.0';
const CASE_COUNT=5;
const DECISIONS_PER_CASE=3;
const DECISION_COUNT=CASE_COUNT*DECISIONS_PER_CASE;
const PASS_PERCENT=80;
const HISTORY_LIMIT=Number(base.HISTORY_LIMIT||20);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const original={summary:base.summary.bind(base),start:base.start.bind(base),applySession:base.applySession.bind(base)};
function rawRecord(value){return isObject(value)&&isObject(value.visual)?value.visual:{};}
function advancedState(value){
  const source=rawRecord(value),history=Array.isArray(source.advancedHistory)?source.advancedHistory.filter(isObject).map(clone):[];
  const latest=isObject(source.advancedLatest)?clone(source.advancedLatest):history[0]||null;
  return {
    advancedPassed:source.advancedPassed===true||history.some(item=>item&&item.passed===true),
    advancedAttempts:Math.max(history.length,safeNumber(source.advancedAttempts,history.length)),
    advancedBestPercent:Math.max(0,Math.min(100,safeNumber(source.advancedBestPercent,0))),
    advancedLatest:latest,
    advancedHistory:history
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
function latestAdvanced(value){
  const local=advancedState(value),persisted=persistedLabs(),remote=persisted?advancedState(persisted):null;
  if(!remote)return local;
  const localTime=Date.parse(local.advancedLatest&&local.advancedLatest.completedAt||0)||0;
  const remoteTime=Date.parse(remote.advancedLatest&&remote.advancedLatest.completedAt||0)||0;
  if(remote.advancedAttempts>local.advancedAttempts||remoteTime>localTime)return remote;
  return local;
}
function restoreAdvanced(value,state){
  const out=isObject(value)?clone(value):{};
  out.visual=isObject(out.visual)?out.visual:{};
  Object.entries(state||{}).forEach(([key,val])=>{out.visual[key]=clone(val);});
  return out;
}
function wrapMutator(name){
  base[name]=function(value,...args){const prior=latestAdvanced(value),result=original[name](value,...args);return restoreAdvanced(result,prior);};
}
function validateAdvancedPack(pack,basePack){
  const errors=[],cases=Array.isArray(pack&&pack.cases)?pack.cases:[],studies=Array.isArray(basePack&&basePack.studies)?basePack.studies:[],studyMap=new Map(studies.map(study=>[String(study.id),study])),stageOptions=Array.isArray(pack&&pack.stageOptions)?pack.stageOptions:[];
  if(!pack||!pack.meta||pack.meta.appAuthored!==true)errors.push('Advanced visual pack must be app-authored.');
  if(cases.length!==CASE_COUNT)errors.push(`Expected ${CASE_COUNT} advanced visual cases; found ${cases.length}.`);
  if(stageOptions.length!==5||!['W','N1','N2','N3','R'].every(stage=>stageOptions.includes(stage)))errors.push('Advanced visual pack must offer W, N1, N2, N3, and R.');
  const ids=new Set(),stageCoverage=new Set();
  cases.forEach((item,index)=>{
    if(!item||!item.id)errors.push(`Case ${index+1} is missing an id.`);else if(ids.has(String(item.id)))errors.push(`Duplicate advanced visual case id ${item.id}.`);else ids.add(String(item.id));
    const sequence=Array.isArray(item&&item.sequence)?item.sequence:[];
    if(sequence.length!==3)errors.push(`Case ${item&&item.id||index+1} must contain exactly three neighboring epochs.`);
    sequence.forEach(studyId=>{if(!studyMap.has(String(studyId)))errors.push(`Case ${item&&item.id||index+1} references unknown study ${studyId}.`);});
    const focusIndex=Number(item&&item.focusEpochIndex);
    if(focusIndex!==1)errors.push(`Case ${item&&item.id||index+1} must keep the center epoch as the focus epoch.`);
    const focusStudy=studyMap.get(String(sequence[focusIndex]||''));
    if(!stageOptions.includes(item&&item.stageAnswer))errors.push(`Case ${item&&item.id||index+1} has an invalid stage answer.`);
    else stageCoverage.add(item.stageAnswer);
    if(focusStudy&&String(focusStudy.stage)!==String(item.stageAnswer))errors.push(`Case ${item&&item.id||index+1} stage answer does not match the focus teaching epoch.`);
    const channelOptions=Array.isArray(item&&item.channelOptions)?item.channelOptions:[];
    if(channelOptions.length!==4||!channelOptions.includes(item&&item.channelAnswer))errors.push(`Case ${item&&item.id||index+1} must contain four channel choices including the answer.`);
    const focusChannels=new Set((focusStudy&&focusStudy.channels||[]).map(channel=>String(channel.label)));
    if(item&&item.channelAnswer&&!focusChannels.has(String(item.channelAnswer)))errors.push(`Case ${item.id} channel answer is not present in the focus epoch.`);
    const evidence=item&&item.evidence||{},type=evidence.type,target=evidence.target||{};
    if(!['point-click','interval-mark'].includes(type))errors.push(`Case ${item&&item.id||index+1} has an unsupported evidence interaction.`);
    if(!focusChannels.has(String(target.channel||'')))errors.push(`Case ${item&&item.id||index+1} evidence target uses an unknown focus-epoch channel.`);
    if(!Number.isFinite(Number(target.start))||!Number.isFinite(Number(target.end))||Number(target.end)<Number(target.start))errors.push(`Case ${item&&item.id||index+1} evidence target has an invalid interval.`);
    const fallbacks=type==='point-click'?evidence.fallbackPoints:evidence.fallbackIntervals;
    if(!Array.isArray(fallbacks)||fallbacks.length!==4)errors.push(`Case ${item&&item.id||index+1} must provide four keyboard-friendly evidence alternatives.`);
    if(!String(evidence.rationale||'').trim())errors.push(`Case ${item&&item.id||index+1} is missing learner feedback.`);
  });
  for(const stage of ['W','N1','N2','N3','R'])if(!stageCoverage.has(stage))errors.push(`Advanced visual pack does not focus stage ${stage}.`);
  return {valid:errors.length===0,errors,caseCount:cases.length,decisionCount:cases.length*DECISIONS_PER_CASE,stages:[...stageCoverage]};
}
function evidenceQuestion(item){
  const evidence=item.evidence||{};
  return {id:`${item.id}::evidence`,type:evidence.type,target:clone(evidence.target),toleranceSeconds:evidence.toleranceSeconds||0};
}
function gradeAdvancedSkill(input){
  const cases=Array.isArray(input&&input.cases)?input.cases:[],answers=isObject(input&&input.answers)?input.answers:{},completedAt=input&&input.completedAt||new Date().toISOString(),responses=[];
  cases.forEach(item=>{
    const stageKey=`${item.id}::stage`,channelKey=`${item.id}::channel`,evidenceKey=`${item.id}::evidence`;
    const stageSelected=answers[stageKey]??null,channelSelected=answers[channelKey]??null,evidenceSelected=answers[evidenceKey]??null,evidenceGrade=base.gradeAnswer(evidenceQuestion(item),evidenceSelected);
    responses.push({id:stageKey,caseId:item.id,kind:'stage',selected:stageSelected,answer:item.stageAnswer,correct:String(stageSelected)===String(item.stageAnswer)});
    responses.push({id:channelKey,caseId:item.id,kind:'channel',selected:channelSelected,answer:item.channelAnswer,correct:String(channelSelected)===String(item.channelAnswer)});
    responses.push({id:evidenceKey,caseId:item.id,kind:'evidence',selected:evidenceSelected,answer:evidenceGrade.answer,correct:evidenceGrade.correct});
  });
  const correct=responses.filter(item=>item.correct).length,total=responses.length,percent=total?Math.round(correct/total*100):0,passPercent=safeNumber(input&&input.passPercent,PASS_PERCENT);
  return {id:'visual-advanced-'+completedAt,source:'v3-lab-visual-advanced',labId:'visual',taskCodes:['D2B','D3A'],correct,total,percent,passed:cases.length===CASE_COUNT&&total===DECISION_COUNT&&percent>=passPercent,passPercent,completedAt,caseIds:cases.map(item=>item.id),responses};
}
function applyAdvancedSkill(value,session){
  const prior=latestAdvanced(value),safe=clone(session),time=safe.completedAt||new Date().toISOString();
  let out=original.start(value,time);out=restoreAdvanced(out,prior);out.visual=isObject(out.visual)?out.visual:{};
  const record=out.visual,history=Array.isArray(record.advancedHistory)?record.advancedHistory:[],already=history.some(item=>item&&item.id===safe.id);
  record.advancedLatest=safe;record.advancedHistory=[safe,...history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);
  if(!already)record.advancedAttempts=Math.max(0,safeNumber(record.advancedAttempts,0))+1;
  record.advancedBestPercent=Math.max(safeNumber(record.advancedBestPercent,0),safeNumber(safe.percent,0));
  record.advancedPassed=record.advancedPassed===true||safe.passed===true;
  return out;
}
wrapMutator('start');wrapMutator('applySession');
base.summary=function(value){const summary=original.summary(value);Object.assign(summary,advancedState(value));return clone(summary);};
base.VERSION='0.5.0';
base.ADVANCED_EXTENSION_VERSION=VERSION;
base.ADVANCED_CASE_COUNT=CASE_COUNT;
base.ADVANCED_DECISIONS_PER_CASE=DECISIONS_PER_CASE;
base.ADVANCED_DECISION_COUNT=DECISION_COUNT;
base.ADVANCED_PASS_PERCENT=PASS_PERCENT;
base.validateAdvancedPack=validateAdvancedPack;
base.gradeAdvancedSkill=gradeAdvancedSkill;
base.applyAdvancedSkill=applyAdvancedSkill;
})();
