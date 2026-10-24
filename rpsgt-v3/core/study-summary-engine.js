(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTStudySummaryEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.3.0';
  const SCHEMA='spg-rpsgt-study-summary/v1';
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const object=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const list=value=>Array.isArray(value)?value:[];
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const percent=(correct,total)=>total?Math.round(number(correct)/number(total)*100):0;
  const safeDate=value=>typeof value==='string'&&value?value:null;
  const normalize=value=>String(value==null?'':value).toLowerCase().replace(/[^a-z0-9+/-]+/g,' ').replace(/\s+/g,' ').trim();
  function flattenTasks(blueprint){return list(blueprint&&blueprint.domains).flatMap(domain=>list(domain.tasks).map(task=>({code:task.code,title:task.title,domain:domain.id,domainName:domain.fullName,nextAction:task.nextAction||''})));}
  function indexMap(questionIndex){const records=Array.isArray(questionIndex)?questionIndex:list(questionIndex&&questionIndex.records);return new Map(records.map(record=>[String(record.id),record]));}
  function countQuestionIds(ids,map,key){const counts={};list(ids).forEach(id=>{const record=map.get(String(id));const value=record&&record[key];if(value) counts[value]=(counts[value]||0)+1;});return counts;}
  function taskRows(saved,blueprint,questionIndex){
    const map=indexMap(questionIndex);const review=object(saved&&saved.review);const missed=countQuestionIds(review.missedIds,map,'taskCode');const mastered=countQuestionIds(review.masteredIds,map,'taskCode');
    return flattenTasks(blueprint).map(task=>{const stats=object(saved&&saved.progress&&saved.progress.byTask&&saved.progress.byTask[task.code]);const answered=number(stats.answered),correct=number(stats.correct);return {...task,answered,correct,accuracy:percent(correct,answered),missed:missed[task.code]||0,mastered:mastered[task.code]||0};});
  }
  function latestTaskCheckpoints(saved){
    const history=list(saved&&saved.guidedStudy&&saved.guidedStudy.checkpointHistory);
    const byTask=new Map();
    // Guided checkpoints are newest-first in the saved learner record.
    for(const record of history){
      if(!record||!record.task||byTask.has(record.task))continue;
      if(!number(record.total))continue;
      byTask.set(record.task,record);
    }
    return byTask;
  }
  function incorrectCheckpointIds(record){
    return list(record&&record.responses).filter(response=>response&&response.correct===false&&response.id!=null).map(response=>String(response.id));
  }
  function weakTaskEvidence(saved,rows){
    const scores=Object.fromEntries(rows.map(row=>[row.code,(row.missed*8)+(row.answered?(1-row.correct/row.answered)*Math.min(row.answered,100):0)]));
    const add=(history,multiplier,newestFirst)=>{const records=list(history);const latest=records.length?(newestFirst?records[0]:records[records.length-1]):null;list(latest&&latest.weakestTasks).forEach((task,index)=>{if(task&&task.taskCode)scores[task.taskCode]=(scores[task.taskCode]||0)+(5-index)*multiplier;});};
    add(saved&&saved.readiness&&saved.readiness.history,5,true);add(saved&&saved.mock&&saved.mock.history,8,false);
    // A failed Guided Study concept checkpoint is actionable weak-area evidence,
    // but only the newest per task contributes so older attempts do not accumulate.
    latestTaskCheckpoints(saved).forEach((record,code)=>{
      if(!(code in scores))return;
      const misses=Math.max(0,number(record.total)-number(record.correct));
      scores[code]+=(Math.min(misses,15)*5)+(record.passed===false?8:0);
    });
    return scores;
  }
  function addTopicIds(counts,ids,map,taskCode,weight){list(ids).forEach(id=>{const record=map.get(String(id));if(record&&record.taskCode===taskCode&&record.topic)counts[record.topic]=(counts[record.topic]||0)+weight;});}
  function addKeyIds(counts,ids,map,taskCode,weight){list(ids).forEach(id=>{const record=map.get(String(id));if(!record||record.taskCode!==taskCode)return;[...list(record.studyRecommendationKeys),...list(record.referenceKeys)].forEach(key=>{if(key)counts[key]=(counts[key]||0)+weight;});});}
  function addWeakTopics(counts,weakestTasks,taskCode,weight){const row=list(weakestTasks).find(item=>item&&item.taskCode===taskCode);list(row&&row.topics).forEach(topic=>{const label=typeof topic==='string'?topic:topic&&topic.label;if(label)counts[label]=(counts[label]||0)+weight;});}
  function interactionTopics(saved,map,taskCode){
    const counts={};const review=object(saved&&saved.review);addTopicIds(counts,review.missedIds,map,taskCode,5);addTopicIds(counts,review.flaggedIds,map,taskCode,1);
    const practiceHistory=list(saved&&saved.progress&&saved.progress.history).slice(-1200);practiceHistory.forEach((item,index)=>{if(!item||item.correct!==false)return;const record=map.get(String(item.questionId));if(!record||record.taskCode!==taskCode||!record.topic)return;const recency=index>=practiceHistory.length-250?2:1;counts[record.topic]=(counts[record.topic]||0)+recency;});
    const readiness=list(saved&&saved.readiness&&saved.readiness.history);const latestReady=readiness[0]||null;if(latestReady){addTopicIds(counts,latestReady.missedIds,map,taskCode,3);addWeakTopics(counts,latestReady.weakestTasks,taskCode,2);}
    const mocks=list(saved&&saved.mock&&saved.mock.history);const latestMock=mocks.length?mocks[mocks.length-1]:null;if(latestMock){addTopicIds(counts,latestMock.scoredMissedIds,map,taskCode,4);addTopicIds(counts,latestMock.flaggedIds,map,taskCode,1);list(latestMock.itemResults||latestMock.details).forEach(item=>{if(item&&item.correct===false)addTopicIds(counts,[item.id],map,taskCode,4);});addWeakTopics(counts,latestMock.weakestTasks,taskCode,3);}
    const checkpoint=latestTaskCheckpoints(saved).get(taskCode);
    if(checkpoint)addTopicIds(counts,incorrectCheckpointIds(checkpoint),map,taskCode,5);
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,4).map(([label,count])=>({label,count:Math.round(count*100)/100}));
  }
  function interactionKeys(saved,map,taskCode){
    const counts={};const review=object(saved&&saved.review);addKeyIds(counts,review.missedIds,map,taskCode,5);addKeyIds(counts,review.flaggedIds,map,taskCode,1);
    const practiceHistory=list(saved&&saved.progress&&saved.progress.history).slice(-1200);practiceHistory.forEach((item,index)=>{if(!item||item.correct!==false)return;const recency=index>=practiceHistory.length-250?2:1;addKeyIds(counts,[item.questionId],map,taskCode,recency);});
    const readiness=list(saved&&saved.readiness&&saved.readiness.history);const latestReady=readiness[0]||null;if(latestReady)addKeyIds(counts,latestReady.missedIds,map,taskCode,3);
    const mocks=list(saved&&saved.mock&&saved.mock.history);const latestMock=mocks.length?mocks[mocks.length-1]:null;if(latestMock){addKeyIds(counts,latestMock.scoredMissedIds,map,taskCode,4);addKeyIds(counts,latestMock.flaggedIds,map,taskCode,1);list(latestMock.itemResults||latestMock.details).forEach(item=>{if(item&&item.correct===false)addKeyIds(counts,[item.id],map,taskCode,4);});}
    const checkpoint=latestTaskCheckpoints(saved).get(taskCode);
    if(checkpoint)addKeyIds(counts,incorrectCheckpointIds(checkpoint),map,taskCode,5);
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,20).map(([key,score])=>({key,score:Math.round(score*100)/100}));
  }
  function sourcePriority(source){const id=normalize(source&&source.id),type=normalize(source&&source.sourceType);if(type.includes('official')||id.startsWith('brpt-')||id.startsWith('aasm-'))return 0;if(id.startsWith('aast-')||type.includes('technical guideline')||type.includes('professional'))return 1;if(type.includes('textbook')||id.includes('fundamentals')||id.includes('polysomnography'))return 2;return 3;}
  function sourceMaps(data){const sources=new Map();const sections=new Map();list(data&&data.sources).forEach(source=>{sources.set(source.id,source);list(source.sections).forEach(section=>sections.set(section.id,{...section,sourceId:source.id}));});return {sources,sections};}
  function familyMatchesTopics(family,topics){const blob=normalize(list(topics).map(topic=>typeof topic==='string'?topic:topic&&topic.label).join(' '));return Boolean(blob)&&list(family&&family.keywords).some(keyword=>blob.includes(normalize(keyword)));}
  function sourceMatchesKey(source,key){const value=normalize(key),id=normalize(source&&source.id);if(!value)return false;if(list(source&&source.referenceKeys).some(sourceKey=>normalize(sourceKey)===value))return true;if(id==='aasm-scoring-manual-v3'&&value.startsWith('aasm-scoring-'))return true;return false;}
  function sourceSectionsForTask(sourceId,taskCode,data,maps){const taskPlan=object(data&&data.taskPlans)[taskCode];const entry=list(taskPlan&&taskPlan.sequence).find(item=>item&&item.sourceId===sourceId);if(entry&&list(entry.sectionIds).length)return list(entry.sectionIds);const source=maps.sources.get(sourceId);return list(source&&source.sections).filter(section=>list(section.taskCodes).includes(taskCode)).map(section=>section.id);}
  function resourceRoute(taskCode,topics,keyEvidence,data,limit){
    if(!data)return[];const max=Math.max(1,number(limit)||10);const maps=sourceMaps(data);const candidates=[];let order=0;const taskPlan=object(data.taskPlans)[taskCode];
    const add=(sourceId,sectionId,reason,matchPriority)=>{const source=maps.sources.get(sourceId),section=maps.sections.get(sectionId);if(!source||!section||section.sourceId!==sourceId)return;candidates.push({sourceId,sourceTitle:source.shortTitle||source.title||source.id,sourceType:source.sourceType||'study source',bestFor:source.bestFor||'',sectionId,sectionLabel:section.label||section.title||sectionId,reason:reason||'',priority:sourcePriority(source),matchPriority:number(matchPriority),order:order++});};
    maps.sources.forEach(source=>{const matched=list(keyEvidence).filter(item=>item&&sourceMatchesKey(source,item.key));if(!matched.length)return;sourceSectionsForTask(source.id,taskCode,data,maps).forEach(sectionId=>add(source.id,sectionId,'Linked to the missed-question references',0));});
    list(data.topicFamilies).filter(family=>familyMatchesTopics(family,topics)).forEach(family=>list(family.recommendations).forEach(pair=>{const sourceId=list(pair)[0];list(list(pair)[1]).forEach(sectionId=>add(sourceId,sectionId,'Matched weak topic: '+family.label,1));}));
    list(taskPlan&&taskPlan.sequence).forEach(entry=>list(entry&&entry.sectionIds).forEach(sectionId=>add(entry.sourceId,sectionId,'Blueprint task '+taskCode+' reading',2)));
    const seen=new Set(),perSource=new Map();
    // Evidence-linked sections first, and current scoring/clinical authorities
    // before supporting texts among similarly specific matches. A per-source
    // limit avoids returning ten chapters from one book while hiding the AAST
    // guideline or another vetted source.
    return candidates.sort((a,b)=>a.matchPriority-b.matchPriority||a.priority-b.priority||a.order-b.order).filter(item=>{
      const key=item.sourceId+'|'+item.sectionId;
      if(seen.has(key))return false;
      seen.add(key);
      const n=perSource.get(item.sourceId)||0;
      if(n>=2)return false;
      perSource.set(item.sourceId,n+1);
      return true;
    }).slice(0,max).map(({priority,matchPriority,order,...item})=>item);
  }
  function groupResources(route,sources,taskCode){
    const groups=[],map=new Map();
    list(route).forEach(item=>{
      let group=map.get(item.sourceId);
      if(!group){group={sourceId:item.sourceId,sourceTitle:item.sourceTitle,sourceType:item.sourceType,bestFor:item.bestFor,sections:[],verifiedChapters:[]};map.set(item.sourceId,group);groups.push(group);}
      group.sections.push({sectionId:item.sectionId,label:item.sectionLabel,reason:item.reason});
    });
    // A task/source-key mapping does not establish a page. Only the edition-
    // checked printed starts from this same source's verified locator registry do.
    const matchedSource=list(sources&&sources.sources).find(source=>source.id==='principles-practice-sleep-medicine-7e');
    const chapters=list(matchedSource&&matchedSource.verifiedChapterLocators).filter(ch=>list(ch.taskCodes).includes(taskCode)&&
      Number.isInteger(ch.printedStartPage)&&ch.printedStartPage>0);
    if(chapters.length){
      let group=map.get(matchedSource.id);
      if(!group){group={sourceId:matchedSource.id,sourceTitle:matchedSource.shortTitle,sourceType:matchedSource.sourceType,bestFor:matchedSource.bestFor,sections:[],verifiedChapters:[]};groups.push(group);}
      group.verifiedChapters=chapters.slice(0,3).map(ch=>({chapter:ch.chapter,label:ch.label,printedStartPage:ch.printedStartPage,
        reason:'Task-linked chapter; printed starting page verified for the 7th edition (not a question-specific page).'}));
    }
    return groups;
  }
  function studyPlan(saved,rows,questionIndex,limit,studySources){
    const map=indexMap(questionIndex),scores=weakTaskEvidence(saved,rows);
    const ready=list(saved&&saved.readiness&&saved.readiness.history)[0]||null;
    const mockHistory=list(saved&&saved.mock&&saved.mock.history);
    const mock=mockHistory.length?mockHistory[mockHistory.length-1]:null;
    const checks=latestTaskCheckpoints(saved);
    const weakIn=(record,code)=>list(record&&record.weakestTasks).some(task=>task&&task.taskCode===code);
    return rows.map(row=>({...row,evidenceScore:Math.round((scores[row.code]||0)*100)/100,topics:interactionTopics(saved,map,row.code),keys:interactionKeys(saved,map,row.code)}))
      .filter(row=>row.evidenceScore>0)
      .sort((a,b)=>b.evidenceScore-a.evidenceScore||b.missed-a.missed||a.code.localeCompare(b.code))
      .slice(0,limit||5).map(row=>{
        const check=checks.get(row.code),evidence=[];
        if(row.missed)evidence.push(row.missed+' currently missed in Practice/Review');
        if(row.answered)evidence.push(row.correct+'/'+row.answered+' Practice correct ('+row.accuracy+'%)');
        if(check)evidence.push('Latest Guided Check: '+number(check.correct)+'/'+number(check.total)+' correct'+(check.passed===false?' · needs review':''));
        if(weakIn(ready,row.code))evidence.push('Flagged as weak in latest Readiness Check');
        if(weakIn(mock,row.code))evidence.push('Flagged as weak in latest Mock');
        return {taskCode:row.code,title:row.title,domain:row.domain,domainName:row.domainName,
          practiceAnswered:row.answered,practiceCorrect:row.correct,practiceAccuracy:row.accuracy,
          missed:row.missed,mastered:row.mastered,evidenceScore:row.evidenceScore,
          evidence,topics:row.topics,nextAction:row.nextAction,
          resources:groupResources(resourceRoute(row.code,row.topics,row.keys,studySources,12),studySources,row.code)};
      });
  }
  function weakDomains(saved,rows,blueprint){
    const scores=weakTaskEvidence(saved,rows);
    return list(blueprint&&blueprint.domains).map(domain=>{
      const tasks=rows.filter(row=>row.domain===domain.id).map(row=>({...row,priorityScore:scores[row.code]||0}))
        .sort((a,b)=>b.priorityScore-a.priorityScore||a.code.localeCompare(b.code));
      return {domain:domain.id,title:domain.fullName,
        evidenceScore:Math.round(tasks.reduce((total,task)=>total+task.priorityScore,0)*100)/100,
        focusTasks:tasks.filter(task=>task.priorityScore>0).slice(0,2).map(task=>({code:task.code,title:task.title}))};
    }).filter(domain=>domain.evidenceScore>0)
      .sort((a,b)=>b.evidenceScore-a.evidenceScore||a.domain.localeCompare(b.domain));
  }
  function compactWeakTasks(value){return list(value).slice(0,5).map(task=>({taskCode:task.taskCode||null,title:task.title||null,total:number(task.total),correct:number(task.correct),missed:number(task.missed),percent:number(task.percent),topics:list(task.topics).slice(0,3)}));}
  function readinessHistory(saved){return list(saved&&saved.readiness&&saved.readiness.history).map(record=>({completedAt:safeDate(record.completedAt),size:number(record.size),answered:number(record.answered),correct:number(record.correct),percent:number(record.percent),weightedPercent:number(record.weightedPercent),weakestTasks:compactWeakTasks(record.weakestTasks)}));}
  function mockHistory(saved){return list(saved&&saved.mock&&saved.mock.history).map(record=>({completedAt:safeDate(record.completedAt),timed:Boolean(record.timed),elapsedMs:number(record.elapsedMs),answeredTotal:number(record.answeredTotal),scoredCount:number(record.scoredCount)||150,pretestCount:number(record.pretestCount)||25,scoredCorrect:number(record.scoredCorrect),scoredPercent:number(record.scoredPercent),weightedPercent:number(record.weightedPercent),unansweredCount:number(record.unansweredCount),flaggedCount:list(record.flaggedIds).length||list(record.itemResults||record.details).filter(item=>item&&item.flagged).length||number(record.flaggedCount),byDomain:clone(object(record.byDomain)),weakestTasks:compactWeakTasks(record.weakestTasks),detailAvailable:list(record.itemResults||record.details).length>0}));}
  function guidedTrail(saved,blueprint,trailDefinition){
    const source=object(saved&&saved.guidedStudy);const awards=object(source.trailAwards);const taskAwards=object(awards.tasks);const domainAwards=object(awards.domains);const marks=object(source.trailStudyMarks);const checkpoints=list(source.checkpointHistory||source.trailCheckpointHistory);const tasks=flattenTasks(blueprint);
    const rows=tasks.map(task=>{const taskChecks=checkpoints.filter(item=>item&&item.task===task.code);const latest=taskChecks[0]||null;return {taskCode:task.code,title:task.title,domain:task.domain,studyMarked:Boolean(marks[task.code]===true||marks[task.code]&&marks[task.code].completed!==false),awardEarned:Boolean(taskAwards[task.code]),checkpointCount:taskChecks.length,latestCheckpoint:latest?{completedAt:safeDate(latest.completedAt),percent:number(latest.percent!=null?latest.percent:latest.score),correct:number(latest.correct),total:number(latest.total),passed:Boolean(latest.passed!=null?latest.passed:number(latest.percent!=null?latest.percent:latest.score)>=80)}:null};});
    const domains=list(blueprint&&blueprint.domains).map(domain=>{const domainRows=rows.filter(row=>row.domain===domain.id);return {domain:domain.id,title:domain.fullName,studyMarked:domainRows.filter(row=>row.studyMarked).length,taskAwards:domainRows.filter(row=>row.awardEarned).length,taskCount:domainRows.length,domainAwardEarned:Boolean(domainAwards[domain.id])};});
    const pathway=object(source.respiratoryStudyTrail);
    const activity=object(pathway.activityProgress);
    const steps=list(trailDefinition&&trailDefinition.steps);
    const completionIndex=steps.findIndex(step=>step.id===pathway.completedThroughStepId);
    const activeIndex=steps.findIndex(step=>step.id===pathway.activeStepId);
    const respiratoryPath=steps.map((step,index)=>{
      const progress=object(activity[step.id]);
      const conceptChecks=checkpoints.filter(item=>item&&item.conceptId===step.id&&item.task===step.taskCode);
      const latest=conceptChecks[0]||null;
      const passed=conceptChecks.some(item=>item&&item.passed===true&&number(item.total)>=15);
      return {id:String(step.id),title:String(step.title||step.navLabel||step.id),taskCode:String(step.taskCode||''),
        stage:index<=completionIndex?'Completed':progress.apply?'Check':progress.learn?'Apply':'Learn',
        completed:index<=completionIndex,active:index===activeIndex,
        learnComplete:index<=completionIndex||progress.learn===true,
        applyComplete:index<=completionIndex||progress.apply===true,
        checkpointPassed:passed,attempts:conceptChecks.length,
        latestPercent:latest?number(latest.percent!=null?latest.percent:latest.score):null};
    });
    return {counts:{studyMarks:rows.filter(row=>row.studyMarked).length,taskAwards:rows.filter(row=>row.awardEarned).length,domainAwards:domains.filter(row=>row.domainAwardEarned).length,checkpoints:checkpoints.length},currentFocus:clone(source.trailFocus||source.lastTrailPost||null),domains,rows,respiratoryPath};
  }
  function labSummary(saved,catalog){
    const source=object(saved&&saved.labs);const completed=new Set(list(source.completed).map(String));Object.keys(source).forEach(key=>{if(source[key]&&typeof source[key]==='object'&&source[key].completed===true)completed.add(key);});const started=object(source.started);const rows=list(catalog&&catalog.labs).map(lab=>{const key=lab.progressKey||lab.id;const detail=object(source[key]);return {id:lab.id,title:lab.title,href:/^lab-[a-z0-9-]+\.html$/.test(String(lab.plannedRoute||''))?lab.plannedRoute:null,taskCodes:list(lab.taskCodes),completed:completed.has(key)||detail.completed===true,started:Boolean(started[key])||Object.keys(detail).length>0,attempts:list(detail.history||detail.checkpointHistory).length,lastCompletedAt:safeDate(detail.completedAt||detail.lastCompletedAt),lastPercent:(detail.bestPercent!=null||detail.lastPercent!=null||detail.percent!=null)?number(detail.bestPercent??detail.lastPercent??detail.percent):null};});return {counts:{total:rows.length,completed:rows.filter(row=>row.completed).length,started:rows.filter(row=>row.started&&!row.completed).length},lastLab:typeof source.lastLab==='string'?source.lastLab:null,rows};
  }
  function buildSummary(input){
    const options=object(input);const saved=clone(object(options.saved));const blueprint=clone(object(options.blueprint));const questionIndex=clone(options.questionIndex||[]);const catalog=clone(object(options.catalog));const studySources=clone(object(options.studySources));const generatedAt=safeDate(options.generatedAt)||new Date().toISOString();const includeLearnerName=options.includeLearnerName===true;const rows=taskRows(saved,blueprint,questionIndex);const readiness=readinessHistory(saved);const mock=mockHistory(saved);const trail=guidedTrail(saved,blueprint,options.trailDefinition);const labs=labSummary(saved,catalog);const progress=object(saved.progress);const review=object(saved.review);const answered=number(progress.answered),correct=number(progress.correct);const name=includeLearnerName?String(saved&&saved.learner&&saved.learner.displayName||'').trim():'';
    return {schema:SCHEMA,engineVersion:VERSION,generatedAt,application:'RPSGT Learning Center v3',developmentOnly:true,disclaimer:'Educational progress summary only. It is not an official BRPT score report, credential decision, or clinical record.',privacy:{containsQuestionText:false,containsAnswerText:false,containsRationales:false,containsNotes:false,containsSearches:false,containsPrivateLinks:false,containsRawBrowserState:false,learnerNameIncluded:Boolean(name)},learner:{displayName:name||null},snapshot:{practiceAnswered:answered,practiceCorrect:correct,practiceAccuracy:percent(correct,answered),missedCount:list(review.missedIds).length,masteredCount:list(review.masteredIds).length,flaggedCount:list(review.flaggedIds).length,readinessAttempts:readiness.length,mockAttempts:mock.length,trailStudyMarks:trail.counts.studyMarks,trailTaskAwards:trail.counts.taskAwards,trailDomainAwards:trail.counts.domainAwards,labsCompleted:labs.counts.completed,labsTotal:labs.counts.total},practice:{answered,correct,accuracy:percent(correct,answered),historyCount:list(progress.history).length,tasks:rows},review:{missedCount:list(review.missedIds).length,masteredCount:list(review.masteredIds).length,flaggedCount:list(review.flaggedIds).length},readiness:{attemptCount:readiness.length,latest:readiness.length?readiness[0]:null,history:readiness},mock:{attemptCount:mock.length,latest:mock.length?mock[mock.length-1]:null,history:mock},guidedTrail:trail,labs,weakDomains:weakDomains(saved,rows,blueprint),studyPlan:studyPlan(saved,rows,questionIndex,5,studySources)};
  }
  function csvCell(value){const text=String(value==null?'':value);return /[",\n\r]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;}
  function toCsv(summary){
    const rows=[['section','code','title','metric','value','detail']];const push=(section,code,title,metric,value,detail)=>rows.push([section,code||'',title||'',metric,value==null?'':value,detail||'']);
    Object.entries(summary.snapshot||{}).forEach(([metric,value])=>push('snapshot','','',metric,value,''));
    list(summary.practice&&summary.practice.tasks).forEach(task=>{push('practice-task',task.code,task.title,'accuracy',task.accuracy,task.correct+'/'+task.answered+' correct');push('practice-task',task.code,task.title,'missed',task.missed,'mastered '+task.mastered);});
    list(summary.readiness&&summary.readiness.history).forEach((record,index)=>push('readiness','attempt-'+(index+1),'Readiness Check','percent',record.percent,(record.size||0)+' questions · '+(record.completedAt||'')));
    list(summary.mock&&summary.mock.history).forEach((record,index)=>push('mock','attempt-'+(index+1),'175-question Mock','scoredPercent',record.scoredPercent,(record.answeredTotal||0)+'/175 answered · '+(record.completedAt||'')));
    list(summary.guidedTrail&&summary.guidedTrail.domains).forEach(domain=>push('guided-trail',domain.domain,domain.title,'taskAwards',domain.taskAwards,domain.studyMarked+'/'+domain.taskCount+' study marked'));
    list(summary.guidedTrail&&summary.guidedTrail.rows).forEach(task=>push('guided-task',task.taskCode,task.title,'status',task.awardEarned?'Badge earned':task.studyMarked?'Studied':'Not started',task.latestCheckpoint?task.latestCheckpoint.percent+'% latest checkpoint; '+task.checkpointCount+' attempts':'No checkpoint'));
    list(summary.guidedTrail&&summary.guidedTrail.respiratoryPath).forEach(step=>push('respiratory-lesson',step.taskCode,step.title,'stage',step.stage,'Learn '+(step.learnComplete?'complete':'pending')+'; Apply '+(step.applyComplete?'complete':'pending')+'; Check '+(step.checkpointPassed?'passed':'pending')));
    
    list(summary.labs&&summary.labs.rows).forEach(lab=>push('lab',lab.id,lab.title,'status',lab.completed?'completed':lab.started?'started':'not-started',(lab.taskCodes||[]).join(' ')));
    list(summary.studyPlan).forEach((item,index)=>{push('study-plan',item.taskCode,item.title,'priority',index+1,item.nextAction);list(item.resources).forEach(group=>{
      list(group.sections).forEach(section=>push('study-resource',item.taskCode,group.sourceTitle,group.sourceType,section.label,section.reason));
      list(group.verifiedChapters).forEach(ch=>push('verified-chapter',item.taskCode,group.sourceTitle,'Chapter '+ch.chapter+', printed start p. '+ch.printedStartPage,ch.label,ch.reason));
    });});
    list(summary.missedQuestionReview&&summary.missedQuestionReview.items).forEach(q=>{
      const info=q.modes.join(' / ')+' · '+q.domain+' / '+q.taskCode;
      push('missed-question',q.taskCode,'Question '+q.questionId,'question',q.question,info);
      push('missed-question',q.taskCode,'Question '+q.questionId,'selectedAnswer',q.selectedAnswer==null?'Not recorded':q.selectedAnswer,'');
      push('missed-question',q.taskCode,'Question '+q.questionId,'correctAnswer',q.correctAnswer,'');
      push('missed-question',q.taskCode,'Question '+q.questionId,'rationale',q.rationale,'');
    });
    return rows.map(row=>row.map(csvCell).join(',')).join('\n')+'\n';
  }
  return {VERSION,SCHEMA,flattenTasks,indexMap,taskRows,interactionTopics,interactionKeys,resourceRoute,groupResources,studyPlan,weakDomains,readinessHistory,mockHistory,guidedTrail,labSummary,buildSummary,toCsv};
});
