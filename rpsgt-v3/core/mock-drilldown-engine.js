(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.RPSGTMockDrilldown=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const FILTERS=["missed","unanswered","flagged","all"];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const sameId=(a,b)=>String(a)===String(b);
  const makeMap=records=>records instanceof Map?records:new Map((records||[]).map(record=>[String(record.id),record]));

  function compactItemResults(items,questionsById,answers,flags){
    const questionMap=questionsById instanceof Map?questionsById:new Map(Object.entries(questionsById||{}).map(([id,question])=>[String(id),question]));
    const answerMap=answers||{};
    const flagSet=new Set((flags||[]).map(String));
    return (items||[]).map(function(item,index){
      const id=String(item&&item.id||"");
      const question=questionMap.get(id)||{};
      const selected=answerMap[id]||"";
      const options=Array.isArray(question.options)?question.options:[];
      const selectedIndex=selected?options.findIndex(option=>option===selected):-1;
      return {
        id:id,
        position:index+1,
        role:item&&item.role==="pretest"?"pretest":"scored",
        domain:String(question.domain||""),
        taskCode:String(question.taskCode||""),
        answered:Boolean(selected),
        correct:Boolean(selected)&&selected===question.answer,
        flagged:flagSet.has(id),
        selectedIndex:selectedIndex>=0?selectedIndex:null
      };
    });
  }

  function normalizeItem(item,index){
    const position=Math.max(1,Number(item&&item.position)||index+1);
    const selectedIndex=Number.isInteger(item&&item.selectedIndex)&&item.selectedIndex>=0?item.selectedIndex:null;
    return {
      id:String(item&&item.id||""),
      position:position,
      role:item&&item.role==="pretest"?"pretest":"scored",
      domain:String(item&&item.domain||""),
      taskCode:String(item&&item.taskCode||""),
      answered:Boolean(item&&item.answered),
      correct:Boolean(item&&item.correct),
      flagged:Boolean(item&&item.flagged),
      selectedIndex:selectedIndex
    };
  }

  function normalizeAttempt(record){
    const source=record&&typeof record==="object"?record:{};
    const itemResults=Array.isArray(source.itemResults)?source.itemResults.map(normalizeItem).filter(item=>item.id):[];
    return {
      resultVersion:Number(source.resultVersion||1),
      sessionId:String(source.sessionId||""),
      completedAt:source.completedAt||null,
      timed:Boolean(source.timed),
      elapsedMs:Math.max(0,Number(source.elapsedMs)||0),
      answeredTotal:Math.max(0,Number(source.answeredTotal)||0),
      scoredCorrect:Math.max(0,Number(source.scoredCorrect)||0),
      scoredPercent:Math.max(0,Number(source.scoredPercent)||0),
      weightedPercent:Math.max(0,Number(source.weightedPercent)||0),
      unansweredCount:Math.max(0,Number(source.unansweredCount)||0),
      flaggedCount:Math.max(0,Number(source.flaggedCount)||itemResults.filter(item=>item.flagged).length),
      byDomain:clone(source.byDomain&&typeof source.byDomain==="object"?source.byDomain:{}),
      weakestTasks:clone(Array.isArray(source.weakestTasks)?source.weakestTasks:[]),
      taskBreakdown:clone(Array.isArray(source.taskBreakdown)?source.taskBreakdown:[]),
      itemResults:itemResults
    };
  }

  function detailLevel(record){return normalizeAttempt(record).itemResults.length?"question-review":"aggregate-only";}

  function filterItems(record,filter){
    const attempt=normalizeAttempt(record);
    const mode=FILTERS.includes(filter)?filter:"missed";
    return attempt.itemResults.filter(function(item){
      if(mode==="missed") return item.role==="scored"&&item.answered&&!item.correct;
      if(mode==="unanswered") return !item.answered;
      if(mode==="flagged") return item.flagged;
      return true;
    }).sort(function(a,b){return a.position-b.position;});
  }

  function taskRows(record,questionIndex){
    const attempt=normalizeAttempt(record);
    if(attempt.taskBreakdown.length) return clone(attempt.taskBreakdown);
    const map=makeMap(questionIndex);
    const rows=new Map();
    attempt.itemResults.forEach(function(item){
      const question=map.get(String(item.id))||{};
      const code=item.taskCode||question.taskCode||"Unknown";
      const row=rows.get(code)||{domain:item.domain||question.domain||"",taskCode:code,title:question.task||code,scoredTotal:0,pretestTotal:0,answered:0,correct:0,missed:0,unanswered:0,flagged:0,percent:0,topics:{}};
      if(item.role==="pretest") row.pretestTotal+=1;
      else {
        row.scoredTotal+=1;
        if(item.answered){row.answered+=1;if(item.correct) row.correct+=1;else row.missed+=1;}
        else row.unanswered+=1;
      }
      if(item.flagged) row.flagged+=1;
      if(question.topic) row.topics[question.topic]=(row.topics[question.topic]||0)+1;
      rows.set(code,row);
    });
    return Array.from(rows.values()).map(function(row){
      row.percent=row.scoredTotal?Math.round(row.correct/row.scoredTotal*100):0;
      row.topics=Object.entries(row.topics).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))).slice(0,3).map(entry=>entry[0]);
      return row;
    }).sort(function(a,b){return a.domain.localeCompare(b.domain)||a.taskCode.localeCompare(b.taskCode);});
  }

  function questionRows(record,questionsById,filter){
    const map=makeMap(questionsById);
    return filterItems(record,filter).map(function(item){
      const question=map.get(String(item.id));
      if(!question) return {item:item,missing:true,prompt:"Question content is unavailable in the current bank."};
      const options=Array.isArray(question.options)?question.options:[];
      return {
        item:item,
        missing:false,
        prompt:String(question.prompt||""),
        task:String(question.task||""),
        topic:String(question.topic||""),
        selectedAnswer:item.selectedIndex===null?"":String(options[item.selectedIndex]||""),
        correctAnswer:String(question.answer||""),
        rationale:String(question.rationale||""),
        options:options.slice()
      };
    });
  }

  function findAttempt(history,sessionId){
    const records=Array.isArray(history)?history:[];
    if(sessionId){const found=records.find(record=>sameId(record&&record.sessionId,sessionId));if(found) return found;}
    return records.length?records[records.length-1]:null;
  }

  return {FILTERS:FILTERS,compactItemResults:compactItemResults,normalizeItem:normalizeItem,normalizeAttempt:normalizeAttempt,detailLevel:detailLevel,filterItems:filterItems,taskRows:taskRows,questionRows:questionRows,findAttempt:findAttempt};
});
