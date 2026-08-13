(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTVisualRespiratoryEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='0.1.0';
  const LAB_ID='visual-respiratory';
  const HISTORY_LIMIT=20;
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  function hashSeed(value){let hash=2166136261;const text=String(value||'visual-respiratory');for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
  function seededRandom(seed){let state=hashSeed(seed)||1;return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};}
  function shuffle(values,seed){const result=values.slice(),random=seededRandom(seed);for(let i=result.length-1;i>0;i-=1){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  function parsePoint(value){const match=String(value==null?'':value).match(/^(.+)@(-?\d+(?:\.\d+)?)$/);return match?{channel:match[1],time:Number(match[2])}:null;}
  function parseInterval(value){const match=String(value==null?'':value).match(/^(.+)@(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);if(!match)return null;const first=Number(match[2]),second=Number(match[3]);return {channel:match[1],start:Math.min(first,second),end:Math.max(first,second)};}
  function pointAnswer(question){const target=question&&question.target||{},start=safeNumber(target.start,0),end=safeNumber(target.end,start);return String(target.channel||'')+'@'+((start+end)/2).toFixed(2);}
  function intervalAnswer(question){const target=question&&question.target||{};return String(target.channel||'')+'@'+safeNumber(target.start,0).toFixed(2)+'-'+safeNumber(target.end,0).toFixed(2);}
  function validateTarget(question,channelSet,prefix,issues){const target=question.target||{};if(!target.channel||!channelSet.has(String(target.channel)))issues.push('invalid-'+prefix+'-channel:'+(question.id||'unknown'));if(!Number.isFinite(Number(target.start))||!Number.isFinite(Number(target.end))||Number(target.end)<Number(target.start))issues.push('invalid-'+prefix+'-window:'+(question.id||'unknown'));}
  function validatePack(pack){
    const issues=[];
    if(!pack||!pack.meta||pack.meta.appAuthored!==true)issues.push('pack-must-be-app-authored');
    const studies=Array.isArray(pack&&pack.studies)?pack.studies:[],questions=Array.isArray(pack&&pack.questions)?pack.questions:[],studyIds=new Set(),channelsByStudy=new Map();
    studies.forEach(study=>{if(!study||!study.id)issues.push('missing-study-id');else if(studyIds.has(String(study.id)))issues.push('duplicate-study-id:'+study.id);else studyIds.add(String(study.id));const channels=Array.isArray(study&&study.channels)?study.channels:[];channelsByStudy.set(String(study&&study.id),new Set(channels.map(channel=>String(channel&&channel.label))));if(!channels.length)issues.push('missing-study-channels:'+(study&&study.id||'unknown'));if(!(safeNumber(study&&study.durationSeconds)>0))issues.push('invalid-study-duration:'+(study&&study.id||'unknown'));});
    const questionIds=new Set();
    questions.forEach(question=>{
      if(!question||!question.id)issues.push('missing-question-id');else if(questionIds.has(String(question.id)))issues.push('duplicate-question-id:'+question.id);else questionIds.add(String(question.id));
      const studyId=String(question&&question.studyId),channelSet=channelsByStudy.get(studyId)||new Set();if(!studyIds.has(studyId))issues.push('unknown-study:'+studyId);
      if(!['choice','region-choice','point-click','interval-mark'].includes(question&&question.type))issues.push('unsupported-question-type:'+(question&&question.id||'unknown'));
      if(question&&question.type==='choice'&&(!Array.isArray(question.options)||!question.options.includes(question.answer)))issues.push('invalid-choice-answer:'+(question.id||'unknown'));
      if(question&&question.type==='region-choice'){const regions=Array.isArray(question.regions)?question.regions:[];if(!regions.some(region=>region&&region.id===question.answer))issues.push('invalid-region-answer:'+(question.id||'unknown'));}
      if(question&&question.type==='point-click'){validateTarget(question,channelSet,'point',issues);const fallback=Array.isArray(question.fallbackPoints)?question.fallbackPoints:[];fallback.forEach(point=>{if(!channelSet.has(String(point&&point.channel))||!Number.isFinite(Number(point&&point.time)))issues.push('invalid-fallback-point:'+(question.id||'unknown'));});}
      if(question&&question.type==='interval-mark'){validateTarget(question,channelSet,'interval',issues);const fallback=Array.isArray(question.fallbackIntervals)?question.fallbackIntervals:[];fallback.forEach(item=>{if(!channelSet.has(String(item&&item.channel))||!Number.isFinite(Number(item&&item.start))||!Number.isFinite(Number(item&&item.end))||Number(item.end)<Number(item.start))issues.push('invalid-fallback-interval:'+(question.id||'unknown'));});}
    });
    return {valid:issues.length===0,issues,studyCount:studies.length,questionCount:questions.length};
  }
  function buildSession(pack,seed){const validation=validatePack(pack);if(!validation.valid)throw new Error('Respiratory visual pack validation failed: '+validation.issues.join(', '));const studies=new Map(pack.studies.map(study=>[String(study.id),clone(study)])),studyOrder=shuffle(pack.studies.map(study=>String(study.id)),String(seed||'respiratory-visual-session')),questionsByStudy=new Map(studyOrder.map(id=>[id,[]]));pack.questions.forEach(question=>{const id=String(question.studyId);if(!questionsByStudy.has(id))questionsByStudy.set(id,[]);questionsByStudy.get(id).push(clone(question));});return {id:'visual-respiratory-'+String(seed||new Date().toISOString()),questions:studyOrder.flatMap(id=>questionsByStudy.get(id)||[]),studies,studyOrder};}
  function gradeAnswer(question,selected){
    let correct=false,answer=question.answer;
    if(question.type==='point-click'){
      const point=parsePoint(selected),target=question.target||{},tolerance=Math.max(0,safeNumber(question.toleranceSeconds,0)),start=safeNumber(target.start)-tolerance,end=safeNumber(target.end)+tolerance;correct=Boolean(point)&&point.channel===String(target.channel)&&point.time>=start&&point.time<=end;answer=pointAnswer(question);
    }else if(question.type==='interval-mark'){
      const interval=parseInterval(selected),target=question.target||{},tolerance=Math.max(0,safeNumber(question.toleranceSeconds,.4));correct=Boolean(interval)&&interval.channel===String(target.channel)&&Math.abs(interval.start-safeNumber(target.start))<=tolerance&&Math.abs(interval.end-safeNumber(target.end))<=tolerance;answer=intervalAnswer(question);
    }else correct=String(selected)===String(question.answer);
    return {id:question.id,selected:selected==null?null:String(selected),correct,answer,taskCode:question.taskCode||null,type:question.type};
  }
  function gradeSession(input){const questions=Array.isArray(input&&input.questions)?input.questions:[],answers=isObject(input&&input.answers)?input.answers:{},completedAt=input&&input.completedAt||new Date().toISOString(),responses=questions.map(question=>gradeAnswer(question,answers[String(question.id)])),correct=responses.filter(item=>item.correct).length,total=responses.length,percent=total?Math.round(correct/total*100):0;return {id:'visual-respiratory-'+completedAt,source:'v3-lab-visual-respiratory',labId:LAB_ID,correct,total,percent,completedAt,questionIds:questions.map(question=>question.id),responses};}
  function normalizeRecord(value){const source=isObject(value)?value:{},history=Array.isArray(source.history)?source.history.filter(isObject).map(clone):[];return {status:source.status==='in-progress'?'in-progress':'not-started',startedAt:source.startedAt||null,updatedAt:source.updatedAt||null,attempts:Math.max(history.length,safeNumber(source.attempts,history.length)),bestPercent:Math.max(0,Math.min(100,safeNumber(source.bestPercent,0))),latestSession:isObject(source.latestSession)?clone(source.latestSession):history[0]||null,history};}
  function normalizeLabs(value){const labs=isObject(value)?clone(value):{},started=isObject(labs.started)?clone(labs.started):{};return {labs,started,record:normalizeRecord(labs[LAB_ID])};}
  function persist(normalized,time){const record=normalized.record;record.status='in-progress';record.updatedAt=time;normalized.started[LAB_ID]=isObject(normalized.started[LAB_ID])?normalized.started[LAB_ID]:{startedAt:record.startedAt||time};normalized.labs.started=normalized.started;normalized.labs.lastLab=LAB_ID;normalized.labs[LAB_ID]=record;return normalized.labs;}
  function start(value,startedAt){const normalized=normalizeLabs(value),time=startedAt||new Date().toISOString();if(!normalized.record.startedAt)normalized.record.startedAt=time;return persist(normalized,time);}
  function applySession(value,session){const normalized=normalizeLabs(value),record=normalized.record,safe=clone(session),time=safe.completedAt||new Date().toISOString(),existing=record.history.some(item=>item&&item.id===safe.id);record.startedAt=record.startedAt||time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!existing)record.attempts+=1;record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));return persist(normalized,time);}
  function summary(value){return clone(normalizeLabs(value).record);}
  return {VERSION,LAB_ID,HISTORY_LIMIT,hashSeed,shuffle,parsePoint,parseInterval,pointAnswer,intervalAnswer,validatePack,buildSession,gradeAnswer,gradeSession,normalizeLabs,start,applySession,summary};
});
