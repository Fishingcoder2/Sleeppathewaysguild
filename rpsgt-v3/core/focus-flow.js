/* Sleep Pathways Guild — RPSGT V3 focus-flow presentation helpers.
   Keeps existing learning/scoring engines intact while improving modal focus and next-step visibility. */
(function(){
  'use strict';
  const doc=document;
  const reducedMotion=()=>Boolean(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let routeOverlay=null;
  let feedbackWasVisible=false;

  function isVisible(node){return Boolean(node&&!node.hidden&&!node.classList.contains('hidden'));}

  function syncPracticeFocus(){
    const shell=doc.querySelector('[data-practice-shell]');
    if(!shell) return;
    const open=isVisible(shell);
    const complete=shell.querySelector('[data-session-complete]');
    shell.classList.toggle('is-complete',open&&isVisible(complete));
    doc.body.classList.toggle('practice-focus-open',open);

    const feedback=shell.querySelector('[data-answer-feedback]');
    const feedbackVisible=open&&isVisible(feedback)&&String(feedback.textContent||'').trim().length>0;
    if(feedbackVisible&&!feedbackWasVisible){
      window.requestAnimationFrame(()=>feedback.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'nearest'}));
    }
    feedbackWasVisible=feedbackVisible;
  }

  function explorerUnlocks(){
    const explorer=window.RPSGTGuidedTrailExplorer;
    if(!explorer||typeof explorer.progress!=='function') return [];
    try{
      const p=explorer.progress();
      const latest=Array.isArray(p.history)?p.history[0]:null;
      if(!latest||!latest.passed) return [];
      const prior=Array.isArray(p.history)?p.history.slice(1):[];
      const taskAward=p.taskAwards&&p.taskAwards[latest.task];
      const newlyEarnedTask=Boolean(taskAward&&taskAward.checkpointId===latest.id);
      const unlocks=[];
      if(newlyEarnedTask&&p.rank&&Number(p.rank.minimum)===Number(p.taskBadgeCount)&&Number(p.rank.minimum)>0){
        unlocks.push({icon:p.rank.icon||'★',name:'New Explorer level: '+p.rank.name,detail:p.rank.upgrade?'Field-kit upgrade: '+p.rank.upgrade:''});
      }
      if(prior.filter(item=>Number(item&&item.total)>=15).length===0) unlocks.push({icon:'🎗️',name:'Trailhead Ribbon',detail:'First full Guided Trail checkpoint completed.'});
      if(newlyEarnedTask&&Number(p.taskBadgeCount)===1) unlocks.push({icon:'🌙',name:'Night Navigator Ribbon',detail:'First task badge earned.'});
      if(newlyEarnedTask&&prior.some(item=>item&&item.task===latest.task&&!item.passed)) unlocks.push({icon:'↗️',name:'Comeback Ribbon',detail:'You returned to this task and earned the badge.'});
      if(Number(latest.score)===100&&!prior.some(item=>Number(item&&item.total)>=15&&Number(item.score)===100)) unlocks.push({icon:'✨',name:'Perfect Signal Ribbon',detail:'First perfect full checkpoint.'});
      if(newlyEarnedTask&&Number(p.taskBadgeCount)===12) unlocks.push({icon:'🏕️',name:'Full Expedition Ribbon',detail:'All 12 Guided Trail task badges earned.'});
      return unlocks.slice(0,4);
    }catch(error){return [];}
  }

  function decorateAwardCeremony(){
    const overlay=doc.querySelector('[data-guided-award-ceremony]');
    if(!overlay||overlay.hidden) return;
    const dialog=overlay.querySelector('.guided-award-dialog');
    if(!dialog||dialog.dataset.focusFlowDecorated==='true') return;
    dialog.dataset.focusFlowDecorated='true';
    const unlocks=explorerUnlocks();
    if(!unlocks.length) return;
    const panel=doc.createElement('section');
    panel.className='guided-explorer-unlocks';
    panel.setAttribute('aria-label','Explorer level and ribbon upgrades');
    panel.innerHTML='<strong>Explorer progress unlocked</strong>'+unlocks.map(item=>'<div><span aria-hidden="true">'+item.icon+'</span><p><b>'+item.name+'</b><small>'+item.detail+'</small></p></div>').join('');
    const next=dialog.querySelector('.guided-award-next');
    if(next) next.insertAdjacentElement('beforebegin',panel); else dialog.appendChild(panel);
  }

  function removeRouteOverlay(){
    if(routeOverlay&&routeOverlay.isConnected) routeOverlay.remove();
    routeOverlay=null;
    doc.body.classList.remove('guided-route-open');
  }

  function awardCeremonyOpen(){
    const award=doc.querySelector('[data-guided-award-ceremony]');
    return Boolean(award&&!award.hidden);
  }

  function promoteCheckpointRoute(){
    const checkpointOverlay=doc.querySelector('[data-checkpoint-overlay]');
    const checkpointHost=doc.querySelector('[data-checkpoint-workspace]');
    if(!checkpointOverlay||!checkpointHost||checkpointOverlay.hidden){removeRouteOverlay();return;}
    if(awardCeremonyOpen()) return;
    const source=checkpointHost.querySelector('[data-checkpoint-routes]');
    if(!source){removeRouteOverlay();return;}
    if(routeOverlay&&routeOverlay.isConnected) return;

    source.classList.add('route-source-hidden');
    source.setAttribute('aria-hidden','true');

    const copy=source.cloneNode(true);
    copy.classList.remove('route-source-hidden');
    copy.removeAttribute('aria-hidden');
    copy.dataset.checkpointRoutesOverlay='true';
    copy.removeAttribute('data-checkpoint-routes');
    copy.tabIndex=-1;

    const heading=copy.querySelector('h3');
    if(heading) heading.textContent='What do you want to do next?';

    const actions=copy.querySelector('.checkpoint-route-actions');
    if(actions){
      const continueButton=actions.querySelector('[data-checkpoint-continue]');
      const retakeButton=actions.querySelector('[data-checkpoint-retake]');
      if(continueButton){
        continueButton.classList.remove('secondary');
        continueButton.classList.add('primary');
      }else if(retakeButton){
        retakeButton.classList.remove('secondary');
        retakeButton.classList.add('primary');
      }
      const review=doc.createElement('button');
      review.type='button';
      review.className='btn secondary';
      review.dataset.guidedRouteDismiss='true';
      review.textContent='Review my answers';
      actions.appendChild(review);
    }

    routeOverlay=doc.createElement('div');
    routeOverlay.className='guided-route-overlay';
    routeOverlay.dataset.guidedRouteOverlay='true';
    routeOverlay.appendChild(copy);
    doc.body.appendChild(routeOverlay);
    doc.body.classList.add('guided-route-open');
    window.requestAnimationFrame(()=>copy.focus({preventScroll:true}));
  }

  function scheduleSync(){
    window.requestAnimationFrame(()=>{
      syncPracticeFocus();
      decorateAwardCeremony();
      promoteCheckpointRoute();
    });
  }

  doc.addEventListener('click',event=>{
    if(event.target.closest('[data-guided-route-dismiss]')){
      event.preventDefault();
      removeRouteOverlay();
      const checkpoint=doc.querySelector('[data-checkpoint-workspace]');
      if(checkpoint) checkpoint.focus({preventScroll:true});
      return;
    }
    if(routeOverlay&&event.target===routeOverlay){removeRouteOverlay();return;}
    if(event.target.closest('[data-checkpoint-retake],[data-checkpoint-continue],[data-checkpoint-return-map],[data-checkpoint-cancel]')) window.setTimeout(removeRouteOverlay,0);
  });

  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&routeOverlay){
      event.preventDefault();
      removeRouteOverlay();
      const checkpoint=doc.querySelector('[data-checkpoint-workspace]');
      if(checkpoint) checkpoint.focus({preventScroll:true});
    }
  });

  const observer=new MutationObserver(scheduleSync);
  observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',scheduleSync,{once:true});
  else scheduleSync();
})();
