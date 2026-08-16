(function(){
  'use strict';
  const base=globalThis.RPSGTScoringLabEngine;
  if(!base) return;
  const VERSION='1.0.0';
  const CONTEXT_SKILL_SIZE=8;
  const CONTEXT_SKILL_PASS_PERCENT=80;
  const CONTEXT_EVIDENCE_PER_CASE=2;
  const CONTEXT_FAMILIES=['arousal','limb-movement','artifact-physiology','transition-boundary'];
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
    applyEventSkill:base.applyEventSkill.bind(base)
  };
  function rawRecord(value){return isObject(value)&&isObject(value.scoring)?value.scoring:{};}
  function rawCompleted(value){return Boolean(rawRecord(value).completed)||Boolean(isObject(value)&&Array.isArray(value.completed)&&value.completed.map(String).includes('scoring'));}
  function contextState(value){
    const source=rawRecord(value),history=Array.isArray(source.contextSkillHistory)?source.contextSkillHistory.filter(isObject).map(clone):[];
    const latest=isObject(source.contextSkillLatest)?clone(source.contextSkillLatest):history[0]||null;
    return {
      contextLegacyCompleted:source.contextLegacyCompleted===true,
      contextSkillPassed:source.contextSkillPassed===true||history.some(item=>item&&item.passed===true),
      contextSkillAttempts:Math.max(history.length,0,safeNumber(source.contextSkillAttempts,history.length)),
      contextSkillBestPercent:Math.max(0,Math.min(100,safeNumber(source.contextSkillBestPercent,0))),
      contextSkillEvidenceComplete:source.contextSkillEvidenceComplete===true||history.some(item=>item&&item.evidenceComplete===true&&item.passed===true),
      contextSkillLatest:latest,
      contextSkillHistory:history
    };
  }
  function restoreContext(value,state){
    const out=isObject(value)?clone(value):{};out.scoring=isObject(out.scoring)?out.scoring:{};
    for(const [key,val] of Object.entries(state||{}))out.scoring[key]=clone(val);
    return out;
  }
  function allBaseRequirements(record){
    const checklist=isObject(record&&record.checklist)?record.checklist:{};
    const stationsComplete=Array.isArray(base.STATIONS)&&base.STATIONS.every(station=>checklist[station.id]===true);
    return stationsComplete&&record.checkpointPassed===true&&record.stageSkillPassed===true&&record.eventSkillPassed===true;
  }
  function recompute(value,options){
    const out=isObject(value)?clone(value):{};out.scoring=isObject(out.scoring)?out.scoring:{};out.completed=Array.isArray(out.completed)?out.completed.map(String):[];
    const record=out.scoring,context=contextState(out),time=options&&options.time||new Date().toISOString();
    const preserveHistorical=Boolean(options&&options.preserveHistorical)||context.contextLegacyCompleted===true;
    if(preserveHistorical){record.contextLegacyCompleted=true;record.completed=true;record.status='completed';record.completedAt=record.completedAt||time;if(!out.completed.includes('scoring'))out.completed.push('scoring');}
    else if(allBaseRequirements(record)&&context.contextSkillPassed&&context.contextSkillEvidenceComplete){record.completed=true;record.status='completed';record.completedAt=record.completedAt||time;if(!out.completed.includes('scoring'))out.completed.push('scoring');}
    else {record.completed=false;if(record.startedAt)record.status='in-progress';else record.status='not-started';out.completed=out.completed.filter(id=>id!=='scoring');record.completedAt=null;}
    out.completed=[...new Set(out.completed)].sort();return out;
  }
  function wrapMutator(name){
    base[name]=function(value,...args){const prior=contextState(value),historical=rawCompleted(value),result=original[name](value,...args),restored=restoreContext(result,prior);return recompute(restored,{preserveHistorical:historical,time:new Date().toISOString()});};
  }
  function validateCasePack(pack){
    const errors=[],cases=Array.isArray(pack&&pack.cases)?pack.cases:[];
    if(cases.length!==CONTEXT_SKILL_SIZE)errors.push(`Expected ${CONTEXT_SKILL_SIZE} context cases; found ${cases.length}.`);
    const ids=new Set();const familyCounts=Object.fromEntries(CONTEXT_FAMILIES.map(family=>[family,0]));
    cases.forEach((item,index)=>{
      if(!item||!item.id)errors.push(`Case ${index+1} is missing an id.`);else if(ids.has(String(item.id)))errors.push(`Duplicate context case id ${item.id}.`);else ids.add(String(item.id));
      if(!CONTEXT_FAMILIES.includes(item&&item.family))errors.push(`Case ${item&&item.id||index+1} has an unsupported family.`);else familyCounts[item.family]+=1;
      if(!Array.isArray(item&&item.options)||!item.options.includes(item.answer))errors.push(`Case ${item&&item.id||index+1} has an invalid answer/options contract.`);
      const evidence=Array.isArray(item&&item.evidence)?item.evidence:[],correct=evidence.filter(option=>option&&option.correct===true);
      if(evidence.length<4||correct.length!==CONTEXT_EVIDENCE_PER_CASE)errors.push(`Case ${item&&item.id||index+1} must provide four or more evidence choices with exactly ${CONTEXT_EVIDENCE_PER_CASE} correct targets.`);
      if(!item.study&&!item.artifactStudyId)errors.push(`Case ${item&&item.id||index+1} is missing a visual study definition.`);
    });
    for(const family of CONTEXT_FAMILIES)if(familyCounts[family]!==2)errors.push(`Context family ${family} must contain exactly two cases.`);
    return {valid:errors.length===0,errors,count:cases.length,familyCounts};
  }
  function gradeContextSkill(input){
    const cases=Array.isArray(input&&input.cases)?input.cases:[],answers=isObject(input&&input.answers)?input.answers:{},evidence=isObject(input&&input.evidence)?input.evidence:{};
    const completedAt=input&&input.completedAt||new Date().toISOString(),passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):CONTEXT_SKILL_PASS_PERCENT;
    const responses=cases.map(item=>{const selected=answers[String(item.id)]??null,proof=isObject(evidence[String(item.id)])?evidence[String(item.id)]:{};const total=Math.max(CONTEXT_EVIDENCE_PER_CASE,safeNumber(proof.total,CONTEXT_EVIDENCE_PER_CASE)),solved=Math.max(0,Math.min(total,safeNumber(proof.solved,0))),revealed=Math.max(0,safeNumber(proof.revealed,0));return {id:item.id,family:item.family,selected,answer:item.answer,correct:base.answersMatch(selected,item.answer),evidenceSolved:solved,evidenceTotal:total,revealed};});
    const correct=responses.filter(item=>item.correct).length,total=cases.length,percent=total?Math.round(correct/total*100):0,evidenceComplete=total===CONTEXT_SKILL_SIZE&&responses.every(item=>item.evidenceSolved===item.evidenceTotal);
    return {id:'scoring-context-skill-'+completedAt,source:'v3-lab-scoring-context-skill',labId:'scoring',taskCodes:['D3A','D3B','D3C'],correct,total,percent,evidenceComplete,revealed:responses.reduce((sum,item)=>sum+item.revealed,0),passed:total===CONTEXT_SKILL_SIZE&&percent>=passPercent&&evidenceComplete,passPercent,completedAt,caseIds:cases.map(item=>item.id),responses};
  }
  function applyContextSkill(value,session){
    const prior=contextState(value),historical=rawCompleted(value),safe=clone(session),time=safe.completedAt||new Date().toISOString();
    let out=original.start(value,time);out=restoreContext(out,prior);out.scoring=isObject(out.scoring)?out.scoring:{};const record=out.scoring,history=Array.isArray(record.contextSkillHistory)?record.contextSkillHistory:[],already=history.some(item=>item&&item.id===safe.id);
    record.contextSkillLatest=safe;record.contextSkillHistory=[safe,...history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!already)record.contextSkillAttempts=Math.max(0,safeNumber(record.contextSkillAttempts,0))+1;record.contextSkillBestPercent=Math.max(safeNumber(record.contextSkillBestPercent,0),safeNumber(safe.percent,0));record.contextSkillPassed=record.contextSkillPassed===true||safe.passed===true;record.contextSkillEvidenceComplete=record.contextSkillEvidenceComplete===true||safe.passed===true&&safe.evidenceComplete===true;
    return recompute(out,{preserveHistorical:historical,time});
  }
  wrapMutator('start');wrapMutator('setStation');wrapMutator('applySession');wrapMutator('applyStageSkill');wrapMutator('applyEventSkill');
  base.summary=function(value){
    const raw=rawRecord(value),historical=raw.contextLegacyCompleted===true||rawCompleted(value)&&!raw.contextSkillLatest&&!raw.contextSkillHistory,context=contextState(value),summary=original.summary(value);const extendedComplete=historical||allBaseRequirements(raw)&&context.contextSkillPassed&&context.contextSkillEvidenceComplete;
    Object.assign(summary,context);summary.completed=extendedComplete;summary.status=extendedComplete?'completed':summary.startedAt?'in-progress':'not-started';if(!extendedComplete&&!historical)summary.completedAt=null;return clone(summary);
  };
  base.VERSION='1.3.0';base.CONTEXT_EXTENSION_VERSION=VERSION;base.CONTEXT_SKILL_SIZE=CONTEXT_SKILL_SIZE;base.CONTEXT_SKILL_PASS_PERCENT=CONTEXT_SKILL_PASS_PERCENT;base.CONTEXT_EVIDENCE_PER_CASE=CONTEXT_EVIDENCE_PER_CASE;base.CONTEXT_FAMILIES=CONTEXT_FAMILIES.slice();base.validateContextCasePack=validateCasePack;base.gradeContextSkill=gradeContextSkill;base.applyContextSkill=applyContextSkill;
})();
