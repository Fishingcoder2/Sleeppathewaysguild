(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTRespiratoryTimelineEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='1.0.0';
  const LONG_DURATION=300;
  const EVIDENCE_DURATION=150;
  const CHANNELS=['eeg','nasal','thermal','thorax','abdomen','spo2'];

  const LONG_CASES=[
    {
      id:'cheyne-stokes',
      title:'Cheyne–Stokes respiration',
      duration:LONG_DURATION,
      kind:'cheyne-stokes',
      cycleSeconds:50,
      cue:'Follow several repeating waxing-and-waning cycles rather than judging one isolated breath.',
      teaching:'This original five-minute teaching schematic emphasizes repeating crescendo–decrescendo ventilation with central pauses and delayed oxygen variability. Use the long view to recognize the pattern over time; verify current scoring criteria in current official guidance.'
    },
    {
      id:'periodic-breathing',
      title:'Periodic breathing',
      duration:LONG_DURATION,
      kind:'periodic-breathing',
      cycleSeconds:38,
      cue:'Look for recurrent cyclic ventilation that is less stereotyped than the Cheyne–Stokes example.',
      teaching:'This original teaching pattern shows recurrent waxing and waning with intermittent central pauses. It is intentionally less regular and less classically crescendo–decrescendo than the Cheyne–Stokes example so the learner must use the entire time window.'
    },
    {
      id:'recurrent-obstructive',
      title:'Recurrent obstructive events',
      duration:LONG_DURATION,
      kind:'recurrent-obstructive',
      cue:'Airflow repeatedly disappears while respiratory effort continues and becomes more prominent.',
      teaching:'Compare both airflow sensors with thoracic and abdominal effort across several events. Oxygen changes lag behind the airflow event rather than occurring at the exact onset.'
    },
    {
      id:'recurrent-central',
      title:'Recurrent central events',
      duration:LONG_DURATION,
      kind:'recurrent-central',
      cue:'Airflow and respiratory effort disappear together during repeated central pauses.',
      teaching:'The long view reinforces that absent airflow alone is not enough to classify an apnea as central; respiratory effort must also be absent during the event.'
    },
    {
      id:'stable-breathing',
      title:'Stable breathing reference',
      duration:LONG_DURATION,
      kind:'stable',
      cue:'Use this as the baseline reference for stable airflow, effort, and oxygen trend.',
      teaching:'A stable reference helps the learner compare amplitude, synchrony, oxygen stability, and the expected relationship between nasal pressure, thermal airflow, and effort.'
    }
  ];

  const EVIDENCE_CASES=[
    {
      id:'obstructive-apnea-evidence',
      title:'Obstructive apnea evidence',
      duration:EVIDENCE_DURATION,
      pattern:'obstructive-apnea',
      event:{start:48,end:78},
      tasks:[
        {prompt:'Click the thermistor segment showing absent or nearly absent airflow.',channel:'thermal',start:48,end:78,hint:'Thermal airflow is the apnea-focused airflow signal in this teaching case.',explanation:'The thermal airflow signal becomes nearly flat during the event.'},
        {prompt:'Click the thoracic effort that continues while airflow is absent.',channel:'thorax',start:50,end:78,hint:'Look below both airflow channels for continued effort during the obstruction.',explanation:'Continued/increasing effort while airflow is absent supports an obstructive pattern.'}
      ]
    },
    {
      id:'central-apnea-evidence',
      title:'Central apnea evidence',
      duration:EVIDENCE_DURATION,
      pattern:'central-apnea',
      event:{start:50,end:80},
      tasks:[
        {prompt:'Click the thoracic segment where respiratory effort disappears.',channel:'thorax',start:50,end:80,hint:'Central apnea requires the effort channels to fall with the airflow signal.',explanation:'Thoracic effort is absent during the central pause.'},
        {prompt:'Click the abdominal segment that confirms effort is also absent.',channel:'abdomen',start:50,end:80,hint:'Check both effort belts before calling the event central.',explanation:'Abdominal effort is absent together with thoracic effort and airflow.'}
      ]
    },
    {
      id:'mixed-apnea-evidence',
      title:'Mixed apnea evidence',
      duration:EVIDENCE_DURATION,
      pattern:'mixed-apnea',
      event:{start:45,end:88},
      transition:66,
      tasks:[
        {prompt:'Click the early thoracic portion where effort is initially absent.',channel:'thorax',start:45,end:65,hint:'The first portion behaves like a central event.',explanation:'The mixed event begins with absent respiratory effort.'},
        {prompt:'Click where thoracic effort returns while airflow remains absent.',channel:'thorax',start:67,end:88,hint:'The second portion should show effort returning before airflow resumes.',explanation:'Resumption of effort during continued absent airflow creates the obstructive portion of the mixed event.'}
      ]
    },
    {
      id:'obstructive-hypopnea-evidence',
      title:'Obstructive hypopnea evidence',
      duration:EVIDENCE_DURATION,
      pattern:'obstructive-hypopnea',
      event:{start:48,end:88},
      tasks:[
        {prompt:'Click the reduced, flattened nasal-pressure segment.',channel:'nasal',start:48,end:88,hint:'Nasal pressure should make the airflow reduction and inspiratory flattening easier to see than the thermal channel.',explanation:'The nasal-pressure signal shows a meaningful reduction with inspiratory flattening.'},
        {prompt:'Click the abdominal effort that remains prominent during the airflow reduction.',channel:'abdomen',start:50,end:88,hint:'Obstructive hypopnea should not make both effort belts shrink with airflow.',explanation:'Preserved/increased effort during reduced airflow supports the obstructive relationship.'}
      ]
    },
    {
      id:'central-hypopnea-evidence',
      title:'Central hypopnea evidence',
      duration:EVIDENCE_DURATION,
      pattern:'central-hypopnea',
      event:{start:50,end:90},
      tasks:[
        {prompt:'Click the thoracic reduction that occurs with the airflow reduction.',channel:'thorax',start:50,end:90,hint:'In this central teaching pattern, airflow and respiratory effort become smaller together.',explanation:'Thoracic effort falls during the same interval as airflow.'},
        {prompt:'Click the abdominal reduction that matches the thoracic change.',channel:'abdomen',start:50,end:90,hint:'Both effort channels should support the central relationship.',explanation:'Abdominal effort also decreases with airflow rather than increasing against an obstruction.'}
      ]
    },
    {
      id:'rera-evidence',
      title:'Flow limitation ending in arousal',
      duration:EVIDENCE_DURATION,
      pattern:'rera',
      event:{start:45,end:95},
      arousal:{start:94,end:106},
      tasks:[
        {prompt:'Click the inspiratory flow-limitation segment in nasal pressure.',channel:'nasal',start:50,end:94,hint:'Look for repeated flattened inspiratory contours before the event terminates.',explanation:'Nasal pressure shows sustained inspiratory flow limitation.'},
        {prompt:'Click the EEG arousal that terminates the flow-limited sequence.',channel:'eeg',start:94,end:106,hint:'A flow-limited sequence alone is not enough for this RERA teaching case; locate the terminal EEG arousal.',explanation:'The flow-limited sequence terminates with an EEG arousal, providing the arousal component of the RERA teaching pattern.'}
      ]
    },
    {
      id:'oxygen-lag-evidence',
      title:'Delayed oxygen response',
      duration:EVIDENCE_DURATION,
      pattern:'obstructive-apnea',
      event:{start:40,end:70},
      tasks:[
        {prompt:'Click the SpO₂ nadir that occurs after the airflow event.',channel:'spo2',start:82,end:112,hint:'The oxygen response should lag behind the airflow change.',explanation:'The saturation nadir is delayed relative to the respiratory event and then begins to recover.'},
        {prompt:'Click where airflow resumes after the obstructive event.',channel:'thermal',start:70,end:84,hint:'Find the return of thermal airflow before following the delayed oxygen response.',explanation:'Thermal airflow resumes before the delayed saturation reaches its nadir.'}
      ]
    }
  ];

  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const longCaseById=id=>clone(LONG_CASES.find(item=>item.id===String(id))||null);
  const evidenceCaseById=id=>clone(EVIDENCE_CASES.find(item=>item.id===String(id))||null);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function checkEvidence(caseId,taskIndex,channel,timeSeconds){
    const item=EVIDENCE_CASES.find(entry=>entry.id===String(caseId));
    const task=item&&item.tasks&&item.tasks[Number(taskIndex)];
    if(!task) return {valid:false,correct:false,reason:'unknown-task'};
    const time=Number(timeSeconds);
    const safeChannel=String(channel||'');
    const correct=safeChannel===task.channel&&Number.isFinite(time)&&time>=task.start&&time<=task.end;
    return {
      valid:true,
      correct,
      expectedChannel:task.channel,
      expectedStart:task.start,
      expectedEnd:task.end,
      hint:task.hint,
      explanation:task.explanation,
      clickedChannel:safeChannel,
      clickedTime:Number.isFinite(time)?clamp(time,0,item.duration):null
    };
  }

  function timelineTicks(duration,step){
    const total=Math.max(1,Number(duration)||1);
    const increment=Math.max(1,Number(step)||30);
    const ticks=[];
    for(let seconds=0;seconds<=total;seconds+=increment) ticks.push(seconds);
    if(ticks[ticks.length-1]!==total) ticks.push(total);
    return ticks;
  }

  return {
    VERSION,
    LONG_DURATION,
    EVIDENCE_DURATION,
    CHANNELS:CHANNELS.slice(),
    LONG_CASES:clone(LONG_CASES),
    EVIDENCE_CASES:clone(EVIDENCE_CASES),
    longCaseById,
    evidenceCaseById,
    checkEvidence,
    timelineTicks
  };
});
