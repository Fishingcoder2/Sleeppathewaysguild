(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  const host=document.querySelector('[data-scoring-stage-visual]');
  if(!host||!renderer)return;

  const LABEL_WIDTH=112;
  const TOP_PAD=34;
  const ROW_HEIGHT=58;
  const state={studies:[],order:[],index:0,mode:'idle',selected:null,locked:false,correct:0,completed:0,animationFrame:0,animationStarted:0,metrics:null};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const stageName=value=>({W:'Wake',N1:'N1',N2:'N2',N3:'N3',R:'REM'}[value]||value);
  const rationale={
    W:'Review the occipital alpha-oriented background together with eye activity and relatively higher chin tone. Use the complete epoch rather than one waveform.',
    N1:'Review the low-amplitude mixed-frequency/theta-oriented background, slow eye movements, reduced alpha, and the vertex teaching feature in context.',
    N2:'Review the low-amplitude mixed-frequency background together with the prominent K-complex and sleep-spindle teaching regions.',
    N3:'Review the sustained slow-wave activity across the EEG montage, with the greatest amplitude emphasis frontally in this teaching epoch.',
    R:'Review the mixed-frequency EEG, rapid eye movements, sawtooth teaching activity, and markedly reduced chin tone together.'
  };

  async function load(){
    const response=await fetch('data/visual/prototype-sleep-staging.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Visual staging pack HTTP '+response.status);
    const pack=await response.json();
    state.studies=(pack.studies||[]).filter(study=>['W','N1','N2','N3','R'].includes(study.stage));
    if(state.studies.length<5)throw new Error('Five staging teaching epochs were not available.');
    state.order=shuffle(state.studies.slice());
    renderIntro();
  }

  function shuffle(items){
    for(let i=items.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
    return items;
  }

  function currentStudy(){return state.order[state.index]||null;}
  function cancelAnimation(){if(state.animationFrame){cancelAnimationFrame(state.animationFrame);state.animationFrame=0;}}

  function renderIntro(){
    cancelAnimation();
    state.mode='idle';
    host.hidden=false;
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 1 · Visual practicum</div><h2>Stage Recognition — live PSG to frozen epoch</h2></div><span class="status">W · N1 · N2 · N3 · R</span></div><p class="report-intro">Watch an original schematic PSG move in real time, then pause the 30-second epoch and score it from the complete signal picture. Finish all five epochs to record the Stage Recognition review station.</p><div class="scoring-stage-roadmap"><div><strong>1 · Watch</strong><small>The PSG page moves right-to-left at one full page every 30 seconds.</small></div><div><strong>2 · Freeze</strong><small>Pause to view the complete 30-second epoch without movement.</small></div><div><strong>3 · Score</strong><small>Choose W, N1, N2, N3, or R, then review the evidence.</small></div></div><div class="actions"><button class="btn primary" type="button" data-stage-start>Start visual stage review</button></div>`;
  }

  function fixedLabels(study){
    const height=TOP_PAD+26+study.channels.length*ROW_HEIGHT;
    return `<div class="scoring-live-labels" style="width:${LABEL_WIDTH}px;height:${height}px">${study.channels.map((channel,index)=>`<span style="top:${TOP_PAD+index*ROW_HEIGHT}px;height:${ROW_HEIGHT}px">${esc(channel.label)}</span>`).join('')}</div>`;
  }

  function renderLive(){
    const study=currentStudy();if(!study)return;
    cancelAnimation();state.mode='live';state.selected=null;state.locked=false;
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 1 · Live review</div><h2>Epoch ${state.index+1} of ${state.order.length}</h2></div><span class="status green">30-second live page</span></div><div class="scoring-live-meta"><span>Original schematic PSG</span><span>Labels remain fixed</span><span>1 page = 30 seconds</span></div><div class="scoring-live-shell" data-live-shell>${fixedLabels(study)}<div class="scoring-live-viewport" data-live-viewport><div class="scoring-live-strip" data-live-strip><div class="scoring-live-page"><canvas data-live-canvas-a aria-label="Scrolling schematic PSG page"></canvas></div><div class="scoring-live-page"><canvas data-live-canvas-b aria-hidden="true"></canvas></div></div></div></div><div class="scoring-live-progress"><span data-live-time>0.0 s</span><progress max="30" value="0" data-live-progress></progress><span>30.0 s</span></div><div class="actions"><button class="btn primary" type="button" data-stage-freeze>Pause and score this epoch</button><button class="btn secondary" type="button" data-stage-close>Close visual review</button></div>`;
    requestAnimationFrame(()=>setupLive(study));
  }

  function setupLive(study){
    const viewport=host.querySelector('[data-live-viewport]'),strip=host.querySelector('[data-live-strip]'),a=host.querySelector('[data-live-canvas-a]'),b=host.querySelector('[data-live-canvas-b]');
    if(!viewport||!strip||!a||!b)return;
    const pageWidth=Math.max(748,viewport.clientWidth||748);
    host.querySelectorAll('.scoring-live-page').forEach(page=>{page.style.width=pageWidth+'px';page.style.flexBasis=pageWidth+'px';});
    [a,b].forEach(canvas=>{canvas.style.marginLeft='-'+LABEL_WIDTH+'px';renderer.render(canvas,study,{width:pageWidth+LABEL_WIDTH});});
    strip.style.width=(pageWidth*2)+'px';
    state.animationStarted=performance.now();
    const tick=now=>{
      if(state.mode!=='live')return;
      const elapsed=((now-state.animationStarted)/1000)%30;
      const progress=elapsed/30;
      strip.style.transform=`translate3d(${-progress*pageWidth}px,0,0)`;
      const time=host.querySelector('[data-live-time]'),bar=host.querySelector('[data-live-progress]');
      if(time)time.textContent=elapsed.toFixed(1)+' s';if(bar)bar.value=elapsed;
      state.animationFrame=requestAnimationFrame(tick);
    };
    state.animationFrame=requestAnimationFrame(tick);
  }

  function renderScore(){
    const study=currentStudy();if(!study)return;
    cancelAnimation();state.mode='score';
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 1 · Frozen scoring view</div><h2>Score Epoch ${state.index+1} of ${state.order.length}</h2></div><span class="status">30-second epoch</span></div><p class="report-intro">Read across EEG, EOG, chin activity, and ECG before choosing the stage. No teaching annotation is shown until you commit.</p><div class="visual-viewer-shell"><div class="visual-viewer-head"><div><strong>PSG signal window</strong><small>Frozen 30-second page · original app-authored schematic</small></div><span class="status green">No patient data</span></div><div class="visual-scroll"><div class="visual-canvas-stage"><canvas data-stage-score-canvas aria-label="Frozen 30-second schematic PSG tracing"></canvas></div></div></div><div class="scoring-stage-question"><h3>Which sleep stage is this epoch designed to represent?</h3><div class="visual-stage-options" role="group" aria-label="Sleep stage choices">${['W','N1','N2','N3','R'].map(stage=>`<button class="visual-choice${state.selected===stage?' selected':''}" type="button" data-stage-answer="${stage}" ${state.locked?'disabled':''}>${stage}</button>`).join('')}</div>${feedbackMarkup(study)}<div class="visual-question-actions">${!state.locked?'<button class="btn primary" type="button" data-stage-check>Check answer</button>':state.index<state.order.length-1?'<button class="btn primary" type="button" data-stage-next>Next live epoch</button>':'<button class="btn primary" type="button" data-stage-finish>Finish stage review</button>'}<button class="btn secondary" type="button" data-stage-live>Return to live review</button><button class="btn secondary" type="button" data-stage-close>Close visual review</button></div></div>`;
    requestAnimationFrame(()=>{const canvas=host.querySelector('[data-stage-score-canvas]');if(canvas)state.metrics=renderer.render(canvas,study);});
  }

  function feedbackMarkup(study){
    if(!state.locked)return '';
    const correct=state.selected===study.stage;
    return `<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${correct?'Correct':'Review'} · ${esc(stageName(study.stage))}</strong><span>${esc(rationale[study.stage]||'Review the complete epoch and signal context.')}</span></div>`;
  }

  function markStationComplete(){
    const checkbox=document.querySelector('[data-scoring-station="stage-recognition"]');
    if(checkbox&&!checkbox.checked&&!checkbox.disabled){checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  function finish(){
    cancelAnimation();state.mode='done';markStationComplete();
    host.innerHTML=`<div class="scoring-stage-result"><div class="eyebrow">Stage Recognition visual review complete</div><h2>${state.correct}/${state.order.length} first-pass stage decisions correct</h2><p>All five original teaching epochs were reviewed in live and frozen scoring views. The Stage Recognition station has been recorded as reviewed; this practicum remains educational practice rather than a competency determination.</p><div class="actions"><button class="btn primary" type="button" data-stage-restart>Practice the five stages again</button></div></div>`;
  }

  host.addEventListener('click',event=>{
    const answer=event.target.closest('[data-stage-answer]');
    if(answer&&!state.locked){state.selected=answer.dataset.stageAnswer;renderScore();return;}
    if(event.target.closest('[data-stage-start]')){state.order=shuffle(state.studies.slice());state.index=0;state.correct=0;state.completed=0;renderLive();return;}
    if(event.target.closest('[data-stage-freeze]')){renderScore();return;}
    if(event.target.closest('[data-stage-live]')){renderLive();return;}
    if(event.target.closest('[data-stage-check]')){
      const study=currentStudy();if(!study||!state.selected)return;
      state.locked=true;state.completed+=1;if(state.selected===study.stage)state.correct+=1;renderScore();return;
    }
    if(event.target.closest('[data-stage-next]')){state.index+=1;state.selected=null;state.locked=false;renderLive();return;}
    if(event.target.closest('[data-stage-finish]')){finish();return;}
    if(event.target.closest('[data-stage-restart]')){state.order=shuffle(state.studies.slice());state.index=0;state.correct=0;state.completed=0;state.selected=null;state.locked=false;renderLive();return;}
    if(event.target.closest('[data-stage-close]')){renderIntro();}
  });

  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimation();else if(state.mode==='live')requestAnimationFrame(()=>setupLive(currentStudy()));});
  load().catch(error=>{host.hidden=false;host.innerHTML=`<div class="notice error"><strong>Visual stage review could not load.</strong> ${esc(error.message)}</div>`;});
})();
