(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTTroubleshootingLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const LAB_ID='troubleshooting';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const TASK_CODES=['D2B','D2C','D3C'];
  const STATIONS=[
    {id:'safety-first',title:'Protect the patient and assess urgency first',focus:'Separate immediate patient-safety or emergency needs from technical problems before touching equipment or continuing the study.'},
    {id:'define-problem',title:'Define the problem and affected data',focus:'Identify when the problem began, which channels or systems are affected, and whether the change is continuous, intermittent, or event-linked.'},
    {id:'localize-source',title:'Localize the source through the signal pathway',focus:'Work from patient and sensor through lead, connector, amplifier, acquisition system, environment, and display rather than changing several variables at once.'},
    {id:'correlate-context',title:'Correlate physiology, video, and neighboring channels',focus:'Compare physiologic plausibility, related channels, body position, behavior, and video before labeling a finding as artifact or true physiology.'},
    {id:'correct-recheck',title:'Apply the least disruptive correction and recheck',focus:'Correct the most likely cause, protect sleep continuity when possible, and confirm that signal quality or patient condition actually improved.'},
    {id:'escalate-boundaries',title:'Escalate unsafe, abnormal, or unresolved conditions',focus:'Use orders, facility policy, emergency procedures, and the chain of command when the finding is urgent, outside scope, or not safely correctable.'},
    {id:'document-integrity',title:'Document the problem, action, response, and limitation',focus:'Record timing, affected data, corrective action, patient or signal response, unresolved limitations, and information needed for scoring and report verification.'}
  ];
  const STATION_IDS=new Set(STATIONS.map(item=>item.id));
  const FAMILY_ORDER=['safety-escalation','patient-event','signal-artifact','sensor-contact','equipment-system','corrective-action','documentation','report-integrity','other'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  function troubleshootingText(record){return `${record&&record.topic||''} ${record&&record.prompt||''} ${record&&record.questionType||''}`.toLowerCase();}
  function troubleshootingTopic(record){
    const text=troubleshootingText(record);
    const general=/(troubleshoot|artifact|signal quality|signal loss|poor signal|failed signal|sensor|electrode|lead problem|channel|impedance|loose|disconnect|drift|erratic|interference|synchroni[sz]|video clock|equipment|hardware|device|malfunction|failure|damaged|missing|contaminat|calibrat|biocal|safety|emergency|chest pain|short of breath|seizure|low oxygen|faint|fall|tangled|out of bed|skin redness|skin irritation|protocol conflict|chain of command|escalat|document|technical note|intervention|patient response|signal response|lights out|lights on|study integrity|data quality|invalid|limitation|underestimat|overestimat|discrepancy|inconsisten|mismatch|plausib|correlat|recheck|correct the sensor|replace the sensor|reposition|secure the sensor|assess the patient|verify signal|verify channel|verify equipment)/i.test(text);
    if(general) return true;
    if(record&&record.taskCode==='D3C'){
      const topic=String(record.topic||'').toLowerCase();
      const prompt=String(record.prompt||'').toLowerCase();
      return /(report|interpretation|verification|documentation|quality|technical|study limitation)/.test(topic)&&/(verify|review|limitation|underestimat|overestimat|inconsisten|mismatch|missing|artifact|technical|document|accurate|quality|valid|context|trap|best interpretation)/.test(prompt);
    }
    return false;
  }
  function classifyFamily(record){
    const text=troubleshootingText(record);
    if(/emergency|chest pain|short of breath|seizure|low oxygen|faint|fall|fire|electrical shock|suicid|distress|acute|chain of command|escalat|unsafe/.test(text)) return 'safety-escalation';
    if(/out of bed|patient movement|body position|behavior|skin redness|skin irritation|restroom|bathroom|patient condition/.test(text)) return 'patient-event';
    if(/artifact|interference|drift|erratic|signal loss|poor signal|failed signal|saturat|clipping|60[- ]hz|50[- ]hz|waveform/.test(text)) return 'signal-artifact';
    if(/sensor|electrode|lead|belt|probe|impedance|loose|disconnect|reposition|secure|contact/.test(text)) return 'sensor-contact';
    if(/equipment|hardware|device|system|amplifier|connector|video|clock|synchroni[sz]|software|acquisition|damaged|missing|contaminat/.test(text)) return 'equipment-system';
    if(/report|verify|interpretation|limitation|underestimat|overestimat|data quality|study integrity|accurate|valid|mismatch|discrepancy/.test(text)) return 'report-integrity';
    if(/document|technical note|lights out|lights on|time|record|note|handoff/.test(text)) return 'documentation';
    if(/correct|replace|repair|recheck|assess|fix|intervention|best next step|first action|respond/.test(text)) return 'corrective-action';
    return 'other';
  }
  function eligibleQuestions(records){
    const seenPrompts=new Set();const seenIds=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||!TASK_CODES.includes(record.taskCode)||record.taskCode==='D2A/D2C') return false;
      if(record.manualReviewRecommended||record.qa&&record.qa.manualReviewRecommended) return false;
      if(record.crossTaskCode==='D2A/D2C'||record.qa&&record.qa.crossTaskCode==='D2A/D2C') return false;
      if(!Array.isArray(record.options)||!record.options.includes(record.answer)) return false;
      if(!troubleshootingTopic(record)) return false;
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
    const quotas={D2B:Math.ceil(desired/3),D2C:Math.floor(desired/3),D3C:Math.floor(desired/3)};
    TASK_CODES.forEach(taskCode=>{
      diverseTake(eligible.filter(item=>item.taskCode===taskCode),quotas[taskCode],random).forEach(item=>{if(!used.has(String(item.id))){used.add(String(item.id));selected.push(item);}});
    });
    const extras=diverseTake(eligible.filter(item=>!used.has(String(item.id))),Math.max(0,desired-selected.length),random);
    return shuffle([...selected,...extras],random).slice(0,desired);
  }
  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];const answers=isObject(input&&input.answers)?input.answers:{};const completedAt=input&&input.completedAt||new Date().toISOString();const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,selected,correct:selected===question.answer,topic:question.topic||null,taskCode:question.taskCode||null,family:classifyFamily(question)};});
    const correct=responses.filter(response=>response.correct).length;const total=questions.length;const percent=total?Math.round(correct/total*100):0;
    return {id:'troubleshooting-'+completedAt,source:'v3-lab-troubleshooting',labId:LAB_ID,taskCodes:TASK_CODES.slice(),correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
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
    if(!STATION_IDS.has(String(stationId)))throw new Error('Unknown Troubleshooting lab station: '+stationId);
    const normalized=normalizeLabs(value);const time=updatedAt||new Date().toISOString();if(!normalized.record.startedAt)normalized.record.startedAt=time;if(!normalized.record.completed)normalized.record.checklist[String(stationId)]=checked===true;return persist(normalized,time);
  }
  function applySession(value,session){
    const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded)record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));record.checkpointPassed=record.checkpointPassed||safe.passed===true;return persist(normalized,time);
  }
  function summary(value){const record=normalizeLabs(value).record;record.stationCount=STATIONS.length;record.stationsComplete=STATIONS.filter(station=>record.checklist[station.id]).length;return clone(record);}
  return {VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,HISTORY_LIMIT,TASK_CODES,STATIONS,FAMILY_ORDER,troubleshootingTopic,classifyFamily,eligibleQuestions,selectQuestions,gradeSession,normalizeLabs,start,setStation,applySession,summary};
});
