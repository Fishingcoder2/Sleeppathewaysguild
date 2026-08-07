(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.RPSGTReadinessEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const DOMAIN_WEIGHTS={D1:.20,D2:.273,D3:.253,D4:.273};
  const DIRECT_TASKS=["D1A","D1B","D1C","D2A","D2B","D2C","D3A","D3B","D3C","D4A","D4B","D4C"];

  function shuffle(items,rng){
    const random=typeof rng==="function"?rng:Math.random;
    const copy=(items||[]).slice();
    for(let i=copy.length-1;i>0;i-=1){
      const j=Math.floor(random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function normalizeWeight(value){
    const n=Number(value)||0;
    return n>1?n/100:n;
  }

  function allocateCounts(total,domains){
    const size=Math.max(0,Number(total)||0);
    const defs=(domains||[]).map(function(domain,index){
      const id=domain.id;
      const weight=normalizeWeight(domain.weight!==undefined?domain.weight:DOMAIN_WEIGHTS[id]);
      const exact=size*weight;
      return {id:id,weight:weight,exact:exact,index:index};
    });
    const counts={};
    let used=0;
    defs.forEach(function(def){counts[def.id]=Math.floor(def.exact);used+=counts[def.id];});
    let remaining=Math.max(0,size-used);
    defs.slice().sort(function(a,b){
      const fraction=(b.exact-Math.floor(b.exact))-(a.exact-Math.floor(a.exact));
      return fraction||b.weight-a.weight||a.index-b.index;
    }).forEach(function(def){if(remaining>0){counts[def.id]+=1;remaining-=1;}});
    return counts;
  }

  function questionBlob(question){
    return [question&&question.difficulty,question&&question.questionType,question&&question.cognitiveLevel,question&&question.topic,question&&question.prompt].join(" ").toLowerCase();
  }

  function difficultyScore(question){
    const blob=questionBlob(question);
    let score=0;
    if(/\badvanced\b|\bhard\b/.test(blob)) score+=120;
    if(/\btricky\b|best[- ]?answer|best next step|best first action|best action|trap|critical thinking|safety judgment|\bsafety\b|application\/analysis|\banalyze\b|\bcase\b|scenario|interpretation|troubleshooting|decision|next step|most appropriate|best response|most important|first action/.test(blob)) score+=90;
    if(/\bexam\b|mixed mock reserve/.test(blob)) score+=70;
    if(/scoring rule|aasm|cutoff|protocol|current rule|technical guideline|rule cutoff/.test(blob)) score+=45;
    if(question&&question.qa&&question.qa.scoringRuleRelated) score+=25;
    if(question&&question.qa&&question.qa.ruleCutoffOrProtocolRelated) score+=18;
    if(/\bcalculation\b|unit trap|index|rate|latency|efficiency|percent|conversion|formula/.test(blob)) score+=28;
    if(/\bintermediate\b/.test(blob)) score+=20;
    if(/\bconcept\b|definition|terminology|glossary|abbreviation|memory\/mastery|\brecall\b|foundation|basic/.test(blob)) score-=65;
    if(/\bbeginner\b|\beasy\b|\bfoundation\b/.test(blob)) score-=500;
    return score;
  }

  function difficultyWeight(question){
    const score=difficultyScore(question);
    if(score>=180) return 1.55;
    if(score>=140) return 1.42;
    if(score>=100) return 1.30;
    if(score>=65) return 1.15;
    return 1;
  }

  function displayPrompt(question){
    return String(question&&question.prompt||"").replace(/\s+Version\s+\d+\.\s*$/i,"").replace(/\s{2,}/g," ").trim();
  }

  function normalizeFamily(question){
    return displayPrompt(question).toLowerCase()
      .replace(/\bpractice item\s+\d+\s*:/g,"practice item:")
      .replace(/\bcase\s+\d+\s*:/g,"case:")
      .replace(/\bversion\s+\d+\.?/g,"")
      .replace(/\b\d+(?:\.\d+)?\b/g,"#")
      .replace(/\s+/g," ").trim();
  }

  function isEligible(question){
    return Boolean(question)&&DIRECT_TASKS.includes(question.taskCode)&&!(question.qa&&question.qa.manualReviewRecommended);
  }

  function dedupeByFamily(pool){
    const best=new Map();
    (pool||[]).filter(isEligible).forEach(function(question){
      const key=normalizeFamily(question)||String(question.id);
      const current=best.get(key);
      if(!current||difficultyScore(question)>difficultyScore(current)) best.set(key,question);
    });
    return Array.from(best.values());
  }

  function pickTaskBalanced(pool,count,rng){
    const target=Math.max(0,Number(count)||0);
    if(!target) return [];
    const buckets={};
    shuffle(pool,rng).forEach(function(question){(buckets[question.taskCode]||(buckets[question.taskCode]=[])).push(question);});
    const taskCodes=Object.keys(buckets).sort(function(a,b){return DIRECT_TASKS.indexOf(a)-DIRECT_TASKS.indexOf(b);});
    const picked=[];
    const ids=new Set();
    let progressed=true;
    while(picked.length<target&&progressed){
      progressed=false;
      taskCodes.forEach(function(code){
        if(picked.length>=target) return;
        const bucket=buckets[code];
        while(bucket.length&&ids.has(String(bucket[0].id))) bucket.shift();
        if(bucket.length){const question=bucket.shift();picked.push(question);ids.add(String(question.id));progressed=true;}
      });
    }
    if(picked.length<target){
      shuffle(pool.filter(function(question){return !ids.has(String(question.id));}),rng).slice(0,target-picked.length).forEach(function(question){picked.push(question);ids.add(String(question.id));});
    }
    return picked.slice(0,target);
  }

  function buildSession(pool,size,domains,rng){
    const eligible=dedupeByFamily(pool);
    const domainDefs=(domains||[]).map(function(domain){return {id:domain.id,weight:domain.weight};});
    const counts=allocateCounts(size,domainDefs);
    const selected=[];
    const ids=new Set();
    const families=new Set();
    domainDefs.forEach(function(domain){
      const domainPool=eligible.filter(function(question){return question.domain===domain.id&&!ids.has(String(question.id))&&!families.has(normalizeFamily(question));});
      pickTaskBalanced(domainPool,counts[domain.id]||0,rng).forEach(function(question){
        const family=normalizeFamily(question);
        if(ids.has(String(question.id))||families.has(family)) return;
        selected.push(question);ids.add(String(question.id));families.add(family);
      });
    });
    if(selected.length<Number(size)){
      shuffle(eligible.filter(function(question){return !ids.has(String(question.id))&&!families.has(normalizeFamily(question));}),rng)
        .slice(0,Number(size)-selected.length).forEach(function(question){selected.push(question);ids.add(String(question.id));families.add(normalizeFamily(question));});
    }
    if(selected.length<Number(size)) throw new Error("Not enough eligible questions to build the requested readiness check.");
    return {questions:shuffle(selected,rng),blueprintCounts:counts,eligibleCount:eligible.length};
  }

  function summarize(questions,answers){
    const answerMap=answers||{};
    const byDomain={};
    const byTask={};
    let correct=0;
    let weightedCorrect=0;
    let weightedTotal=0;
    (questions||[]).forEach(function(question){
      const selected=answerMap[String(question.id)]||"";
      const isCorrect=selected===question.answer;
      const weight=difficultyWeight(question);
      weightedTotal+=weight;
      if(isCorrect){correct+=1;weightedCorrect+=weight;}
      const domain=byDomain[question.domain]||(byDomain[question.domain]={domain:question.domain,total:0,correct:0});
      domain.total+=1;if(isCorrect) domain.correct+=1;
      const task=byTask[question.taskCode]||(byTask[question.taskCode]={domain:question.domain,taskCode:question.taskCode,title:question.task,total:0,correct:0,missed:0,topics:{},recommendationKeys:new Set(),referenceKeys:new Set()});
      task.total+=1;
      if(isCorrect) task.correct+=1; else {
        task.missed+=1;
        (question.studyRecommendationKeys||[]).forEach(function(key){task.recommendationKeys.add(key);});
        (question.referenceKeys||[]).forEach(function(key){task.referenceKeys.add(key);});
      }
      if(question.topic) task.topics[question.topic]=(task.topics[question.topic]||0)+1;
    });
    Object.values(byDomain).forEach(function(row){row.percent=row.total?Math.round(row.correct/row.total*100):0;});
    const weakestTasks=Object.values(byTask).map(function(task){
      return {domain:task.domain,taskCode:task.taskCode,title:task.title,total:task.total,correct:task.correct,missed:task.missed,percent:task.total?Math.round(task.correct/task.total*100):0,topics:Object.entries(task.topics).sort(function(a,b){return b[1]-a[1];}).slice(0,3).map(function(entry){return entry[0];}),recommendationKeys:Array.from(task.recommendationKeys).slice(0,8),referenceKeys:Array.from(task.referenceKeys).slice(0,8)};
    }).sort(function(a,b){return a.percent-b.percent||b.missed-a.missed||a.taskCode.localeCompare(b.taskCode);}).slice(0,5);
    return {total:(questions||[]).length,answered:Object.keys(answerMap).length,correct:correct,percent:questions&&questions.length?Math.round(correct/questions.length*100):0,weightedPercent:weightedTotal?Math.round(weightedCorrect/weightedTotal*100):0,byDomain:byDomain,weakestTasks:weakestTasks};
  }

  return {DOMAIN_WEIGHTS:DOMAIN_WEIGHTS,DIRECT_TASKS:DIRECT_TASKS,shuffle:shuffle,allocateCounts:allocateCounts,difficultyScore:difficultyScore,difficultyWeight:difficultyWeight,displayPrompt:displayPrompt,normalizeFamily:normalizeFamily,isEligible:isEligible,dedupeByFamily:dedupeByFamily,pickTaskBalanced:pickTaskBalanced,buildSession:buildSession,summarize:summarize};
});
