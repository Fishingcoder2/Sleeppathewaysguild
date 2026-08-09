(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTVisualLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='0.1.0';
  const LAB_ID='visual';
  const HISTORY_LIMIT=20;
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  function validatePack(pack){
    const issues=[];
    if(!pack||!pack.meta||pack.meta.appAuthored!==true) issues.push('pack-must-be-app-authored');
    const studies=Array.isArray(pack&&pack.studies)?pack.studies:[];
    const questions=Array.isArray(pack&&pack.questions)?pack.questions:[];
    const studyIds=new Set();
    studies.forEach(study=>{
      if(!study||!study.id) issues.push('missing-study-id');
      else if(studyIds.has(String(study.id))) issues.push('duplicate-study-id:'+study.id);
      else studyIds.add(String(study.id));
      if(!Array.isArray(study&&study.channels)||!study.channels.length) issues.push('missing-study-channels:'+(study&&study.id||'unknown'));
      if(!(safeNumber(study&&study.durationSeconds)>0)) issues.push('invalid-study-duration:'+(study&&study.id||'unknown'));
    });
    const questionIds=new Set();
    questions.forEach(question=>{
      if(!question||!question.id) issues.push('missing-question-id');
      else if(questionIds.has(String(question.id))) issues.push('duplicate-question-id:'+question.id);
      else questionIds.add(String(question.id));
      if(!studyIds.has(String(question&&question.studyId))) issues.push('unknown-study:'+String(question&&question.studyId));
      if(!['stage-choice','region-choice'].includes(question&&question.type)) issues.push('unsupported-question-type:'+(question&&question.id||'unknown'));
      if(question&&question.type==='stage-choice'&&(!Array.isArray(question.options)||!question.options.includes(question.answer))) issues.push('invalid-stage-answer:'+(question.id||'unknown'));
      if(question&&question.type==='region-choice'){
        const regions=Array.isArray(question.regions)?question.regions:[];
        if(!regions.some(region=>region&&region.id===question.answer)) issues.push('invalid-region-answer:'+(question.id||'unknown'));
      }
    });
    return {valid:issues.length===0,issues,studyCount:studies.length,questionCount:questions.length};
  }
  function buildSession(pack,seed){
    const validation=validatePack(pack);
    if(!validation.valid) throw new Error('Visual pack validation failed: '+validation.issues.join(', '));
    const questions=pack.questions.map(clone);
    const studies=new Map(pack.studies.map(study=>[String(study.id),clone(study)]));
    return {id:'visual-'+String(seed||new Date().toISOString()),questions,studies};
  }
  function gradeAnswer(question,selected){
    return {id:question.id,selected:selected==null?null:String(selected),correct:String(selected)===String(question.answer),answer:question.answer,taskCode:question.taskCode||null,type:question.type};
  }
  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];
    const answers=isObject(input&&input.answers)?input.answers:{};
    const completedAt=input&&input.completedAt||new Date().toISOString();
    const responses=questions.map(question=>gradeAnswer(question,answers[String(question.id)]));
    const correct=responses.filter(item=>item.correct).length;
    const total=responses.length;
    const percent=total?Math.round(correct/total*100):0;
    return {id:'visual-'+completedAt,source:'v3-lab-visual',labId:LAB_ID,correct,total,percent,completedAt,questionIds:questions.map(question=>question.id),responses};
  }
  function normalizeRecord(value){
    const source=isObject(value)?value:{};
    const history=Array.isArray(source.history)?source.history.filter(isObject).map(clone):[];
    return {
      status:source.status==='in-progress'?'in-progress':'not-started',
      startedAt:source.startedAt||null,
      updatedAt:source.updatedAt||null,
      attempts:Math.max(history.length,safeNumber(source.attempts,history.length)),
      bestPercent:Math.max(0,Math.min(100,safeNumber(source.bestPercent,0))),
      latestSession:isObject(source.latestSession)?clone(source.latestSession):history[0]||null,
      history
    };
  }
  function normalizeLabs(value){
    const labs=isObject(value)?clone(value):{};
    const started=isObject(labs.started)?clone(labs.started):{};
    return {labs,started,record:normalizeRecord(labs[LAB_ID])};
  }
  function persist(normalized,time){
    const record=normalized.record;
    record.status='in-progress';
    record.updatedAt=time;
    normalized.started[LAB_ID]=isObject(normalized.started[LAB_ID])?normalized.started[LAB_ID]:{startedAt:record.startedAt||time};
    normalized.labs.started=normalized.started;
    normalized.labs.lastLab=LAB_ID;
    normalized.labs[LAB_ID]=record;
    return normalized.labs;
  }
  function start(value,startedAt){
    const normalized=normalizeLabs(value);const time=startedAt||new Date().toISOString();
    if(!normalized.record.startedAt) normalized.record.startedAt=time;
    return persist(normalized,time);
  }
  function applySession(value,session){
    const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();
    const existing=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;
    record.latestSession=safe;
    record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);
    if(!existing) record.attempts+=1;
    record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));
    return persist(normalized,time);
  }
  function summary(value){return clone(normalizeLabs(value).record);}
  return {VERSION,LAB_ID,HISTORY_LIMIT,validatePack,buildSession,gradeAnswer,gradeSession,normalizeLabs,start,applySession,summary};
});
