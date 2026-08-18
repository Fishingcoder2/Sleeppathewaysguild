(function(){
  'use strict';

  const TAU=Math.PI*2;
  const RERA_AROUSAL_MIN_SECONDS=3;
  const VISUAL_DURATION_SECONDS=30;
  const VISUAL_AROUSAL={start:21.8,end:25.8};
  const TIMELINE_DURATION_SECONDS=150;
  const TIMELINE_AROUSAL={start:94,end:100};
  if(VISUAL_AROUSAL.end-VISUAL_AROUSAL.start<RERA_AROUSAL_MIN_SECONDS||TIMELINE_AROUSAL.end-TIMELINE_AROUSAL.start<RERA_AROUSAL_MIN_SECONDS)throw new Error('RERA teaching arousal must remain at least 3 seconds.');

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function edgeGate(t,start,end){
    if(t<start||t>end)return 0;
    const edge=.18;
    return clamp(Math.min((t-start)/edge,(end-t)/edge),0,1);
  }
  function sleepBackground(t){
    return 1.02*Math.sin(TAU*5.25*t)
      +.54*Math.sin(TAU*6.45*t+.72)
      +.32*Math.sin(TAU*2.35*t+.38)
      +.20*Math.sin(TAU*7.35*t+1.17);
  }
  function fasterFrequencyShift(t){
    const irregular=.88+.12*Math.sin(TAU*.43*t+.4)+.07*Math.sin(TAU*.71*t+1.1);
    return irregular*(.78*Math.sin(TAU*9.2*t+.18)
      +.60*Math.sin(TAU*12.7*t+.83)
      +.42*Math.sin(TAU*15.1*t+1.36)
      +.20*Math.sin(TAU*8.1*t+2.08));
  }
  function eegPath(config){
    const parts=[];
    for(let index=0;index<config.count;index+=1){
      const t=config.duration*index/(config.count-1);
      const x=config.left+(config.right-config.left)*index/(config.count-1);
      const gate=edgeGate(t,config.arousal.start,config.arousal.end);
      const baseline=sleepBackground(t)*config.baselineScale;
      const arousal=fasterFrequencyShift(t)*config.arousalScale;
      const value=baseline*(1-gate)+arousal*gate;
      parts.push(`${index?'L':'M'}${x.toFixed(2)},${(config.rowY-value).toFixed(2)}`);
    }
    return parts.join(' ');
  }
  const visualPath=()=>eegPath({duration:VISUAL_DURATION_SECONDS,left:112,right:730,rowY:62,count:1200,arousal:VISUAL_AROUSAL,baselineScale:2.35,arousalScale:2.55});
  const timelinePath=()=>eegPath({duration:TIMELINE_DURATION_SECONDS,left:142,right:974,rowY:72,count:4800,arousal:TIMELINE_AROUSAL,baselineScale:2.55,arousalScale:2.75});

  function patchVisualTrace(svg){
    if(!svg||svg.dataset.reraArousalPatched==='true'||!svg.querySelector('.trace-arousal-note'))return;
    const eeg=svg.querySelector('.trace-line.eeg');
    if(!eeg)return;
    eeg.setAttribute('d',visualPath());
    svg.dataset.reraArousalPatched='true';
    svg.setAttribute('data-rera-arousal-seconds',String((VISUAL_AROUSAL.end-VISUAL_AROUSAL.start).toFixed(1)));
    const note=svg.querySelector('.trace-arousal-note');
    if(note){note.setAttribute('x','602');note.textContent='EEG arousal · faster-frequency shift';}
  }
  function patchTimelineTrace(svg){
    if(!svg||svg.dataset.reraArousalPatched==='true'||!svg.querySelector('.resp-timeline-arousal-label'))return;
    const eeg=svg.querySelector('.resp-timeline-line.eeg');
    if(!eeg)return;
    eeg.setAttribute('d',timelinePath());
    svg.dataset.reraArousalPatched='true';
    svg.setAttribute('data-rera-arousal-seconds',String(TIMELINE_AROUSAL.end-TIMELINE_AROUSAL.start));
    const label=svg.querySelector('.resp-timeline-arousal-label');
    if(label)label.textContent='faster-frequency EEG arousal';
  }
  function patchRenderedTraces(root){
    const scope=root&&root.querySelectorAll?root:document;
    scope.querySelectorAll('svg.respiratory-trace').forEach(patchVisualTrace);
    scope.querySelectorAll('svg.respiratory-timeline-trace').forEach(patchTimelineTrace);
  }

  function patchTimelineEngine(){
    const engine=window.RPSGTRespiratoryTimelineEngine;
    if(!engine)return;
    const exposed=Array.isArray(engine.EVIDENCE_CASES)?engine.EVIDENCE_CASES.find(item=>item&&item.id==='rera-evidence'):null;
    if(exposed){
      exposed.arousal={...TIMELINE_AROUSAL};
      if(exposed.tasks&&exposed.tasks[1]){
        exposed.tasks[1].start=TIMELINE_AROUSAL.start;
        exposed.tasks[1].end=TIMELINE_AROUSAL.end;
        exposed.tasks[1].hint='Look for the sustained faster-frequency EEG shift at the end of the flow-limited sequence.';
        exposed.tasks[1].explanation='The flow-limited sequence terminates with a sustained faster-frequency EEG arousal.';
      }
    }
    const originalCaseById=typeof engine.evidenceCaseById==='function'?engine.evidenceCaseById.bind(engine):null;
    if(originalCaseById){
      engine.evidenceCaseById=function(id){
        const item=originalCaseById(id);
        if(item&&item.id==='rera-evidence'){
          item.arousal={...TIMELINE_AROUSAL};
          if(item.tasks&&item.tasks[1]){item.tasks[1].start=TIMELINE_AROUSAL.start;item.tasks[1].end=TIMELINE_AROUSAL.end;}
        }
        return item;
      };
    }
    const originalCheck=typeof engine.checkEvidence==='function'?engine.checkEvidence.bind(engine):null;
    if(originalCheck){
      engine.checkEvidence=function(caseId,taskIndex,channel,timeSeconds){
        if(String(caseId)==='rera-evidence'&&Number(taskIndex)===1){
          const time=Number(timeSeconds),correct=String(channel||'')==='eeg'&&Number.isFinite(time)&&time>=TIMELINE_AROUSAL.start&&time<=TIMELINE_AROUSAL.end;
          return {valid:true,correct,expectedChannel:'eeg',expectedStart:TIMELINE_AROUSAL.start,expectedEnd:TIMELINE_AROUSAL.end,hint:'Look for the sustained faster-frequency EEG shift at the end of the flow-limited sequence.',explanation:'The flow-limited sequence terminates with a sustained faster-frequency EEG arousal.',clickedChannel:String(channel||''),clickedTime:Number.isFinite(time)?clamp(time,0,TIMELINE_DURATION_SECONDS):null};
        }
        return originalCheck(caseId,taskIndex,channel,timeSeconds);
      };
    }
  }
  function patchVisualModel(){
    const engine=window.RPSGTRespiratoryLabEngine;
    if(!engine||!Array.isArray(engine.PATTERNS))return;
    const rera=engine.PATTERNS.find(pattern=>pattern&&pattern.id==='flow-limitation');
    if(!rera)return;
    rera.cue='Inspiratory airflow flattens while effort builds, then the sequence terminates in a sustained faster-frequency EEG arousal.';
    rera.teaching='Flow limitation by itself is not enough to call a RERA. In this teaching case, progressive inspiratory flow limitation and increasing effort terminate with a sustained faster-frequency EEG shift rather than a single large slow transient.';
  }

  patchTimelineEngine();
  patchVisualModel();
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)patchRenderedTraces(node);patchRenderedTraces(document);});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>patchRenderedTraces(document));else patchRenderedTraces(document);

  window.RPSGTRespiratoryReraArousal={RERA_AROUSAL_MIN_SECONDS,VISUAL_AROUSAL:{...VISUAL_AROUSAL},TIMELINE_AROUSAL:{...TIMELINE_AROUSAL}};
})();
