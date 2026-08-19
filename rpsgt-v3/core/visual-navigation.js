(function(){
  'use strict';
  const workspace=document.querySelector('[data-visual-workspace]');
  if(!workspace)return;

  const text=value=>String(value==null?'':value).trim();
  const existing=selector=>workspace.querySelector(selector);
  function epochButtons(){return [...workspace.querySelectorAll('[data-visual-epoch]')];}
  function currentEpochIndex(){return epochButtons().findIndex(button=>button.classList.contains('current')||button.getAttribute('aria-current')==='true');}
  function currentEpochLabel(){const index=currentEpochIndex();return index>=0?`Epoch ${index+1}`:'current epoch';}
  function currentProgress(){
    const buttons=epochButtons(),index=currentEpochIndex();
    if(index<0)return null;
    const small=buttons[index].querySelector('small');
    const match=text(small&&small.textContent).match(/(\d+)\s*\/\s*(\d+)/);
    return match?{done:Number(match[1]),total:Number(match[2])}:null;
  }
  function suggestion(){
    if(existing('[data-visual-finish]'))return 'Save this Pack 1 attempt';
    if(existing('[data-visual-check]'))return `Check this ${currentEpochLabel()} answer`;
    const progress=currentProgress(),buttons=epochButtons(),index=currentEpochIndex();
    if(existing('[data-visual-next]')){
      if(progress&&progress.done<progress.total)return `Next visual in ${currentEpochLabel()}`;
      if(index>=0&&index<buttons.length-1)return `Continue to Epoch ${index+2}`;
      return 'Continue to the next visual';
    }
    return '';
  }
  function clickExisting(selector){const target=existing(selector);if(target)target.click();}
  function button(label,action,enabled,primary){
    return `<button class="btn ${primary?'primary':'secondary'}" type="button" data-visual-modal-action="${action}" ${enabled?'':'disabled'}>${label}</button>`;
  }
  function ensureChrome(){
    if(!workspace.querySelector('.visual-modal-rotate')){
      workspace.insertAdjacentHTML('afterbegin','<div class="visual-modal-rotate" role="status"><div class="visual-modal-rotate-icon" aria-hidden="true">↻</div><strong>Rotate your phone sideways</strong><span>The Visual Skills viewer uses landscape mode so the waveform and question controls fit together.</span></div>');
    }
    if(!workspace.querySelector('[data-visual-modal-close]')){
      workspace.insertAdjacentHTML('afterbegin','<button class="visual-modal-close" type="button" data-visual-modal-close aria-label="Close Visual Skills viewer">×</button>');
    }
  }
  function renderFooter(){
    workspace.querySelectorAll('.visual-modal-footer').forEach(node=>node.remove());
    const card=existing('.visual-question-card');
    if(!card)return;
    const buttons=epochButtons(),epochIndex=currentEpochIndex();
    const hasPrev=Boolean(existing('[data-visual-prev]'));
    const hasCheck=Boolean(existing('[data-visual-check]'));
    const hasNext=Boolean(existing('[data-visual-next]'));
    const hasFinish=Boolean(existing('[data-visual-finish]'));
    const footer=document.createElement('footer');
    footer.className='visual-modal-footer';
    footer.setAttribute('aria-label','Visual question navigation');
    const primaryLabel=hasCheck?'Check answer':hasFinish?'Save Pack 1 attempt':'Next visual →';
    const primaryAction=hasCheck?'check':hasFinish?'finish':'next';
    const primaryEnabled=hasCheck||hasFinish||hasNext;
    footer.innerHTML=`<div class="visual-modal-footer-left">${button('← Previous visual','prev',hasPrev,false)}${button('← Previous epoch','prev-epoch',epochIndex>0,false)}</div><div class="visual-modal-next-cue"><small>Suggested next action</small><strong>${text(suggestion())}</strong></div><div class="visual-modal-footer-right">${button('Next epoch →','next-epoch',epochIndex>=0&&epochIndex<buttons.length-1,false)}${button(primaryLabel,primaryAction,primaryEnabled,true)}</div>`;
    workspace.appendChild(footer);
  }
  function renderResultNext(){
    const result=existing('.visual-result');
    if(!result)return false;
    if(!result.querySelector('.visual-result-next')){
      const panel=document.createElement('div');
      panel.className='visual-result-next';
      panel.innerHTML='<div class="eyebrow">Suggested next visual practice</div><h3>Keep moving from recognition to scoring context</h3><p>Choose the next visual skill without returning to the catalog.</p><div class="actions"><a class="btn primary" href="lab-scoring.html">Continue to Scoring Lab visuals</a><a class="btn secondary" href="lab-artifact.html">Practice Artifact Recognition</a><a class="btn secondary" href="lab-respiratory.html">Practice Respiratory visuals</a></div>';
      result.appendChild(panel);
    }
    return true;
  }
  function activate(){
    if(workspace.hidden){
      document.body.classList.remove('visual-modal-open');
      workspace.classList.remove('visual-modal-active');
      workspace.removeAttribute('role');workspace.removeAttribute('aria-modal');
      return;
    }
    document.body.classList.add('visual-modal-open');
    workspace.classList.add('visual-modal-active');
    workspace.setAttribute('role','dialog');workspace.setAttribute('aria-modal','true');workspace.setAttribute('aria-label','Visual Skills viewer');
    ensureChrome();
    workspace.querySelectorAll('.visual-flow-nav,.visual-up-next').forEach(node=>node.remove());
    if(renderResultNext())return;
    renderFooter();
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-visual-modal-close]')){clickExisting('[data-visual-close]');return;}
    const control=event.target.closest('[data-visual-modal-action]');
    if(!control||control.disabled)return;
    const action=control.dataset.visualModalAction;
    if(action==='prev'){clickExisting('[data-visual-prev]');return;}
    if(action==='check'){clickExisting('[data-visual-check]');return;}
    if(action==='next'){clickExisting('[data-visual-next]');return;}
    if(action==='finish'){clickExisting('[data-visual-finish]');return;}
    const buttons=epochButtons(),index=currentEpochIndex();
    if(action==='prev-epoch'&&index>0){buttons[index-1].click();return;}
    if(action==='next-epoch'&&index>=0&&index<buttons.length-1)buttons[index+1].click();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!workspace.hidden)clickExisting('[data-visual-close]');
  });
  const observer=new MutationObserver(()=>queueMicrotask(activate));
  observer.observe(workspace,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','aria-current']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate);else activate();
})();
