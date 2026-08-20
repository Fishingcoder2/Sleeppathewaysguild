(function(){
  'use strict';
  const workspace=document.querySelector('[data-visual-workspace]');
  const startButton=document.querySelector('[data-visual-start]');
  if(!workspace)return;

  const existing=selector=>workspace.querySelector(selector);
  const epochButtons=()=>[...workspace.querySelectorAll('[data-visual-epoch]')];
  const isDesktop=()=>window.matchMedia('(min-width:901px)').matches;
  const isPhoneLandscape=()=>window.matchMedia('(max-width:900px) and (orientation:landscape)').matches;
  let desktopHintOpen=false;
  let desktopToolsOpen=false;
  let viewportSnapshot=null;

  const DESKTOP_RECAPS=[
    ['Posterior alpha is the dominant wake teaching clue.','Eye activity and relatively higher chin tone support the wake context.'],
    ['Low-amplitude mixed-frequency/theta-oriented EEG replaces the wake alpha pattern.','Slow eye movements and the vertex teaching feature support the N1 context.'],
    ['A K-complex and sleep-spindle teaching burst support the N2 pattern.','Use the one-second grid to connect spindle density and duration with the marked feature.'],
    ['Sustained high-amplitude slow activity is strongest in the frontal teaching channels.','Judge the slow-wave run in the context of the complete epoch rather than one isolated deflection.'],
    ['Low-amplitude mixed-frequency EEG combines with REM-oriented eye activity and low chin tone.','Sawtooth morphology is a supporting clue only when the surrounding REM context agrees.']
  ];

  const scheduleSync=()=>{
    queueMicrotask(syncChrome);
    setTimeout(()=>{syncChrome();restoreViewport();},0);
    requestAnimationFrame(()=>{syncChrome();restoreViewport();});
  };

  function hasSelection(){
    return Boolean(existing('.visual-choice.selected,.visual-region-button.selected,.visual-point-marker.selected,.visual-interval-selection'));
  }

  function retryRequired(){
    return Boolean(existing('.visual-retry-notice,.visual-outcome-dialog.incorrect'));
  }

  function outcomeCorrect(){
    return Boolean(existing('.visual-outcome-dialog.correct'));
  }

  function questionPrompt(){
    return String(existing('.visual-question-top h2')?.textContent||'Open the current question').trim();
  }

  function currentEpochIndex(){
    return epochButtons().findIndex(button=>button.classList.contains('current')||button.getAttribute('aria-current')==='true');
  }

  function currentProgress(){
    const index=currentEpochIndex();
    const button=epochButtons()[index];
    const match=String(button?.querySelector('small')?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
    return match?{done:Number(match[1]),total:Number(match[2])}:null;
  }

  function currentStage(){
    const index=currentEpochIndex();
    const strong=String(epochButtons()[index]?.querySelector('strong')?.textContent||'');
    const match=strong.match(/·\s*(W|N1|N2|N3|R)\b/);
    return match?match[1]:'';
  }

  function currentTaskType(){
    if(existing('.visual-stage-options'))return 'stage';
    if(existing('.visual-interval-options,[data-visual-interval-surface]'))return 'mark';
    if(existing('.visual-point-options,[data-visual-point-surface],.visual-region-options'))return 'evidence';
    return 'review';
  }

  function currentTaskLabel(){
    const type=currentTaskType();
    if(type==='stage')return 'Stage the epoch';
    if(type==='mark')return 'Mark the feature';
    if(type==='evidence')return 'Find the evidence';
    return 'Review the epoch';
  }

  function hintText(){
    const type=currentTaskType();
    if(type==='stage')return 'Compare the EEG background, EOG behavior, chin tone, and stage-defining features across the full 30-second epoch before committing a stage.';
    if(type==='mark')return 'Identify where the requested morphology clearly begins, stay on the same channel, and drag through the point where it returns toward the surrounding background.';
    if(type==='evidence')return 'Stay on the channel named in the prompt. Use the one-second grid and compare morphology, frequency, amplitude, and neighboring channels before selecting the feature.';
    return 'Use the full PSG context and the one-second grid before moving forward.';
  }

  function captureViewport(){
    if(!isDesktop())return;
    const scroll=existing('.visual-scroll');
    if(!scroll)return;
    viewportSnapshot={epoch:currentEpochIndex(),left:scroll.scrollLeft,top:scroll.scrollTop};
  }

  function restoreViewport(){
    if(!isDesktop()||!viewportSnapshot||viewportSnapshot.epoch!==currentEpochIndex())return;
    const scroll=existing('.visual-scroll');
    if(!scroll)return;
    scroll.scrollLeft=viewportSnapshot.left;
    scroll.scrollTop=viewportSnapshot.top;
  }

  function closeQuestion(focusLauncher=true){
    if(isDesktop()){
      workspace.classList.remove('visual-question-open','visual-split-view');
      existing('[data-visual-question-toolbar]')?.remove();
      return;
    }
    if(!workspace.classList.contains('visual-question-open'))return;
    workspace.classList.remove('visual-question-open','visual-split-view');
    existing('[data-visual-question-toolbar]')?.remove();
    if(focusLauncher)requestAnimationFrame(()=>existing('[data-visual-open-question]')?.focus());
  }

  function ensureQuestionToolbar(){
    if(isDesktop())return;
    const card=existing('.visual-question-card');
    if(!card)return;
    let toolbar=card.querySelector('[data-visual-question-toolbar]');
    if(!toolbar){
      toolbar=document.createElement('div');
      toolbar.className='visual-question-modal-toolbar';
      toolbar.dataset.visualQuestionToolbar='true';
      card.prepend(toolbar);
    }
    const counter=existing('.visual-counter')?.textContent?.trim()||'Current question';
    const split=workspace.classList.contains('visual-split-view');
    toolbar.innerHTML=`<div><small>Visual Skills question</small><strong>${counter}</strong></div><div class="visual-question-toolbar-actions"><button class="btn secondary" type="button" data-visual-question-layout>${split?'Full question':'Split view'}</button><button class="btn secondary" type="button" data-visual-question-close>← Review PSG</button></div>`;
  }

  function openQuestion(){
    if(workspace.hidden||existing('.visual-result')||existing('.visual-outcome-backdrop'))return;
    const card=existing('.visual-question-card');
    if(!card)return;
    if(isDesktop()){
      workspace.classList.add('visual-desktop-workstation');
      requestAnimationFrame(()=>card.querySelector('[data-visual-answer]:not(:disabled),h2')?.focus?.());
      return;
    }
    workspace.classList.add('visual-question-open');
    workspace.classList.toggle('visual-split-view',isPhoneLandscape());
    ensureQuestionToolbar();
    requestAnimationFrame(()=>{
      const target=card.querySelector('[data-visual-answer]:not(:disabled),[data-visual-question-close],h2');
      if(target&&typeof target.focus==='function')target.focus();
    });
  }

  function ensureViewerFullscreenControl(){
    const head=existing('.visual-viewer-head');
    if(!head)return;
    let control=head.querySelector('[data-spg-request-fullscreen]');
    if(!control){
      control=document.createElement('button');
      control.type='button';
      control.className='btn secondary visual-viewer-fullscreen';
      control.dataset.spgRequestFullscreen='true';
      control.dataset.spgFullscreenTarget='[data-visual-workspace]';
      control.textContent='Full screen';
      head.appendChild(control);
    }
    window.SPGVisualDisplay?.syncFullscreenControls();
  }

  function ensureStatusPanel(){
    const head=existing(':scope > .section-head');
    if(!head)return;
    let panel=head.querySelector('[data-visual-item-status]');
    if(!panel){
      panel=document.createElement('aside');
      panel.className='visual-item-status';
      panel.dataset.visualItemStatus='true';
      panel.setAttribute('aria-label','Current visual progress');
      head.appendChild(panel);
    }
    const epochHeading=(head.querySelector('h2')?.textContent||'Current epoch').replace(/\s+·.*$/,'').trim();
    const question=existing('.visual-counter')?.textContent?.trim()||'—';
    const completed=epochButtons().filter(button=>button.classList.contains('complete')&&!button.classList.contains('needs-review')).length;
    let stateLabel='First attempt';
    if(retryRequired())stateLabel='Retry required';
    else if(outcomeCorrect())stateLabel='Correct';
    else if(hasSelection())stateLabel='Answer selected';
    const canPrevious=Boolean(existing('[data-visual-prev]'))&&!retryRequired();
    panel.innerHTML=`<span><small>Epoch</small><strong>${epochHeading.replace(/^Epoch\s+/i,'')}</strong></span><span><small>Question</small><strong>${question}</strong></span><span><small>Completed</small><strong>${completed}/5 epochs</strong></span><span class="${retryRequired()?'retry':outcomeCorrect()?'correct':''}"><small>Status</small><strong>${stateLabel}</strong></span><div class="visual-question-launch"><div><small>Current task</small><strong>${questionPrompt()}</strong></div><button class="btn secondary" type="button" data-visual-question-prev ${canPrevious?'':'disabled'}>← Previous</button><button class="btn primary" type="button" data-visual-open-question>Answer question</button></div>`;
  }

  function syncEpochNav(){
    const nav=existing('.visual-epoch-nav');
    if(!nav)return;
    let cue=nav.querySelector('.visual-epoch-cue');
    if(!cue){
      cue=document.createElement('div');
      cue.className='visual-epoch-cue';
      cue.setAttribute('role','note');
      nav.prepend(cue);
    }
    const buttons=epochButtons();
    buttons.forEach(button=>button.classList.remove('next-step','needs-review'));
    const current=buttons.find(button=>button.getAttribute('aria-current')==='true'||button.classList.contains('current'));
    if(current&&retryRequired())current.classList.add('needs-review');
    buttons.forEach((button,index)=>{
      const complete=button.classList.contains('complete')&&!button.classList.contains('needs-review');
      button.title=complete?`Epoch ${index+1} complete — click to review`:`Open Epoch ${index+1}`;
      button.setAttribute('aria-label',complete?`Epoch ${index+1}, complete, click to review`:`Open Epoch ${index+1}`);
    });
    if(retryRequired()){
      cue.innerHTML='<strong>Stay on this epoch</strong><span>Review and answer correctly before moving on.</span>';
      return;
    }
    if(current&&current.classList.contains('complete')){
      const currentIndex=buttons.indexOf(current);
      const next=buttons.slice(currentIndex+1).find(button=>!button.classList.contains('complete'))||buttons.find(button=>!button.classList.contains('complete'));
      if(next&&next!==current)next.classList.add('next-step');
      cue.innerHTML=next?'<strong>Choose the next epoch</strong><span>Completed epochs are green. Tap the highlighted epoch to continue.</span>':'<strong>All epochs reviewed</strong><span>You can tap any green epoch to review it again.</span>';
    }else{
      cue.innerHTML='<strong>Epoch navigator</strong><span>Tap any epoch tab to open it. Completed epochs turn green with a checkmark.</span>';
    }
  }

  function removeConfirmation(){
    workspace.querySelectorAll('[data-visual-submit-confirmation]').forEach(node=>node.remove());
  }

  function showConfirmation(){
    if(workspace.hidden||existing('[data-visual-submit-confirmation]')||existing('.visual-outcome-backdrop'))return;
    if(!existing('[data-visual-check]')||!hasSelection())return;
    const layer=document.createElement('div');
    layer.className='visual-submit-backdrop';
    layer.dataset.visualSubmitConfirmation='true';
    layer.innerHTML='<section class="visual-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="visual-submit-title"><div class="visual-submit-icon" aria-hidden="true">?</div><div><div class="eyebrow">Confirm answer</div><h2 id="visual-submit-title">Are you sure?</h2><p>Submit this answer for grading? You can go back and change your selection before submitting.</p><div class="visual-submit-actions"><button class="btn primary" type="button" data-visual-confirm-submit>Submit answer</button><button class="btn secondary" type="button" data-visual-confirm-cancel>Change answer</button></div></div></section>';
    workspace.appendChild(layer);
  }

  function syncFooterCue(){
    const check=existing('.visual-modal-footer [data-visual-modal-action="check"]');
    if(check)check.hidden=true;
    const cue=existing('.visual-modal-next-cue strong');
    if(cue&&existing('[data-visual-check]'))cue.textContent='Open Answer question in the upper-right to respond';
  }

  function railStep(label,state){
    return `<li class="${state}"><span aria-hidden="true"></span><strong>${label}</strong></li>`;
  }

  function syncDesktopTaskRail(){
    if(!isDesktop()||existing('.visual-result'))return;
    const card=existing('.visual-question-card');
    if(!card)return;
    let rail=card.querySelector('[data-visual-workstation-rail]');
    if(!rail){
      rail=document.createElement('section');
      rail.className='visual-workstation-task-rail';
      rail.dataset.visualWorkstationRail='true';
      rail.setAttribute('aria-label','PSG scoring workflow');
      card.prepend(rail);
    }
    const index=currentEpochIndex();
    const progress=currentProgress()||{done:0,total:1};
    const stage=currentStage();
    const type=currentTaskType();
    const currentButton=epochButtons()[index];
    const epochComplete=Boolean(currentButton?.classList.contains('complete')&&!currentButton.classList.contains('needs-review'));
    const stageState=stage?'complete':type==='stage'?'current':'upcoming';
    const evidenceState=type==='evidence'?'current':progress.done>1||epochComplete?'complete':'upcoming';
    const markState=type==='mark'?'current':epochComplete&&progress.total>=3?'complete':'optional';
    const reviewState=epochComplete?'current':'upcoming';
    const step=Math.min(progress.total,Math.max(1,progress.done+(epochComplete?0:1)));
    rail.innerHTML=`<div class="visual-workstation-rail-head"><small>Epoch ${index+1} of ${epochButtons().length} · Step ${step} of ${progress.total}</small><strong>${currentTaskLabel()}</strong><span>${stage?`Stage ${stage} revealed after your scoring decision`:'Stage label stays hidden until you commit the stage'}</span></div><ol class="visual-workstation-steps">${railStep('Stage',stageState)}${railStep('Prove it',evidenceState)}${railStep('Mark / measure',markState)}${railStep('Review',reviewState)}</ol><div class="visual-workstation-tool-buttons"><button class="btn secondary" type="button" data-visual-desktop-hint>${desktopHintOpen?'Hide hint':'Hint'}</button><button class="btn secondary" type="button" data-visual-desktop-tools>${desktopToolsOpen?'Hide EEG tools':'EEG tools'}</button></div>${desktopHintOpen?`<div class="visual-workstation-hint" role="note"><strong>Hint</strong><span>${hintText()}</span></div>`:''}${desktopToolsOpen?'<div class="visual-workstation-eeg-tools" role="note"><strong>EEG frequency anchors</strong><div><span>Slow wave</span><b>0.5–2 Hz</b></div><div><span>Theta / sleep LAMF</span><b>4–7 Hz</b></div><div><span>Alpha</span><b>8–13 Hz</b></div><div><span>Sleep spindle</span><b>11–16 Hz</b></div><div><span>Sawtooth</span><b>2–6 Hz</b></div><small>Use the one-second grid to count cycles; always interpret frequency with morphology and full PSG context.</small></div>':''}`;
  }

  function syncDesktopFooter(){
    if(!isDesktop()||existing('.visual-result'))return;
    const footer=existing('.visual-modal-footer');
    if(!footer)return;
    footer.classList.add('visual-workstation-footer');
    const progress=currentProgress()||{done:0,total:1};
    const index=currentEpochIndex();
    const previous=Boolean(existing('[data-visual-prev]'))&&!retryRequired();
    let primaryAction='submit';
    let primaryLabel='Submit answer';
    let primaryEnabled=Boolean(existing('[data-visual-check]')&&hasSelection());
    if(existing('[data-visual-next]')){primaryAction='next';primaryLabel='Next →';primaryEnabled=true;}
    if(existing('[data-visual-finish]')){primaryAction='finish';primaryLabel='Save Pack 1 attempt';primaryEnabled=true;}
    footer.innerHTML=`<div class="visual-workstation-footer-left"><button class="btn secondary" type="button" data-visual-desktop-action="prev" ${previous?'':'disabled'}>← Previous</button></div><div class="visual-workstation-footer-progress"><small>Epoch ${index+1} of ${epochButtons().length}</small><strong>${currentTaskLabel()} · ${progress.done}/${progress.total} complete</strong></div><div class="visual-workstation-footer-right"><button class="btn secondary" type="button" data-visual-desktop-hint>${desktopHintOpen?'Hide hint':'Hint'}</button><button class="btn primary" type="button" data-visual-desktop-action="${primaryAction}" ${primaryEnabled?'':'disabled'}>${primaryLabel}</button></div>`;
  }

  function enhanceDesktopOutcome(){
    if(!isDesktop())return;
    const dialog=existing('.visual-outcome-dialog.correct');
    const index=currentEpochIndex();
    const button=epochButtons()[index];
    if(!dialog||!button?.classList.contains('complete')||dialog.querySelector('[data-visual-workstation-recap]'))return;
    const title=dialog.querySelector('h2');
    const paragraph=title?.nextElementSibling;
    if(title)title.textContent=`Epoch ${index+1} complete — review the evidence`;
    if(paragraph&&paragraph.tagName==='P')paragraph.textContent='You completed the required visual tasks for this teaching epoch. Review the pattern, then continue without leaving the PSG workstation.';
    const recap=document.createElement('div');
    recap.className='visual-workstation-recap';
    recap.dataset.visualWorkstationRecap='true';
    const points=DESKTOP_RECAPS[index]||[];
    recap.innerHTML=`<strong>${currentStage()?`Stage ${currentStage()}`:'Teaching epoch'} recap</strong><ul>${points.map(point=>`<li>${point}</li>`).join('')}</ul>`;
    const actions=dialog.querySelector('.visual-outcome-actions');
    if(actions)dialog.querySelector('div>div')?.insertBefore(recap,actions);
    const next=dialog.querySelector('[data-visual-outcome-action="next"]');
    if(next)next.textContent=index<epochButtons().length-1?`Continue to Epoch ${index+2} →`:'Finish Pack 1';
  }

  function syncDesktopWorkstation(){
    if(!isDesktop()){
      workspace.classList.remove('visual-desktop-workstation');
      return;
    }
    workspace.classList.add('visual-desktop-workstation');
    existing('[data-visual-question-toolbar]')?.remove();
    const fullEpoch=existing('[data-visual-full-epoch]');
    if(fullEpoch)fullEpoch.textContent=workspace.classList.contains('visual-epoch-fullscreen')?'Split view':'PSG only';
    syncDesktopTaskRail();
    syncDesktopFooter();
    enhanceDesktopOutcome();
  }

  function syncChrome(){
    if(workspace.hidden){
      removeConfirmation();
      closeQuestion(false);
      workspace.classList.remove('visual-desktop-workstation');
      return;
    }
    syncEpochNav();
    ensureStatusPanel();
    ensureViewerFullscreenControl();
    if(isDesktop())syncDesktopWorkstation();
    else{
      syncFooterCue();
      if(workspace.classList.contains('visual-question-open'))ensureQuestionToolbar();
    }
  }

  if(startButton)startButton.addEventListener('click',scheduleSync);

  workspace.addEventListener('pointerdown',captureViewport,true);

  document.addEventListener('click',event=>{
    const desktopHint=event.target.closest('[data-visual-desktop-hint]');
    if(desktopHint&&isDesktop()){
      desktopHintOpen=!desktopHintOpen;
      syncDesktopWorkstation();
      return;
    }
    const desktopTools=event.target.closest('[data-visual-desktop-tools]');
    if(desktopTools&&isDesktop()){
      desktopToolsOpen=!desktopToolsOpen;
      syncDesktopWorkstation();
      return;
    }
    const desktopAction=event.target.closest('[data-visual-desktop-action]');
    if(desktopAction&&isDesktop()&&!desktopAction.disabled){
      const action=desktopAction.dataset.visualDesktopAction;
      if(action==='prev')existing('[data-visual-prev]')?.click();
      if(action==='submit')showConfirmation();
      if(action==='next')existing('[data-visual-next]')?.click();
      if(action==='finish')existing('[data-visual-finish]')?.click();
      scheduleSync();
      return;
    }
    if(event.target.closest('[data-visual-open-question]')){
      openQuestion();
      return;
    }
    if(event.target.closest('[data-visual-question-layout]')){
      workspace.classList.toggle('visual-split-view');
      ensureQuestionToolbar();
      return;
    }
    if(event.target.closest('[data-visual-question-close]')){
      closeQuestion();
      return;
    }
    if(event.target.closest('[data-visual-question-prev]')){
      const previous=existing('[data-visual-prev]');
      if(!previous)return;
      closeQuestion(false);
      previous.click();
      scheduleSync();
      return;
    }
    if(event.target.closest('[data-visual-confirm-submit]')){
      const submit=existing('[data-visual-check]');
      closeQuestion(false);
      removeConfirmation();
      if(submit)submit.click();
      scheduleSync();
      return;
    }
    if(event.target.closest('[data-visual-confirm-cancel]')){
      removeConfirmation();
      scheduleSync();
      return;
    }
    if(event.target.closest('[data-visual-answer],[data-visual-region],[data-visual-point-surface]')){
      setTimeout(()=>{
        syncChrome();
        if(!isDesktop())showConfirmation();
      },0);
      return;
    }
    if(event.target.closest('[data-visual-epoch],[data-visual-prev],[data-visual-next],[data-visual-finish],[data-visual-restart],[data-visual-close],[data-visual-outcome-action],[data-visual-modal-action],[data-visual-full-epoch]')){
      closeQuestion(false);
      scheduleSync();
    }
  });

  document.addEventListener('pointerup',event=>{
    if(event.target.closest('[data-visual-interval-surface]'))setTimeout(()=>{
      syncChrome();
      if(!isDesktop())showConfirmation();
    },0);
  });

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(existing('[data-visual-submit-confirmation]')){
      event.stopImmediatePropagation();
      removeConfirmation();
      scheduleSync();
      return;
    }
    if(!isDesktop()&&workspace.classList.contains('visual-question-open')){
      event.stopImmediatePropagation();
      closeQuestion();
    }
  },true);

  window.matchMedia('(min-width:901px)').addEventListener?.('change',scheduleSync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncChrome);else syncChrome();
})();
