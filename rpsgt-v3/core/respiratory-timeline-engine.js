(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTRespiratoryTimelineEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='1.1.0';
  const LONG_DURATION=300;
  const EVIDENCE_DURATION=150;
  const CHANNELS=['eeg','nasal','thermal','thorax','abdomen','spo2'];

  const LONG_CASES=[
    {id:'cheyne-stokes',title:'Cheyne–Stokes respiration',duration:LONG_DURATION,kind:'cheyne-stokes',cycleSeconds:50,cue:'Follow several repeating waxing-and-waning cycles rather than judging one isolated breath.',teaching:'This original five-minute teaching schematic emphasizes repeating crescendo–decrescendo ventilation with central pauses and delayed oxygen variability. Use the long view to recognize the pattern over time; verify current scoring criteria in current official guidance.'},
    {id:'periodic-breathing',title:'Periodic breathing',duration:LONG_DURATION,kind:'periodic-breathing',cycleSeconds:38,cue:'Look for recurrent cyclic ventilation that is less stereotyped than the Cheyne–Stokes example.',teaching:'This original teaching pattern shows recurrent waxing and waning with intermittent central pauses. It is intentionally less regular and less classically crescendo–decrescendo than the Cheyne–Stokes example so the learner must use the entire time window.'},
    {id:'recurrent-obstructive',title:'Recurrent obstructive events',duration:LONG_DURATION,kind:'recurrent-obstructive',cycleSeconds:50,cue:'Airflow repeatedly disappears while respiratory effort continues and becomes more prominent.',teaching:'Compare both airflow sensors with thoracic and abdominal effort across several events. Oxygen changes lag behind the airflow event rather than occurring at the exact onset.'},
    {id:'recurrent-central',title:'Recurrent central events',duration:LONG_DURATION,kind:'recurrent-central',cycleSeconds:50,cue:'Airflow and respiratory effort disappear together during repeated central pauses.',teaching:'The long view reinforces that absent airflow alone is not enough to classify an apnea as central; respiratory effort must also be absent during the event.'},
    {id:'stable-breathing',title:'Stable breathing reference',duration:LONG_DURATION,kind:'stable',cycleSeconds:50,cue:'Use this as the baseline reference for stable airflow, effort, and oxygen trend.',teaching:'A stable reference helps the learner compare amplitude, synchrony, oxygen stability, and the expected relationship between nasal pressure, thermal airflow, and effort.'}
  ];

  const EVIDENCE_CASES=[
    {
      id:'obstructive-apnea-evidence',title:'Obstructive apnea evidence',duration:EVIDENCE_DURATION,pattern:'obstructive-apnea',stage:'N2',event:{start:48,end:78},authority:'AASM Version 3 adult apnea criteria',
      tasks:[
        {prompt:'Click the thermistor segment showing absent or nearly absent airflow.',channel:'thermal',start:48,end:78,hint:'For an adult diagnostic apnea, use the oronasal thermal signal to judge the near-complete airflow reduction.',explanation:'The thermal airflow signal becomes nearly flat for well over 10 seconds, supplying the airflow and duration components of the teaching apnea.'},
        {prompt:'Click the thoracic effort that continues while airflow is absent.',channel:'thorax',start:50,end:78,hint:'Look below both airflow channels for continued effort during the absent-airflow interval.',explanation:'Continued or increased inspiratory effort throughout absent airflow supports an obstructive apnea.'}
      ]
    },
    {
      id:'central-apnea-evidence',title:'Central apnea evidence',duration:EVIDENCE_DURATION,pattern:'central-apnea',stage:'N2',event:{start:50,end:80},authority:'AASM Version 3 adult apnea criteria',
      tasks:[
        {prompt:'Click the thermal-airflow segment that becomes nearly absent.',channel:'thermal',start:50,end:80,hint:'First confirm that the adult apnea airflow criterion is represented.',explanation:'Thermal airflow is nearly absent for well over 10 seconds.'},
        {prompt:'Click the thoracic segment where inspiratory effort is also absent.',channel:'thorax',start:50,end:80,hint:'Central apnea requires absent inspiratory effort throughout the absent-airflow interval.',explanation:'Thoracic effort disappears with airflow, supporting a central apnea pattern; the abdominal channel provides matching context.'}
      ]
    },
    {
      id:'mixed-apnea-evidence',title:'Mixed apnea evidence',duration:EVIDENCE_DURATION,pattern:'mixed-apnea',stage:'N2',event:{start:45,end:88},transition:66,authority:'AASM Version 3 adult apnea criteria',
      tasks:[
        {prompt:'Click the early thoracic portion where effort is initially absent.',channel:'thorax',start:45,end:65,hint:'The event begins with an absent-effort component.',explanation:'The mixed event begins with absent respiratory effort while airflow is absent.'},
        {prompt:'Click where thoracic effort returns before airflow resumes.',channel:'thorax',start:67,end:88,hint:'The second portion shows inspiratory effort returning while the airflow channels remain nearly flat.',explanation:'Resumption of effort during continued absent airflow creates the obstructive component of the mixed apnea teaching pattern.'}
      ]
    },
    {
      id:'obstructive-hypopnea-evidence',title:'Obstructive hypopnea evidence',duration:EVIDENCE_DURATION,pattern:'obstructive-hypopnea',stage:'N2',event:{start:48,end:88},authority:'AASM Version 3 adult hypopnea criteria',
      tasks:[
        {prompt:'Click the reduced, flattened nasal-pressure segment.',channel:'nasal',start:48,end:88,hint:'For an adult diagnostic hypopnea, nasal pressure is the recommended airflow signal. The inspiratory flattening also supports an obstructive subtype when that optional classification is used.',explanation:'The nasal-pressure excursion is reduced by more than 30% for well over 10 seconds and shows inspiratory flattening.'},
        {prompt:'Click the delayed SpO₂ nadir associated with the airflow reduction.',channel:'spo2',start:102,end:122,hint:'The teaching desaturation occurs after the airflow event because the oxygen response is delayed.',explanation:'The schematic supplies a little more than a 3% delayed desaturation, satisfying the oxygen-consequence component of the adult Version 3 hypopnea teaching case.'}
      ]
    },
    {
      id:'central-hypopnea-evidence',title:'Central hypopnea evidence',duration:EVIDENCE_DURATION,pattern:'central-hypopnea',stage:'N2',event:{start:50,end:90},authority:'AASM Version 3 adult hypopnea criteria; subtype classification only if elected',
      tasks:[
        {prompt:'Click the thoracic reduction that occurs with the airflow reduction.',channel:'thorax',start:50,end:90,hint:'In this central teaching pattern, airflow and respiratory effort become smaller together.',explanation:'Thoracic effort falls during the same interval as airflow.'},
        {prompt:'Click the abdominal reduction that matches the thoracic change.',channel:'abdomen',start:50,end:90,hint:'Both effort channels should support the central relationship.',explanation:'Abdominal effort also decreases with airflow rather than increasing against an obstruction.'}
      ]
    },
    {
      id:'rera-evidence',title:'Flow limitation ending in arousal',duration:EVIDENCE_DURATION,pattern:'rera',stage:'N2',event:{start:45,end:95},arousal:{start:94,end:106},authority:'AASM Version 3 adult RERA criteria',
      tasks:[
        {prompt:'Click the inspiratory flow-limitation segment in nasal pressure.',channel:'nasal',start:50,end:94,hint:'Look for repeated inspiratory flattening with increasing effort. In this revised schematic the overall excursion intentionally stays short of the ≥30% reduction used to score a hypopnea.',explanation:'The nasal-pressure contour is flow limited for more than 10 seconds but is intentionally kept above the adult hypopnea amplitude-reduction threshold.'},
        {prompt:'Click the EEG arousal that terminates the flow-limited sequence.',channel:'eeg',start:94,end:106,hint:'A RERA requires the qualifying breathing sequence to lead to an arousal and not already meet apnea or hypopnea criteria.',explanation:'The flow-limited sequence terminates with a qualifying NREM EEG arousal after stable sleep, supplying the arousal component of the RERA teaching pattern.'}
      ]
    },
    {
      id:'oxygen-lag-evidence',title:'Delayed oxygen response',duration:EVIDENCE_DURATION,pattern:'obstructive-apnea',stage:'N2',event:{start:40,end:70},authority:'Physiologic timing support; use Version 3 for event classification',
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
    return {valid:true,correct,expectedChannel:task.channel,expectedStart:task.start,expectedEnd:task.end,hint:task.hint,explanation:task.explanation,clickedChannel:safeChannel,clickedTime:Number.isFinite(time)?clamp(time,0,item.duration):null};
  }

  function timelineTicks(duration,step){
    const total=Math.max(1,Number(duration)||1);const increment=Math.max(1,Number(step)||30);const ticks=[];
    for(let seconds=0;seconds<=total;seconds+=increment) ticks.push(seconds);
    if(ticks[ticks.length-1]!==total) ticks.push(total);
    return ticks;
  }

  return {VERSION,LONG_DURATION,EVIDENCE_DURATION,CHANNELS:CHANNELS.slice(),LONG_CASES:clone(LONG_CASES),EVIDENCE_CASES:clone(EVIDENCE_CASES),longCaseById,evidenceCaseById,checkEvidence,timelineTicks};
});
