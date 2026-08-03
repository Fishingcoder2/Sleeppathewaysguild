(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTDaytimeTestingLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const LAB_ID='daytime-testing';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const TASK_CODES=['D1A','D2C','D3A'];
  const STATIONS=[
    {id:'indication-development',title:'Indication, goals, and developmental appropriateness',focus:'Confirm the order, clinical question, age and developmental needs, caregiver expectations, and limits of what daytime testing can establish.'},
    {id:'sleep-schedule',title:'Sleep schedule, diary, actigraphy, and treatment readiness',focus:'Review habitual timing and duration, document adequate sleep before testing, and identify untreated or insufficiently controlled sleep disorders that can confound results.'},
    {id:'medications-substances',title:'Medication, substance, caffeine, and screening plan',focus:'Follow the prescriber-approved plan for alerting, sedating, and REM-modulating agents; document recent changes, caffeine strategy, and indicated toxicology screening.'},
    {id:'preceding-psg',title:'Preceding attended PSG and habitual timing',focus:'Verify adequate recording and sleep opportunity, align testing with the patient’s habitual schedule, use prescribed sleep-disordered-breathing therapy, and identify conditions that require rescheduling or interpretation caution.'},
    {id:'environment-conduct',title:'Daytime environment and between-trial conduct',focus:'Maintain controlled light, noise, temperature, meals, activity, device access, caregiver behavior, wakefulness, comfort, and safety between trials.'},
    {id:'trial-acquisition',title:'Montage, calibrations, instructions, and nap-trial acquisition',focus:'Use the required recording channels, audiovisual monitoring, age-appropriate calibrations and instructions, standardized trial timing, and accurate sleep and REM latency measurement.'},
    {id:'reporting-validity-mwt',title:'Reporting, protocol deviations, validity, and MWT boundaries',focus:'Report trial metrics, prestudy evidence, medications and substances, deviations, environmental observations, and limitations; recognize that pediatric MWT norms and clinical utility remain uncertain.'}
  ];
  const STATION_IDS=new Set(STATIONS.map(item=>item.id));
  const FAMILY_ORDER=['preparation','sleep-schedule','medication-substance','preceding-psg','environment','mslt-trials','mwt','acquisition-scoring','documentation-validity','other'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  function combinedText(record){
    const keys=[...(Array.isArray(record&&record.referenceKeys)?record.referenceKeys:[]),...(Array.isArray(record&&record.studyRecommendationKeys)?record.studyRecommendationKeys:[])].join(' ');
    return `${record&&record.topic||''} ${record&&record.prompt||''} ${record&&record.questionType||''} ${keys}`.toLowerCase();
  }
  function isDaytimeTestingRelevant(record){
    const text=combinedText(record);
    const explicitKey=/(^|\s)aasm-mslt-mwt(\s|$)/.test(text);
    const strongText=/\bmslt\b|multiple sleep latency|\bmwt\b|maintenance of wakefulness|nap trial|sleep latency test|mean sleep latency|soremp|sleep-onset rem|hypersomnolence testing|daytime sleepiness test/.test(text);
    const protocolText=/(sleep diary|actigraphy|preceding psg|overnight psg|habitual bedtime|habitual sleep|medication washout|rem-modulating|caffeine withdrawal|drug screen|between naps|between trials|bio-?calibration|dark quiet room|keep the patient awake|trial start|trial end|sleep latency|rem latency|protocol deviation)/.test(text);
    return explicitKey||strongText||protocolText;
  }
  function classifyFamily(record){
    const text=combinedText(record);
    if(/report|document|protocol deviation|limitation|validity|interpretation|data transfer|study result|technologist note|final report/.test(text)) return 'documentation-validity';
    if(/maintenance of wakefulness|\bmwt\b|stay awake|wakefulness trial/.test(text)) return 'mwt';
    if(/montage|eeg|eog|emg|ecg|audiovisual|video|bio-?calibration|sleep latency|rem latency|score|epoch|acquisition/.test(text)) return 'acquisition-scoring';
    if(/nap trial|five naps|4 naps|four naps|2-hour|two-hour|trial timing|lights out|sleep onset|soremp|mean sleep latency|\bmslt\b|multiple sleep latency/.test(text)) return 'mslt-trials';
    if(/dark|quiet|temperature|bright light|sunlight|electronic device|between naps|between trials|meal|breakfast|lunch|activity|out of bed|caregiver/.test(text)) return 'environment';
    if(/preceding psg|overnight psg|attended psg|time in bed|total sleep time|split-night|titration night|habitual bedtime|nocturnal recording|pap download|home therapy/.test(text)) return 'preceding-psg';
    if(/medication|prescription|over-the-counter|herbal|substance|caffeine|nicotine|alcohol|marijuana|drug screen|toxicology|washout|half-life|sedating|alerting|rem-modulating/.test(text)) return 'medication-substance';
    if(/sleep diary|sleep log|actigraphy|sleep schedule|sleep duration|insufficient sleep|circadian|delayed sleep|long nap|habitual sleep/.test(text)) return 'sleep-schedule';
    if(/indication|order|referral|age|development|patient preparation|goal|narcolepsy|idiopathic hypersomnia|hypersomnolence/.test(text)) return 'preparation';
    return 'other';
  }
  function eligibleQuestions(records){
    const seenPrompts=new Set();const seenIds=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||!TASK_CODES.includes(record.taskCode)||!isDaytimeTestingRelevant(record)) return false;
      if(record.manualReviewRecommended||record.qa&&record.qa.manualReviewRecommended) return false;
      if(record.crossTaskCode==='D2A/D2C'||record.qa&&record.qa.crossTaskCode==='D2A/D2C') return false;
      if(!Array.isArray(record.options)||!record.options.includes(record.answer)) return false;
      const prompt=normalizedPrompt(record.prompt);const id=String(record.id||'');
      if(!prompt||!id||seenPrompts.has(prompt)||seenIds.has(id)) return false;
      seenPrompts.add(prompt);seenIds.add(id);return true;
    }).map(clone);
  }
  function hash(text){let value=2166136261;for(let index=0;index<String(text).length;index+=1){value^=String(text).charCodeAt(index);value=Math.imul(value,16777619);}return value>>>0;}
  function seededRandom(seed){let state=hash(seed)||1;return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};}
  function shuffle(records,random){const copy=records.slice();for(let index=copy.length-1;index>0;index-=1){const swap=Math.floor(random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}return copy;}
  function diverseTake(records,count,random){
    const groups=new Map(FAMILY_ORDER.map(family=>[family,[]]));
    shuffle(records,random).forEach(record=>groups.get(classifyFamily(record)).push(record));
    const selected=[];
    while(selected.length<count){let added=false;for(const family of FAMILY_ORDER){const group=groups.get(family);if(group.length&&selected.length<count){selected.push(group.shift());added=true;}}if(!added)break;}
    return selected;
  }
  function selectQuestions(records,count,seed){
    const desired=Math.max(0,Math.floor(safeNumber(count,SESSION_SIZE)));const random=seededRandom(seed||LAB_ID);const eligible=eligibleQuestions(records);const selected=[];const used=new Set();
    const quotas={D1A:Math.ceil(desired/3),D2C:Math.floor(desired/3),D3A:Math.floor(desired/3)};
    TASK_CODES.forEach(taskCode=>{
      diverseTake(eligible.filter(item=>item.taskCode===taskCode),quotas[taskCode],random).forEach(item=>{if(!used.has(String(item.id))){used.add(String(item.id));selected.push(item);}});
    });
    diverseTake(eligible.filter(item=>!used.has(String(item.id))),Math.max(0,desired-selected.length),random).forEach(item=>{if(!used.has(String(item.id))){used.add(String(item.id));selected.push(item);}});
    return shuffle(selected,random).slice(0,desired);
  }
  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];const answers=isObject(input&&input.answers)?input.answers:{};const completedAt=input&&input.completedAt||new Date().toISOString();const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,selected,correct:selected===question.answer,topic:question.topic||null,taskCode:question.taskCode||null,family:classifyFamily(question)};});
    const correct=responses.filter(response=>response.correct).length;const total=questions.length;const percent=total?Math.round(correct/total*100):0;
    return {id:'daytime-testing-'+completedAt,source:'v3-lab-daytime-testing',labId:LAB_ID,taskCodes:TASK_CODES.slice(),correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
  }
  function normalizeChecklist(value){const source=isObject(value)?value:{};return STATIONS.reduce((out,station)=>{out[station.id]=source[station.id]===true;return out;},{});}
  function normalizeRecord(value,completedFromList){
    const source=isObject(value)?value:{};const history=Array.isArray(source.history)?source.history.filter(isObject).map(clone):[];const checklist=normalizeChecklist(source.checklist);const checklistCompleted=STATIONS.every(station=>checklist[station.id]);const checkpointPassed=Boolean(source.checkpointPassed)||Boolean(source.quizPassed)||history.some(item=>item&&item.passed===true);const completed=Boolean(source.completed)||Boolean(completedFromList)||(checklistCompleted&&checkpointPassed);
    return {status:completed?'completed':source.status==='in-progress'?'in-progress':'not-started',completed,startedAt:source.startedAt||null,updatedAt:source.updatedAt||null,completedAt:source.completedAt||null,checklist,checklistCompleted,checkpointPassed,attempts:Math.max(history.length,0,safeNumber(source.attempts,history.length)),bestPercent:Math.max(0,Math.min(100,safeNumber(source.bestPercent,0))),latestSession:isObject(source.latestSession)?clone(source.latestSession):history[0]||null,history};
  }
  function normalizeLabs(value){const labs=isObject(value)?clone(value):{};const completed=new Set(Array.isArray(labs.completed)?labs.completed.map(String):[]);const started=isObject(labs.started)?clone(labs.started):{};return {labs,completed,started,record:normalizeRecord(labs[LAB_ID],completed.has(LAB_ID))};}
  function persist(normalized,time){
    const record=normalized.record;record.checklistCompleted=STATIONS.every(station=>record.checklist[station.id]);
    if(record.completed||record.checklistCompleted&&record.checkpointPassed){record.completed=true;record.status='completed';record.completedAt=record.completedAt||time;normalized.completed.add(LAB_ID);}else if(record.startedAt){record.status='in-progress';}
    record.updatedAt=time;normalized.started[LAB_ID]=isObject(normalized.started[LAB_ID])?normalized.started[LAB_ID]:{startedAt:record.startedAt||time};normalized.labs.started=normalized.started;normalized.labs.completed=[...normalized.completed].sort();normalized.labs.lastLab=LAB_ID;normalized.labs[LAB_ID]=record;return normalized.labs;
  }
  function start(value,startedAt){const normalized=normalizeLabs(value);const time=startedAt||new Date().toISOString();if(!normalized.record.startedAt)normalized.record.startedAt=time;return persist(normalized,time);}
  function setStation(value,stationId,checked,updatedAt){
    if(!STATION_IDS.has(String(stationId)))throw new Error('Unknown daytime-testing lab station: '+stationId);
    const normalized=normalizeLabs(value);const time=updatedAt||new Date().toISOString();if(!normalized.record.startedAt)normalized.record.startedAt=time;if(!normalized.record.completed)normalized.record.checklist[String(stationId)]=checked===true;return persist(normalized,time);
  }
  function applySession(value,session){
    const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded)record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));record.checkpointPassed=record.checkpointPassed||safe.passed===true;return persist(normalized,time);
  }
  function summary(value){const record=normalizeLabs(value).record;record.stationCount=STATIONS.length;record.stationsComplete=STATIONS.filter(station=>record.checklist[station.id]).length;return clone(record);}
  return {VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,HISTORY_LIMIT,TASK_CODES,STATIONS,FAMILY_ORDER,isDaytimeTestingRelevant,classifyFamily,eligibleQuestions,selectQuestions,gradeSession,normalizeLabs,start,setStation,applySession,summary};
});
