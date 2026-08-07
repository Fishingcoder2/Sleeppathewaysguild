(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.RPSGTReportsEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const percent=(correct,answered)=>answered?Math.round((Number(correct)||0)/(Number(answered)||0)*100):0;
  const byId=records=>new Map((records||[]).map(record=>[String(record.id),record]));
  function flattenTasks(blueprint){const tasks=[];(blueprint&&blueprint.domains||[]).forEach(domain=>(domain.tasks||[]).forEach(task=>tasks.push({...task,domain:domain.id,domainName:domain.fullName})));return tasks;}
  function questionRecords(ids,index){const map=index instanceof Map?index:byId(index);return (ids||[]).map(id=>map.get(String(id))).filter(Boolean);}
  function countBy(records,key){const counts={};(records||[]).forEach(record=>{const value=record&&record[key];if(value) counts[value]=(counts[value]||0)+1;});return counts;}
  function topEntries(counts,limit){return Object.entries(counts||{}).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))).slice(0,limit||5).map(([label,count])=>({label,count}));}
  function taskRows(saved,blueprint,index){
    const map=index instanceof Map?index:byId(index);const missed=questionRecords(saved&&saved.review&&saved.review.missedIds,map);const mastered=questionRecords(saved&&saved.review&&saved.review.masteredIds,map);const missedBy=countBy(missed,"taskCode");const masteredBy=countBy(mastered,"taskCode");
    return flattenTasks(blueprint).map(task=>{const stats=saved&&saved.progress&&saved.progress.byTask&&saved.progress.byTask[task.code]||{};const answered=Number(stats.answered||0),correct=Number(stats.correct||0);return {...task,answered,correct,percent:percent(correct,answered),missed:missedBy[task.code]||0,mastered:masteredBy[task.code]||0};});
  }
  function weakTaskScore(row){const errorRate=row.answered?1-row.correct/row.answered:0;return row.missed*8+errorRate*Math.min(row.answered,100)+(row.answered?0:2);}
  function rankWeakTasks(rows,limit){return (rows||[]).filter(row=>row.answered||row.missed).slice().sort((a,b)=>weakTaskScore(b)-weakTaskScore(a)||a.percent-b.percent||b.missed-a.missed).slice(0,limit||5);}
  function historyCounts(saved){const history=saved&&saved.progress&&Array.isArray(saved.progress.history)?saved.progress.history:[];return {practice:history.filter(item=>item.source==="v3-practice-full-bank").length,review:history.filter(item=>/^v3-review-/.test(item.source||"")).length,total:history.length};}
  function latest(history){return Array.isArray(history)&&history.length?history[0]:null;}
  function evidenceScores(saved,rows){
    const scores=Object.fromEntries((rows||[]).map(row=>[row.code,weakTaskScore(row)]));
    const addWeak=(history,multiplier)=>{const record=latest(history);(record&&record.weakestTasks||[]).forEach((task,index)=>{scores[task.taskCode]=(scores[task.taskCode]||0)+(5-index)*multiplier;});};
    addWeak(saved&&saved.readiness&&saved.readiness.history,5);addWeak(saved&&saved.mock&&saved.mock.history,8);return scores;
  }
  function studyPlan(saved,blueprint,index,limit){
    const rows=taskRows(saved,blueprint,index);const scores=evidenceScores(saved,rows);const map=index instanceof Map?index:byId(index);const missed=questionRecords(saved&&saved.review&&saved.review.missedIds,map);
    return rows.map(row=>{const topics=topEntries(countBy(missed.filter(question=>question.taskCode===row.code),"topic"),3);return {...row,evidenceScore:scores[row.code]||0,topics};}).filter(row=>row.evidenceScore>0).sort((a,b)=>b.evidenceScore-a.evidenceScore||a.code.localeCompare(b.code)).slice(0,limit||3);
  }
  return {percent,byId,flattenTasks,questionRecords,countBy,topEntries,taskRows,rankWeakTasks,historyCounts,latest,evidenceScores,studyPlan};
});
