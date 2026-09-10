/* Sleep Pathways Guild — RPSGT V3 focus-flow presentation helpers.
   Keeps existing learning/scoring engines intact while improving modal focus and next-step visibility. */
(function(){
  'use strict';
  const doc=document;
  const reducedMotion=()=>Boolean(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let routeOverlay=null;
  let feedbackWasVisible=false;

  function isVisible(node){
    return Boolean(node&&!node.hidden&&!node.classList.contains('hidden'));
  }

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
      window.requestAnimationFrame(()=>{
        feedback.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'nearest'});
      });
    }
    feedbackWasVisible=feedbackVisible;
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
      const review=document.createElement('button');
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
    if(routeOverlay&&event.target===routeOverlay){
      removeRouteOverlay();
      return;
    }
    if(event.target.closest('[data-checkpoint-retake],[data-checkpoint-continue],[data-checkpoint-return-map],[data-checkpoint-cancel]')){
      window.setTimeout(removeRouteOverlay,0);
    }
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
