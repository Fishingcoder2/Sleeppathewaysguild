(function(){
  'use strict';
  const workspace=document.querySelector('[data-visual-workspace]');
  if(!workspace)return;

  const text=value=>String(value==null?'':value).trim();
  function epochButtons(){return [...workspace.querySelectorAll('[data-visual-epoch]')];}
  function currentEpochIndex(){return epochButtons().findIndex(button=>button.classList.contains('current')||button.getAttribute('aria-current')==='true');}
  function currentEpochLabel(){const buttons=epochButtons(),index=currentEpochIndex();return index>=0?`Epoch ${index+1}`:'this epoch';}
  function currentProgress(){
    const buttons=epochButtons(),index=currentEpochIndex();
    if(index<0)return null;
    const small=buttons[index].querySelector('small');
    const match=text(small&&small.textContent).match(/(\d+)\s*\/\s*(\d+)/);
    return match?{done:Number(match[1]),total:Number(match[2])}:null;
  }
  function nextSuggestion(){
    const buttons=epochButtons(),index=currentEpochIndex(),progress=currentProgress();
    if(workspace.querySelector('[data-visual-finish]'))return {title:'Up next: save this Pack 1 attempt',body:'You have reached the last visual item. Save the attempt, then choose the next visual practice area.'};
    if(!workspace.querySelector('[data-visual-next]'))return null;
    if(progress&&progress.done<progress.total)return {title:`Up next: another visual in ${currentEpochLabel()}`,body:'Stay with this 30-second tracing and inspect the next requested stage or waveform feature.'};
    if(index>=0&&index<buttons.length-1)return {title:`Up next: Epoch ${index+2}`,body:'This epoch is reviewed. Continue to the next 30-second tracing and apply the same evidence-first approach.'};
    return {title:'Up next: the next visual item',body:'Continue to the next waveform task in Sleep Staging Pack 1.'};
  }
  function button(label,action,enabled,primary){
    return `<button class="btn ${primary?'primary':'secondary'}" type="button" data-visual-flow-action="${action}" ${enabled?'':'disabled'}>${label}</button>`;
  }
  function renderActive(){
    const card=workspace.querySelector('.visual-question-card');
    if(!card)return;
    const buttons=epochButtons(),epochIndex=currentEpochIndex(),hasPrev=Boolean(workspace.querySelector('[data-visual-prev]')),hasNext=Boolean(workspace.querySelector('[data-visual-next]')),hasFinish=Boolean(workspace.querySelector('[data-visual-finish]'));
    const counter=text(workspace.querySelector('.visual-counter')&&workspace.querySelector('.visual-counter').textContent);
    const snapshot=['active',counter,hasPrev,hasNext,hasFinish,epochIndex,currentProgress()&&currentProgress().done].join('|');
    if(workspace.dataset.visualFlowSnapshot===snapshot)return;
    workspace.dataset.visualFlowSnapshot=snapshot;
    workspace.querySelectorAll('.visual-flow-nav,.visual-up-next').forEach(node=>node.remove());

    const nav=document.createElement('nav');
    nav.className='visual-flow-nav';
    nav.setAttribute('aria-label','Visual item navigation');
    nav.innerHTML=`<div class="visual-flow-main">${button('← Previous visual','prev',hasPrev,false)}${button(hasFinish?'Save Pack 1 attempt':'Next visual →',hasFinish?'finish':'next',hasNext||hasFinish,hasNext||hasFinish)}</div><div class="visual-flow-epochs">${button('← Previous epoch','prev-epoch',epochIndex>0,false)}${button('Next epoch →','next-epoch',epochIndex>=0&&epochIndex<buttons.length-1,false)}</div>`;
    card.parentNode.insertBefore(nav,card);

    const suggestion=nextSuggestion();
    const actionArea=card.querySelector('.visual-question-actions');
    if(suggestion&&actionArea){
      const panel=document.createElement('div');
      panel.className='visual-up-next';
      panel.innerHTML=`<strong>${suggestion.title}</strong><span>${suggestion.body}</span>`;
      card.insertBefore(panel,actionArea);
    }
  }
  function renderFinished(){
    const result=workspace.querySelector('.visual-result');
    if(!result)return false;
    const snapshot='finished|'+text(result.querySelector('h2')&&result.querySelector('h2').textContent);
    if(workspace.dataset.visualFlowSnapshot===snapshot)return true;
    workspace.dataset.visualFlowSnapshot=snapshot;
    workspace.querySelectorAll('.visual-flow-nav,.visual-up-next,.visual-result-next').forEach(node=>node.remove());
    const panel=document.createElement('div');
    panel.className='visual-result-next';
    panel.innerHTML='<div class="eyebrow">Suggested next visual practice</div><h3>Keep moving from recognition to scoring context</h3><p>Choose the next visual skill instead of returning to the catalog and searching for it.</p><div class="actions"><a class="btn primary" href="lab-scoring.html">Continue to Scoring Lab visuals</a><a class="btn secondary" href="lab-artifact.html">Practice Artifact Recognition</a><a class="btn secondary" href="lab-respiratory.html">Practice Respiratory visuals</a></div>';
    result.appendChild(panel);
    return true;
  }
  function enhance(){
    if(workspace.hidden)return;
    if(renderFinished())return;
    renderActive();
  }
  function clickExisting(selector){const target=workspace.querySelector(selector);if(target)target.click();}
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-visual-flow-action]');
    if(!control||control.disabled)return;
    const action=control.dataset.visualFlowAction;
    if(action==='prev'){clickExisting('[data-visual-prev]');return;}
    if(action==='next'){clickExisting('[data-visual-next]');return;}
    if(action==='finish'){clickExisting('[data-visual-finish]');return;}
    const buttons=epochButtons(),index=currentEpochIndex();
    if(action==='prev-epoch'&&index>0){buttons[index-1].click();return;}
    if(action==='next-epoch'&&index>=0&&index<buttons.length-1)buttons[index+1].click();
  });
  const observer=new MutationObserver(()=>queueMicrotask(enhance));
  observer.observe(workspace,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','aria-current']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
