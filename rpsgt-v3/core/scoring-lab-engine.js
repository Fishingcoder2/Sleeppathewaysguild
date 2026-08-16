(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTScoringLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.2.0';
  const LAB_ID='scoring';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const STAGE_SKILL_SIZE=5;
  const STAGE_SKILL_PASS_PERCENT=80;
  const EVENT_SKILL_SIZE=5;
  const EVENT_SKILL_PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const TASK_CODES=['D3A','D3B','D3C'];
  const EVENT_OPTIONS=['Obstructive apnea','Central apnea','Mixed apnea','Obstructive hypopnea','RERA / flow limitation ending in arousal'];
  const EVENT_SKILL_CASES=[
    {id:'event-obstructive-apnea',evidenceCaseId:'obstructive-apnea-evidence',answer:'Obstructive apnea',options:EVENT_OPTIONS.slice(),evidenceTasks:2,rationale:'Thermal airflow becomes nearly absent while respiratory effort continues and becomes more prominent, supporting an obstructive apnea pattern.'},
    {id:'event-central-apnea',evidenceCaseId:'central-apnea-evidence',answer:'Central apnea',options:EVENT_OPTIONS.slice(),evidenceTasks:2,rationale:'Airflow and both respiratory-effort channels disappear together during the event, supporting a central apnea pattern.'},
    {id:'event-mixed-apnea',evidenceCaseId:'mixed-apnea-evidence',answer:'Mixed apnea',options:EVENT_OPTIONS.slice(),evidenceTasks:2,rationale:'The event begins with absent effort, then respiratory effort returns while airflow remains absent, creating the central-to-obstructive sequence.'},
    {id:'event-obstructive-hypopnea',evidenceCaseId:'obstructive-hypopnea-evidence',answer:'Obstructive hypopnea',options:EVENT_OPTIONS.slice(),evidenceTasks:2,rationale:'Nasal pressure is reduced and flattened while respiratory effort remains prominent, supporting an obstructive airflow-reduction pattern.'},
    {id:'event-rera',evidenceCaseId:'rera-evidence',answer:'RERA / flow limitation ending in arousal',options:EVENT_OPTIONS.slice(),evidenceTasks:2,rationale:'Sustained inspiratory flow limitation is followed by a visible terminating EEG arousal; the arousal context is essential to this teaching pattern.'}
  ];
  const STATIONS=[
    {id:'stage-recognition',title:'Wake, N1, N2, N3, and REM recognition',focus:'Review the signal features used to distinguish the major sleep stages.'},
    {id:'stage-transitions',title:'Stage transitions and epoch decisions',focus:'Review how changing signals and epoch context affect a staging decision.'},
    {id:'arousal-context',title:'Arousal recognition and sleep-stage context',focus:'Separate arousal recognition from the surrounding stage and event context.'},
    {id:'respiratory-classification',title:'Apnea, hypopnea, and respiratory-event classification',focus:'Review airflow, effort, oxygen, arousal, and event-context evidence before classifying an event.'},
    {id:'limb-movement-context',title:'Limb-movement context and association',focus:'Review movement timing, series context, and relationships to respiratory events or arousals.'},
    {id:'artifact-physiology',title:'Artifact versus physiologic event',focus:'Trace questionable findings back through the signal pathway before scoring a physiologic event.'},
    {id:'population-boundaries',title:'Population and protocol boundaries',focus:'Use age-specific or protocol-specific distinctions only when supported by the validated study material and current official guidance.'}
  ];
  const STATION_IDS=new Set(STATIONS.map(item=>item.id));
  const FAMILY_ORDER=['stage-transition','sleep-stage','arousal','respiratory-event','limb-movement','artifact','pediatric','other'];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  const normalizedAnswer=value=>String(value==null?'':value).normalize('NFKC').replace(/\u00a0/g,' ').trim().replace(/\s+/g,' ');
  function answersMatch(selected,correct){return selected!==null&&selected!==undefined&&normalizedAnswer(selected)===normalizedAnswer(correct);}
  function classifyFamily(record){
    const text=`${record&&record.topic||''} ${record&&record.prompt||''}`.toLowerCase();
    if(/infant|neonat|newborn|pediatric|paediatric|child|age[- ]specific/.test(text)) return 'pediatric';
    if(/artifact|signal loss|signal quality|electrode|sensor|channel|physiologic versus|physiological versus/.test(text)) return 'artifact';
    if(/periodic limb|limb movement|leg movement|\bplm\b|\bplms\b/.test(text)) return 'limb-movement';
    if(/apnea|hypopnea|rera|respiratory event|airflow|respiratory effort|desaturation|oxygen saturation|central event|obstructive event|mixed event/.test(text)) return 'respiratory-event';
    if(/arousal/.test(text)) return 'arousal';
    if(/transition|stage change|change from|epoch boundary|preceding epoch|subsequent epoch/.test(text)) return 'stage-transition';
    if(/sleep stage|stage n1|stage n2|stage n3|\brem\b|\bwake\b|k[- ]?complex|sleep spindle|slow wave|chin tone|rapid eye movement|epoch/.test(text)) return 'sleep-stage';
    return 'other';
  }
  function eligibleQuestions(records){
    const seenPrompts=new Set();const seenIds=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||!TASK_CODES.includes(record.taskCode)) return false;
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
  function diverseTake(records,count,random){const groups=new Map(FAMILY_ORDER.map(family=>[family,[]]));shuffle(records,random).forEach(record=>groups.get(classifyFamily(record)).push(record));const selected=[];while(selected.length<count){let added=false;for(const family of FAMILY_ORDER){const group=groups.get(family);if(group.length&&selected.length<count){selected.push(group.shift());added=true;}}if(!added) break;}return selected;}
  function selectQuestions(records,count,seed){
    const desired=Math.max(0,Math.floor(safeNumber(count,SESSION_SIZE)));const random=seededRandom(seed||LAB_ID);const eligible=eligibleQuestions(records);const selected=[];const used=new Set();const base=Math.floor(desired/TASK_CODES.length);let remainder=desired%TASK_CODES.length;
    TASK_CODES.forEach(taskCode=>{const quota=base+(remainder>0?1:0);if(remainder>0) remainder-=1;diverseTake(eligible.filter(item=>item.taskCode===taskCode),quota,random).forEach(item=>{if(!used.has(String(item.id))){used.add(String(item.id));selected.push(item);}});});
    const extras=diverseTake(eligible.filter(item=>!used.has(String(item.id))),Math.max(0,desired-selected.length),random);return shuffle([...selected,...extras],random).slice(0,desired);
  }
  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];const answers=isObject(input&&input.answers)?input.answers:{};const completedAt=input&&input.completedAt||new Date().toISOString();const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,selected,correct:answersMatch(selected,question.answer),topic:question.topic||null,taskCode:question.taskCode||null,family:classifyFamily(question)};});const correct=responses.filter(response=>response.correct).length;const total=questions.length;const percent=total?Math.round(correct/total*100):0;return {id:'scoring-'+completedAt,source:'v3-lab-scoring',labId:LAB_ID,taskCodes:TASK_CODES.slice(),correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
  }
  function gradeStageSkill(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];const answers=isObject(input&&input.answers)?input.answers:{};const completedAt=input&&input.completedAt||new Date().toISOString();const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):STAGE_SKILL_PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,studyId:question.studyId||null,selected,correct:answersMatch(selected,question.answer),answer:question.answer};});const correct=responses.filter(response=>response.correct).length;const total=questions.length;const percent=total?Math.round(correct/total*100):0;return {id:'scoring-stage-skill-'+completedAt,source:'v3-lab-scoring-stage-skill',labId:LAB_ID,taskCode:'D3A',correct,total,percent,passed:total===STAGE_SKILL_SIZE&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
  }
  function gradeEventSkill(input){
    const cases=Array.isArray(input&&input.cases)?input.cases:[];const answers=isObject(input&&input.answers)?input.answers:{};const evidence=isObject(input&&input.evidence)?input.evidence:{};const completedAt=input&&input.completedAt||new Date().toISOString();const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):EVENT_SKILL_PASS_PERCENT;
    const responses=cases.map(item=>{const selected=answers[String(item.id)]??null;const proof=isObject(evidence[String(item.id)])?evidence[String(item.id)]:{};const evidenceTotal=Math.max(0,safeNumber(proof.total,item.evidenceTasks||0));const evidenceSolved=Math.max(0,Math.min(evidenceTotal,safeNumber(proof.solved,0)));const revealed=Math.max(0,safeNumber(proof.revealed,0));return {id:item.id,evidenceCaseId:item.evidenceCaseId||null,selected,answer:item.answer,correct:answersMatch(selected,item.answer),evidenceSolved,evidenceTotal,revealed};});
    const correct=responses.filter(response=>response.correct).length,total=cases.length,percent=total?Math.round(correct/total*100):0;const evidenceComplete=total===EVENT_SKILL_SIZE&&responses.every(response=>response.evidenceTotal>0&&response.evidenceSolved===response.evidenceTotal);return {id:'scoring-event-skill-'+completedAt,source:'v3-lab-scoring-event-skill',labId:LAB_ID,taskCode:'D3B',correct,total,percent,evidenceComplete,revealed:responses.reduce((sum,item)=>sum+item.revealed,0),passed:total===EVENT_SKILL_SIZE&&percent>=passPercent&&evidenceComplete,passPercent,completedAt,caseIds:cases.map(item=>item.id),responses};
  }
  function normalizeChecklist(value){const source=isObject(value)?value:{};return STATIONS.reduce((out,station)=>{out[station.id]=source[station.id]===true;return out;},{});}
  function normalizeRecord(value,completedFromList){
    const source=isObject(value)?value:{};const history=Array.isArray(source.history)?source.history.filter(isObject).map(clone):[];const stageSkillHistory=Array.isArray(source.stageSkillHistory)?source.stageSkillHistory.filter(isObject).map(clone):[];const eventSkillHistory=Array.isArray(source.eventSkillHistory)?source.eventSkillHistory.filter(isObject).map(clone):[];const checklist=normalizeChecklist(source.checklist);const checklistCompleted=STATIONS.every(station=>checklist[station.id]);const checkpointPassed=Boolean(source.checkpointPassed)||Boolean(source.quizPassed)||history.some(item=>item&&item.passed===true);const stageSkillPassed=Boolean(source.stageSkillPassed)||stageSkillHistory.some(item=>item&&item.passed===true);const eventSkillPassed=Boolean(source.eventSkillPassed)||eventSkillHistory.some(item=>item&&item.passed===true);const completed=Boolean(source.completed)||Boolean(completedFromList)||(checklistCompleted&&checkpointPassed&&stageSkillPassed&&eventSkillPassed);
    return {status:completed?'completed':source.status==='in-progress'?'in-progress':'not-started',completed,startedAt:source.startedAt||null,updatedAt:source.updatedAt||null,completedAt:source.completedAt||null,checklist,checklistCompleted,checkpointPassed,attempts:Math.max(history.length,0,safeNumber(source.attempts,history.length)),bestPercent:Math.max(0,Math.min(100,safeNumber(source.bestPercent,0))),latestSession:isObject(source.latestSession)?clone(source.latestSession):history[0]||null,history,stageSkillPassed,stageSkillAttempts:Math.max(stageSkillHistory.length,0,safeNumber(source.stageSkillAttempts,stageSkillHistory.length)),stageSkillBestPercent:Math.max(0,Math.min(100,safeNumber(source.stageSkillBestPercent,0))),stageSkillLatest:isObject(source.stageSkillLatest)?clone(source.stageSkillLatest):stageSkillHistory[0]||null,stageSkillHistory,eventSkillPassed,eventSkillAttempts:Math.max(eventSkillHistory.length,0,safeNumber(source.eventSkillAttempts,eventSkillHistory.length)),eventSkillBestPercent:Math.max(0,Math.min(100,safeNumber(source.eventSkillBestPercent,0))),eventSkillLatest:isObject(source.eventSkillLatest)?clone(source.eventSkillLatest):eventSkillHistory[0]||null,eventSkillHistory};
  }
  function normalizeLabs(value){const labs=isObject(value)?clone(value):{};const completed=new Set(Array.isArray(labs.completed)?labs.completed.map(String):[]);const started=isObject(labs.started)?clone(labs.started):{};return {labs,completed,started,record:normalizeRecord(labs[LAB_ID],completed.has(LAB_ID))};}
  function persist(normalized,time){const record=normalized.record;record.checklistCompleted=STATIONS.every(station=>record.checklist[station.id]);if(record.completed||record.checklistCompleted&&record.checkpointPassed&&record.stageSkillPassed&&record.eventSkillPassed){record.completed=true;record.status='completed';record.completedAt=record.completedAt||time;normalized.completed.add(LAB_ID);}else if(record.startedAt){record.status='in-progress';}record.updatedAt=time;normalized.started[LAB_ID]=isObject(normalized.started[LAB_ID])?normalized.started[LAB_ID]:{startedAt:record.startedAt||time};normalized.labs.started=normalized.started;normalized.labs.completed=[...normalized.completed].sort();normalized.labs.lastLab=LAB_ID;normalized.labs[LAB_ID]=record;return normalized.labs;}
  function start(value,startedAt){const normalized=normalizeLabs(value);const time=startedAt||new Date().toISOString();if(!normalized.record.startedAt) normalized.record.startedAt=time;return persist(normalized,time);}
  function setStation(value,stationId,checked,updatedAt){if(!STATION_IDS.has(String(stationId))) throw new Error('Unknown Scoring lab station: '+stationId);const normalized=normalizeLabs(value);const time=updatedAt||new Date().toISOString();if(!normalized.record.startedAt) normalized.record.startedAt=time;if(!normalized.record.completed) normalized.record.checklist[String(stationId)]=checked===true;return persist(normalized,time);}
  function applySession(value,session){const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);record.startedAt=record.startedAt||time;record.latestSession=safe;record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded) record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));record.checkpointPassed=record.checkpointPassed||safe.passed===true;return persist(normalized,time);}
  function applyStageSkill(value,session){const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.stageSkillHistory.some(item=>item&&item.id===safe.id);record.startedAt=record.startedAt||time;record.stageSkillLatest=safe;record.stageSkillHistory=[safe,...record.stageSkillHistory.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded) record.stageSkillAttempts=Math.max(0,safeNumber(record.stageSkillAttempts,0))+1;record.stageSkillBestPercent=Math.max(record.stageSkillBestPercent,safeNumber(safe.percent,0));record.stageSkillPassed=record.stageSkillPassed||safe.passed===true;return persist(normalized,time);}
  function applyEventSkill(value,session){const normalized=normalizeLabs(value);const record=normalized.record;const safe=clone(session);const time=safe.completedAt||new Date().toISOString();const alreadyRecorded=record.eventSkillHistory.some(item=>item&&item.id===safe.id);record.startedAt=record.startedAt||time;record.eventSkillLatest=safe;record.eventSkillHistory=[safe,...record.eventSkillHistory.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);if(!alreadyRecorded) record.eventSkillAttempts=Math.max(0,safeNumber(record.eventSkillAttempts,0))+1;record.eventSkillBestPercent=Math.max(record.eventSkillBestPercent,safeNumber(safe.percent,0));record.eventSkillPassed=record.eventSkillPassed||safe.passed===true;return persist(normalized,time);}
  function summary(value){const record=normalizeLabs(value).record;record.stationCount=STATIONS.length;record.stationsComplete=STATIONS.filter(station=>record.checklist[station.id]).length;return clone(record);}
  return {VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,STAGE_SKILL_SIZE,STAGE_SKILL_PASS_PERCENT,EVENT_SKILL_SIZE,EVENT_SKILL_PASS_PERCENT,HISTORY_LIMIT,TASK_CODES,EVENT_OPTIONS:EVENT_OPTIONS.slice(),EVENT_SKILL_CASES:clone(EVENT_SKILL_CASES),STATIONS,FAMILY_ORDER,normalizedAnswer,answersMatch,classifyFamily,eligibleQuestions,selectQuestions,gradeSession,gradeStageSkill,gradeEventSkill,normalizeLabs,start,setStation,applySession,applyStageSkill,applyEventSkill,summary};
});