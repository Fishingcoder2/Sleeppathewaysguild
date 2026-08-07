(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.RPSGTStudyFeedback=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function textBlob(value){return String(value||"").toLowerCase().replace(/[^a-z0-9+/-]+/g," ").replace(/\s+/g," ").trim();}
  function sourceMap(data){return new Map((data&&data.sources||[]).map(source=>[source.id,source]));}
  function sectionMap(data){
    const map=new Map();
    (data&&data.sources||[]).forEach(source=>(source.sections||[]).forEach(section=>map.set(section.id,{...section,sourceId:source.id,sourceTitle:source.shortTitle||source.title})));
    return map;
  }
  function matchesFamily(question,family){
    const blob=textBlob([question&&question.topic,question&&question.questionType,question&&question.reportCategory,question&&question.task,question&&question.prompt,(question&&question.referenceKeys||[]).join(" "),(question&&question.studyRecommendationKeys||[]).join(" ")].join(" "));
    return (family.keywords||[]).some(keyword=>blob.includes(textBlob(keyword)));
  }
  function familyMatches(question,data){return (data&&data.topicFamilies||[]).filter(family=>matchesFamily(question,family));}
  function expandRoute(entries,data){
    const sources=sourceMap(data);const sections=sectionMap(data);const out=[];
    (entries||[]).forEach(entry=>{
      const source=sources.get(entry.sourceId);if(!source) return;
      (entry.sectionIds||[]).forEach(sectionId=>{const section=sections.get(sectionId);if(section) out.push({sourceId:source.id,sourceTitle:source.shortTitle||source.title,sourceType:source.sourceType,sectionId,sectionLabel:section.label||section.title,reason:entry.reason||""});});
    });
    return out;
  }
  function questionRoute(question,data,limit){
    const max=Math.max(1,Number(limit)||4);const seen=new Set();const out=[];
    const add=item=>{const key=item.sourceId+"|"+item.sectionId;if(seen.has(key)||out.length>=max) return;seen.add(key);out.push(item);};
    familyMatches(question,data).forEach(family=>(family.recommendations||[]).forEach(pair=>expandRoute([{sourceId:pair[0],sectionIds:pair[1],reason:"Matched topic: "+family.label}],data).forEach(add)));
    const taskPlan=data&&data.taskPlans&&data.taskPlans[question&&question.taskCode];
    expandRoute(taskPlan&&taskPlan.sequence||[],data).forEach(add);
    return out;
  }
  function taskRoute(taskCode,topicLabels,data,limit){
    const max=Math.max(1,Number(limit)||6);const seen=new Set();const out=[];
    const add=item=>{const key=item.sourceId+"|"+item.sectionId;if(seen.has(key)||out.length>=max) return;seen.add(key);out.push(item);};
    const pseudo={taskCode,topic:(topicLabels||[]).join(" ")};
    familyMatches(pseudo,data).forEach(family=>(family.recommendations||[]).forEach(pair=>expandRoute([{sourceId:pair[0],sectionIds:pair[1],reason:"Matched weak topic: "+family.label}],data).forEach(add)));
    const taskPlan=data&&data.taskPlans&&data.taskPlans[taskCode];
    expandRoute(taskPlan&&taskPlan.sequence||[],data).forEach(add);
    return out;
  }
  function groupBySource(route){
    const grouped=[];const map=new Map();
    (route||[]).forEach(item=>{let group=map.get(item.sourceId);if(!group){group={sourceId:item.sourceId,sourceTitle:item.sourceTitle,sourceType:item.sourceType,sections:[]};map.set(item.sourceId,group);grouped.push(group);}group.sections.push({sectionId:item.sectionId,label:item.sectionLabel,reason:item.reason});});
    return grouped;
  }
  return {textBlob,matchesFamily,familyMatches,expandRoute,questionRoute,taskRoute,groupBySource};
});
