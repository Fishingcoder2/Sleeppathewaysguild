(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTMentoringDiagnosticEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const LAB_ID='mentoring-diagnostic';
  const HISTORY_LIMIT=20;
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

  function validateCatalog(catalog){
    const issues=[];
    const sections=Array.isArray(catalog&&catalog.sections)?catalog.sections:[];
    const questions=Array.isArray(catalog&&catalog.questions)?catalog.questions:[];
    const sectionIds=new Set();const questionIds=new Set();
    if(!sections.length) issues.push({code:'missing-sections'});
    if(!questions.length) issues.push({code:'missing-questions'});
    sections.forEach((section,index)=>{
      const id=String(section&&section.id||'');
      if(!id) issues.push({code:'missing-section-id',index});
      else if(sectionIds.has(id)) issues.push({code:'duplicate-section-id',id});
      else sectionIds.add(id);
      if(!String(section&&section.title||'').trim()) issues.push({code:'missing-section-title',id});
      if(!Number.isFinite(Number(section&&section.targetCorrect))) issues.push({code:'missing-section-target',id});
    });
    questions.forEach((question,index)=>{
      const id=String(question&&question.id||'');
      if(!id) issues.push({code:'missing-question-id',index});
      else if(questionIds.has(id)) issues.push({code:'duplicate-question-id',id});
      else questionIds.add(id);
      if(!sectionIds.has(String(question&&question.section||''))) issues.push({code:'unknown-question-section',id});
      if(!String(question&&question.taskCode||'').trim()) issues.push({code:'missing-task-code',id});
      if(!String(question&&question.prompt||'').trim()) issues.push({code:'missing-prompt',id});
      if(!Array.isArray(question&&question.options)||question.options.length!==4) issues.push({code:'invalid-options',id});
      const answer=Number(question&&question.answer);
      if(!Number.isInteger(answer)||answer<0||answer>3) issues.push({code:'invalid-answer',id});
      if(!String(question&&question.rationale||'').trim()) issues.push({code:'missing-rationale',id});
    });
    const expected=safeNumber(catalog&&catalog.meta&&catalog.meta.questionCount,questions.length);
    if(expected!==questions.length) issues.push({code:'question-count-mismatch',expected,actual:questions.length});
    return {valid:issues.length===0,issues,sectionCount:sections.length,questionCount:questions.length};
  }

  function grade(catalog,answers,completedAt){
    const questions=Array.isArray(catalog&&catalog.questions)?catalog.questions:[];
    const sections=Array.isArray(catalog&&catalog.sections)?catalog.sections:[];
    const selected=isObject(answers)?answers:{};
    const responses=questions.map(question=>{
      const raw=selected[question.id];
      const choice=raw===undefined||raw===null||raw===''?null:Number(raw);
      return {id:question.id,section:question.section,taskCode:question.taskCode,topic:question.topic||'',skill:question.skill||'',selected:Number.isInteger(choice)?choice:null,answer:question.answer,correct:Number.isInteger(choice)&&choice===question.answer,answered:Number.isInteger(choice)};
    });
    const sectionResults=sections.map(section=>{
      const rows=responses.filter(row=>row.section===section.id);
      const correct=rows.filter(row=>row.correct).length;
      const answered=rows.filter(row=>row.answered).length;
      const total=rows.length;
      const targetCorrect=Math.min(total,Math.max(0,safeNumber(section.targetCorrect,0)));
      const missedSkills=[...new Set(rows.filter(row=>!row.correct).map(row=>row.skill||row.topic).filter(Boolean))];
      return {id:section.id,title:section.title,correct,answered,total,percent:total?Math.round(correct/total*100):0,targetCorrect,targetMet:correct>=targetCorrect,missedSkills};
    });
    const correct=responses.filter(row=>row.correct).length;
    const answered=responses.filter(row=>row.answered).length;
    const total=questions.length;
    const overallTarget=Math.min(total,Math.max(0,safeNumber(catalog&&catalog.targets&&catalog.targets.overallCorrect,total)));
    const allSectionsMet=sectionResults.every(row=>row.targetMet);
    const targetMet=correct>=overallTarget&&allSectionsMet;
    return {
      id:'mentoring-diagnostic-'+(completedAt||new Date().toISOString()),
      labId:LAB_ID,
      source:'v3-mentoring-diagnostic',
      completedAt:completedAt||new Date().toISOString(),
      correct,answered,total,percent:total?Math.round(correct/total*100):0,
      overallTarget,targetMet,allSectionsMet,
      sectionResults,responses,
      missedQuestionIds:responses.filter(row=>!row.correct).map(row=>row.id)
    };
  }

  function band(result){
    if(!result||!result.total) return {id:'not-scored',title:'Not scored',message:'Complete the diagnostic to generate a mentoring plan.'};
    if(result.targetMet) return {id:'application-ready',title:'Ready for timed mixed application',message:'The core targets were met. Use mentoring time for speed, mixed scenarios, and confidence under exam-style conditions.'};
    if(result.correct>=17) return {id:'targeted-reinforcement',title:'Targeted reinforcement',message:'Most foundations are in place. Concentrate mentoring on the section targets that were missed, then repeat mixed application.'};
    if(result.correct>=13) return {id:'concentrated-remediation',title:'Concentrated remediation',message:'Several applied pathways need deliberate practice before timed mixed work.'};
    return {id:'foundations-rebuild',title:'Foundations rebuild',message:'Rebuild the calculation and troubleshooting pathways step by step before increasing speed or question volume.'};
  }

  function mentoringPlan(catalog,result){
    const sectionMap=new Map((catalog&&catalog.sections||[]).map(section=>[section.id,section]));
    const weak=(result&&result.sectionResults||[]).filter(row=>!row.targetMet).sort((a,b)=>(a.percent-b.percent)||(b.total-a.total));
    const priorities=(weak.length?weak:(result&&result.sectionResults||[]).slice().sort((a,b)=>a.percent-b.percent).slice(0,2)).map(row=>{
      const section=sectionMap.get(row.id)||{};
      return {id:row.id,title:row.title,score:`${row.correct}/${row.total}`,percent:row.percent,target:`${row.targetCorrect}/${row.total}`,missedSkills:row.missedSkills||[],resources:clone(section.resources||[]),taskCodes:clone(section.taskCodes||[])};
    });
    const overallBand=band(result);
    const nextActions=[];
    if(priorities.some(item=>item.id==='calculations')) nextActions.push('Work missed formulas untimed: write numerator, denominator, time conversion, unit, and a reasonableness check before calculating.');
    if(priorities.some(item=>item.id==='artifacts')) nextActions.push('For each artifact, practice the same sequence: identify affected channels, find the shared source, correct the cause, verify the signal, then document.');
    if(priorities.some(item=>item.id==='scoring')) nextActions.push('Verify version-sensitive scoring definitions in the AASM Scoring Manual Version 3, then connect each rule to the report value it changes.');
    if(priorities.some(item=>item.id==='integrated')) nextActions.push('Practice scenario questions by choosing the safest FIRST action, then the least disruptive technical correction, verification step, and documentation.');
    if(result&&result.targetMet) nextActions.push('Move to timed mixed practice and ask the learner to explain why each distractor is less appropriate than the best answer.');
    else nextActions.push('Repeat this diagnostic after targeted review; compare section results rather than treating the overall percentage as an exam passing prediction.');
    return {band:overallBand,priorities,nextActions};
  }

  function normalizeLabs(value){
    const labs=isObject(value)?clone(value):{};
    const completed=new Set(Array.isArray(labs.completed)?labs.completed.map(String):[]);
    const started=isObject(labs.started)?clone(labs.started):{};
    const source=isObject(labs[LAB_ID])?labs[LAB_ID]:{};
    const history=Array.isArray(source.history)?source.history.filter(isObject).slice(0,HISTORY_LIMIT).map(clone):[];
    const bestPercent=Math.max(0,Math.min(100,safeNumber(source.bestPercent,history.reduce((best,item)=>Math.max(best,safeNumber(item.percent,0)),0))));
    const completedFlag=Boolean(source.completed)||completed.has(LAB_ID);
    return {labs,completed,started,record:{status:completedFlag?'completed':source.startedAt?'in-progress':'not-started',completed:completedFlag,startedAt:source.startedAt||null,updatedAt:source.updatedAt||null,completedAt:source.completedAt||null,attempts:Math.max(history.length,safeNumber(source.attempts,history.length)),bestPercent,latestResult:isObject(source.latestResult)?clone(source.latestResult):history[0]||null,history}};
  }

  function persist(normalized,time){
    const record=normalized.record;
    record.updatedAt=time;
    if(record.startedAt) normalized.started[LAB_ID]=normalized.started[LAB_ID]||{startedAt:record.startedAt};
    if(record.completed) normalized.completed.add(LAB_ID);
    normalized.labs.started=normalized.started;
    normalized.labs.completed=[...normalized.completed].sort();
    normalized.labs.lastLab=LAB_ID;
    normalized.labs[LAB_ID]=record;
    return normalized.labs;
  }
  function start(value,time){
    const normalized=normalizeLabs(value);const now=time||new Date().toISOString();
    normalized.record.startedAt=normalized.record.startedAt||now;
    if(!normalized.record.completed) normalized.record.status='in-progress';
    return persist(normalized,now);
  }
  function applyResult(value,result){
    const normalized=normalizeLabs(value);const now=result&&result.completedAt||new Date().toISOString();const safe=clone(result);
    normalized.record.startedAt=normalized.record.startedAt||now;
    normalized.record.latestResult=safe;
    normalized.record.history=[safe,...normalized.record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);
    normalized.record.attempts=normalized.record.history.length;
    normalized.record.bestPercent=Math.max(normalized.record.bestPercent,safeNumber(safe.percent,0));
    if(safe.targetMet){normalized.record.completed=true;normalized.record.status='completed';normalized.record.completedAt=normalized.record.completedAt||now;}
    else if(!normalized.record.completed) normalized.record.status='in-progress';
    return persist(normalized,now);
  }
  function summary(value){return clone(normalizeLabs(value).record);}

  return {VERSION,LAB_ID,HISTORY_LIMIT,validateCatalog,grade,band,mentoringPlan,normalizeLabs,start,applyResult,summary};
});
