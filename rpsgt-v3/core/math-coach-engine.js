(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTMathCoachEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2.0.0';
  const PASS_PERCENT=80;
  const INDEPENDENT_ADVANCE_PERCENT=67;
  const HISTORY_LIMIT=20;
  const STAGES=['learn','worked','guided','independent','mastery','complete'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const nowValue=value=>value||new Date().toISOString();

  function validateQuestion(question,path,issues){
    if(!isObject(question)){issues.push({code:'invalid-question',path});return;}
    if(!String(question.id||'').trim()) issues.push({code:'missing-question-id',path});
    if(!String(question.prompt||'').trim()) issues.push({code:'missing-question-prompt',path});
    if(!Number.isFinite(Number(question.answer))) issues.push({code:'invalid-question-answer',path});
    if(!String(question.unit||'').trim()) issues.push({code:'missing-question-unit',path});
  }
  function validateCatalog(catalog){
    const issues=[];const skills=Array.isArray(catalog&&catalog.skills)?catalog.skills:[];const ids=new Set();
    if(!skills.length) issues.push({code:'missing-skills',path:'skills'});
    skills.forEach((skill,index)=>{
      const path='skills['+index+']';const id=String(skill&&skill.id||'');
      if(!id) issues.push({code:'missing-skill-id',path});else if(ids.has(id)) issues.push({code:'duplicate-skill-id',path,id});else ids.add(id);
      ['title','formula','lesson','memoryClue','coachBobNote'].forEach(key=>{if(!String(skill&&skill[key]||'').trim())issues.push({code:'missing-skill-field',path:path+'.'+key});});
      if(!Array.isArray(skill&&skill.variables)||!skill.variables.length) issues.push({code:'missing-variables',path});
      if(!isObject(skill&&skill.workedExample)||!Array.isArray(skill.workedExample.steps)||skill.workedExample.steps.length<2) issues.push({code:'invalid-worked-example',path});
      ['guided','independent','mastery'].forEach(group=>{
        const rows=Array.isArray(skill&&skill[group])?skill[group]:[];
        if(group==='guided'&&rows.length<2) issues.push({code:'guided-retry-required',path});
        if(group==='independent'&&rows.length<3) issues.push({code:'independent-practice-too-small',path});
        if(group==='mastery'&&rows.length<5) issues.push({code:'mastery-check-too-small',path});
        rows.forEach((question,qIndex)=>validateQuestion(question,path+'.'+group+'['+qIndex+']',issues));
      });
      if(!Array.isArray(skill&&skill.studyResources)||!skill.studyResources.length) issues.push({code:'missing-study-resources',path});
    });
    return {valid:issues.length===0,issues,count:skills.length};
  }
  function skillMap(catalog){return new Map((catalog&&catalog.skills||[]).map(skill=>[String(skill.id),skill]));}
  function defaultSkill(){return {status:'not-started',stage:'learn',startedAt:null,updatedAt:null,masteredAt:null,guidedAttempts:0,independentAttempts:0,masteryAttempts:0,bestIndependentPercent:0,bestMasteryPercent:0,lastFeedback:null,history:[]};}
  function normalizeSkill(value){
    const source=isObject(value)?value:{};const base=defaultSkill();
    Object.keys(base).forEach(key=>{if(source[key]!==undefined)base[key]=clone(source[key]);});
    if(!STAGES.includes(base.stage)) base.stage='learn';
    if(base.masteredAt||base.status==='mastered') base.status='mastered';
    else if(base.startedAt||base.status==='in-progress') base.status='in-progress';
    else base.status='not-started';
    base.guidedAttempts=Math.max(0,safeNumber(base.guidedAttempts,0));
    base.independentAttempts=Math.max(0,safeNumber(base.independentAttempts,0));
    base.masteryAttempts=Math.max(0,safeNumber(base.masteryAttempts,0));
    base.bestIndependentPercent=Math.max(0,Math.min(100,safeNumber(base.bestIndependentPercent,0)));
    base.bestMasteryPercent=Math.max(0,Math.min(100,safeNumber(base.bestMasteryPercent,0)));
    base.history=Array.isArray(base.history)?base.history.filter(isObject).slice(0,HISTORY_LIMIT).map(clone):[];
    return base;
  }
  function normalizeState(value,catalog){
    const source=isObject(value)?value:{};const skills={};
    (catalog&&catalog.skills||[]).forEach(skill=>{skills[skill.id]=normalizeSkill(source.skills&&source.skills[skill.id]);});
    return {skills,currentSkill:skillMap(catalog).has(source.currentSkill)?source.currentSkill:null,updatedAt:source.updatedAt||null};
  }
  function updateSkill(value,catalog,skillId,mutator,time){
    const next=normalizeState(value,catalog);if(!next.skills[skillId]) return next;
    const record=next.skills[skillId];mutator(record);record.updatedAt=nowValue(time);next.currentSkill=skillId;next.updatedAt=record.updatedAt;return next;
  }
  function startSkill(value,catalog,skillId,time){
    return updateSkill(value,catalog,skillId,record=>{record.startedAt=record.startedAt||nowValue(time);if(record.status==='not-started')record.status='in-progress';if(record.stage==='complete'&&record.status!=='mastered')record.stage='learn';},time);
  }
  function setStage(value,catalog,skillId,stage,time){
    if(!STAGES.includes(stage)) return normalizeState(value,catalog);
    return updateSkill(value,catalog,skillId,record=>{record.startedAt=record.startedAt||nowValue(time);if(record.status==='not-started')record.status='in-progress';record.stage=stage;},time);
  }
  function numericResult(question,rawValue){
    const raw=String(rawValue==null?'':rawValue).trim();
    if(!raw) return {answered:false,correct:false,value:null,message:'Enter a number before checking your work.'};
    const value=Number(raw.replace(/,/g,''));
    if(!Number.isFinite(value)) return {answered:true,correct:false,value:null,message:'Use numbers only. Add the unit after the calculation, not inside the answer box.'};
    const answer=Number(question.answer);const tolerance=Math.max(0,safeNumber(question.tolerance,0.01));
    if(Math.abs(value-answer)<=tolerance) return {answered:true,correct:true,value,answer,unit:question.unit,message:question.success||'Correct. Your setup and unit match the expected result.'};
    const match=(question.commonErrors||[]).find(item=>Number.isFinite(Number(item.value))&&Math.abs(value-Number(item.value))<=Math.max(0,safeNumber(item.tolerance,tolerance)));
    return {answered:true,correct:false,value,answer,unit:question.unit,message:match&&match.message||question.hint||'Recheck the formula, denominator, unit conversion, and rounding.'};
  }
  function gradeSet(questions,answers){
    const rows=(Array.isArray(questions)?questions:[]).map(question=>{
      const result=numericResult(question,isObject(answers)?answers[question.id]:undefined);
      return {id:question.id,prompt:question.prompt,selected:result.value,answer:Number(question.answer),unit:question.unit,correct:result.correct,message:result.message};
    });
    const correct=rows.filter(row=>row.correct).length;const total=rows.length;const percent=total?Math.round(correct/total*100):0;
    return {correct,total,percent,responses:rows};
  }
  function historyEntry(kind,result,time){return {kind,correct:result.correct,total:result.total,percent:result.percent,completedAt:nowValue(time)};}
  function recordGuided(value,catalog,skillId,result,time){
    return updateSkill(value,catalog,skillId,record=>{
      record.guidedAttempts+=1;record.lastFeedback=clone(result);
      record.history=[{kind:'guided',correct:Boolean(result.correct),questionId:result.questionId||null,completedAt:nowValue(time)},...record.history].slice(0,HISTORY_LIMIT);
      if(result.correct) record.stage='independent';
    },time);
  }
  function recordIndependent(value,catalog,skillId,result,time,advancePercent){
    const threshold=Number.isFinite(Number(advancePercent))?Number(advancePercent):Number(catalog&&catalog.independentAdvancePercent)||INDEPENDENT_ADVANCE_PERCENT;
    return updateSkill(value,catalog,skillId,record=>{
      record.independentAttempts+=1;record.bestIndependentPercent=Math.max(record.bestIndependentPercent,safeNumber(result.percent,0));record.lastFeedback=clone(result);
      record.history=[historyEntry('independent',result,time),...record.history].slice(0,HISTORY_LIMIT);
      record.stage=result.percent>=threshold?'mastery':'independent';
    },time);
  }
  function awardFor(skill,record,time){return {id:'math-skill-'+skill.id,title:skill.shortTitle+' mastery medal',skillTitle:skill.title,earnedAt:record.masteredAt||nowValue(time),message:'You built the formula, checked the units, and demonstrated mastery.'};}
  function recordMastery(value,catalog,skillId,result,time,passPercent){
    const map=skillMap(catalog);const skill=map.get(skillId);const threshold=Number.isFinite(Number(passPercent))?Number(passPercent):Number(catalog&&catalog.passPercent)||PASS_PERCENT;let earnedNow=false;
    const next=updateSkill(value,catalog,skillId,record=>{
      record.masteryAttempts+=1;record.bestMasteryPercent=Math.max(record.bestMasteryPercent,safeNumber(result.percent,0));record.lastFeedback=clone(result);
      record.history=[historyEntry('mastery',result,time),...record.history].slice(0,HISTORY_LIMIT);
      if(result.percent>=threshold){earnedNow=record.status!=='mastered';record.status='mastered';record.stage='complete';record.masteredAt=record.masteredAt||nowValue(time);}else if(record.status!=='mastered') record.stage='mastery';
    },time);
    return {state:next,passed:result.percent>=threshold,earnedNow,award:result.percent>=threshold&&skill?awardFor(skill,next.skills[skillId],time):null};
  }
  function resetForPractice(value,catalog,skillId,time){return setStage(value,catalog,skillId,'guided',time);}
  function reviewSkill(value,catalog,skillId,time){return setStage(value,catalog,skillId,'learn',time);}
  function nextSkillId(catalog,skillId){const ids=(catalog&&catalog.skills||[]).map(skill=>skill.id);const index=ids.indexOf(skillId);return index>=0&&index<ids.length-1?ids[index+1]:null;}
  function summary(value,catalog){
    const state=normalizeState(value,catalog);const rows=(catalog&&catalog.skills||[]).map(skill=>({id:skill.id,title:skill.title,shortTitle:skill.shortTitle,category:skill.category,...clone(state.skills[skill.id])}));
    return {state,rows,counts:{total:rows.length,started:rows.filter(row=>row.status!=='not-started').length,mastered:rows.filter(row=>row.status==='mastered').length,attempts:rows.reduce((sum,row)=>sum+row.masteryAttempts,0)},current:state.currentSkill};
  }
  return {VERSION,PASS_PERCENT,INDEPENDENT_ADVANCE_PERCENT,HISTORY_LIMIT,STAGES,validateCatalog,skillMap,normalizeSkill,normalizeState,startSkill,setStage,numericResult,gradeSet,recordGuided,recordIndependent,recordMastery,resetForPractice,reviewSkill,nextSkillId,summary};
});
