(function(){
  'use strict';

  const engine=window.RPSGTRespiratoryTimelineEngine;
  const host=document.querySelector('[data-respiratory-timeline-workspace]');
  const modeButtons=[...document.querySelectorAll('[data-respiratory-timeline-mode]')];
  if(!engine||!host||!modeButtons.length) return;

  const ROWS={eeg:72,nasal:140,thermal:208,thorax:276,abdomen:344,spo2:416};
  const LABELS={eeg:'EEG',nasal:'Nasal pressure',thermal:'Thermistor',thorax:'Thorax',abdomen:'Abdomen',spo2:'SpO₂'};
  const PLOT={left:142,right:974,top:34,bottom:452};
  const state={mode:'long',longId:'cheyne-stokes',evidenceIndex:0,taskIndex:0,feedback:null,reveal:false,solved:false,correct:0,misses:0,completed:false};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const TAU=Math.PI*2;

  function formatTime(seconds){
    const value=Math.max(0,Math.round(Number(seconds)||0));
    return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');
  }

  function breath(t,phase){return Math.sin(TAU*t/4+(phase||0));}
  function eventContains(event,t){return event&&t>=event.start&&t<=event.end;}
  function inIntervals(t,intervals){return intervals.some(pair=>t>=pair[0]&&t<=pair[1]);}
  function intervalProgress(t,intervals){for(const pair of intervals){if(t>=pair[0]&&t<=pair[1])return (t-pair[0])/(pair[1]-pair[0]);}return 0;}
  function centralEnvelope(t,cycle,irregular){
    const wobble=irregular?0.18*Math.sin(t/17)+0.08*Math.sin(t/7):0;
    const phase=TAU*t/(cycle||50)-Math.PI/2+wobble;
    let value=.04+.96*Math.pow((1+Math.sin(phase))/2,.88);
    if(value<.15) value=.025;
    return clamp(value,.02,1);
  }

  function longSignal(def,channel,t){
    if(channel==='eeg'){
      let value=1.25*Math.sin(t*3.7)+.8*Math.sin(t*8.4+.7)+.55*Math.sin(t*15.2+.2)+.35*Math.sin(t*23.1);
      const obstructiveEnds=[68,132,196,260];
      if(def.kind==='recurrent-obstructive'&&obstructiveEnds.some(end=>Math.abs(t-end)<2.8)) value+=4.8*Math.sin(t*28.5);
      return value;
    }
    if(channel==='spo2') return spo2Percent(def,t);
    const phase=channel==='abdomen'?0.12:channel==='thermal'?.06:0;
    let value=breath(t,phase);
    let amplitude=channel==='thermal'?.8:1;

    if(def.kind==='stable') return value*amplitude;
    if(def.kind==='cheyne-stokes'){
      return value*amplitude*centralEnvelope(t,def.cycleSeconds,false);
    }
    if(def.kind==='periodic-breathing'){
      const env=centralEnvelope(t,def.cycleSeconds,true);
      const irregular=clamp(env*(.9+.12*Math.sin(t/11)+.06*Math.sin(t/5.3)),.025,1);
      return value*amplitude*irregular;
    }

    const events=def.kind==='recurrent-obstructive'?[[42,68],[106,132],[170,196],[234,260]]:[[48,72],[116,140],[184,208],[250,274]];
    if(!inIntervals(t,events)) return value*amplitude;
    if(def.kind==='recurrent-central') return value*.025;
    if(channel==='nasal'||channel==='thermal') return value*.025;
    const progress=intervalProgress(t,events);
    if(channel==='thorax') return value*(1.15+.7*progress);
    if(channel==='abdomen') return breath(t,Math.PI)*(1.18+.65*progress);
    return value;
  }

  function eventSignal(def,channel,t){
    const event=def.event;
    const inside=eventContains(event,t);
    if(channel==='eeg'){
      let value=1.15*Math.sin(t*3.9)+.82*Math.sin(t*8.7+.45)+.5*Math.sin(t*14.8+.2)+.28*Math.sin(t*24.2);
      if(def.pattern==='rera'&&def.arousal&&t>=def.arousal.start&&t<=def.arousal.end){
        const mid=(def.arousal.start+def.arousal.end)/2;
        const env=1-Math.min(1,Math.abs(t-mid)/((def.arousal.end-def.arousal.start)/2));
        value+=5.4*env*Math.sin(t*30.5)+2.1*env*Math.sin(t*18.3);
      }
      return value;
    }
    if(channel==='spo2') return spo2Percent(def,t);
    const phase=channel==='abdomen'?.12:channel==='thermal'?.06:0;
    let wave=breath(t,phase);
    let amplitude=channel==='thermal'?.8:1;
    if(!inside) return wave*amplitude;

    const progress=(t-event.start)/(event.end-event.start);
    if(def.pattern==='obstructive-apnea'){
      if(channel==='nasal'||channel==='thermal') return wave*.02;
      if(channel==='thorax') return wave*(1.2+.7*progress);
      if(channel==='abdomen') return breath(t,Math.PI)*(1.2+.62*progress);
    }
    if(def.pattern==='central-apnea') return wave*.02;
    if(def.pattern==='mixed-apnea'){
      if(channel==='nasal'||channel==='thermal') return wave*.02;
      if(t<(def.transition||((event.start+event.end)/2))) return wave*.02;
      const resumed=clamp((t-(def.transition||event.start))/(event.end-(def.transition||event.start)),0,1);
      if(channel==='thorax') return wave*(1.15+.6*resumed);
      if(channel==='abdomen') return breath(t,Math.PI)*(1.12+.6*resumed);
    }
    if(def.pattern==='obstructive-hypopnea'){
      if(channel==='nasal'){
        wave=wave>0?Math.min(wave,.26):wave*.84;
        return wave*.48;
      }
      if(channel==='thermal') return wave*.78;
      if(channel==='thorax') return wave*(1.15+.4*progress);
      if(channel==='abdomen') return breath(t,Math.PI)*(1.13+.38*progress);
    }
    if(def.pattern==='central-hypopnea'){
      if(channel==='nasal') return wave*.46;
      if(channel==='thermal') return wave*.64;
      if(channel==='thorax'||channel==='abdomen') return wave*.43;
    }
    if(def.pattern==='rera'){
      if(channel==='nasal'){
        wave=wave>0?Math.min(wave,.28):wave*.88;
        return wave*(.72-.18*progress);
      }
      if(channel==='thermal') return wave*.9;
      if(channel==='thorax') return wave*(1.05+.42*progress);
      if(channel==='abdomen') return wave*(1.03+.38*progress);
    }
    return wave*amplitude;
  }

  function delayedDrop(t,event,depth){
    if(!event) return 0;
    const start=event.end+6;const nadir=event.end+24;const recovery=event.end+52;
    if(t<start||t>recovery) return 0;
    if(t<=nadir) return depth*(t-start)/(nadir-start);
    return depth*(1-(t-nadir)/(recovery-nadir));
  }

  function spo2Percent(def,t){
    if(def.kind==='stable') return 97;
    if(def.kind==='cheyne-stokes'){
      const delayed=centralEnvelope(Math.max(0,t-12),def.cycleSeconds,false);
      return clamp(96-(1-delayed)*3.4,91.5,97);
    }
    if(def.kind==='periodic-breathing'){
      const delayed=centralEnvelope(Math.max(0,t-10),def.cycleSeconds,true);
      return clamp(97-(1-delayed)*2.5,93,98);
    }
    if(def.kind==='recurrent-obstructive'||def.kind==='recurrent-central'){
      const events=def.kind==='recurrent-obstructive'?[[42,68],[106,132],[170,196],[234,260]]:[[48,72],[116,140],[184,208],[250,274]];
      const depth=def.kind==='recurrent-obstructive'?4.2:3.2;
      let drop=0;
      events.forEach(pair=>{drop=Math.max(drop,delayedDrop(t,{start:pair[0],end:pair[1]},depth));});
      return 97-drop;
    }
    const depth=def.pattern==='central-hypopnea'?2.2:def.pattern==='rera'?1.1:def.pattern==='obstructive-hypopnea'?3:4.2;
    return 97-delayedDrop(t,def.event,depth);
  }

  function samplePath(def,channel,duration){
    if(channel==='spo2') return spo2Path(def,duration).path;
    const count=duration===300?920:620;
    const row=ROWS[channel];
    const scale={eeg:3.8,nasal:19,thermal:16,thorax:17,abdomen:17}[channel]||15;
    const parts=[];
    for(let index=0;index<count;index+=1){
      const t=duration*index/(count-1);
      const x=PLOT.left+(PLOT.right-PLOT.left)*index/(count-1);
      const value=duration===300?longSignal(def,channel,t):eventSignal(def,channel,t);
      parts.push(`${index?'L':'M'}${x.toFixed(1)},${(row-value*scale).toFixed(1)}`);
    }
    return parts.join(' ');
  }

  function spo2Path(def,duration){
    const parts=[];const count=duration===300?500:300;
    for(let index=0;index<count;index+=1){
      const t=duration*index/(count-1);
      const x=PLOT.left+(PLOT.right-PLOT.left)*index/(count-1);
      const sat=spo2Percent(def,t);
      const y=ROWS.spo2+(97-sat)*5.2;
      parts.push(`${index?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return {path:parts.join(' ')};
  }

  function oxygenLabels(def,duration){
    return engine.timelineTicks(duration,30).map(seconds=>{
      const x=PLOT.left+(PLOT.right-PLOT.left)*(seconds/duration);
      const sat=Math.round(spo2Percent(def,seconds));
      return `<text class="resp-timeline-spo2-number" x="${x.toFixed(1)}" y="${(ROWS.spo2-15).toFixed(1)}" text-anchor="middle">${sat}</text>`;
    }).join('');
  }

  function ruler(duration){
    const ticks=engine.timelineTicks(duration,30);
    return ticks.map(seconds=>{
      const x=PLOT.left+(PLOT.right-PLOT.left)*(seconds/duration);
      return `<g class="resp-timeline-tick"><line x1="${x.toFixed(1)}" y1="454" x2="${x.toFixed(1)}" y2="462"></line><text x="${x.toFixed(1)}" y="482" text-anchor="middle">${formatTime(seconds)}</text></g>`;
    }).join('');
  }

  function eventShading(def,duration){
    const windows=[];
    if(duration===300&&def.kind==='recurrent-obstructive') windows.push(...[[42,68],[106,132],[170,196],[234,260]]);
    if(duration===300&&def.kind==='recurrent-central') windows.push(...[[48,72],[116,140],[184,208],[250,274]]);
    if(duration===150&&def.event) windows.push([def.event.start,def.event.end]);
    return windows.map(pair=>{
      const x=PLOT.left+(PLOT.right-PLOT.left)*(pair[0]/duration);
      const width=(PLOT.right-PLOT.left)*((pair[1]-pair[0])/duration);
      return `<rect class="resp-timeline-event-window" x="${x.toFixed(1)}" y="38" width="${width.toFixed(1)}" height="402" rx="8"></rect>`;
    }).join('');
  }

  function targetHighlight(def,task,duration){
    if(!task||!state.reveal&&!state.solved) return '';
    const x=PLOT.left+(PLOT.right-PLOT.left)*(task.start/duration);
    const width=(PLOT.right-PLOT.left)*((task.end-task.start)/duration);
    const y=(ROWS[task.channel]||ROWS.nasal)-26;
    return `<g class="resp-evidence-highlight"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="52" rx="10"></rect><text x="${(x+width/2).toFixed(1)}" y="${(y-7).toFixed(1)}" text-anchor="middle">evidence</text></g>`;
  }

  function traceSvg(def,duration,interactive,task){
    const aria=interactive?'Interactive 2 minute 30 second respiratory teaching tracing. Click the requested waveform evidence.':`Original five-minute respiratory teaching schematic for ${def.title}.`;
    const guides=Object.entries(ROWS).map(([channel,y])=>`<line x1="${PLOT.left}" y1="${y}" x2="${PLOT.right}" y2="${y}"></line>`).join('');
    const labels=Object.entries(ROWS).map(([channel,y])=>`<text x="12" y="${y+5}">${LABELS[channel]}</text>`).join('');
    const paths=['eeg','nasal','thermal','thorax','abdomen','spo2'].map(channel=>`<path class="resp-timeline-line ${channel}" d="${samplePath(def,channel,duration)}"></path>`).join('');
    const arousal=duration===150&&def.pattern==='rera'&&def.arousal?(()=>{const x=PLOT.left+(PLOT.right-PLOT.left)*(((def.arousal.start+def.arousal.end)/2)/duration);return `<text class="resp-timeline-arousal-label" x="${x.toFixed(1)}" y="28" text-anchor="middle">arousal region</text>`;})():'';
    return `<svg class="respiratory-timeline-trace ${interactive?'is-interactive':''}" viewBox="0 0 1000 495" role="img" aria-label="${esc(aria)}" ${interactive?'tabindex="0" data-respiratory-evidence-svg':''}>${eventShading(def,duration)}<g class="resp-timeline-guides">${guides}</g><g class="resp-timeline-labels">${labels}</g>${paths}${oxygenLabels(def,duration)}${targetHighlight(def,task,duration)}${arousal}<g class="resp-timeline-ruler">${ruler(duration)}</g></svg>`;
  }

  function renderModes(){
    modeButtons.forEach(button=>{
      const active=button.dataset.respiratoryTimelineMode===state.mode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function renderLong(){
    const def=engine.longCaseById(state.longId)||engine.LONG_CASES[0];
    const selector=engine.LONG_CASES.map(item=>`<button type="button" class="resp-long-case-button ${item.id===def.id?'active':''}" data-resp-long-case="${esc(item.id)}" aria-pressed="${item.id===def.id?'true':'false'}"><strong>${esc(item.title)}</strong><span>${esc(item.cue)}</span></button>`).join('');
    host.innerHTML=`<div class="resp-timeline-long-layout"><div class="resp-long-case-list" aria-label="Five-minute respiratory patterns">${selector}</div><div class="resp-timeline-panel"><div class="resp-timeline-panel-head"><div><span class="status gold">5-minute full-pattern view</span><h3>${esc(def.title)}</h3><p>${esc(def.cue)}</p></div><span class="resp-duration-badge">5:00</span></div>${traceSvg(def,300,false,null)}<div class="resp-timeline-teaching"><strong>What to notice</strong><p>${esc(def.teaching)}</p><p class="tiny">Teaching schematic only. Use current official scoring guidance for rule-sensitive clinical decisions.</p></div></div></div>`;
  }

  function currentEvidence(){return engine.EVIDENCE_CASES[state.evidenceIndex]||null;}
  function currentTask(){const item=currentEvidence();return item&&item.tasks[state.taskIndex]||null;}
  function totalEvidenceTasks(){return engine.EVIDENCE_CASES.reduce((sum,item)=>sum+item.tasks.length,0);}
  function completedBefore(){let total=0;for(let i=0;i<state.evidenceIndex;i+=1)total+=engine.EVIDENCE_CASES[i].tasks.length;return total+state.taskIndex;}

  function timeTargetButtons(item,task){
    const buttons=[];
    for(let start=0;start<item.duration;start+=30){
      const end=Math.min(item.duration,start+30);const midpoint=(start+end)/2;
      buttons.push(`<button type="button" class="resp-evidence-time-button" data-resp-evidence-time="${midpoint}" aria-label="Choose ${LABELS[task.channel]} between ${formatTime(start)} and ${formatTime(end)}">${formatTime(start)}–${formatTime(end)}</button>`);
    }
    return buttons.join('');
  }

  function renderEvidence(){
    if(state.completed){
      const total=totalEvidenceTasks();
      host.innerHTML=`<div class="resp-evidence-complete"><span class="status green">Click-the-evidence practice complete</span><h3>${state.correct}/${total} targets found without using “Show me”</h3><p>You worked through the restored 2-minute 30-second evidence-localization cases. Revisit a case when you want to practice the relationship between airflow, effort, oxygen timing, and EEG arousal.</p><div class="actions"><button class="btn primary" type="button" data-resp-evidence-restart>Practice the evidence lab again</button><button class="btn secondary" type="button" data-respiratory-timeline-mode-jump="long">Return to 5-minute patterns</button></div></div>`;
      return;
    }
    const item=currentEvidence();const task=currentTask();if(!item||!task)return;
    const progress=completedBefore()+1;const total=totalEvidenceTasks();
    const feedback=state.feedback?`<div class="resp-evidence-feedback ${state.solved?'correct':'retry'}" role="status" aria-live="polite"><strong>${state.solved?'Evidence found':'Try again'}</strong><p>${esc(state.feedback)}</p></div>`:'';
    host.innerHTML=`<div class="resp-evidence-shell"><div class="resp-evidence-head"><div><span class="status gold">2:30 click-the-evidence</span><h3>${esc(item.title)}</h3><p><strong>Prompt ${state.taskIndex+1} of ${item.tasks.length}:</strong> ${esc(task.prompt)}</p></div><div class="resp-evidence-progress"><strong>${progress}/${total}</strong><span>evidence targets</span></div></div>${traceSvg(item,150,true,task)}${feedback}<div class="resp-evidence-help"><div><strong>How to answer</strong><p>Click or tap the requested feature directly on the tracing. The hit area is intentionally generous enough for phones and tablets. An incorrect attempt stays on this same target and gives a persistent hint.</p></div><button class="btn secondary" type="button" data-resp-evidence-show>Show me</button></div><details class="resp-evidence-keyboard"><summary>Keyboard / alternate time targets</summary><p>The prompt already tells you which channel to inspect. Choose the 30-second interval containing the requested feature.</p><div class="resp-evidence-time-grid">${timeTargetButtons(item,task)}</div></details><div class="resp-evidence-actions"><button class="btn secondary" type="button" data-resp-evidence-prev ${state.evidenceIndex===0&&state.taskIndex===0?'disabled':''}>Previous target</button><button class="btn primary" type="button" data-resp-evidence-next ${state.solved||state.reveal?'':'disabled'}>${progress===total?'Finish evidence lab':'Next target'}</button></div></div>`;
  }

  function render(){renderModes();if(state.mode==='long')renderLong();else renderEvidence();}

  function channelFromY(y){
    let best=null;let distance=Infinity;
    Object.entries(ROWS).forEach(([channel,row])=>{const current=Math.abs(y-row);if(current<distance){best=channel;distance=current;}});
    return distance<=31?best:null;
  }

  function handleGuess(channel,time){
    if(state.mode!=='evidence'||state.completed||state.solved||state.reveal) return;
    const item=currentEvidence();const task=currentTask();if(!item||!task)return;
    const result=engine.checkEvidence(item.id,state.taskIndex,channel,time);
    if(result.correct){
      state.solved=true;state.correct+=1;state.feedback=task.explanation;
    }else{
      state.misses+=1;state.feedback=`Not there yet. ${task.hint}`;
    }
    renderEvidence();
  }

  function advanceEvidence(direction){
    if(state.completed)return;
    if(direction>0&&!state.solved&&!state.reveal)return;
    if(direction>0){
      const item=currentEvidence();
      if(state.taskIndex<item.tasks.length-1) state.taskIndex+=1;
      else if(state.evidenceIndex<engine.EVIDENCE_CASES.length-1){state.evidenceIndex+=1;state.taskIndex=0;}
      else{state.completed=true;renderEvidence();return;}
    }else{
      if(state.taskIndex>0) state.taskIndex-=1;
      else if(state.evidenceIndex>0){state.evidenceIndex-=1;state.taskIndex=engine.EVIDENCE_CASES[state.evidenceIndex].tasks.length-1;}
      else return;
    }
    state.feedback=null;state.reveal=false;state.solved=false;renderEvidence();
  }

  modeButtons.forEach(button=>button.addEventListener('click',()=>{state.mode=button.dataset.respiratoryTimelineMode==='evidence'?'evidence':'long';render();}));

  host.addEventListener('click',event=>{
    const longButton=event.target.closest('[data-resp-long-case]');
    if(longButton){state.longId=longButton.dataset.respLongCase;renderLong();return;}
    const jump=event.target.closest('[data-respiratory-timeline-mode-jump]');
    if(jump){state.mode=jump.dataset.respiratoryTimelineModeJump==='evidence'?'evidence':'long';render();return;}
    const svg=event.target.closest('[data-respiratory-evidence-svg]');
    if(svg&&state.mode==='evidence'){
      const rect=svg.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const x=(event.clientX-rect.left)/rect.width*1000;
      const y=(event.clientY-rect.top)/rect.height*495;
      if(x<PLOT.left||x>PLOT.right)return;
      const item=currentEvidence();const channel=channelFromY(y);if(!channel||!item)return;
      const time=(x-PLOT.left)/(PLOT.right-PLOT.left)*item.duration;
      handleGuess(channel,time);return;
    }
    const timeButton=event.target.closest('[data-resp-evidence-time]');
    if(timeButton){const task=currentTask();if(task)handleGuess(task.channel,Number(timeButton.dataset.respEvidenceTime));return;}
    if(event.target.closest('[data-resp-evidence-show]')){const task=currentTask();state.reveal=true;state.solved=false;state.feedback=task?`Shown: ${task.explanation}`:'Evidence shown.';renderEvidence();return;}
    if(event.target.closest('[data-resp-evidence-next]')){advanceEvidence(1);return;}
    if(event.target.closest('[data-resp-evidence-prev]')){advanceEvidence(-1);return;}
    if(event.target.closest('[data-resp-evidence-restart]')){state.evidenceIndex=0;state.taskIndex=0;state.feedback=null;state.reveal=false;state.solved=false;state.correct=0;state.misses=0;state.completed=false;renderEvidence();}
  });

  render();
})();
