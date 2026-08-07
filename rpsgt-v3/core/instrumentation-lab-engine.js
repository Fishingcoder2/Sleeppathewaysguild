(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTInstrumentationLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const LAB_ID='instrumentation';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const TASK_CODES=['D2A','D2B','D2C'];
  const STATIONS=[
    {id:'signal-pathway',title:'Trace the signal from patient to display',focus:'Review the pathway from physiologic source through sensor, input, amplifier, acquisition system, and displayed channel.'},
    {id:'derivations-polarity',title:'Derivations, references, grounds, and polarity',focus:'Review how input relationships, references, grounds, and polarity shape the displayed waveform.'},
    {id:'amplifiers-common-mode',title:'Differential amplification and common-mode rejection',focus:'Review amplification concepts and why common signals should be rejected rather than displayed as physiology.'},
    {id:'sensitivity-calibration',title:'Sensitivity, gain, calibration, and display scale',focus:'Review how amplitude settings and calibration evidence affect interpretation without changing the underlying patient signal.'},
    {id:'filters-frequency',title:'Filters, frequency response, and time constants',focus:'Review how filter choices can attenuate, distort, or preserve signal components across the expected frequency range.'},
    {id:'sampling-digital',title:'Sampling, resolution, and digital acquisition',focus:'Review sampling, aliasing, resolution, and acquisition concepts that influence stored and displayed data.'},
    {id:'artifact-troubleshooting',title:'Artifact isolation, correction, and documentation',focus:'Trace questionable waveforms through the channel and equipment pathway before changing settings or documenting corrective action.'}
  ];
  const STATION_IDS=new Set(STATIONS.map(item=>item.id));
  const FAMILY_ORDER=['signal-pathway','derivation-polarity','amplifier','sensitivity-calibration','filters','sampling-digital','artifact','equipment','other'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  function instrumentationText(record){return `${record&&record.topic||''} ${record&&record.prompt||''}`.toLowerCase();}
  function instrumentationTopic(record){
    return /(instrument|signal pathway|signal chain|channel|montage|derivation|reference|referential|bipolar|ground|polarity|input 1|input 2|differential|common[- ]mode|cmrr|amplifier|gain|sensitivity|calibrat|filter|low[- ]frequency|high[- ]frequency|lff|hff|notch|frequency response|time constant|sampling|sample rate|alias|digital|analog|resolution|bit depth|a\/d|adc|electrode|impedance|artifact|signal quality|equipment|hardware|acquisition|waveform|amplitude|frequency|transducer|sensor|connector|lead|electrical interference|60[- ]hz|50[- ]hz|baseline drift|blocking|saturation|clipping)/i.test(instrumentationText(record));
  }
  function classifyFamily(record){
    const text=instrumentationText(record);
    if(/artifact|interference|baseline drift|signal loss|poor signal|clipping|saturat|blocking|60[- ]hz|50[- ]hz|troubleshoot/.test(text)) return 'artifact';
    if(/sampling|sample rate|alias|digital|analog|resolution|bit depth|a\/d|adc/.test(text)) return 'sampling-digital';
    if(/low[- ]frequency|high[- ]frequency|lff|hff|notch|filter|frequency response|time constant/.test(text)) return 'filters';
    if(/sensitivity|gain|calibrat|display scale|amplitude setting/.test(text)) return 'sensitivity-calibration';
    if(/differential|common[- ]mode|cmrr|amplifier/.test(text)) return 'amplifier';
    if(/montage|derivation|reference|referential|bipolar|ground|polarity|input 1|input 2/.test(text)) return 'derivation-polarity';
    if(/signal pathway|signal chain|sensor.*amplifier|electrode.*amplifier|patient.*display|physiologic source/.test(text)) return 'signal-pathway';
    if(/equipment|hardware|acquisition|connector|transducer|sensor|electrode|impedance|channel/.test(text)) return 'equipment';
    return 'other';
  }
  function eligibleQuestions(records){
    const seenPrompts=new Set();const seenIds=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||!TASK_CODES.includes(record.taskCode)||record.taskCode==='D2A/D2C') return false;
      if(record.manualReviewRecommended||record.qa&&record.qa.manualReviewRecommended) return false;
      if(record.crossTaskCode==='D2A/D2C'||record.qa&&record.qa.crossTaskCode==='D2A/D2C') return false;
      if(!Array.isArray(record.options)||!record.options.includes(record.answer)) return false;
      if(!instrumentationTopic(record)) return false;
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
    const quotas={D2A:Math.ceil(desired/3),D2B:Math.floor(desired/3),D2C:Math.floor(desired/3)};
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
    return {id:'instrumentation-'+completedAt,source:'v3-lab-instrumentation',labId:LAB_ID,taskCodes:TASK_CODES.slice(),correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
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
    if(!STATION_IDS.has(String(stationId)))throw new Error('Unknown Instrumentation lab station: '+stationId);
    const normalized=normalizeLabs(value);const time=updatedAt||new Date().toISOString();if(!normalized.record.startedAt)normalized.record.startedAt=time;if(!normalized.record.completed)normalized.record.checklist[String(stationId)]=checked===true;return persist(normalized,time);
  }
  function applySession(value,session){
    const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded)record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));record.checkpointPassed=record.checkpointPassed||safe.passed===true;return persist(normalized,time);
  }
  function summary(value){const record=normalizeLabs(value).record;record.stationCount=STATIONS.length;record.stationsComplete=STATIONS.filter(station=>record.checklist[station.id]).length;return clone(record);}
  return {VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,HISTORY_LIMIT,TASK_CODES,STATIONS,FAMILY_ORDER,instrumentationTopic,classifyFamily,eligibleQuestions,selectQuestions,gradeSession,normalizeLabs,start,setStation,applySession,summary};
});
