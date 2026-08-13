(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTHookupLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='2.0.0';
  const LAB_ID='hookup';
  const SESSION_SIZE=10;
  const PASS_PERCENT=80;
  const HISTORY_LIMIT=20;
  const SKILL_HISTORY_LIMIT=60;
  const TASK_CODES=['D2A','D2B'];

  const STATIONS=[
    {
      id:'measurement-foundations',
      title:'Build the 10–20 measurement map',
      action:'Identify and sequence',
      prompt:'Before marking EEG locations, which workflow best establishes the head map?',
      options:[
        'Measure head circumference, nasion-to-inion, and preauricular-to-preauricular, then mark locations from the measured 10% and 20% intervals.',
        'Place the EEG electrodes by visual symmetry first, then measure only if a channel looks abnormal.',
        'Measure only nasion-to-inion because the lateral head measurements are optional for standard placement.',
        'Use the patient’s hat size and facial midline to estimate the remaining positions.'
      ],
      answer:'Measure head circumference, nasion-to-inion, and preauricular-to-preauricular, then mark locations from the measured 10% and 20% intervals.',
      rationale:'The international 10–20 approach begins with three primary head measurements: circumference, nasion-to-inion, and preauricular-to-preauricular. Electrode locations are then derived from measured 10% and 20% intervals.'
    },
    {
      id:'measurement-math',
      title:'Calculate a placement interval',
      action:'Measure and calculate',
      prompt:'A nasion-to-inion measurement is 36 cm. What distance represents the first 10% interval from an endpoint?',
      options:['3.6 cm','7.2 cm','18 cm','32.4 cm'],
      answer:'3.6 cm',
      rationale:'Ten percent of 36 cm is 3.6 cm. Use the patient’s measured distance rather than a memorized fixed centimeter value.'
    },
    {
      id:'eog-placement',
      title:'Correct an EOG placement error',
      action:'Identify and correct',
      prompt:'During hookup review, E1 is 1 cm above the left outer canthus and E2 is 1 cm below the right outer canthus. What correction matches the standard left-inferior/right-superior arrangement?',
      options:[
        'Move E1 to 1 cm below the left outer canthus and E2 to 1 cm above the right outer canthus.',
        'Leave both electrodes where they are; only the references determine eye-movement polarity.',
        'Move both E1 and E2 1 cm above their outer canthi.',
        'Move both E1 and E2 1 cm below their outer canthi.'
      ],
      answer:'Move E1 to 1 cm below the left outer canthus and E2 to 1 cm above the right outer canthus.',
      rationale:'For the standard recommended arrangement, E1 is positioned inferior to the left outer canthus and E2 superior to the right outer canthus. Placement should be verified before relying on calibration waveforms.'
    },
    {
      id:'impedance-correction',
      title:'Troubleshoot poor electrode contact',
      action:'Interpret and correct',
      prompt:'Before lights out, a derivation shows prominent line-frequency interference and one electrode has a much higher impedance than its partner. What is the best next technologist action?',
      options:[
        'Inspect and correct electrode-to-skin contact and the patient circuit, then recheck impedance and signal quality.',
        'Turn on the line-frequency filter first and leave the electrode untouched if the waveform looks cleaner.',
        'Increase display gain so the physiologic waveform becomes larger than the interference.',
        'Ignore the difference because common-mode rejection works best when impedances are unequal.'
      ],
      answer:'Inspect and correct electrode-to-skin contact and the patient circuit, then recheck impedance and signal quality.',
      rationale:'High or imbalanced impedance and poor connections increase susceptibility to line-frequency artifact. Correct the electrode/contact or circuit problem and verify the signal rather than masking the cause first.'
    },
    {
      id:'calibration-verification',
      title:'Verify a physiologic calibration',
      action:'Choose and verify',
      prompt:'During the command to move the left great toe, the expected left leg EMG response is absent and the wrong leg channel deflects. What should the technologist do?',
      options:[
        'Verify the leg electrode/input assignment, correct the problem, and repeat the maneuver until the expected channel responds cleanly.',
        'Continue the study because any leg-channel deflection proves both limb sensors are working.',
        'Increase the leg EMG sensitivity and skip repeating the calibration command.',
        'Document the mismatch but wait until scoring to decide whether the channels were reversed.'
      ],
      answer:'Verify the leg electrode/input assignment, correct the problem, and repeat the maneuver until the expected channel responds cleanly.',
      rationale:'Physiologic calibration should confirm that the intended movement appears in the correct channel. If it does not, correct placement or input assignment and repeat the maneuver to verify a clean response.'
    },
    {
      id:'documentation-response',
      title:'Document a hookup correction',
      action:'Document and verify',
      prompt:'You repair an electrode and adjust a recording setting while troubleshooting during physiologic calibrations. What is the best follow-through?',
      options:[
        'Document the instruction and relevant change or corrective action, then repeat the affected calibration maneuver to verify clean recording.',
        'Document only the final impedance values because the reason for the correction is not important after the signal improves.',
        'Repeat the calibration silently and avoid annotating the change so the recording stays uncluttered.',
        'Wait until the end of the study to reconstruct all calibration changes from memory.'
      ],
      answer:'Document the instruction and relevant change or corrective action, then repeat the affected calibration maneuver to verify clean recording.',
      rationale:'Calibration documentation should capture what was asked or changed, and corrective action should be followed by a repeat maneuver so the technologist verifies that the intended physiologic signal is recorded cleanly.'
    }
  ];

  const STATION_MAP=new Map(STATIONS.map(item=>[item.id,item]));
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const safeNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const normalizedPrompt=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
  const hookupTopic=value=>/(electrode|impedance|10[-–]20|landmark|measure|site prep|skin prep|montage|reference|ground|chin emg|leg emg|ecg|ekg|biocal|physiologic calibration|sensor placement|lead placement|application|hookup|conductive|paste|collodion|cup electrode|\bm1\b|\bm2\b|\bf3\b|\bf4\b|\bc3\b|\bc4\b|\bo1\b|\bo2\b|\be1\b|\be2\b)/i.test(String(value||''));

  function eligibleQuestions(records){
    const seen=new Set();
    return (Array.isArray(records)?records:[]).filter(record=>{
      if(!record||!TASK_CODES.includes(record.taskCode)) return false;
      if(record.manualReviewRecommended||record.qa&&record.qa.manualReviewRecommended) return false;
      if(!Array.isArray(record.options)||!record.options.includes(record.answer)) return false;
      if(!hookupTopic(record.topic)&&!hookupTopic(record.prompt)) return false;
      const prompt=normalizedPrompt(record.prompt);
      if(!prompt||seen.has(prompt)) return false;
      seen.add(prompt);
      return true;
    }).map(clone);
  }

  function hash(text){let value=2166136261;for(let index=0;index<String(text).length;index+=1){value^=String(text).charCodeAt(index);value=Math.imul(value,16777619);}return value>>>0;}
  function seededRandom(seed){let state=hash(seed)||1;return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};}
  function shuffle(records,random){const copy=records.slice();for(let index=copy.length-1;index>0;index-=1){const swap=Math.floor(random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}return copy;}

  function selectQuestions(records,count,seed){
    const desired=Math.max(0,safeNumber(count,SESSION_SIZE));
    const random=seededRandom(seed||LAB_ID);
    const eligible=eligibleQuestions(records);
    const d2a=shuffle(eligible.filter(item=>item.taskCode==='D2A'),random);
    const d2b=shuffle(eligible.filter(item=>item.taskCode==='D2B'),random);
    const selected=[...d2a.slice(0,Math.ceil(desired/2)),...d2b.slice(0,Math.floor(desired/2))];
    const used=new Set(selected.map(item=>String(item.id)));
    const remainder=shuffle(eligible.filter(item=>!used.has(String(item.id))),random);
    return shuffle([...selected,...remainder.slice(0,Math.max(0,desired-selected.length))],random).slice(0,desired);
  }

  function gradeSession(input){
    const questions=Array.isArray(input&&input.questions)?input.questions:[];
    const answers=isObject(input&&input.answers)?input.answers:{};
    const completedAt=input&&input.completedAt||new Date().toISOString();
    const passPercent=Number.isFinite(Number(input&&input.passPercent))?Number(input.passPercent):PASS_PERCENT;
    const responses=questions.map(question=>{const selected=answers[String(question.id)]??null;return {id:question.id,selected,correct:selected===question.answer,topic:question.topic||null,taskCode:question.taskCode||null};});
    const correct=responses.filter(response=>response.correct).length;
    const total=questions.length;
    const percent=total?Math.round(correct/total*100):0;
    return {id:'hookup-'+completedAt,source:'v3-lab-hookup',labId:LAB_ID,taskCodes:TASK_CODES.slice(),correct,total,percent,passed:total>0&&percent>=passPercent,passPercent,completedAt,questionIds:questions.map(question=>question.id),responses};
  }

  function gradeSkill(stationId,selected,completedAt){
    const station=STATION_MAP.get(String(stationId));
    if(!station) throw new Error('Unknown Hookup lab station: '+stationId);
    const choice=selected==null?null:String(selected);
    return {
      id:'hookup-skill-'+station.id+'-'+(completedAt||new Date().toISOString()),
      stationId:station.id,
      selected:choice,
      correct:choice===station.answer,
      answer:station.answer,
      rationale:station.rationale,
      completedAt:completedAt||new Date().toISOString()
    };
  }

  function normalizeLegacyChecklist(value){
    const source=isObject(value)?value:{};
    const legacyIds=['order-equipment','patient-site','landmark-plan','application-impedance','calibrations','signal-documentation'];
    return legacyIds.reduce((out,id)=>{out[id]=source[id]===true;return out;},{});
  }

  function normalizeSkills(value){
    const source=isObject(value)?value:{};
    return STATIONS.reduce((out,station)=>{
      const row=isObject(source[station.id])?source[station.id]:{};
      out[station.id]={
        mastered:row.mastered===true,
        attempts:Math.max(0,safeNumber(row.attempts,0)),
        lastSelected:row.lastSelected==null?null:String(row.lastSelected),
        lastAttemptAt:row.lastAttemptAt||null,
        masteredAt:row.masteredAt||null
      };
      return out;
    },{});
  }

  function normalizeRecord(value){
    const source=isObject(value)?value:{};
    const history=Array.isArray(source.history)?source.history.filter(isObject).map(clone):[];
    const skillHistory=Array.isArray(source.skillHistory)?source.skillHistory.filter(isObject).map(clone):[];
    const skills=normalizeSkills(source.skills);
    const skillsCompleted=STATIONS.every(station=>skills[station.id]&&skills[station.id].mastered===true);
    const quizPassed=Boolean(source.quizPassed)||history.some(item=>item&&item.passed===true);
    const completed=skillsCompleted&&quizPassed;
    const legacyChecklist=normalizeLegacyChecklist(source.checklist||source.legacyChecklist);
    return {
      skillVersion:2,
      status:completed?'completed':source.startedAt||skillHistory.length||history.length?'in-progress':'not-started',
      completed,
      startedAt:source.startedAt||null,
      updatedAt:source.updatedAt||null,
      completedAt:completed?source.completedAt||null:null,
      skills,
      skillsCompleted,
      skillHistory,
      quizPassed,
      attempts:Math.max(history.length,0,safeNumber(source.attempts,history.length)),
      bestPercent:Math.max(0,Math.min(100,safeNumber(source.bestPercent,0))),
      latestSession:isObject(source.latestSession)?clone(source.latestSession):history[0]||null,
      history,
      legacyChecklist
    };
  }

  function normalizeLabs(value){
    const labs=isObject(value)?clone(value):{};
    const completed=new Set(Array.isArray(labs.completed)?labs.completed.map(String):[]);
    const started=isObject(labs.started)?clone(labs.started):{};
    return {labs,completed,started,record:normalizeRecord(labs[LAB_ID])};
  }

  function persist(normalized,time){
    const record=normalized.record;
    record.skillsCompleted=STATIONS.every(station=>record.skills[station.id]&&record.skills[station.id].mastered===true);
    record.completed=record.skillsCompleted&&record.quizPassed;
    if(record.completed){
      record.status='completed';
      record.completedAt=record.completedAt||time;
      normalized.completed.add(LAB_ID);
    }else{
      normalized.completed.delete(LAB_ID);
      record.completedAt=null;
      record.status=record.startedAt?'in-progress':'not-started';
    }
    record.updatedAt=time;
    if(record.startedAt) normalized.started[LAB_ID]=isObject(normalized.started[LAB_ID])?normalized.started[LAB_ID]:{startedAt:record.startedAt};
    normalized.labs.started=normalized.started;
    normalized.labs.completed=[...normalized.completed].sort();
    normalized.labs.lastLab=LAB_ID;
    normalized.labs[LAB_ID]=record;
    return normalized.labs;
  }

  function start(value,startedAt){
    const normalized=normalizeLabs(value);
    const time=startedAt||new Date().toISOString();
    if(!normalized.record.startedAt) normalized.record.startedAt=time;
    return persist(normalized,time);
  }

  function applySkillAttempt(value,attempt){
    if(!attempt||!STATION_MAP.has(String(attempt.stationId))) throw new Error('Unknown Hookup lab station: '+(attempt&&attempt.stationId));
    const normalized=normalizeLabs(value);
    const record=normalized.record;
    const time=attempt.completedAt||new Date().toISOString();
    if(!record.startedAt) record.startedAt=time;
    const skill=record.skills[String(attempt.stationId)];
    skill.attempts=Math.max(0,safeNumber(skill.attempts,0))+1;
    skill.lastSelected=attempt.selected==null?null:String(attempt.selected);
    skill.lastAttemptAt=time;
    if(attempt.correct===true){
      skill.mastered=true;
      skill.masteredAt=skill.masteredAt||time;
    }
    record.skillHistory=[clone(attempt),...record.skillHistory.filter(item=>item&&item.id!==attempt.id)].slice(0,SKILL_HISTORY_LIMIT);
    return persist(normalized,time);
  }

  function applySession(value,session){
    const normalized=normalizeLabs(value);
    const record=normalized.record;
    const safe=clone(session);
    const time=safe.completedAt||new Date().toISOString();
    const alreadyRecorded=record.history.some(item=>item&&item.id===safe.id);
    record.startedAt=record.startedAt||time;
    record.latestSession=safe;
    record.history=[safe,...record.history.filter(item=>item&&item.id!==safe.id)].slice(0,HISTORY_LIMIT);
    if(!alreadyRecorded) record.attempts=Math.max(0,safeNumber(record.attempts,0))+1;
    record.bestPercent=Math.max(record.bestPercent,safeNumber(safe.percent,0));
    record.quizPassed=record.quizPassed||safe.passed===true;
    return persist(normalized,time);
  }

  function summary(value){
    const record=normalizeLabs(value).record;
    record.stationCount=STATIONS.length;
    record.stationsComplete=STATIONS.filter(station=>record.skills[station.id]&&record.skills[station.id].mastered).length;
    record.skillAttempts=Object.values(record.skills).reduce((sum,row)=>sum+safeNumber(row&&row.attempts,0),0);
    return clone(record);
  }

  return {
    VERSION,LAB_ID,SESSION_SIZE,PASS_PERCENT,HISTORY_LIMIT,SKILL_HISTORY_LIMIT,TASK_CODES,STATIONS,
    eligibleQuestions,selectQuestions,gradeSession,gradeSkill,normalizeLabs,start,applySkillAttempt,applySession,summary
  };
});
