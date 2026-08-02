(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTPediatricLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const LAB_ID='pediatric';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const TASK_CODES=['D1A','D1C','D3A','D3B','D4A'];
  const PEDIATRIC_KEYS=new Set([
    'aap-pediatric-osa','aasm-child-respiratory-psg','aasm-scoring-pediatric',
    'clinical-guide-pediatric-sleep','pediatric-psg','pediatric-sleep-pearls',
    'principles-practice-pediatric-sleep'
  ]);
  const STATIONS=[
    {id:'development-context',title:'Start with age, development, history, and the ordered study',focus:'Confirm chronological and developmental context, relevant medical history, the study indication, orders, and special precautions before setup.'},
    {id:'caregiver-preparation',title:'Prepare the child, caregiver, and sleep environment',focus:'Use age-appropriate explanations, caregiver partnership, familiar routines, and a calm environment while preserving study requirements and safety.'},
    {id:'pediatric-setup',title:'Adapt hookup and signal acquisition without losing required data',focus:'Plan sensor placement, secure leads and belts, protect skin, reduce entanglement risk, and verify signals before lights out and after interventions.'},
    {id:'developmental-staging',title:'Interpret sleep through developmental context',focus:'Review age-sensitive sleep organization and staging context without substituting adult expectations or memorized shortcuts for current scoring guidance.'},
    {id:'respiratory-gas-exchange',title:'Integrate airflow, effort, oxygen, carbon dioxide, and clinical context',focus:'Evaluate signal quality and the complete respiratory pattern, including age-appropriate gas-exchange monitoring and the possibility of events without obvious adult-style arousals.'},
    {id:'safety-observation',title:'Protect skin, airway, mobility, and patient safety throughout the study',focus:'Continuously observe the child, recognize urgent changes, follow infection and electrical-safety practices, and escalate concerns according to orders and facility policy.'},
    {id:'documentation-handoff',title:'Document caregiver input, interventions, limitations, and handoff',focus:'Record timing, behavior, sleep opportunity, sensor changes, respiratory or safety concerns, caregiver observations, study limitations, and required follow-up without making an independent diagnosis.'}
  ];
  const STATION_IDS=new Set(STATIONS.map(item=>item.id));
  const FAMILY_ORDER=['caregiver-preparation','setup-sensors','developmental-staging','respiratory-events','gas-exchange','safety-comfort','treatment-followup','documentation','other'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  const keyList=record=>[
    ...(Array.isArray(record&&record.referenceKeys)?record.referenceKeys:[]),
    ...(Array.isArray(record&&record.studyRecommendationKeys)?record.studyRecommendationKeys:[])
  ].map(String);
  function combinedText(record){
    return `${record&&record.topic||''} ${record&&record.prompt||''} ${record&&record.questionType||''} ${(record&&record.tags||[]).join(' ')}`.toLowerCase();
  }
  function isPediatricRelevant(record){
    if(keyList(record).some(key=>PEDIATRIC_KEYS.has(key))) return true;
    const text=combinedText(record);
    return /\bpediatric\b|\bpaediatric\b|\bchild\b|\bchildren\b|\binfant\b|\bneonat|\bnewborn\b|\btoddler\b|\badolescen|\bteen\b|\bpreterm\b|\bprematur|\bcorrected age\b|\bdevelopmental age\b|\bcaregiver\b|\bparent\b|\bguardian\b|\bcrib\b|\bbedwet|\benuresis\b|\btonsil|\badenoid|\bcongenital\b|\bdown syndrome\b|\bcraniofacial\b/.test(text);
  }
  function classifyFamily(record){
    const text=combinedText(record);
    if(/document|technical note|report|handoff|caregiver observation|limitation|lights out|lights on/.test(text)) return 'documentation';
    if(/treatment|therapy|pap|cpap|bilevel|oxygen|follow[- ]?up|adherence|surgery|adenotonsil/.test(text)) return 'treatment-followup';
    if(/safety|skin|burn|electrical|infection|entangl|fall|seizure|emergency|urgent|distress|comfort|anxiety/.test(text)) return 'safety-comfort';
    if(/carbon dioxide|co2|capnograph|end[- ]?tidal|transcutaneous|gas exchange|hypoventil/.test(text)) return 'gas-exchange';
    if(/apnea|hypopnea|respiratory|airflow|effort|desatur|oxygen saturation|snor|paradox|periodic breathing/.test(text)) return 'respiratory-events';
    if(/stage|staging|sleep architecture|sleep cycle|rem|nrem|active sleep|quiet sleep|developmental/.test(text)) return 'developmental-staging';
    if(/sensor|electrode|lead|belt|probe|hookup|montage|impedance|placement|secure|signal/.test(text)) return 'setup-sensors';
    if(/caregiver|parent|guardian|prepare|explain|education|routine|separation|child-friendly|acclimat/.test(text)) return 'caregiver-preparation';
    return 'other';
  }
  function eligibleQuestions(records){
    const seenPrompts=new Set();const seenIds=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||!TASK_CODES.includes(record.taskCode)||!isPediatricRelevant(record)) return false;
      if(record.manualReviewRecommended||record.qa&&record.qa.manualReviewRecommended) return false;
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
    while(selected.length<count){
      let added=false;
      for(const family of FAMILY_ORDER){const group=groups.get(family);if(group.length&&selected.length<count){selected.push(group.shift());added=true;}}
      if(!added) break;
    }
    return selected;
  }
  function selectQuestions(records,count,seed){
    const desired=Math.max(0,Math.floor(safeNumber(count,SESSION_SIZE)));const random=seededRandom(seed||LAB_ID);const eligible=eligibleQuestions(records);const selected=[];const used=new Set();
    const base=Math.floor(desired/TASK_CODES.length);let remainder=desired%TASK_CODES.length;
    TASK_CODES.forEach(taskCode=>{
      const quota=base+(remainder>0?1:0);if(remainder>0) remainder-=1;
      diverseTake(eligible.filter(item=>item.taskCode===taskCode),quota,random).forEach(item=>{if(!used.has(String(item.id))){used.add(String(item.id));selected.push(item);}});
    });
    diverseTake(eligible.filter(item=>!used.has(String(item.id))),Math.max(0,desired-selected.length),random).forEach(item=>selected.push(item));
    return shuffle(selected,random).slice(0,desired);
  }
  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];const answers=isObject(input&&input.answers)?input.answers:{};const completedAt=input&&input.completedAt||new Date().toISOString();const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,selected,correct:selected===question.answer,topic:question.topic||null,taskCode:question.taskCode||null,family:classifyFamily(question)};});
    const correct=responses.filter(response=>response.correct).length;const total=questions.length;const percent=total?Math.round(correct/total*100):0;
    return {id:'pediatric-'+completedAt,source:'v3-lab-pediatric',labId:LAB_ID,taskCodes:TASK_CODES.slice(),correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
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
  function start(value,startedAt){const normalized=normalizeLabs(value);const time=startedAt||new Date().toISOString();if(!normalized.record.startedAt) normalized.record.startedAt=time;return persist(normalized,time);}
  function setStation(value,stationId,checked,updatedAt){
    if(!STATION_IDS.has(String(stationId))) throw new Error('Unknown Pediatric lab station: '+stationId);
    const normalized=normalizeLabs(value);const time=updatedAt||new Date().toISOString();if(!normalized.record.startedAt) normalized.record.startedAt=time;if(!normalized.record.completed) normalized.record.checklist[String(stationId)]=checked===true;return persist(normalized,time);
  }
  function applySession(value,session){
    const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded) record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));record.checkpointPassed=record.checkpointPassed||safe.passed===true;return persist(normalized,time);
  }
  function summary(value){const record=normalizeLabs(value).record;record.stationCount=STATIONS.length;record.stationsComplete=STATIONS.filter(station=>record.checklist[station.id]).length;return clone(record);}
  return {VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,HISTORY_LIMIT,TASK_CODES,PEDIATRIC_KEYS,STATIONS,FAMILY_ORDER,isPediatricRelevant,classifyFamily,eligibleQuestions,selectQuestions,gradeSession,normalizeLabs,start,setStation,applySession,summary};
});
