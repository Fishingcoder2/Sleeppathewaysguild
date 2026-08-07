(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.RPSGTQuestionRotationEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const VERSION="1.0.0";
  const DEFAULTS={
    count:10,
    mode:"practice",
    familyPolicy:"preferred",
    recentQuestionCooldownHours:24,
    recentConceptCooldownHours:12,
    remediationDelayMinutes:15,
    allowRemediation:true,
    excludeQuestionIds:[],
    avoidConceptFamilyIds:[],
    seed:null
  };

  const MODE_DEFAULTS={
    practice:{familyPolicy:"preferred",allowRemediation:true,recentQuestionCooldownHours:24,recentConceptCooldownHours:12},
    "guided-practice":{familyPolicy:"preferred",allowRemediation:true,recentQuestionCooldownHours:24,recentConceptCooldownHours:12},
    "guided-checkpoint":{familyPolicy:"preferred",allowRemediation:true,recentQuestionCooldownHours:48,recentConceptCooldownHours:12},
    readiness:{familyPolicy:"preferred",allowRemediation:false,recentQuestionCooldownHours:72,recentConceptCooldownHours:24},
    mock:{familyPolicy:"hard",allowRemediation:false,recentQuestionCooldownHours:168,recentConceptCooldownHours:72}
  };

  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
  const toId=value=>String(value==null?"":value).trim();
  const toTime=value=>{
    const n=Date.parse(value||"");
    return Number.isFinite(n)?n:null;
  };
  const hours=(value)=>Math.max(0,Number(value)||0)*60*60*1000;
  const minutes=(value)=>Math.max(0,Number(value)||0)*60*1000;

  function slug(value){
    return String(value||"").toLowerCase().normalize("NFKD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"")||"general";
  }

  function questionId(question){
    return toId(question&&(question.questionId||question.id||question.legacyQuestionId));
  }

  function conceptFamilyId(question){
    const explicit=toId(question&&(question.conceptFamilyId||question.conceptFamily));
    if(explicit) return explicit;
    const task=toId(question&&(question.taskId||question.taskCode))||"UNMAPPED";
    const topic=slug(question&&question.topic);
    return "legacy:"+task+":"+topic;
  }

  function conceptId(question){
    const explicit=toId(question&&question.conceptId);
    return explicit||conceptFamilyId(question)+":general";
  }

  function defaultState(){
    return {
      schemaVersion:1,
      questionStats:{},
      conceptStats:{},
      sessionHistory:[],
      updatedAt:null
    };
  }

  function normalizeCounter(value){
    const source=isObject(value)?value:{};
    return {
      attempts:Math.max(0,Number(source.attempts)||0),
      correct:Math.max(0,Number(source.correct)||0),
      incorrect:Math.max(0,Number(source.incorrect)||0),
      streak:Math.max(0,Number(source.streak)||0),
      lastSeenAt:source.lastSeenAt||null,
      lastCorrectAt:source.lastCorrectAt||null,
      lastIncorrectAt:source.lastIncorrectAt||null,
      mastered:Boolean(source.mastered),
      remediationDueAt:source.remediationDueAt||null
    };
  }

  function normalizeState(value){
    const source=isObject(value)?value:{};
    const state=defaultState();
    Object.keys(isObject(source.questionStats)?source.questionStats:{}).forEach(id=>{state.questionStats[id]=normalizeCounter(source.questionStats[id]);});
    Object.keys(isObject(source.conceptStats)?source.conceptStats:{}).forEach(id=>{state.conceptStats[id]=normalizeCounter(source.conceptStats[id]);});
    state.sessionHistory=Array.isArray(source.sessionHistory)?clone(source.sessionHistory).slice(0,100):[];
    state.updatedAt=source.updatedAt||null;
    return state;
  }

  function safeEligible(question){
    if(!question||!questionId(question)) return false;
    if(question.reviewStatus==="retired"||question.status==="retired") return false;
    if(question.qa&&question.qa.manualReviewRecommended||question.manualReviewRecommended) return false;
    if(!String(question.prompt||"").trim()) return false;
    if(!Array.isArray(question.options)||question.options.length<2) return false;
    if(!String(question.answer||"").trim()||!question.options.includes(question.answer)) return false;
    return true;
  }

  function seededRandom(seed){
    let state=2166136261;
    String(seed||"").split("").forEach(ch=>{state^=ch.charCodeAt(0);state=Math.imul(state,16777619);});
    state=state>>>0||1;
    return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  }

  function randomFor(options){return options&&typeof options.rng==="function"?options.rng:(options&&options.seed!=null?seededRandom(options.seed):Math.random);}

  function modeOptions(options){
    const supplied=isObject(options)?options:{};
    const mode=supplied.mode||DEFAULTS.mode;
    return Object.assign({},DEFAULTS,MODE_DEFAULTS[mode]||{},supplied,{mode});
  }

  function statFor(map,id){return normalizeCounter(map&&map[id]);}

  function ageMs(lastSeenAt,nowMs){
    const seen=toTime(lastSeenAt);
    return seen===null?Number.POSITIVE_INFINITY:Math.max(0,nowMs-seen);
  }

  function rankQuestion(question,state,options,nowMs){
    const qid=questionId(question);
    const familyId=conceptFamilyId(question);
    const qStat=statFor(state.questionStats,qid);
    const familyStat=statFor(state.conceptStats,familyId);
    const qAge=ageMs(qStat.lastSeenAt,nowMs);
    const familyAge=ageMs(familyStat.lastSeenAt,nowMs);
    const remediationDue=toTime(familyStat.remediationDueAt);
    const remediationReady=options.allowRemediation&&familyStat.incorrect>0&&remediationDue!==null&&remediationDue<=nowMs;
    let tier;
    let reason;

    if(familyStat.attempts===0){tier=0;reason="unseen-concept";}
    else if(qStat.attempts===0){tier=1;reason=remediationReady?"fresh-remediation-question":"unseen-question";}
    else {
      const recentQuestion=qAge<hours(options.recentQuestionCooldownHours);
      const recentConcept=familyAge<hours(options.recentConceptCooldownHours);
      if(remediationReady&&!qStat.lastIncorrectAt){tier=1.25;reason="alternate-remediation-question";}
      else if(qStat.mastered&&!recentQuestion){tier=2;reason="older-mastered-question";}
      else if(!qStat.mastered&&!recentQuestion){tier=2.1;reason="older-reviewed-question";}
      else if(qStat.mastered){tier=3;reason="recent-mastered-question";}
      else {tier=3.2;reason="recent-reviewed-question";}
      if(recentConcept) tier+=0.15;
      if(qStat.lastIncorrectAt&&remediationReady) tier+=0.35;
    }

    return {
      question,
      questionId:qid,
      conceptFamilyId:familyId,
      conceptId:conceptId(question),
      tier,
      reason,
      qAge,
      familyAge,
      qStat,
      familyStat
    };
  }

  function compareRank(a,b,rng){
    if(a.tier!==b.tier) return a.tier-b.tier;
    if(a.qAge!==b.qAge) return b.qAge-a.qAge;
    if(a.familyAge!==b.familyAge) return b.familyAge-a.familyAge;
    return rng()-0.5;
  }

  function buildRankedPool(records,options){
    const config=modeOptions(options);
    const state=normalizeState(config.rotationState||config.historyState);
    const nowMs=toTime(config.now)||Date.now();
    const excluded=new Set((config.excludeQuestionIds||[]).map(toId));
    const avoidFamilies=new Set((config.avoidConceptFamilyIds||[]).map(toId));
    const rng=randomFor(config);
    return (records||[])
      .filter(safeEligible)
      .filter(question=>!excluded.has(questionId(question)))
      .map(question=>rankQuestion(question,state,config,nowMs))
      .map(row=>Object.assign(row,{avoidFamily:avoidFamilies.has(row.conceptFamilyId)}))
      .sort((a,b)=>{
        if(a.avoidFamily!==b.avoidFamily) return a.avoidFamily?1:-1;
        return compareRank(a,b,rng);
      });
  }

  function selectQuestions(records,options){
    const config=modeOptions(options);
    const target=Math.max(0,Number(config.count)||0);
    if(!target) return [];
    const ranked=buildRankedPool(records,config);
    const selected=[];
    const selectedIds=new Set();
    const selectedFamilies=new Set();

    function take(row){
      if(!row||selectedIds.has(row.questionId)) return false;
      selected.push(row);
      selectedIds.add(row.questionId);
      selectedFamilies.add(row.conceptFamilyId);
      return true;
    }

    ranked.forEach(row=>{
      if(selected.length>=target) return;
      if(selectedFamilies.has(row.conceptFamilyId)) return;
      take(row);
    });

    if(selected.length<target&&config.familyPolicy!=="hard"){
      ranked.forEach(row=>{
        if(selected.length>=target) return;
        take(row);
      });
    }

    return selected.slice(0,target).map(row=>{
      const question=clone(row.question);
      question.rotationMeta={
        selectedReason:row.reason,
        selectionTier:row.tier,
        conceptFamilyId:row.conceptFamilyId,
        conceptId:row.conceptId,
        engineVersion:VERSION
      };
      return question;
    });
  }

  function selectByQuotas(records,options){
    const config=modeOptions(options);
    const quotas=isObject(config.quotas)?config.quotas:{};
    const quotaField=config.quotaField||"domain";
    const selected=[];
    const usedIds=new Set((config.excludeQuestionIds||[]).map(toId));
    const usedFamilies=new Set((config.avoidConceptFamilyIds||[]).map(toId));

    Object.keys(quotas).forEach(key=>{
      const count=Math.max(0,Number(quotas[key])||0);
      const pool=(records||[]).filter(question=>toId(question&&question[quotaField])===toId(key));
      const rows=selectQuestions(pool,Object.assign({},config,{
        count,
        excludeQuestionIds:Array.from(usedIds),
        avoidConceptFamilyIds:Array.from(usedFamilies)
      }));
      rows.forEach(question=>{usedIds.add(questionId(question));usedFamilies.add(conceptFamilyId(question));selected.push(question);});
    });

    const target=Object.values(quotas).reduce((sum,value)=>sum+(Math.max(0,Number(value)||0)),0);
    if(selected.length<target){
      const extras=selectQuestions(records,Object.assign({},config,{
        count:target-selected.length,
        excludeQuestionIds:Array.from(usedIds),
        avoidConceptFamilyIds:Array.from(usedFamilies)
      }));
      selected.push.apply(selected,extras);
    }
    return selected.slice(0,target);
  }

  function recordAttempt(value,input){
    const state=normalizeState(value);
    const question=input&&input.question||{};
    const qid=questionId(question)||toId(input&&input.questionId);
    const familyId=conceptFamilyId(question)||toId(input&&input.conceptFamilyId);
    if(!qid||!familyId) return state;
    const at=input&&input.at||new Date().toISOString();
    const correct=Boolean(input&&input.correct);
    const remediationDelay=minutes(input&&input.remediationDelayMinutes!=null?input.remediationDelayMinutes:DEFAULTS.remediationDelayMinutes);

    function update(bucket,id){
      const stat=statFor(bucket,id);
      stat.attempts+=1;
      stat.lastSeenAt=at;
      if(correct){
        stat.correct+=1;
        stat.streak+=1;
        stat.lastCorrectAt=at;
        stat.mastered=stat.streak>=2;
        if(stat.mastered) stat.remediationDueAt=null;
      }else{
        stat.incorrect+=1;
        stat.streak=0;
        stat.mastered=false;
        stat.lastIncorrectAt=at;
        const when=(toTime(at)||Date.now())+remediationDelay;
        stat.remediationDueAt=new Date(when).toISOString();
      }
      bucket[id]=stat;
    }

    update(state.questionStats,qid);
    update(state.conceptStats,familyId);
    state.updatedAt=at;
    return state;
  }

  function recordSession(value,input){
    const state=normalizeState(value);
    const questions=Array.isArray(input&&input.questions)?input.questions:[];
    const record={
      sessionId:toId(input&&input.sessionId)||"session-"+Date.now(),
      mode:input&&input.mode||"practice",
      completedAt:input&&input.completedAt||new Date().toISOString(),
      questionIds:questions.map(questionId).filter(Boolean),
      conceptFamilyIds:Array.from(new Set(questions.map(conceptFamilyId).filter(Boolean)))
    };
    state.sessionHistory=[record].concat(state.sessionHistory.filter(item=>item&&item.sessionId!==record.sessionId)).slice(0,100);
    state.updatedAt=record.completedAt;
    return state;
  }

  function sessionExclusions(value,options){
    const state=normalizeState(value);
    const supplied=isObject(options)?options:{};
    const modes=Array.isArray(supplied.modes)?new Set(supplied.modes):null;
    const sessions=Math.max(1,Number(supplied.sessions)||1);
    const matching=state.sessionHistory.filter(item=>!modes||modes.has(item.mode)).slice(0,sessions);
    return {
      questionIds:Array.from(new Set(matching.flatMap(item=>item.questionIds||[]))),
      conceptFamilyIds:Array.from(new Set(matching.flatMap(item=>item.conceptFamilyIds||[])))
    };
  }

  return {
    VERSION,
    DEFAULTS:clone(DEFAULTS),
    MODE_DEFAULTS:clone(MODE_DEFAULTS),
    defaultState,
    normalizeState,
    safeEligible,
    questionId,
    conceptFamilyId,
    conceptId,
    modeOptions,
    buildRankedPool,
    selectQuestions,
    selectByQuotas,
    recordAttempt,
    recordSession,
    sessionExclusions
  };
});
