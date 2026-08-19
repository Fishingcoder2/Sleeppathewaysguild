(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTRespiratoryLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.1.0';
  const LAB_ID='respiratory';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const TASK_CODES=['D2A','D2B','D3B'];
  const STATIONS=[
    {id:'signal-inventory',title:'Respiratory signal inventory and purpose',focus:'Identify what each respiratory channel contributes before interpreting an event.'},
    {id:'airflow-pathway',title:'Airflow sensors and signal behavior',focus:'Review thermal airflow, nasal pressure, cannula placement, signal limitations, and loss of airflow data.'},
    {id:'effort-pathway',title:'Thoracic and abdominal effort',focus:'Review effort belts, respiratory inductance, paradox, displacement, and effort-signal quality.'},
    {id:'oxygen-carbon-dioxide',title:'Oximetry and carbon-dioxide context',focus:'Review oxygen saturation and carbon-dioxide trends alongside signal quality, timing, and clinical context.'},
    {id:'snore-position-context',title:'Snore, position, and event context',focus:'Use snore and body-position information as supporting context rather than isolated proof.'},
    {id:'event-classification',title:'Respiratory-event recognition and classification',focus:'Integrate airflow, effort, oxygen, arousal, duration, and surrounding sleep context before classifying an event.'},
    {id:'artifact-correction',title:'Artifact correction and documentation',focus:'Trace questionable signals through the sensor pathway, correct what is safely correctable, and document meaningful changes.'}
  ];
  const PATTERNS=[
    {id:'normal',title:'Normal breathing',airflow:'normal',thorax:'normal',abdomen:'normal',oxygen:'steady',cue:'Airflow and respiratory effort rise and fall together.',teaching:'Use this as the baseline. Compare the size and timing of airflow, thoracic effort, abdominal effort, and oxygen with the event patterns.'},
    {id:'obstructive-apnea',title:'Obstructive apnea',airflow:'absent',thorax:'increased',abdomen:'paradox-increased',oxygen:'drop',cue:'Airflow stops while respiratory effort continues or increases.',teaching:'The airway is obstructed, so airflow becomes nearly flat while the effort belts continue. The effort pattern is intentionally prominent in this teaching trace.'},
    {id:'central-apnea',title:'Central apnea',airflow:'absent',thorax:'absent',abdomen:'absent',oxygen:'drop',cue:'Airflow and respiratory effort are absent together.',teaching:'The important contrast with obstructive apnea is the absence of meaningful thoracic and abdominal effort during the event.'},
    {id:'mixed-apnea',title:'Mixed apnea',airflow:'absent',thorax:'mixed',abdomen:'mixed-paradox',oxygen:'drop',cue:'The event begins without effort, then effort resumes before airflow returns.',teaching:'Look for the change within the same event: central physiology first, then obstructive effort while airflow remains absent.'},
    {id:'obstructive-hypopnea',title:'Obstructive hypopnea',airflow:'reduced-flattened',thorax:'increased',abdomen:'paradox-increased',oxygen:'drop',cue:'Airflow is clearly reduced and flattened while respiratory effort is preserved or increases.',teaching:'The airflow reduction is intentionally large enough to see. Thoracic effort becomes stronger, and abdominal effort continues with a visible paradoxical component so the obstructive pattern does not look like a central reduction.'},
    {id:'central-hypopnea',title:'Central hypopnea',airflow:'reduced',thorax:'reduced',abdomen:'reduced',oxygen:'drop',cue:'Airflow and respiratory effort decrease together.',teaching:'Compare this directly with obstructive hypopnea. Here the belts shrink along with airflow instead of staying strong or increasing.'},
    {id:'flow-limitation',title:'Flow limitation / RERA pattern',airflow:'flattened',thorax:'increased',abdomen:'increased',oxygen:'steady',cue:'Inspiratory airflow flattens while effort builds.',teaching:'This pattern emphasizes progressive inspiratory flow limitation and increasing effort. An arousal or other required context must be considered before assigning an event label.'}
  ];
  const STATION_IDS=new Set(STATIONS.map(item=>item.id));
  const PATTERN_IDS=new Set(PATTERNS.map(item=>item.id));
  const FAMILY_ORDER=['airflow','effort','oxygen','carbon-dioxide','snore-position','event-classification','artifact','other'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  const respiratoryTopic=value=>/(respirat|airflow|nasal pressure|pressure transducer|cannula|thermistor|thermocouple|thermal sensor|oro[- ]?nasal|effort belt|thoracic|abdominal|respiratory inductance|\brip\b|paradox|apnea|hypopnea|\brera\b|desatur|oximetr|oxygen saturation|\bspo2\b|carbon dioxide|\bco2\b|capnograph|end[- ]tidal|transcutaneous|snor|obstructive|central|mixed event|periodic breathing|cheyne[- ]stokes)/i.test(String(value||''));
  function classifyFamily(record){
    const text=`${record&&record.topic||''} ${record&&record.prompt||''}`.toLowerCase();
    if(/artifact|signal loss|poor signal|sensor displacement|sensor off|channel failure|troubleshoot|reposition|replace sensor/.test(text)) return 'artifact';
    if(/carbon dioxide|\bco2\b|capnograph|end[- ]tidal|transcutaneous/.test(text)) return 'carbon-dioxide';
    if(/oximetr|oxygen saturation|\bspo2\b|desatur|pulse oxim/.test(text)) return 'oxygen';
    if(/snor|body position|supine|prone|lateral/.test(text)) return 'snore-position';
    if(/apnea|hypopnea|\brera\b|obstructive|central|mixed event|periodic breathing|cheyne[- ]stokes|respiratory event/.test(text)) return 'event-classification';
    if(/effort belt|thoracic|abdominal|respiratory inductance|\brip\b|paradox|respiratory effort/.test(text)) return 'effort';
    if(/airflow|nasal pressure|pressure transducer|cannula|thermistor|thermocouple|thermal sensor|oro[- ]?nasal/.test(text)) return 'airflow';
    return 'other';
  }
  function eligibleQuestions(records){
    const seenPrompts=new Set();const seenIds=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||!TASK_CODES.includes(record.taskCode)) return false;
      if(record.manualReviewRecommended||record.qa&&record.qa.manualReviewRecommended) return false;
      if(!Array.isArray(record.options)||!record.options.includes(record.answer)) return false;
      if(!respiratoryTopic(record.topic)&&!respiratoryTopic(record.prompt)) return false;
      const prompt=normalizedPrompt(record.prompt);const id=String(record.id||'');
      if(!prompt||!id||seenPrompts.has(prompt)||seenIds.has(id)) return false;
      seenPrompts.add(prompt);seenIds.add(id);return true;
    }).map(clone);
  }
  function patternById(id){return clone(PATTERNS.find(item=>item.id===String(id))||PATTERNS[0]);}
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
    const extras=diverseTake(eligible.filter(item=>!used.has(String(item.id))),Math.max(0,desired-selected.length),random);
    return shuffle([...selected,...extras],random).slice(0,desired);
  }
  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];const answers=isObject(input&&input.answers)?input.answers:{};const completedAt=input&&input.completedAt||new Date().toISOString();const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,selected,correct:selected===question.answer,topic:question.topic||null,taskCode:question.taskCode||null,family:classifyFamily(question)};});
    const correct=responses.filter(response=>response.correct).length;const total=questions.length;const percent=total?Math.round(correct/total*100):0;
    return {id:'respiratory-'+completedAt,source:'v3-lab-respiratory',labId:LAB_ID,taskCodes:TASK_CODES.slice(),correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
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
    if(!STATION_IDS.has(String(stationId))) throw new Error('Unknown Respiratory lab station: '+stationId);
    const normalized=normalizeLabs(value);const time=updatedAt||new Date().toISOString();if(!normalized.record.startedAt) normalized.record.startedAt=time;if(!normalized.record.completed||checked===true) normalized.record.checklist[String(stationId)]=checked===true;return persist(normalized,time);
  }
  function applySession(value,session){
    const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded) record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));record.checkpointPassed=record.checkpointPassed||safe.passed===true;return persist(normalized,time);
  }
  function summary(value){const record=normalizeLabs(value).record;record.stationCount=STATIONS.length;record.stationsComplete=STATIONS.filter(station=>record.checklist[station.id]).length;return clone(record);}
  return {VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,HISTORY_LIMIT,TASK_CODES,STATIONS,PATTERNS,FAMILY_ORDER,classifyFamily,eligibleQuestions,patternById,selectQuestions,gradeSession,normalizeLabs,start,setStation,applySession,summary};
});