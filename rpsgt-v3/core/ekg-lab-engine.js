(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTEkgLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const LAB_ID='ekg';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const TASK_CODES=['D2B','D3C'];
  const STATIONS=[
    {id:'signal-validity',title:'Verify tracing validity and signal quality',focus:'Confirm electrode and lead integrity, time base, artifact, neighboring-channel contamination, and whether the displayed tracing represents the patient before interpreting it.'},
    {id:'rate-regularity',title:'Determine rate and regularity',focus:'Review R-R spacing, calculate or estimate rate with the displayed time base, and describe whether the ventricular pattern is regular, regularly irregular, or irregular.'},
    {id:'atrial-activity',title:'Review P waves and atrial activity',focus:'Look for consistent atrial activity, P-wave morphology and timing, and atrial patterns that require closer correlation.'},
    {id:'conduction-ventricular',title:'Review PR, QRS, and the atrial-ventricular relationship',focus:'Assess conduction timing, QRS width and morphology, ventricular activity, and the relationship between atrial and ventricular events.'},
    {id:'pattern-context',title:'Classify the broad pattern and correlate context',focus:'Use a repeatable sequence to identify a broad rhythm family, then correlate the tracing with symptoms, video, oxygen, respiratory events, movement, and neighboring PSG channels.'},
    {id:'safety-escalation',title:'Assess the patient and follow escalation procedures',focus:'Assess symptoms and urgency first, maintain patient safety, and follow current facility cardiac-rhythm, emergency, physician-notification, and medical-direction procedures.'},
    {id:'documentation-handoff',title:'Document the finding, response, and limitations',focus:'Record onset, duration, rate or pattern, signal validity, symptoms, interventions, response, notifications, unresolved concerns, and any study limitation without making an independent diagnosis.'}
  ];
  const STATION_IDS=new Set(STATIONS.map(item=>item.id));
  const FAMILY_ORDER=['documentation','safety-escalation','signal-validity','rate-regularity','atrial','conduction','ventricular','sinus-pause','other'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  function combinedText(record){
    const keys=[...(Array.isArray(record&&record.referenceKeys)?record.referenceKeys:[]),...(Array.isArray(record&&record.studyRecommendationKeys)?record.studyRecommendationKeys:[])].join(' ');
    return `${record&&record.topic||''} ${record&&record.prompt||''} ${record&&record.questionType||''} ${record&&record.source||''} ${record&&record.sourceCredit||''} ${record&&record.sourceFamily||''} ${record&&record.reportCategory||''} ${keys}`.toLowerCase();
  }
  function isEkgRelevant(record){
    const text=combinedText(record);
    const strong=/\becg\b|\bekg\b|electrocardio|cardiac rhythm|dysrhythm|arrhythm|heart rate|r-r|p wave|qrs|pr interval|qt interval|sinus brady|sinus tach|atrial fibrillation|atrial flutter|junctional|premature atrial|\bpac\b|premature ventricular|\bpvc\b|ventricular tach|ventricular fibrillation|asystole|cardiac pause|av block|heart block|bigeminy|trigeminy|ectopy|wide[- ]complex/.test(text);
    const mapped=/(^|\s)ekg-tech-support(\s|$)/.test(text)&&/(heart rate|cardiac|ecg|ekg|rhythm|dysrhythm|arrhythm|p wave|qrs|pr interval|qt interval|chest pain|palpitation|syncope|bradycard|tachycard|ventricular|atrial|asystole|ectopy)/.test(text);
    return strong||mapped;
  }
  function classifyFamily(record){
    const text=combinedText(record);
    if(/document|report|chart|handoff|technologist note|notify|notification|record onset|duration/.test(text)) return 'documentation';
    if(/symptom|chest pain|distress|syncope|dizz|diaphores|palpitation|emergency|assess the patient|patient assessment|activate|escalat|physician contact|medical director/.test(text)) return 'safety-escalation';
    if(/artifact|electrode|lead problem|lead integrity|signal quality|valid tracing|verify tracing|calibration|neighboring channel|contamination/.test(text)) return 'signal-validity';
    if(/count|calculate|beats per minute|\bbpm\b|r-r|heart rate|rate and regular|regularity|irregular rhythm/.test(text)) return 'rate-regularity';
    if(/atrial fibrillation|atrial flutter|premature atrial|\bpac\b|p wave|atrial activity/.test(text)) return 'atrial';
    if(/pr interval|qrs|av block|heart block|junctional|conduction|atrial-ventricular|a-v relationship/.test(text)) return 'conduction';
    if(/premature ventricular|\bpvc\b|ventricular tach|ventricular fibrillation|bigeminy|trigeminy|wide[- ]complex|ventricular ectopy/.test(text)) return 'ventricular';
    if(/sinus brady|sinus tach|sinus pause|asystole|cardiac pause|sinus rhythm/.test(text)) return 'sinus-pause';
    return 'other';
  }
  function eligibleQuestions(records){
    const seenPrompts=new Set();const seenIds=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||!TASK_CODES.includes(record.taskCode)||!isEkgRelevant(record)) return false;
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
    const base=Math.floor(desired/TASK_CODES.length);let remainder=desired%TASK_CODES.length;
    TASK_CODES.forEach(taskCode=>{
      const quota=base+(remainder>0?1:0);if(remainder>0)remainder-=1;
      diverseTake(eligible.filter(item=>item.taskCode===taskCode),quota,random).forEach(item=>{if(!used.has(String(item.id))){used.add(String(item.id));selected.push(item);}});
    });
    diverseTake(eligible.filter(item=>!used.has(String(item.id))),Math.max(0,desired-selected.length),random).forEach(item=>{if(!used.has(String(item.id))){used.add(String(item.id));selected.push(item);}});
    return shuffle(selected,random).slice(0,desired);
  }
  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];const answers=isObject(input&&input.answers)?input.answers:{};const completedAt=input&&input.completedAt||new Date().toISOString();const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,selected,correct:selected===question.answer,topic:question.topic||null,taskCode:question.taskCode||null,family:classifyFamily(question)};});
    const correct=responses.filter(response=>response.correct).length;const total=questions.length;const percent=total?Math.round(correct/total*100):0;
    return {id:'ekg-'+completedAt,source:'v3-lab-ekg',labId:LAB_ID,taskCodes:TASK_CODES.slice(),correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
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
    if(!STATION_IDS.has(String(stationId)))throw new Error('Unknown EKG lab station: '+stationId);
    const normalized=normalizeLabs(value);const time=updatedAt||new Date().toISOString();if(!normalized.record.startedAt)normalized.record.startedAt=time;if(!normalized.record.completed)normalized.record.checklist[String(stationId)]=checked===true;return persist(normalized,time);
  }
  function applySession(value,session){
    const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded)record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));record.checkpointPassed=record.checkpointPassed||safe.passed===true;return persist(normalized,time);
  }
  function summary(value){const record=normalizeLabs(value).record;record.stationCount=STATIONS.length;record.stationsComplete=STATIONS.filter(station=>record.checklist[station.id]).length;return clone(record);}
  return {VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,HISTORY_LIMIT,TASK_CODES,STATIONS,FAMILY_ORDER,isEkgRelevant,classifyFamily,eligibleQuestions,selectQuestions,gradeSession,normalizeLabs,start,setStation,applySession,summary};
});
