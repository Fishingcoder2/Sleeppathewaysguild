(function(){
  'use strict';
  const workspace=document.querySelector('[data-visual-workspace]');
  const startButton=document.querySelector('[data-visual-start]');
  if(!workspace)return;

  const existing=selector=>workspace.querySelector(selector);
  const epochButtons=()=>[...workspace.querySelectorAll('[data-visual-epoch]')];
  const scheduleSync=()=>setTimeout(syncChrome,0);

  function hasSelection(){
    return Boolean(existing('.visual-choice.selected,.visual-region-button.selected,.visual-point-marker.selected,.visual-interval-selection'));
  }

  function retryRequired(){
    return Boolean(existing('.visual-retry-notice,.visual-outcome-dialog.incorrect'));
  }

  function outcomeCorrect(){
    return Boolean(existing('.visual-outcome-dialog.correct'));
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
    panel.innerHTML=`<span><small>Epoch</small><strong>${epochHeading.replace(/^Epoch\s+/i,'')}</strong></span><span><small>Question</small><strong>${question}</strong></span><span><small>Completed</small><strong>${completed}/5 epochs</strong></span><span class="${retryRequired()?'retry':outcomeCorrect()?'correct':''}"><small>Status</small><strong>${stateLabel}</strong></span>`;
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
    if(cue&&existing('[data-visual-check]'))cue.textContent=hasSelection()?'Answer selected — confirm submission':'Choose an answer to submit';
  }

  function syncChrome(){
    if(workspace.hidden){removeConfirmation();return;}
    syncEpochNav();
    ensureStatusPanel();
    syncFooterCue();
  }

  if(startButton)startButton.addEventListener('click',scheduleSync);

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-visual-confirm-submit]')){
      const submit=existing('[data-visual-check]');
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
      setTimeout(()=>{syncChrome();showConfirmation();},0);
      return;
    }
    if(event.target.closest('[data-visual-epoch],[data-visual-prev],[data-visual-next],[data-visual-finish],[data-visual-restart],[data-visual-close],[data-visual-outcome-action],[data-visual-modal-action]'))scheduleSync();
  });

  document.addEventListener('pointerup',event=>{
    if(event.target.closest('[data-visual-interval-surface]'))setTimeout(()=>{syncChrome();showConfirmation();},0);
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&existing('[data-visual-submit-confirmation]')){
      event.stopImmediatePropagation();
      removeConfirmation();
      scheduleSync();
    }
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncChrome);else syncChrome();
})();