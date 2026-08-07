(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.RPSGTMockEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const DIRECT_TASKS=["D1A","D1B","D1C","D2A","D2B","D2C","D3A","D3B","D3C","D4A","D4B","D4C"];
  const SCORED_DOMAIN_COUNTS={D1:30,D2:41,D3:38,D4:41};
  const SCORED_COUNT=150;
  const PRETEST_COUNT=25;
  const TOTAL_COUNT=175;
  const TIME_LIMIT_MINUTES=180;

  function shuffle(items,rng){
    const random=typeof rng==="function"?rng:Math.random;
    const copy=(items||[]).slice();
    for(let i=copy.length-1;i>0;i-=1){
      const j=Math.floor(random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function questionBlob(question){
    return [question&&question.difficulty,question&&question.questionType,question&&question.cognitiveLevel,question&&question.topic,question&&question.prompt].join(" ").toLowerCase();
  }

  function isVisualPlaceholder(question){
    const text=[question&&question.topic,question&&question.prompt,question&&question.questionType].join(" ").toLowerCase();
    const hasVisualData=Boolean(question&&(question.visual||question.image||question.channels||question.figure||question.svg));
    const explicitlyVisual=Boolean(question&&(question.visualRequired===true||/\bvisual\s*required\b/i.test(String(question.qaStatus||""))));
    const visualLanguage=/\bepoch lab\b|\bvisual lab\b|\bimage lab\b|\bfigure\b|\bshown in the image\b|\bshown in this epoch\b|\bthis epoch shows\b|\blook at (?:this )?tracing\b|\bshown in the tracing\b|\bshown on the strip\b|\blook at the strip\b/.test(text);
    return explicitlyVisual||hasVisualData||visualLanguage;
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

  function treatmentBoost(question){
    if(!question||question.domain!=="D4") return 0;
    const blob=questionBlob(question);
    let boost=18;
    if(/pap|cpap|bilevel|bipap|ipap|epap|pressure support|titration|mask|interface|leak|humidification|desensitization|adherence|oxygen|o2|spo2|alternative therap|oral appliance|positional|surgery|hypoglossal|inspire|therapy/.test(blob)) boost+=22;
    if(/troubleshooting|safety|best[- ]?answer|best next step|best first action|best action|case|scenario|decision|most appropriate|first action|respond|intervention/.test(blob)) boost+=20;
    return boost;
  }

  function sortScore(question){return difficultyScore(question)+treatmentBoost(question);}

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

  function baseEligible(question){
    return Boolean(question)&&DIRECT_TASKS.includes(question.taskCode)&&!(question.qa&&question.qa.manualReviewRecommended)&&question.mockEligible!==false&&question.mockExclude!==true&&!(question.qa&&question.qa.mockExclude===true)&&!question.stagingOnly&&!isVisualPlaceholder(question);
  }

  function isSimpleRecall(question){
    const blob=questionBlob(question);
    const application=/\btricky\b|best[- ]?answer|best next step|best first action|best action|critical thinking|safety judgment|\bsafety\b|\bcase\b|scenario|interpretation|troubleshooting|decision|calculation|unit trap|scoring rule|aasm|cutoff|protocol|most appropriate|first action/.test(blob);
    return !application&&/\bconcept\b|definition|terminology|glossary|abbreviation|memory\/mastery|\brecall\b/.test(blob);
  }

  function isMockStyleCandidate(question){
    const blob=questionBlob(question);
    if(/\bbeginner\b|\beasy\b|\bfoundation\b/.test(blob)) return false;
    if(isSimpleRecall(question)) return false;
    return difficultyScore(question)>=100;
  }

  function dedupeByFamily(pool,preferHard){
    const best=new Map();
    (pool||[]).filter(baseEligible).forEach(function(question){
      const key=normalizeFamily(question)||String(question.id);
      const current=best.get(key);
      if(!current){best.set(key,question);return;}
      const qScore=preferHard===false?difficultyScore(question):sortScore(question);
      const currentScore=preferHard===false?difficultyScore(current):sortScore(current);
      if(qScore>currentScore) best.set(key,question);
    });
    return Array.from(best.values());
  }

  function mockEligiblePool(pool){
    const eligible=dedupeByFamily((pool||[]).filter(baseEligible),true);
    const examGrade=dedupeByFamily(eligible.filter(isMockStyleCandidate),true);
    if(examGrade.length>=TOTAL_COUNT) return examGrade.sort(function(a,b){return sortScore(b)-sortScore(a);});
    const strictFallback=dedupeByFamily(eligible.filter(function(question){
      const blob=questionBlob(question);
      return !/(\bbeginner\b|\beasy\b|\bfoundation\b)/.test(blob)&&!isSimpleRecall(question)&&difficultyScore(question)>=65;
    }),true);
    if(strictFallback.length>=TOTAL_COUNT) return strictFallback.sort(function(a,b){return sortScore(b)-sortScore(a);});
    const nonBeginner=dedupeByFamily(eligible.filter(function(question){return !/(\bbeginner\b|\beasy\b|\bfoundation\b)/.test(questionBlob(question));}),true);
    return (nonBeginner.length>=TOTAL_COUNT?nonBeginner:eligible).sort(function(a,b){return sortScore(b)-sortScore(a);});
  }

  function pickTaskBalanced(pool,count,preferHard,rng){
    const target=Math.max(0,Number(count)||0);
    if(!target) return [];
    const prepared=preferHard===false?shuffle(pool,rng):shuffle(pool,rng).sort(function(a,b){return sortScore(b)-sortScore(a);});
    const buckets={};
    prepared.forEach(function(question){const key=String(question.taskCode||"General");(buckets[key]||(buckets[key]=[])).push(question);});
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
      const extras=(preferHard===false?shuffle(pool,rng):shuffle(pool,rng).sort(function(a,b){return sortScore(b)-sortScore(a);}))
        .filter(function(question){return !ids.has(String(question.id));}).slice(0,target-picked.length);
      picked.push.apply(picked,extras);
    }
    return picked.slice(0,target);
  }

  function buildSession(pool,rng){
    const eligible=mockEligiblePool(pool);
    const selected=[];
    const ids=new Set();
    const families=new Set();
    Object.keys(SCORED_DOMAIN_COUNTS).forEach(function(domain){
      const domainPool=eligible.filter(function(question){return question.domain===domain&&!ids.has(String(question.id))&&!families.has(normalizeFamily(question));});
      pickTaskBalanced(domainPool,SCORED_DOMAIN_COUNTS[domain],true,rng).forEach(function(question){
        const id=String(question.id);const family=normalizeFamily(question);
        if(ids.has(id)||families.has(family)) return;
        selected.push({question:question,role:"scored"});ids.add(id);families.add(family);
      });
    });
    if(selected.length<SCORED_COUNT){
      eligible.filter(function(question){return !ids.has(String(question.id))&&!families.has(normalizeFamily(question));})
        .sort(function(a,b){return sortScore(b)-sortScore(a);})
        .slice(0,SCORED_COUNT-selected.length).forEach(function(question){selected.push({question:question,role:"scored"});ids.add(String(question.id));families.add(normalizeFamily(question));});
    }
    const remaining=eligible.filter(function(question){return !ids.has(String(question.id))&&!families.has(normalizeFamily(question));});
    pickTaskBalanced(remaining,PRETEST_COUNT,true,rng).forEach(function(question){selected.push({question:question,role:"pretest"});ids.add(String(question.id));families.add(normalizeFamily(question));});
    if(selected.filter(function(item){return item.role==="scored";}).length!==SCORED_COUNT||selected.filter(function(item){return item.role==="pretest";}).length!==PRETEST_COUNT){
      throw new Error("Not enough eligible questions to build the preserved 175-question mock structure.");
    }
    const items=shuffle(selected,rng).map(function(item){return {id:String(item.question.id),role:item.role};});
    return {items:items,questionsById:Object.fromEntries(selected.map(function(item){return [String(item.question.id),item.question];})),eligibleCount:eligible.length,blueprintCounts:Object.assign({},SCORED_DOMAIN_COUNTS),scoredCount:SCORED_COUNT,pretestCount:PRETEST_COUNT,totalCount:TOTAL_COUNT,timeLimitMinutes:TIME_LIMIT_MINUTES};
  }

  function summarize(items,questionsById,answers){
    const answerMap=answers||{};
    const rows=(items||[]).map(function(item){
      const question=questionsById[String(item.id)];
      if(!question) return null;
      const selected=answerMap[String(item.id)]||"";
      return {item:item,question:question,selected:selected,correct:Boolean(selected)&&selected===question.answer};
    }).filter(Boolean);
    const scoredRows=rows.filter(function(row){return row.item.role!=="pretest";});
    const pretestRows=rows.filter(function(row){return row.item.role==="pretest";});
    const byDomain={};
    const byTask={};
    let weightedCorrect=0;let weightedTotal=0;
    scoredRows.forEach(function(row){
      const question=row.question;const weight=difficultyWeight(question);
      weightedTotal+=weight;if(row.correct) weightedCorrect+=weight;
      const domain=byDomain[question.domain]||(byDomain[question.domain]={domain:question.domain,total:0,correct:0});
      domain.total+=1;if(row.correct) domain.correct+=1;
      const task=byTask[question.taskCode]||(byTask[question.taskCode]={domain:question.domain,taskCode:question.taskCode,title:question.task,total:0,correct:0,missed:0,topics:{},recommendationKeys:new Set(),referenceKeys:new Set()});
      task.total+=1;
      if(row.correct) task.correct+=1; else {
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
    const scoredCorrect=scoredRows.filter(function(row){return row.correct;}).length;
    return {totalItems:rows.length,answeredTotal:rows.filter(function(row){return Boolean(row.selected);}).length,scoredCount:scoredRows.length,pretestCount:pretestRows.length,scoredCorrect:scoredCorrect,scoredPercent:scoredRows.length?Math.round(scoredCorrect/scoredRows.length*100):0,weightedPercent:weightedTotal?Math.round(weightedCorrect/weightedTotal*100):0,byDomain:byDomain,weakestTasks:weakestTasks,scoredMissedIds:scoredRows.filter(function(row){return row.selected&&!row.correct;}).map(function(row){return row.item.id;}),unansweredIds:rows.filter(function(row){return !row.selected;}).map(function(row){return row.item.id;})};
  }

  return {DIRECT_TASKS:DIRECT_TASKS,SCORED_DOMAIN_COUNTS:SCORED_DOMAIN_COUNTS,SCORED_COUNT:SCORED_COUNT,PRETEST_COUNT:PRETEST_COUNT,TOTAL_COUNT:TOTAL_COUNT,TIME_LIMIT_MINUTES:TIME_LIMIT_MINUTES,shuffle:shuffle,questionBlob:questionBlob,isVisualPlaceholder:isVisualPlaceholder,difficultyScore:difficultyScore,difficultyWeight:difficultyWeight,displayPrompt:displayPrompt,normalizeFamily:normalizeFamily,baseEligible:baseEligible,isSimpleRecall:isSimpleRecall,isMockStyleCandidate:isMockStyleCandidate,dedupeByFamily:dedupeByFamily,mockEligiblePool:mockEligiblePool,pickTaskBalanced:pickTaskBalanced,buildSession:buildSession,summarize:summarize};
});
