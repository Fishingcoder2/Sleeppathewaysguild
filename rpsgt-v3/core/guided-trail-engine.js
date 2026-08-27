(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTGuidedTrailEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.3.0';
  const PASS_PERCENT=80;
  const BADGE_QUESTION_COUNT=15;
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const taskList=blueprint=>(blueprint&&blueprint.domains||[]).flatMap(domain=>(domain.tasks||[]).map(task=>({...task,domain:domain.id,domainName:domain.fullName})));
  const taskMap=blueprint=>new Map(taskList(blueprint).map(task=>[task.code,task]));
  function normalizeAwardMap(value){return isObject(value)?clone(value):{};}
  function normalizeMarks(value){
    if(!isObject(value)) return {};
    return Object.keys(value).reduce((out,key)=>{
      const item=value[key];
      if(item===true) out[key]={completed:true,completedAt:null,source:'legacy'};
      else if(isObject(item)) out[key]={completed:item.completed!==false,completedAt:item.completedAt||null,source:item.source||'v3-guided-study'};
      return out;
    },{});
  }
  function normalizeState(value){
    const source=isObject(value)?value:{};
    const awards=isObject(source.trailAwards)?source.trailAwards:{};
    return {
      trailAwards:{tasks:normalizeAwardMap(awards.tasks),domains:normalizeAwardMap(awards.domains)},
      trailStudyMarks:normalizeMarks(source.trailStudyMarks),
      lastTrailPost:isObject(source.lastTrailPost)?clone(source.lastTrailPost):null,
      trailDomain:typeof source.trailDomain==='string'?source.trailDomain:null,
      trailFocus:isObject(source.trailFocus)?clone(source.trailFocus):null,
      checkpointHistory:Array.isArray(source.checkpointHistory)?clone(source.checkpointHistory):Array.isArray(source.trailCheckpointHistory)?clone(source.trailCheckpointHistory):[]
    };
  }
  function completePrompt(value){
    const prompt=String(value||'').trim();
    if(prompt.length<12) return false;
    if(/(?:\.{3,}|…)\s*$/.test(prompt)) return false;
    if(/\b(?:tbd|to be completed|incomplete question|placeholder)\b/i.test(prompt)) return false;
    return true;
  }
  function eligibleQuestion(record,taskCode){
    if(!record||record.taskCode!==taskCode) return false;
    if(record.qa&&record.qa.manualReviewRecommended||record.manualReviewRecommended) return false;
    if(!completePrompt(record.prompt)) return false;
    if(!Array.isArray(record.options)||record.options.length<2) return false;
    if(record.options.some(option=>!String(option==null?'':option).trim())) return false;
    if(!String(record.answer==null?'':record.answer).trim()||!record.options.includes(record.answer)) return false;
    return true;
  }
  function hash(text){let value=2166136261;for(let i=0;i<String(text).length;i+=1){value^=String(text).charCodeAt(i);value=Math.imul(value,16777619);}return value>>>0;}
  function seededRandom(seed){let state=hash(seed)||1;return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};}
  function selectQuestions(records,taskCode,count,seed){
    const eligible=(records||[]).filter(record=>eligibleQuestion(record,taskCode));
    const copy=eligible.slice();const random=seededRandom(seed||taskCode);
    for(let i=copy.length-1;i>0;i-=1){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
    return copy.slice(0,Math.max(0,Number(count)||BADGE_QUESTION_COUNT)).map(clone);
  }
  function gradeCheckpoint(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];
    const answers=isObject(input&&input.answers)?input.answers:{};
    const correct=questions.reduce((sum,question)=>sum+(answers[String(question.id)]===question.answer?1:0),0);
    const total=questions.length;
    const percent=total?Math.round(correct/total*100):0;
    const taskCode=input&&input.taskCode||questions[0]&&questions[0].taskCode||null;
    const domain=taskCode?String(taskCode).slice(0,2):null;
    const completedAt=input&&input.completedAt||new Date().toISOString();
    const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    return {
      id:'trail-'+String(taskCode||'unknown').toLowerCase()+'-'+completedAt,
      source:'v3-guided-trail-checkpoint',scope:'task',domain,task:taskCode,
      score:percent,percent,total,correct,passed:total>0&&percent>=passPercent,passPercent,completedAt,
      questionIds:questions.map(question=>question.id),
      responses:questions.map(question=>({id:question.id,selected:answers[String(question.id)]??null,correct:answers[String(question.id)]===question.answer}))
    };
  }
  function markTaskStudy(value,taskCode,completedAt){
    const next=normalizeState(value);const time=completedAt||new Date().toISOString();
    next.trailStudyMarks[taskCode]={completed:true,completedAt:time,source:'v3-guided-study'};
    next.trailDomain=String(taskCode).slice(0,2);next.trailFocus={domain:next.trailDomain,task:taskCode};
    next.lastTrailPost={domain:next.trailDomain,task:taskCode,kind:'study-mark',completedAt:time};
    return next;
  }
  function applyCheckpoint(value,record,blueprint){
    const next=normalizeState(value);const safe=clone(record);
    next.checkpointHistory=[safe,...next.checkpointHistory.filter(item=>item&&item.id!==safe.id)];
    next.trailDomain=safe.domain||next.trailDomain;next.trailFocus={domain:safe.domain,task:safe.task};
    next.lastTrailPost={domain:safe.domain,task:safe.task,kind:'checkpoint',score:safe.score,passed:safe.passed,completedAt:safe.completedAt};
    const qualifiesForBadge=Number(safe.total)>=BADGE_QUESTION_COUNT&&safe.passed&&safe.task;
    if(qualifiesForBadge){next.trailAwards.tasks[safe.task]={earnedAt:safe.completedAt,score:safe.score,correct:safe.correct,total:safe.total,checkpointId:safe.id};}
    const tasks=taskList(blueprint).filter(task=>task.domain===safe.domain);
    if(tasks.length&&tasks.every(task=>next.trailAwards.tasks[task.code])){
      next.trailAwards.domains[safe.domain]={earnedAt:safe.completedAt,taskCount:tasks.length,source:'v3-guided-trail'};
    }
    return next;
  }
  function summary(value,blueprint){
    const state=normalizeState(value);const tasks=taskList(blueprint);
    const rows=tasks.map(task=>{
      const checkpoints=state.checkpointHistory.filter(item=>item&&item.task===task.code);
      return {...task,studyMarked:Boolean(state.trailStudyMarks[task.code]&&state.trailStudyMarks[task.code].completed),award:state.trailAwards.tasks[task.code]||null,checkpointCount:checkpoints.length,latestCheckpoint:checkpoints[0]||null};
    });
    const domains=(blueprint&&blueprint.domains||[]).map(domain=>{
      const domainRows=rows.filter(row=>row.domain===domain.id);
      return {id:domain.id,name:domain.fullName,taskCount:domainRows.length,studyMarked:domainRows.filter(row=>row.studyMarked).length,taskAwards:domainRows.filter(row=>row.award).length,award:state.trailAwards.domains[domain.id]||null};
    });
    return {state,rows,domains,counts:{studyMarks:rows.filter(row=>row.studyMarked).length,taskAwards:rows.filter(row=>row.award).length,domainAwards:domains.filter(domain=>domain.award).length,checkpoints:state.checkpointHistory.length},latestCheckpoint:state.checkpointHistory[0]||null,currentFocus:state.trailFocus||state.lastTrailPost||null};
  }
  return {VERSION,PASS_PERCENT,BADGE_QUESTION_COUNT,normalizeState,taskList,taskMap,completePrompt,eligibleQuestion,selectQuestions,gradeCheckpoint,markTaskStudy,applyCheckpoint,summary};
});