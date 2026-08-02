(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTMathCoachEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.1';
  const LAB_ID='math-coach';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  const mathTopic=value=>/(calcul|math|index|efficiency|latency|waso|\btst\b|\bahi\b|\brdi\b|\brei\b|\bplm|sleep period)/i.test(String(value||''));
  function eligibleQuestions(records){
    const seen=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||record.taskCode!=='D3C') return false;
      if(record.manualReviewRecommended||record.qa&&record.qa.manualReviewRecommended) return false;
      if(!Array.isArray(record.options)||!record.options.includes(record.answer)) return false;
      if(String(record.questionType||'').toLowerCase()!=='calculation'&&!mathTopic(record.topic)) return false;
      const prompt=normalizedPrompt(record.prompt);
      if(!prompt||seen.has(prompt)) return false;
      seen.add(prompt);
      return true;
    }).map(clone);
  }
  function hash(text){let value=2166136261;for(let index=0;index<String(text).length;index+=1){value^=String(text).charCodeAt(index);value=Math.imul(value,16777619);}return value>>>0;}
  function seededRandom(seed){let state=hash(seed)||1;return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};}
  function selectQuestions(records,count,seed){
    const copy=eligibleQuestions(records);const random=seededRandom(seed||LAB_ID);
    for(let index=copy.length-1;index>0;index-=1){const swap=Math.floor(random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}
    return copy.slice(0,Math.max(0,safeNumber(count,SESSION_SIZE)));
  }
  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];
    const answers=isObject(input&&input.answers)?input.answers:{};
    const completedAt=input&&input.completedAt||new Date().toISOString();
    const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,selected,correct:selected===question.answer,topic:question.topic||null};});
    const correct=responses.filter(response=>response.correct).length;const total=questions.length;const percent=total?Math.round(correct/total*100):0;
    return {id:'math-coach-'+completedAt,source:'v3-lab-math-coach',labId:LAB_ID,taskCode:'D3C',correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
  }
  function normalizeRecord(value,completedFromList){
    const source=isObject(value)?value:{};const history=Array.isArray(source.history)?source.history.filter(isObject).map(clone):[];
    const completed=Boolean(source.completed)||Boolean(completedFromList);
    return {status:completed?'completed':source.status==='in-progress'?'in-progress':'not-started',completed,startedAt:source.startedAt||null,updatedAt:source.updatedAt||null,completedAt:source.completedAt||null,attempts:Math.max(history.length,0,safeNumber(source.attempts,history.length)),bestPercent:Math.max(0,Math.min(100,safeNumber(source.bestPercent,0))),latestSession:isObject(source.latestSession)?clone(source.latestSession):history[0]||null,history};
  }
  function normalizeLabs(value){
    const labs=isObject(value)?clone(value):{};const completed=new Set(Array.isArray(labs.completed)?labs.completed.map(String):[]);const started=isObject(labs.started)?clone(labs.started):{};
    return {labs,completed,started,record:normalizeRecord(labs[LAB_ID],completed.has(LAB_ID))};
  }
  function start(value,startedAt){
    const normalized=normalizeLabs(value);const time=startedAt||new Date().toISOString();const record=normalized.record;
    if(!record.startedAt) record.startedAt=time;if(record.status==='not-started') record.status='in-progress';record.updatedAt=time;
    normalized.started[LAB_ID]=isObject(normalized.started[LAB_ID])?normalized.started[LAB_ID]:{startedAt:record.startedAt};
    normalized.labs.started=normalized.started;normalized.labs.lastLab=LAB_ID;normalized.labs[LAB_ID]=record;return normalized.labs;
  }
  function applySession(value,session){
    const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();
    const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;record.updatedAt=time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);
    if(!alreadyRecorded) record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;
    record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));
    if(safe.passed){record.completed=true;record.status='completed';record.completedAt=record.completedAt||time;normalized.completed.add(LAB_ID);}else if(!record.completed){record.status='in-progress';}
    normalized.started[LAB_ID]=isObject(normalized.started[LAB_ID])?normalized.started[LAB_ID]:{startedAt:record.startedAt};
    normalized.labs.started=normalized.started;normalized.labs.completed=[...normalized.completed].sort();normalized.labs.lastLab=LAB_ID;normalized.labs[LAB_ID]=record;return normalized.labs;
  }
  function summary(value){const normalized=normalizeLabs(value);return clone(normalized.record);}
  function legacyLessonSummary(value){
    if(value===null||value===undefined) return {present:false};
    if(!isObject(value)) return {present:true,type:Array.isArray(value)?'array':typeof value,value:clone(value)};
    const known={};['lesson','currentLesson','index','completed','score','updatedAt'].forEach(key=>{if(value[key]!==undefined) known[key]=clone(value[key]);});
    return {present:true,type:'object',known,unknownKeys:Object.keys(value).filter(key=>!Object.prototype.hasOwnProperty.call(known,key)).sort()};
  }
  return {VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,HISTORY_LIMIT,eligibleQuestions,selectQuestions,gradeSession,normalizeLabs,start,applySession,summary,legacyLessonSummary};
});
