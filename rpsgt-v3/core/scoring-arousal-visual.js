(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  const host=document.querySelector('[data-scoring-arousal-visual]');
  if(!host||!renderer)return;

  const state={base:null,cases:[],index:0,decision:null,decisionLocked:false,interval:null,intervalLocked:false,drag:null,metrics:null,correct:0};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const currentCase=()=>state.cases[state.index]||null;

  async function load(){
    const response=await fetch('data/visual/prototype-sleep-staging.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Visual staging pack HTTP '+response.status);
    const pack=await response.json();
    state.base=(pack.studies||[]).find(study=>study.stage==='N2')||null;
    if(!state.base)throw new Error('The N2 teaching epoch was not available.');
    state.cases=buildCases();
    renderIntro();
  }

  function buildCases(){
    return [
      {
        id:'arousal-clear',title:'Abrupt EEG frequency shift',
        prompt:'Does this schematic epoch contain an EEG arousal based on the duration of the abrupt frequency shift?',
        study:clone(state.base),answer:'score',event:{start:7.0,end:11.2},artifact:null,
        rationale:'The uploaded project reference describes an EEG arousal as an abrupt shift in EEG frequency lasting at least 3 seconds. This app-authored shift lasts a little more than 4 seconds.'
      },
      {
        id:'arousal-short',title:'Short frequency shift',
        prompt:'Does this shorter schematic EEG frequency shift meet the duration described in the uploaded project reference?',
        study:clone(state.base),answer:'do-not-score',event:{start:15.0,end:17.0},artifact:null,
        rationale:'The visible frequency shift is approximately 2 seconds long. The uploaded project reference states that the abrupt EEG frequency shift must last at least 3 seconds, so this teaching example is intentionally too short.'
      },
      {
        id:'arousal-artifact',title:'Arousal followed by muscle artifact',
        prompt:'Separate the initial EEG frequency shift from the later high-frequency muscle artifact. Should the initial event be scored as an arousal?',
        study:clone(state.base),answer:'score',event:{start:9.0,end:12.6},artifact:{start:12.6,end:16.2},
        rationale:'The initial app-authored EEG frequency shift lasts more than 3 seconds. The uploaded project reference also warns that high-frequency activity superimposed on EEG channels during and following an arousal may be muscle artifact; the later dense activity is included to teach that distinction.'
      }
    ];
  }

  function resetCase(){state.decision=null;state.decisionLocked=false;state.interval=null;state.intervalLocked=false;state.drag=null;state.metrics=null;}

  function renderIntro(){
    host.hidden=false;
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 3 · Visual practicum</div><h2>Arousal Recognition — find the EEG change, then measure it</h2></div><span class="status">3 app-authored cases</span></div><p class="report-intro">First decide whether the epoch contains a qualifying arousal pattern using the uploaded project reference. When an arousal is present, mark its approximate interval directly on an EEG channel. Teaching highlights stay hidden until you commit.</p><div class="scoring-arousal-roadmap"><div><strong>Recognize</strong><small>Look for an abrupt change in EEG frequency rather than a single isolated deflection.</small></div><div><strong>Measure</strong><small>The uploaded reference describes a duration of at least 3 seconds for the abrupt frequency shift.</small></div><div><strong>Separate artifact</strong><small>Do not mistake later high-frequency muscle artifact superimposed on EEG channels for the arousal itself.</small></div></div><div class="actions"><button class="btn primary" type="button" data-arousal-start>Start arousal review</button></div>`;
  }

  function renderCase(){
    const item=currentCase();if(!item)return;
    const needsInterval=state.decisionLocked&&item.answer==='score'&&state.decision==='score';
    const readyNext=state.decisionLocked&&(item.answer==='do-not-score'||state.intervalLocked||state.decision!=='score');
    host.hidden=false;
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 3 · Case ${state.index+1} of ${state.cases.length}</div><h2>${esc(item.title)}</h2></div><span class="status">30-second N2 teaching epoch</span></div><div class="scoring-arousal-meta"><span>Original schematic PSG</span><span>EEG-focused event review</span><span>No patient data</span></div><div class="visual-viewer-shell"><div class="visual-viewer-head"><div><strong>PSG signal window</strong><small>Review the complete epoch before classifying the event</small></div><span class="status green">Annotations hidden until check</span></div><div class="visual-scroll"><div class="visual-canvas-stage" data-arousal-stage><canvas data-arousal-canvas aria-label="Schematic PSG epoch for arousal recognition"></canvas><div class="visual-region-layer" data-arousal-layer aria-label="Interactive arousal marking layer"></div></div></div></div><section class="scoring-stage-question"><h3>${esc(item.prompt)}</h3><div class="scoring-arousal-decisions" role="group" aria-label="Arousal scoring decision"><button class="visual-choice${state.decision==='score'?' selected':''}" type="button" data-arousal-decision="score" ${state.decisionLocked?'disabled':''}>Score arousal</button><button class="visual-choice${state.decision==='do-not-score'?' selected':''}" type="button" data-arousal-decision="do-not-score" ${state.decisionLocked?'disabled':''}>Do not score</button></div>${!state.decisionLocked?'<div class="visual-question-actions"><button class="btn primary" type="button" data-arousal-check-decision>Check decision</button><button class="btn secondary" type="button" data-arousal-close>Close visual review</button></div>':decisionFeedback(item)}${needsInterval?intervalControls(item):''}${readyNext?nextControls():''}</section>`;
    requestAnimationFrame(()=>renderCanvas(item));
  }

  function decisionFeedback(item){
    const correct=state.decision===item.answer;
    const status=correct?'Correct decision':'Review the duration and signal pattern';
    return `<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${status}</strong><span>${esc(item.rationale)}</span></div><p class="scoring-source-note"><strong>Source boundary:</strong> This exercise uses the uploaded project reference statement that an EEG arousal requires an abrupt EEG frequency shift lasting at least 3 seconds. Current official scoring guidance remains authoritative.</p>`;
  }

  function intervalControls(item){
    if(state.intervalLocked){
      const grade=gradeInterval(item,state.interval);
      return `<div class="scoring-arousal-mark-feedback ${grade.correct?'correct':'retry'}"><strong>${grade.correct?'Interval marked well':'Review the event boundaries'}</strong><span>Your mark: ${state.interval?state.interval.start.toFixed(1)+'–'+state.interval.end.toFixed(1)+' s on '+esc(state.interval.channel):'—'} · Teaching target: ${item.event.start.toFixed(1)}–${item.event.end.toFixed(1)} s.</span></div>`;
    }
    return `<div class="visual-point-help"><strong>Mark the arousal:</strong> press or touch near the beginning of the abrupt frequency shift on any EEG channel, drag to its end, and release.</div><div class="visual-question-actions"><button class="btn primary" type="button" data-arousal-check-interval ${state.interval?'':'disabled'}>Check marked interval</button></div>`;
  }

  function nextControls(){
    return `<div class="visual-question-actions">${state.index<state.cases.length-1?'<button class="btn primary" type="button" data-arousal-next>Next arousal case</button>':'<button class="btn primary" type="button" data-arousal-finish>Finish arousal review</button>'}<button class="btn secondary" type="button" data-arousal-close>Close visual review</button></div>`;
  }

  function renderCanvas(item){
    const canvas=host.querySelector('[data-arousal-canvas]');if(!canvas)return;
    state.metrics=renderer.render(canvas,item.study);
    drawEventOverlay(canvas,item);
    renderInteractionLayer(item);
  }

  function drawEventOverlay(canvas,item){
    if(!state.metrics)return;
    const metrics=state.metrics,ratio=Math.max(1,canvas.width/metrics.width),ctx=canvas.getContext('2d');
    ctx.save();ctx.setTransform(ratio,0,0,ratio,0,0);ctx.lineWidth=1.15;ctx.strokeStyle='#132f3f';
    const eegIndexes=item.study.channels.map((channel,index)=>channel.type==='eeg'?index:-1).filter(index=>index>=0);
    eegIndexes.forEach((index,order)=>drawBurst(ctx,metrics,index,item.event.start,item.event.end,17.5,7.0,order*.41));
    if(item.artifact){
      ctx.lineWidth=.9;
      eegIndexes.forEach((index,order)=>drawArtifact(ctx,metrics,index,item.artifact.start,item.artifact.end,order*.57));
    }
    ctx.restore();
  }

  function timeX(metrics,time){return metrics.labelWidth+(time/metrics.duration)*(metrics.plotRight-metrics.labelWidth);}
  function rowY(metrics,index){return metrics.topPad+index*metrics.rowHeight+metrics.rowHeight/2;}

  function drawBurst(ctx,metrics,index,start,end,frequency,amplitude,phase){
    const steps=Math.max(20,Math.round((end-start)*120)),y0=rowY(metrics,index);ctx.beginPath();
    for(let i=0;i<=steps;i+=1){const t=start+(end-start)*(i/steps),gate=Math.min(1,(t-start)/.12,(end-t)/.12),y=y0-gate*(Math.sin(Math.PI*2*frequency*t+phase)*amplitude+Math.sin(Math.PI*2*8.2*t+phase*.5)*2.2),x=timeX(metrics,t);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  }

  function drawArtifact(ctx,metrics,index,start,end,phase){
    const steps=Math.max(30,Math.round((end-start)*150)),y0=rowY(metrics,index);ctx.beginPath();
    for(let i=0;i<=steps;i+=1){const t=start+(end-start)*(i/steps),gate=Math.min(1,(t-start)/.10,(end-t)/.18),noise=Math.sin(Math.PI*2*28*t+phase)*5.5+Math.sin(Math.PI*2*41*t+phase*1.7)*3.0+Math.sin(Math.PI*2*19*t+.8)*2.1,x=timeX(metrics,t),y=y0-gate*noise;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  }

  function renderInteractionLayer(item){
    const layer=host.querySelector('[data-arousal-layer]');if(!layer||!state.metrics)return;layer.innerHTML='';
    if(state.decisionLocked){
      addTeachingRegion(layer,item.event,'scoring-arousal-target',state.intervalLocked||item.answer==='do-not-score');
      if(item.artifact)addTeachingRegion(layer,item.artifact,'scoring-arousal-artifact-target',state.intervalLocked);
    }
    if(state.interval)addSelection(layer,state.interval,state.intervalLocked?gradeInterval(item,state.interval).correct?'correct':'incorrect':'selected');
    if(state.decisionLocked&&item.answer==='score'&&state.decision==='score'&&!state.intervalLocked){
      const surface=document.createElement('div');surface.className='visual-interval-surface scoring-arousal-surface';surface.dataset.arousalSurface='true';surface.style.left=state.metrics.labelWidth+'px';surface.style.top=state.metrics.topPad+'px';surface.style.width=(state.metrics.plotRight-state.metrics.labelWidth)+'px';surface.style.height=(state.metrics.channels.length*state.metrics.rowHeight)+'px';surface.setAttribute('role','application');surface.setAttribute('aria-label','Drag across an EEG channel to mark the arousal interval');layer.appendChild(surface);
    }
  }

  function addTeachingRegion(layer,region,className,visible){
    if(!visible)return;const metrics=state.metrics,x=timeX(metrics,region.start),width=timeX(metrics,region.end)-x;
    const eegIndexes=currentCase().study.channels.map((channel,index)=>channel.type==='eeg'?index:-1).filter(index=>index>=0);if(!eegIndexes.length)return;
    const top=metrics.topPad+Math.min(...eegIndexes)*metrics.rowHeight,height=(Math.max(...eegIndexes)-Math.min(...eegIndexes)+1)*metrics.rowHeight;
    const box=document.createElement('span');box.className=className;box.style.left=x+'px';box.style.top=top+'px';box.style.width=Math.max(5,width)+'px';box.style.height=height+'px';box.setAttribute('aria-hidden','true');layer.appendChild(box);
  }

  function addSelection(layer,interval,status){
    const metrics=state.metrics,index=metrics.channels.indexOf(interval.channel);if(index<0)return;const box=document.createElement('span');box.className='visual-interval-selection '+status;box.style.left=timeX(metrics,interval.start)+'px';box.style.top=(metrics.topPad+index*metrics.rowHeight)+'px';box.style.width=Math.max(5,timeX(metrics,interval.end)-timeX(metrics,interval.start))+'px';box.style.height=metrics.rowHeight+'px';box.setAttribute('aria-hidden','true');layer.appendChild(box);
  }

  function pointFromEvent(event,surface,channelIndex){
    if(!state.metrics)return null;const rect=surface.getBoundingClientRect(),x=event.clientX-rect.left+state.metrics.labelWidth,y=channelIndex==null?event.clientY-rect.top+state.metrics.topPad:state.metrics.topPad+channelIndex*state.metrics.rowHeight+state.metrics.rowHeight/2;return renderer.hitTest(state.metrics,x,y);
  }

  function beginDrag(event,surface){
    if(state.intervalLocked)return;const point=pointFromEvent(event,surface,null);if(!point)return;const channel=currentCase().study.channels[point.channelIndex];if(!channel||channel.type!=='eeg')return;event.preventDefault();if(surface.setPointerCapture)surface.setPointerCapture(event.pointerId);state.drag={pointerId:event.pointerId,surface,channel:point.channel,channelIndex:point.channelIndex,start:point.time,end:point.time};state.interval={channel:point.channel,start:point.time,end:point.time};renderInteractionLayer(currentCase());
  }

  function moveDrag(event){
    if(!state.drag||event.pointerId!==state.drag.pointerId)return;const point=pointFromEvent(event,state.drag.surface,state.drag.channelIndex);if(!point)return;event.preventDefault();state.drag.end=point.time;state.interval={channel:state.drag.channel,start:Math.min(state.drag.start,state.drag.end),end:Math.max(state.drag.start,state.drag.end)};renderInteractionLayer(currentCase());
  }

  function endDrag(event){if(!state.drag||event.pointerId!==state.drag.pointerId)return;moveDrag(event);state.drag=null;renderCase();}

  function gradeInterval(item,interval){
    if(!interval)return {correct:false};const channel=item.study.channels.find(entry=>entry.label===interval.channel);if(!channel||channel.type!=='eeg')return {correct:false};
    const startOk=Math.abs(interval.start-item.event.start)<=.8,endOk=Math.abs(interval.end-item.event.end)<=.8,duration=interval.end-interval.start,durationOk=duration>=2.7;
    return {correct:startOk&&endOk&&durationOk};
  }

  function caseCorrect(item){
    if(state.decision!==item.answer)return false;
    if(item.answer==='do-not-score')return true;
    return state.intervalLocked&&gradeInterval(item,state.interval).correct;
  }

  function markStationComplete(){
    const checkbox=document.querySelector('[data-scoring-station="arousal-context"]');if(checkbox&&!checkbox.checked&&!checkbox.disabled){checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  function finish(){
    if(caseCorrect(currentCase()))state.correct+=1;markStationComplete();host.innerHTML=`<div class="scoring-stage-result"><div class="eyebrow">Arousal Recognition visual review complete</div><h2>${state.correct}/${state.cases.length} first-pass cases fully correct</h2><p>You classified abrupt EEG frequency shifts, measured qualifying intervals, and separated a later muscle-artifact teaching pattern from the arousal itself. The Arousal Recognition station has been recorded as reviewed.</p><div class="actions"><button class="btn primary" type="button" data-arousal-restart>Practice the arousal cases again</button></div></div>`;
  }

  host.addEventListener('click',event=>{
    const decision=event.target.closest('[data-arousal-decision]');if(decision&&!state.decisionLocked){state.decision=decision.dataset.arousalDecision;renderCase();return;}
    if(event.target.closest('[data-arousal-start]')){state.index=0;state.correct=0;resetCase();renderCase();return;}
    if(event.target.closest('[data-arousal-check-decision]')){if(!state.decision)return;state.decisionLocked=true;renderCase();return;}
    if(event.target.closest('[data-arousal-check-interval]')){if(!state.interval)return;state.intervalLocked=true;renderCase();return;}
    if(event.target.closest('[data-arousal-next]')){if(caseCorrect(currentCase()))state.correct+=1;state.index+=1;resetCase();renderCase();return;}
    if(event.target.closest('[data-arousal-finish]')){finish();return;}
    if(event.target.closest('[data-arousal-restart]')){state.index=0;state.correct=0;resetCase();renderCase();return;}
    if(event.target.closest('[data-arousal-close]')){renderIntro();}
  });
  host.addEventListener('pointerdown',event=>{const surface=event.target.closest('[data-arousal-surface]');if(surface)beginDrag(event,surface);});
  host.addEventListener('pointermove',moveDrag);
  host.addEventListener('pointerup',endDrag);
  host.addEventListener('pointercancel',endDrag);

  load().catch(error=>{host.hidden=false;host.innerHTML=`<div class="notice error"><strong>Visual arousal review could not load.</strong> ${esc(error.message)}</div>`;});
})();
