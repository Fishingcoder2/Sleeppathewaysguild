(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.RPSGTReportQuestionReview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const list=value=>Array.isArray(value)?value:[];
 const text=value=>String(value==null?'':value);
 const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 function index(questionIndex){
   const records=Array.isArray(questionIndex)?questionIndex:list(questionIndex&&questionIndex.records);
   return new Map(records.map(r=>[text(r.id),r]));
 }
 function collect(saved){
   const byId=new Map();
   function record(id,mode,choice,at,task){
     if(id==null||!text(id))return;
     const key=text(id);let row=byId.get(key);
     if(!row){row={id:key,modes:[],observations:[],taskCode:task||null};byId.set(key,row);}
     if(!row.modes.includes(mode))row.modes.push(mode);
     if(!row.taskCode&&task)row.taskCode=task;
     if(choice!=null&&text(choice).trim())row.observations.push({mode,selected:text(choice),date:text(at)});
   }
   const review=obj(saved&&saved.review);
   list(review.missedIds).forEach(id=>record(id,'Missed review',null,null,null));
   const history=list(saved&&saved.progress&&saved.progress.history);
   // Include historical errors, even when subsequently mastered; one row per
   // distinct question and the latest recorded incorrect selection.
   history.forEach(item=>{
     if(item&&item.correct===false)record(item.questionId,'Practice',item.selectedAnswer,item.answeredAt,item.taskCode);
   });
   const readiness=list(saved&&saved.readiness&&saved.readiness.history)[0];
   if(readiness){
     list(readiness.missedIds).forEach(id=>record(id,'Readiness',null,readiness.completedAt,null));
     list(readiness.itemResults||readiness.details).filter(x=>x&&x.correct===false).forEach(x=>record(x.questionId??x.id,'Readiness',x.selectedAnswer??x.selected,readiness.completedAt,x.taskCode));
   }
   const mocks=list(saved&&saved.mock&&saved.mock.history),mock=mocks[mocks.length-1];
   if(mock){
     list(mock.scoredMissedIds).forEach(id=>record(id,'Mock',null,mock.completedAt,null));
     list(mock.itemResults||mock.details).filter(x=>x&&x.correct===false).forEach(x=>record(x.questionId??x.id,'Mock',x.selectedAnswer??x.selected,mock.completedAt,x.taskCode));
   }
   const checks=list(saved&&saved.guidedStudy&&saved.guidedStudy.checkpointHistory),seenChecks=new Set();
   checks.forEach(check=>{
     if(!check||!check.task||seenChecks.has(check.task))return;
     seenChecks.add(check.task);
     list(check.responses).filter(response=>response&&response.correct===false).forEach(response=>record(response.id,'Guided Study',response.selected,check.completedAt,check.task));
   });
   return [...byId.values()];
 }
 function taskCodes(saved,questionIndex){
   const map=index(questionIndex);
   const missed=collect(saved);
   const resolved=missed.map(item=>item.taskCode||map.get(item.id)?.taskCode);
   // Owner-approved additions and older saved question IDs may not appear
   // in the compact legacy feedback index; search approved task modules
   // rather than silently omitting their question and answer.
   if(missed.length&&resolved.some(code=>!/^D[1-4][A-D]$/.test(text(code)))){
     return ['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C'];
   }
   return [...new Set(resolved.filter(code=>/^D[1-4][A-D]$/.test(text(code))))];
 }
 function selectedLabel(observations,question){
   const sourceOrder=['Practice','Guided Study','Readiness','Mock'];
   const arranged=list(observations).sort((a,b)=>{
      const time=Date.parse(b.date||'')-Date.parse(a.date||'');
      return Number.isFinite(time)&&time!==0?time:sourceOrder.indexOf(a.mode)-sourceOrder.indexOf(b.mode);
   });
   const choice=arranged.length?arranged[0].selected:null;
   if(choice==null)return null;
   if(/^\d+$/.test(choice)&&!question.options.includes(choice)){
     const at=Number(choice);
     return question.options[at]||null;
   }
   return choice;
 }
 function build(saved,questionIndex,bank,blueprint){
   const map=index(questionIndex);
   const questions=new Map(list(bank).filter(q=>q&&q.id!=null).map(q=>[text(q.id),q]));
   const tasks=new Map(list(blueprint&&blueprint.domains).flatMap(d=>list(d.tasks).map(t=>[t.code,{title:t.title,domainName:d.fullName}])));
   let unresolved=0;
   const rows=collect(saved).map(item=>{
     const q=questions.get(item.id),info=map.get(item.id),code=item.taskCode||q?.taskCode||info?.taskCode||null;
     if(!q||q.qa?.manualReviewRecommended===true||q.qa?.learnerExcluded===true||
       q.learnerExcluded===true||q.reviewStatus==='retired'||q.publicationStatus==='proposed-not-learner-eligible'||
       !list(q.options).includes(q.answer)||!text(q.prompt).trim()||!text(q.rationale).trim()){unresolved++;return null;}
     return {
       questionId:item.id,taskCode:code,domain:code?code.slice(0,2):q.domain||null,
       taskTitle:tasks.get(code)?.title||null,domainName:tasks.get(code)?.domainName||null,
       topic:q.topic||info?.topic||null,modes:item.modes,question:q.prompt,options:q.options,
       selectedAnswer:selectedLabel(item.observations,q),
       correctAnswer:q.answer,rationale:q.rationale,
       referenceKeys:list(q.referenceKeys),studyRecommendationKeys:list(q.studyRecommendationKeys)
     };
   }).filter(Boolean);
   return {items:rows,unresolved,requested:rows.length+unresolved};
 }
 return {collect,taskCodes,build};
});