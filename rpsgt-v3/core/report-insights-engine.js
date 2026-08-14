(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTReportInsights=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const list=value=>Array.isArray(value)?value:[];
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const percent=(correct,total)=>total?Math.round(number(correct)/number(total)*100):0;
  const dateValue=value=>{const time=value?new Date(value).getTime():NaN;return Number.isFinite(time)?time:null;};

  function latestReadiness(saved){
    const history=list(saved&&saved.readiness&&saved.readiness.history);
    return history.length?history[0]:null;
  }

  function latestMock(saved){
    const history=list(saved&&saved.mock&&saved.mock.history);
    return history.length?history[history.length-1]:null;
  }

  function domainStat(row){
    const source=object(row);
    const answered=number(source.answered||source.total);
    const correct=number(source.correct);
    const stated=source.percent;
    return {
      answered,
      correct,
      percent:answered?(Number.isFinite(Number(stated))?number(stated):percent(correct,answered)):null
    };
  }

  function domainEvidence(saved,blueprint){
    const progress=object(saved&&saved.progress);
    const practiceByDomain=object(progress.byDomain);
    const readiness=latestReadiness(saved);
    const mock=latestMock(saved);
    const readinessByDomain=object(readiness&&readiness.byDomain);
    const mockByDomain=object(mock&&mock.byDomain);
    return list(blueprint&&blueprint.domains).map(domain=>({
      id:domain.id,
      title:domain.fullName||domain.title||domain.id,
      practice:domainStat(practiceByDomain[domain.id]),
      readiness:domainStat(readinessByDomain[domain.id]),
      mock:domainStat(mockByDomain[domain.id]),
      latestReadinessAt:readiness&&readiness.completedAt||null,
      latestMockAt:mock&&mock.completedAt||null
    }));
  }

  function isOrdinaryAnswer(entry){
    if(!entry||typeof entry.correct!=='boolean') return false;
    const source=String(entry.source||'');
    return source==='v3-practice-full-bank'||/^v3-review-/.test(source);
  }

  function answerWindow(entries){
    const rows=list(entries);
    const correct=rows.filter(item=>item.correct===true).length;
    return {answered:rows.length,correct,percent:rows.length?percent(correct,rows.length):null};
  }

  function recentPracticeTrend(saved,windowSize){
    const size=Math.max(5,number(windowSize)||25);
    const history=list(saved&&saved.progress&&saved.progress.history).filter(isOrdinaryAnswer);
    const currentRows=history.slice(-size);
    const previousRows=history.slice(Math.max(0,history.length-size*2),Math.max(0,history.length-size));
    const current=answerWindow(currentRows);
    const previous=answerWindow(previousRows);
    const comparable=current.answered>=5&&previous.answered>=5;
    const delta=comparable?current.percent-previous.percent:null;
    const direction=delta===null?'insufficient':delta>=3?'improving':delta<=-3?'declining':'steady';
    return {
      sampleSize:size,
      eligibleHistoryCount:history.length,
      current,
      previous,
      comparable,
      delta,
      direction,
      firstCurrentAt:currentRows.length?currentRows[0].answeredAt||null:null,
      lastCurrentAt:currentRows.length?currentRows[currentRows.length-1].answeredAt||null:null
    };
  }

  function addDate(target,value){const time=dateValue(value);if(time!==null) target.push(time);}

  function activityRange(saved){
    const dates=[];
    list(saved&&saved.progress&&saved.progress.history).forEach(entry=>addDate(dates,entry&&entry.answeredAt));
    list(saved&&saved.readiness&&saved.readiness.history).forEach(entry=>{addDate(dates,entry&&entry.startedAt);addDate(dates,entry&&entry.completedAt);});
    list(saved&&saved.mock&&saved.mock.history).forEach(entry=>{addDate(dates,entry&&entry.startedAt);addDate(dates,entry&&entry.completedAt);});
    const guided=object(saved&&saved.guidedStudy);
    list(guided.checkpointHistory||guided.trailCheckpointHistory).forEach(entry=>addDate(dates,entry&&entry.completedAt));
    const labs=object(saved&&saved.labs);
    Object.values(labs).forEach(value=>{
      if(!value||typeof value!=='object'||Array.isArray(value)) return;
      addDate(dates,value.completedAt);addDate(dates,value.lastCompletedAt);
      list(value.history||value.checkpointHistory).forEach(entry=>{addDate(dates,entry&&entry.completedAt);addDate(dates,entry&&entry.answeredAt);});
    });
    if(!dates.length) return {firstAt:null,lastAt:null,activityDays:0};
    const first=Math.min(...dates),last=Math.max(...dates);
    const day=24*60*60*1000;
    return {firstAt:new Date(first).toISOString(),lastAt:new Date(last).toISOString(),activityDays:Math.max(1,Math.floor((last-first)/day)+1)};
  }

  function readinessTrend(saved,limit){
    const max=Math.max(1,number(limit)||6);
    return list(saved&&saved.readiness&&saved.readiness.history).slice().reverse().slice(-max).map(record=>({
      completedAt:record&&record.completedAt||null,
      size:number(record&&record.size),
      percent:number(record&&record.percent),
      weightedPercent:number(record&&record.weightedPercent)
    }));
  }

  function mockTrend(saved,limit){
    const max=Math.max(1,number(limit)||6);
    return list(saved&&saved.mock&&saved.mock.history).slice(-max).map(record=>({
      completedAt:record&&record.completedAt||null,
      scoredPercent:number(record&&record.scoredPercent),
      weightedPercent:number(record&&record.weightedPercent),
      answeredTotal:number(record&&record.answeredTotal),
      timed:Boolean(record&&record.timed)
    }));
  }

  function build(saved,blueprint){
    return {
      activity:activityRange(saved),
      domainEvidence:domainEvidence(saved,blueprint),
      practiceTrend:recentPracticeTrend(saved,25),
      readinessTrend:readinessTrend(saved,6),
      mockTrend:mockTrend(saved,6)
    };
  }

  return {percent,latestReadiness,latestMock,domainEvidence,recentPracticeTrend,activityRange,readinessTrend,mockTrend,build};
});
