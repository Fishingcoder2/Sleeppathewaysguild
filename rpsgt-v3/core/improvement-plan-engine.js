(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTImprovementPlan=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const list=value=>Array.isArray(value)?value:[];
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const normalize=value=>String(value==null?'':value).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const words=value=>normalize(value).split(' ').filter(word=>word.length>=4);
  function domainMap(summary){
    const map=new Map();
    list(summary&&summary.practice&&summary.practice.tasks).forEach(task=>{
      if(task&&task.domain&&!map.has(task.domain)) map.set(task.domain,{id:task.domain,title:task.domainName||task.domain});
    });
    return map;
  }
  function taskEvidence(summary,item){
    const readiness=list(summary&&summary.readiness&&summary.readiness.latest&&summary.readiness.latest.weakestTasks);
    const mock=list(summary&&summary.mock&&summary.mock.latest&&summary.mock.latest.weakestTasks);
    const inReadiness=readiness.some(row=>row&&row.taskCode===item.taskCode);
    const inMock=mock.some(row=>row&&row.taskCode===item.taskCode);
    const signals=[];
    if(number(item.practiceAnswered)>0) signals.push(number(item.practiceAccuracy)+'% Practice accuracy across '+number(item.practiceAnswered)+' answers');
    if(number(item.missed)>0) signals.push(number(item.missed)+' currently in the missed queue');
    if(inReadiness) signals.push('flagged among the latest Readiness weak tasks');
    if(inMock) signals.push('flagged among the latest Mock weak tasks');
    return {inReadiness,inMock,signals,text:signals.length?signals.join('; '):'Repeated weak-area evidence was detected in the learner record.'};
  }
  function topicScore(lab,item){
    const blob=normalize((lab.title||'')+' '+(lab.description||''));
    let score=0;
    list(item&&item.topics).forEach(topic=>{
      const label=normalize(topic&&topic.label||topic);
      if(label&&blob.includes(label)) score+=10;
      words(label).forEach(word=>{if(blob.includes(word))score+=2;});
    });
    if(item&&item.taskCode==='D3C'&&lab.id==='math-coach') score+=3;
    return score;
  }
  function labsFor(item,catalog,limit){
    return list(catalog&&catalog.labs)
      .filter(lab=>lab&&lab.status==='v3-ready'&&list(lab.taskCodes).includes(item.taskCode)&&lab.plannedRoute)
      .map((lab,index)=>({...lab,_score:topicScore(lab,item),_index:index}))
      .sort((a,b)=>b._score-a._score||a._index-b._index)
      .slice(0,Math.max(1,number(limit)||2))
      .map(({_score,_index,...lab})=>lab);
  }
  function activitiesFor(item,catalog){
    const activities=[
      {kind:'study',title:'Guided Study: '+item.taskCode,detail:'Review the task lesson before another question set.',href:'study.html#'+item.taskCode},
      {kind:'practice',title:'Focused Practice: '+item.taskCode,detail:'Open Practice with this task already selected.',href:'practice.html?task='+item.taskCode}
    ];
    if(number(item.missed)>0) activities.push({kind:'review',title:'Review missed questions',detail:'Work the active missed queue and read the reasoning before retrying.',href:'review.html?list=missed'});
    labsFor(item,catalog,2).forEach(lab=>activities.push({kind:'lab',title:lab.title,detail:lab.description||'Use the matching Skills Lab for applied practice.',href:lab.plannedRoute,labId:lab.id}));
    const topicBlob=normalize(list(item.topics).map(topic=>topic&&topic.label||topic).join(' '));
    if(item.taskCode==='D3C'||/(formula|calculation|index|unit|efficiency|latency|percentage)/.test(topicBlob)){
      if(!activities.some(activity=>activity.href==='math-coach.html')) activities.push({kind:'memory',title:'Math Coach',detail:'Rebuild calculation skill with worked examples and staged practice.',href:'math-coach.html'});
      activities.push({kind:'memory',title:'Memory Games',detail:'Use formula, unit, abbreviation, or weak-memory drills to strengthen recall.',href:'memory-games.html'});
    }else if(number(item.missed)>0){
      activities.push({kind:'memory',title:'Flashcard Center',detail:'Review saved cards and filter by the weak domain or task.',href:'flashcards.html'});
    }
    activities.push({kind:'verify',title:'Recheck after remediation',detail:'After studying and focused practice, use a Readiness Check to see whether the weak area is improving.',href:'readiness.html'});
    return activities;
  }
  function sourceHeadline(item){
    const group=list(item&&item.resources)[0];
    if(!group) return null;
    const section=list(group.sections)[0];
    return {sourceTitle:group.sourceTitle||'the recommended study reference',sectionLabel:section&&section.label||null};
  }
  function strongestTask(summary){
    const rows=list(summary&&summary.practice&&summary.practice.tasks).filter(row=>number(row.answered)>=5);
    if(!rows.length) return null;
    return rows.slice().sort((a,b)=>number(b.accuracy)-number(a.accuracy)||number(b.answered)-number(a.answered)||String(a.code).localeCompare(String(b.code)))[0];
  }
  function domainPriorities(priorities,domains){
    const grouped=new Map();
    priorities.forEach((item,index)=>{
      const key=item.domain||'Unknown';
      if(!grouped.has(key)) grouped.set(key,{domain:key,title:domains.get(key)&&domains.get(key).title||key,score:0,tasks:[]});
      const row=grouped.get(key);row.score+=number(item.evidenceScore)||Math.max(1,priorities.length-index);row.tasks.push({taskCode:item.taskCode,title:item.title,rank:index+1});
    });
    return Array.from(grouped.values()).sort((a,b)=>b.score-a.score||a.domain.localeCompare(b.domain));
  }
  function trendSentence(insights){
    const trend=insights&&insights.practiceTrend;
    if(!trend||!trend.current||!trend.current.answered) return 'You are still building enough recent Practice evidence to show a trend.';
    if(!trend.comparable) return 'Your recent Practice block is '+number(trend.current.percent)+'%, but there is not yet an earlier block large enough for a fair comparison.';
    if(trend.direction==='improving') return 'Your recent Practice trend is moving in the right direction, up '+Math.abs(number(trend.delta))+' percentage points from the prior block.';
    if(trend.direction==='declining') return 'Your recent Practice trend is down '+Math.abs(number(trend.delta))+' percentage points from the prior block, so keep your next review focused on a small number of weak tasks.';
    return 'Your recent Practice trend is holding about steady, so the next gain is most likely to come from targeted work on the repeated weak tasks.';
  }
  function coachLetter(summary,insights,priorities,domains){
    const greeting=summary&&summary.learner&&summary.learner.displayName?'Hi '+summary.learner.displayName+',':'Hi there,';
    if(!priorities.length){
      return {greeting,paragraphs:[
        'You are still building enough learning evidence for me to give you a reliable task-by-task study prescription.',
        'Complete some Focused Practice or a Readiness Check at your own pace. Once the app sees repeated performance patterns, this report will point you toward the domains, tasks, study materials, and practice tools that deserve your attention first.',
        trendSentence(insights)
      ],signature:'Coach Bob'};
    }
    const first=priorities[0];const firstDomain=domains.get(first.domain)||{title:first.domain};const evidence=taskEvidence(summary,first);const source=sourceHeadline(first);const labs=labsFor(first,summary&&summary._catalog||{},1);
    const second=priorities[1];const strength=strongestTask(summary);
    const paragraphs=[];
    paragraphs.push('Here is what your report is telling me in plain language: your first study priority is '+first.domain+' · '+firstDomain.title+', especially '+first.taskCode+' · '+first.title+'. The reason is '+evidence.text+'.');
    if(strength&&strength.code!==first.taskCode) paragraphs.push('One area that is currently looking stronger in ordinary Practice is '+strength.code+' · '+strength.title+' at '+number(strength.accuracy)+'% across '+number(strength.answered)+' answers. Keep touching that area, but put most of your review attention on the weaker areas.');
    if(second){const secondDomain=domains.get(second.domain)||{title:second.domain};paragraphs.push('When you are ready to move on from the first priority, continue to '+second.domain+' · '+secondDomain.title+', '+second.taskCode+' · '+second.title+'. Keeping the review focused makes it easier to tell whether your remediation is working.');}
    let action='A useful sequence is to start with the Guided Study lesson for '+first.taskCode;
    if(source){action+=', then read '+source.sourceTitle+(source.sectionLabel?' — '+source.sectionLabel:'');}
    if(labs.length) action+=', and use '+labs[0].title+' for applied practice';
    action+='. Then use task-filtered Focused Practice, work the missed queue, and recheck yourself with Readiness when you feel prepared.';
    paragraphs.push(action);
    paragraphs.push(trendSentence(insights)+' I am not looking for one perfect score. I want to see fewer repeated misses, stronger task accuracy, and better performance when you return to the same material after studying. Work through the plan steadily and efficiently, but at your own pace so the material has time to stick.');
    return {greeting,paragraphs,signature:'Coach Bob'};
  }
  function build(input){
    const options=object(input);const summary=object(options.summary);const insights=object(options.insights);const catalog=object(options.catalog);const domains=domainMap(summary);
    const priorities=list(summary.studyPlan).slice(0,3).map((item,index)=>{
      const evidence=taskEvidence(summary,item);const domain=domains.get(item.domain)||{id:item.domain,title:item.domain};
      return {...item,rank:index+1,domainTitle:domain.title,evidence,activities:activitiesFor(item,catalog),labs:labsFor(item,catalog,2)};
    });
    const summaryForLetter={...summary,_catalog:catalog};
    return {priorities,domains:domainPriorities(priorities,domains),strongestTask:strongestTask(summary),letter:coachLetter(summaryForLetter,insights,priorities,domains)};
  }
  return {build,labsFor,activitiesFor,strongestTask,taskEvidence,domainPriorities,coachLetter};
});
