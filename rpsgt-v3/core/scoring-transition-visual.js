(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  const host=document.querySelector('[data-scoring-transition-visual]');
  if(!host||!renderer)return;

  const state={base:new Map(),cases:[],caseIndex:0,contextIndex:1,selected:null,locked:false,correct:0};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const stageName=value=>({W:'Wake',N1:'N1',N2:'N2',N3:'N3',R:'REM'}[value]||value);

  async function load(){
    const response=await fetch('data/visual/prototype-sleep-staging.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Visual staging pack HTTP '+response.status);
    const pack=await response.json();
    (pack.studies||[]).forEach(study=>state.base.set(String(study.stage),study));
    if(!['W','N1','N2','N3','R'].every(stage=>state.base.has(stage)))throw new Error('The five base staging epochs were not available.');
    state.cases=buildCases();
    renderIntro();
  }

  function cleanFeatures(study,types){
    const copy=clone(study);
    copy.channels.forEach(channel=>{
      if(Array.isArray(channel.features))channel.features=channel.features.filter(feature=>!types.includes(feature.type));
    });
    return copy;
  }

  function n2Continuation(){
    const study=cleanFeatures(state.base.get('N2'),['k-complex','spindle']);
    study.id='transition-n2-continuation';
    study.title='Schematic N2 continuation epoch without a new defining feature';
    study.channels.forEach(channel=>{
      if(channel.type==='eeg')channel.profile='n2-lamf';
    });
    return study;
  }

  function remContinuation(){
    const study=cleanFeatures(state.base.get('R'),['rapid-eye','sawtooth']);
    study.id='transition-rem-continuation';
    study.title='Schematic REM continuation epoch without new rapid eye movements';
    return study;
  }

  function buildCases(){
    const n2Continue=n2Continuation(),remContinue=remContinuation();
    return [
      {
        id:'w-n1-n2',
        title:'Sleep-onset transition',
        prompt:'Score the middle epoch after reviewing the epoch before it and the epoch after it.',
        epochs:[clone(state.base.get('W')),clone(state.base.get('N1')),clone(state.base.get('N2'))],
        answer:'N1',
        rationale:'The middle teaching epoch shows the transition away from wake-oriented alpha toward a low-amplitude mixed-frequency/theta-oriented pattern with slow eye movements. The neighboring epochs help establish that this is the sleep-onset transition rather than an isolated waveform decision.'
      },
      {
        id:'n2-continuation',
        title:'N2 continuity across epochs',
        prompt:'The middle epoch has no new schematic K-complex or spindle. Score it using the preceding epoch and the continuing EEG context.',
        epochs:[clone(state.base.get('N2')),n2Continue,clone(state.base.get('N3'))],
        answer:'N2',
        rationale:'In the project reference, N2 may continue through low-amplitude mixed-frequency epochs without a new K-complex or spindle when preceding N2 context contains an unassociated K-complex or a sleep spindle, until a terminating transition or event occurs. This exercise uses that continuity concept; verify current official guidance for clinical scoring.'
      },
      {
        id:'rem-continuation',
        title:'REM continuity without new eye movements',
        prompt:'The middle epoch contains no new schematic rapid eye movements. Use the preceding REM epoch and the continuing EEG/chin pattern to score it.',
        epochs:[clone(state.base.get('R')),remContinue,clone(state.base.get('R'))],
        answer:'R',
        rationale:'The project reference describes continuing stage R after a preceding R epoch when low-amplitude mixed-frequency EEG continues, chin tone remains low, and new K-complexes or sleep spindles are absent, even when rapid eye movements are not present in that epoch. This app-authored exercise illustrates that context dependency.'
      }
    ];
  }

  function currentCase(){return state.cases[state.caseIndex]||null;}
  function currentEpoch(){const item=currentCase();return item&&item.epochs[state.contextIndex]||null;}

  function renderIntro(){
    host.hidden=false;
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 2 · Visual practicum</div><h2>Stage Transitions — score the middle epoch in context</h2></div><span class="status">3 consecutive-epoch cases</span></div><p class="report-intro">Move backward and forward through three original 30-second schematic epochs. The scoring target is always the middle epoch. Use the surrounding signal history before committing to a stage.</p><div class="scoring-transition-roadmap"><div><strong>Look back</strong><small>Inspect the preceding 30-second epoch for stage-defining context.</small></div><div><strong>Score the middle</strong><small>Make one W, N1, N2, N3, or R decision for the target epoch.</small></div><div><strong>Look ahead</strong><small>Use the following epoch to understand the direction of the transition, without letting it replace the target epoch evidence.</small></div></div><div class="actions"><button class="btn primary" type="button" data-transition-start>Start transition review</button></div>`;
  }

  function navMarkup(item){
    return `<nav class="scoring-transition-nav" aria-label="Three-epoch context navigator">${item.epochs.map((epoch,index)=>{const role=index===1?'Score this epoch':index===0?'Previous epoch':'Next epoch';const revealed=state.locked?` · ${stageName(index===1?item.answer:epoch.stage)}`:'';return `<button class="scoring-transition-tab${index===state.contextIndex?' current':''}${index===1?' target':''}" type="button" data-transition-context="${index}" aria-current="${index===state.contextIndex?'true':'false'}"><strong>${role}${esc(revealed)}</strong><small>${index*30}–${(index+1)*30} s context</small></button>`;}).join('')}</nav>`;
  }

  function feedbackMarkup(item){
    if(!state.locked)return '';
    const correct=state.selected===item.answer;
    return `<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${correct?'Correct':'Review'} · Middle epoch: ${esc(stageName(item.answer))}</strong><span>${esc(item.rationale)}</span></div><p class="scoring-source-note"><strong>Reference boundary:</strong> This app-authored exercise is based on the project scoring reference and is not a substitute for the current official scoring manual or supervised clinical scoring.</p>`;
  }

  function renderCase(){
    const item=currentCase(),epoch=currentEpoch();if(!item||!epoch)return;
    host.hidden=false;
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 2 · Case ${state.caseIndex+1} of ${state.cases.length}</div><h2>${esc(item.title)}</h2></div><span class="status">90 seconds of context</span></div>${navMarkup(item)}<div class="scoring-transition-meta"><span>Displayed epoch: ${state.contextIndex===0?'previous':state.contextIndex===1?'scoring target':'next'}</span><span>30-second page</span><span>Original schematic PSG</span></div><div class="visual-viewer-shell"><div class="visual-viewer-head"><div><strong>${state.contextIndex===1?'Target epoch':'Context epoch'}</strong><small>${esc(epoch.title||'App-authored schematic signal')}</small></div><span class="status ${state.contextIndex===1?'gold':''}">${state.contextIndex===1?'Score this epoch':'Context only'}</span></div><div class="visual-scroll"><div class="visual-canvas-stage"><canvas data-transition-canvas aria-label="Thirty-second schematic PSG transition epoch"></canvas></div></div></div><section class="scoring-stage-question"><h3>${esc(item.prompt)}</h3><p class="report-intro">You may inspect all three epochs before answering. Your stage choice applies only to the middle epoch.</p><div class="visual-stage-options" role="group" aria-label="Sleep stage choices">${['W','N1','N2','N3','R'].map(stage=>`<button class="visual-choice${state.selected===stage?' selected':''}" type="button" data-transition-answer="${stage}" ${state.locked?'disabled':''}>${stage}</button>`).join('')}</div>${feedbackMarkup(item)}<div class="visual-question-actions">${!state.locked?'<button class="btn primary" type="button" data-transition-check>Check middle epoch</button>':state.caseIndex<state.cases.length-1?'<button class="btn primary" type="button" data-transition-next-case>Next transition case</button>':'<button class="btn primary" type="button" data-transition-finish>Finish transition review</button>'}<button class="btn secondary" type="button" data-transition-prev ${state.contextIndex===0?'disabled':''}>Previous epoch</button><button class="btn secondary" type="button" data-transition-next-context ${state.contextIndex===2?'disabled':''}>Next epoch</button><button class="btn secondary" type="button" data-transition-close>Close visual review</button></div></section>`;
    requestAnimationFrame(()=>{const canvas=host.querySelector('[data-transition-canvas]');if(canvas)renderer.render(canvas,epoch);});
  }

  function markStationComplete(){
    const checkbox=document.querySelector('[data-scoring-station="stage-transitions"]');
    if(checkbox&&!checkbox.checked&&!checkbox.disabled){checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  function finish(){
    markStationComplete();
    host.innerHTML=`<div class="scoring-stage-result"><div class="eyebrow">Stage Transitions visual review complete</div><h2>${state.correct}/${state.cases.length} first-pass middle-epoch decisions correct</h2><p>You reviewed nine 30-second schematic pages across three transition cases. The Stage Transitions station has been recorded as reviewed; this remains educational practice rather than a competency determination.</p><div class="actions"><button class="btn primary" type="button" data-transition-restart>Practice the transition cases again</button></div></div>`;
  }

  host.addEventListener('click',event=>{
    const context=event.target.closest('[data-transition-context]');
    if(context){state.contextIndex=Number(context.dataset.transitionContext);renderCase();return;}
    const answer=event.target.closest('[data-transition-answer]');
    if(answer&&!state.locked){state.selected=answer.dataset.transitionAnswer;renderCase();return;}
    if(event.target.closest('[data-transition-start]')){state.caseIndex=0;state.contextIndex=1;state.selected=null;state.locked=false;state.correct=0;renderCase();return;}
    if(event.target.closest('[data-transition-check]')){const item=currentCase();if(!item||!state.selected)return;state.locked=true;if(state.selected===item.answer)state.correct+=1;renderCase();return;}
    if(event.target.closest('[data-transition-prev]')){state.contextIndex=Math.max(0,state.contextIndex-1);renderCase();return;}
    if(event.target.closest('[data-transition-next-context]')){state.contextIndex=Math.min(2,state.contextIndex+1);renderCase();return;}
    if(event.target.closest('[data-transition-next-case]')){state.caseIndex+=1;state.contextIndex=1;state.selected=null;state.locked=false;renderCase();return;}
    if(event.target.closest('[data-transition-finish]')){finish();return;}
    if(event.target.closest('[data-transition-restart]')){state.caseIndex=0;state.contextIndex=1;state.selected=null;state.locked=false;state.correct=0;renderCase();return;}
    if(event.target.closest('[data-transition-close]')){renderIntro();}
  });

  load().catch(error=>{host.hidden=false;host.innerHTML=`<div class="notice error"><strong>Visual transition review could not load.</strong> ${esc(error.message)}</div>`;});
})();
