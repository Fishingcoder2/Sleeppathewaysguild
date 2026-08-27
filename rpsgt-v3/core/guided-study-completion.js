(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTGuidedStudyCompletion=api;
  if(root.document) api.mount(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='1.1.0';
  const DOMAIN_AWARD_NAMES={
    D1:'Clinical Guide',
    D2:'Study Signal Scout',
    D3:'Scoring Pathfinder',
    D4:'Therapy Trail Guide'
  };
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const text=value=>String(value==null?'':value).trim();
  const asArray=value=>Array.isArray(value)?value:[];
  const sameId=(left,right)=>String(left)===String(right);
  const uniqueIds=values=>[...new Map(asArray(values).filter(value=>value!==null&&value!==undefined&&text(value)).map(value=>[String(value),value])).values()];

  function updateMissedReview(saved,record){
    const next=clone(saved||{});
    next.review=next.review&&typeof next.review==='object'?next.review:{};
    next.guidedStudy=next.guidedStudy&&typeof next.guidedStudy==='object'?next.guidedStudy:{};
    const missed=asArray(record&&record.responses).filter(item=>item&&!item.correct).map(item=>item.id);
    next.review.missedIds=uniqueIds(asArray(next.review.missedIds).concat(missed));
    next.guidedStudy.lastCheckpointReview={
      taskCode:text(record&&record.task),
      completedAt:record&&record.completedAt||null,
      missedIds:uniqueIds(missed)
    };
    return next;
  }

  function awardCeremonies(saved,taskCode,before){
    const guided=saved&&saved.guidedStudy||{};
    const awards=guided.trailAwards||{};
    const tasks=awards.tasks||{};
    const domains=awards.domains||{};
    const code=text(taskCode);
    const domain=code.slice(0,2);
    const prior=before||{};
    const taskEarned=Boolean(code&&tasks[code]&&!prior.task);
    const domainEarned=Boolean(domain&&domains[domain]&&!prior.domain);
    const queue=[];
    if(taskEarned){
      queue.push({
        id:'guided-task:'+code,
        kind:'task',
        code,
        domain,
        domainEarned,
        earnedAt:tasks[code].earnedAt||null
      });
    }else if(domainEarned){
      queue.push({
        id:'guided-domain:'+domain,
        kind:'domain',
        code:domain,
        domain,
        domainEarned:true,
        earnedAt:domains[domain].earnedAt||null
      });
    }
    return queue;
  }

  function unseenCeremonies(saved,ceremonies){
    const seen=new Set(asArray(saved&&saved.awards&&saved.awards.seenCeremonyIds).map(String));
    return asArray(ceremonies).filter(item=>item&&item.id&&!seen.has(String(item.id))).map(clone);
  }

  function markCeremonySeen(saved,id){
    const next=clone(saved||{});
    next.awards=next.awards&&typeof next.awards==='object'?next.awards:{};
    next.awards.seenCeremonyIds=uniqueIds(asArray(next.awards.seenCeremonyIds).concat([id]));
    return next;
  }

  function nextTaskRoute(blueprint,taskCode){
    const tasks=(blueprint&&blueprint.domains||[]).flatMap(domain=>(domain.tasks||[]).map(task=>({
      code:text(task.code),
      title:text(task.title),
      domain:text(domain.id),
      domainName:text(domain.fullName)
    })));
    const index=tasks.findIndex(task=>task.code===text(taskCode));
    const current=index>=0?tasks[index]:null;
    const next=index>=0?tasks[index+1]||null:null;
    if(!next) return {current,next:null,label:'Return to Guided Study map',beginsDomain:false};
    const beginsDomain=Boolean(current&&next.domain!==current.domain);
    return {current,next,label:beginsDomain?'Begin the next domain':'Continue to the next task',beginsDomain};
  }

  function filterRetakeRecords(records,excludedIds,count){
    const excluded=new Set(asArray(excludedIds).map(String));
    return asArray(records).filter(record=>record&&!excluded.has(String(record.id)));
  }

  function mount(win){
    const doc=win.document;
    const storage=win.RPSGTStorage;
    const engine=win.RPSGTGuidedTrailEngine;
    const checkpointHost=doc.querySelector('[data-checkpoint-workspace]');
    const checkpointOverlay=doc.querySelector('[data-checkpoint-overlay]');
    const blueprintHost=doc.querySelector('[data-blueprint-map]');
    const trailHost=doc.querySelector('[data-guided-trail-dashboard]');
    if(!storage||!engine||!checkpointHost||!checkpointOverlay) return null;

    const legacyAchievement=doc.querySelector('[data-achievement-overlay]');
    if(legacyAchievement) legacyAchievement.remove();

    const state={
      taskCode:null,
      blueprint:null,
      awardsBeforeSubmit:null,
      latestHandledId:null,
      retakeExclusions:new Map(),
      ceremonyQueue:[],
      ceremonyOpen:false,
      recommendation:null,
      returnFocus:null,
      observer:null,
      mapObserver:null,
      scheduled:false,
      presentationScheduled:false
    };

    const originalSelect=engine.selectQuestions.bind(engine);
    engine.selectQuestions=function(records,taskCode,count,seed){
      const code=text(taskCode);
      const excluded=state.retakeExclusions.get(code)||[];
      if(excluded.length){
        state.retakeExclusions.delete(code);
        return originalSelect(filterRetakeRecords(records,excluded,count),taskCode,count,seed);
      }
      return originalSelect(records,taskCode,count,seed);
    };

    function loadJson(path){
      return win.fetch(path,{cache:'no-store'}).then(response=>{
        if(!response.ok) throw new Error(path+' HTTP '+response.status);
        return response.json();
      });
    }

    function latestRecord(saved){
      const history=asArray(saved&&saved.guidedStudy&&saved.guidedStudy.checkpointHistory);
      return history.find(item=>item&&item.task===state.taskCode)||history[0]||null;
    }

    function taskDetails(code){
      const route=nextTaskRoute(state.blueprint,code);
      return route.current||{code:text(code),title:'RPSGT task',domain:text(code).slice(0,2),domainName:'RPSGT domain'};
    }

    function domainDetails(domainCode){
      const domain=asArray(state.blueprint&&state.blueprint.domains).find(item=>text(item.id)===text(domainCode));
      return domain?{code:text(domain.id),title:text(domain.fullName),tasks:asArray(domain.tasks)}:{code:text(domainCode),title:'RPSGT domain',tasks:[]};
    }

    function closeCheckpoint(){
      const close=checkpointHost.querySelector('[data-checkpoint-cancel]');
      if(close) close.click();
    }

    function focusTask(code){
      const card=doc.getElementById(text(code));
      if(!card) return;
      card.scrollIntoView({behavior:win.matchMedia&&win.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      const focus=card.querySelector('[data-checkpoint-start],h3,button,a');
      if(focus){if(!focus.hasAttribute('tabindex')&&!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(focus.tagName)) focus.tabIndex=-1;focus.focus({preventScroll:true});}
    }

    function recommendationFor(item){
      let route=null;
      if(item.kind==='task') route=nextTaskRoute(state.blueprint,item.code);
      else{
        const domain=domainDetails(item.domain);
        const last=domain.tasks.length?domain.tasks[domain.tasks.length-1]:null;
        if(last) route=nextTaskRoute(state.blueprint,last.code);
      }
      if(route&&route.next){
        return {
          kind:'task',
          code:route.next.code,
          title:route.next.title,
          label:'Start '+route.next.code,
          copy:'Recommended next: '+route.next.code+' · '+route.next.title+'. Would you like to open this area now?'
        };
      }
      return {
        kind:'href',
        href:'readiness.html',
        title:'Readiness Check',
        label:'Start Readiness Check',
        copy:'You completed the Guided Study map. Recommended next: run a Readiness Check to find the strongest next study target. Would you like to start it now?'
      };
    }

    function ensureCeremonyShell(){
      let overlay=doc.querySelector('[data-guided-award-ceremony]');
      if(overlay) return overlay;
      overlay=doc.createElement('div');
      overlay.className='guided-award-overlay';
      overlay.dataset.guidedAwardCeremony='true';
      overlay.hidden=true;
      overlay.innerHTML='<section class="guided-award-dialog" role="dialog" aria-modal="true" aria-labelledby="guided-award-title" tabindex="-1"><button class="guided-award-close" type="button" data-guided-award-close aria-label="Close accomplishment celebration">×</button><div class="guided-award-medal" data-guided-award-symbol aria-hidden="true">✓</div><div class="eyebrow">Sleep Pathways Guild accomplishment</div><h2 id="guided-award-title" data-guided-award-title>Congratulations</h2><p class="guided-award-skill" data-guided-award-skill></p><div class="guided-award-domain-note" data-guided-award-domain hidden></div><aside class="guided-award-coach"><strong>Coach Bob</strong><p data-guided-award-coach></p></aside><section class="guided-award-next" aria-label="Recommended next activity"><strong>Recommended next</strong><p data-guided-award-next></p></section><div class="guided-award-actions"><button class="btn primary" type="button" data-guided-award-launch>Start next area</button><button class="btn secondary" type="button" data-guided-award-close>Not now</button><a class="btn secondary" href="reports.html#guided-trail-report">View accomplishments</a></div><p class="guided-award-boundary">Guild accomplishments are educational progress markers, not BRPT credentials or passing predictions.</p></section>';
      doc.body.appendChild(overlay);
      overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-guided-award-close]')) closeCeremony();});
      overlay.addEventListener('click',event=>{if(event.target.closest('[data-guided-award-launch]')) launchRecommendation();});
      return overlay;
    }

    function openNextCeremony(){
      if(state.ceremonyOpen||!state.ceremonyQueue.length) return;
      const item=state.ceremonyQueue.shift();
      let saved=storage.load();
      if(asArray(saved.awards&&saved.awards.seenCeremonyIds).some(id=>sameId(id,item.id))){openNextCeremony();return;}
      saved=markCeremonySeen(saved,item.id);
      storage.save(saved);
      const task=item.kind==='task'?taskDetails(item.code):null;
      const domain=domainDetails(item.domain);
      const guided=saved.guidedStudy||{};
      const taskAward=guided.trailAwards&&guided.trailAwards.tasks&&guided.trailAwards.tasks[item.code]||null;
      const overlay=ensureCeremonyShell();
      const title=overlay.querySelector('[data-guided-award-title]');
      const skill=overlay.querySelector('[data-guided-award-skill]');
      const coach=overlay.querySelector('[data-guided-award-coach]');
      const symbol=overlay.querySelector('[data-guided-award-symbol]');
      const domainNote=overlay.querySelector('[data-guided-award-domain]');
      const nextCopy=overlay.querySelector('[data-guided-award-next]');
      const launch=overlay.querySelector('[data-guided-award-launch]');
      overlay.dataset.guidedAwardKind=item.kind;
      domainNote.hidden=true;
      domainNote.textContent='';
      if(item.kind==='domain'){
        const awardName=DOMAIN_AWARD_NAMES[item.domain]||item.domain+' Trail Award';
        if(symbol) symbol.textContent='★';
        title.textContent='Congratulations — you completed '+domain.title;
        skill.textContent='Every Guided Study area in '+item.domain+' is complete.';
        domainNote.hidden=false;
        domainNote.innerHTML='<strong>'+awardName+' domain medal earned</strong><span>'+item.domain+' · '+domain.title+'</span>';
        coach.textContent='That is a full domain of work behind you. Take the win, then keep the same steady method for the next section.';
      }else{
        if(symbol) symbol.textContent='✓';
        title.textContent='Congratulations — you completed '+(task&&task.title||item.code);
        skill.textContent=item.code+' is now marked complete automatically'+(taskAward&&Number.isFinite(Number(taskAward.score))?' after a '+Number(taskAward.score)+'% checkpoint result.':'.');
        if(item.domainEarned){
          const awardName=DOMAIN_AWARD_NAMES[item.domain]||item.domain+' Trail Award';
          domainNote.hidden=false;
          domainNote.innerHTML='<strong>You also completed '+domain.title+'</strong><span>'+awardName+' domain medal earned.</span>';
        }
        coach.textContent='You do not need to check this off yourself. Your work earned the accomplishment, and your progress record now shows it.';
      }
      state.recommendation=recommendationFor(item);
      if(nextCopy) nextCopy.textContent=state.recommendation.copy;
      if(launch) launch.textContent=state.recommendation.label;
      state.returnFocus=doc.activeElement;
      state.ceremonyOpen=true;
      overlay.hidden=false;
      doc.body.classList.add('guided-award-open');
      win.requestAnimationFrame(()=>overlay.querySelector('[role="dialog"]')?.focus({preventScroll:true}));
    }

    function closeCeremony(options){
      const overlay=doc.querySelector('[data-guided-award-ceremony]');
      if(!overlay||overlay.hidden) return;
      const skipQueue=Boolean(options&&options.skipQueue);
      overlay.hidden=true;
      doc.body.classList.remove('guided-award-open');
      state.ceremonyOpen=false;
      state.recommendation=null;
      if(!skipQueue&&state.ceremonyQueue.length){openNextCeremony();return;}
      const target=checkpointHost.querySelector('[data-checkpoint-routes]')||state.returnFocus;
      if(target&&typeof target.focus==='function') target.focus({preventScroll:true});
      state.returnFocus=null;
    }

    function launchRecommendation(){
      const recommendation=state.recommendation&&clone(state.recommendation);
      if(!recommendation) return;
      state.ceremonyQueue=[];
      closeCeremony({skipQueue:true});
      closeCheckpoint();
      if(recommendation.kind==='task'){
        win.setTimeout(()=>focusTask(recommendation.code),0);
        return;
      }
      if(recommendation.href) win.location.href=recommendation.href;
    }

    function updatePresentation(){
      if(!state.blueprint) return;
      const saved=storage.load();
      const summary=engine.summary(saved&&saved.guidedStudy,state.blueprint);
      doc.querySelectorAll('[data-trail-mark]').forEach(button=>button.remove());
      summary.rows.forEach(row=>{
        const card=doc.getElementById(row.code);
        if(!card) return;
        const status=card.querySelector('.trail-status-row .status');
        if(status){
          status.textContent=row.award?'Area completed':row.latestCheckpoint?'In progress':'Not started';
          status.classList.toggle('green',Boolean(row.award));
        }
        const checkpoint=card.querySelector('[data-checkpoint-start]');
        if(checkpoint) checkpoint.textContent=row.award?'Review checkpoint':'Complete '+String(engine.BADGE_QUESTION_COUNT||15)+'-question checkpoint';
      });
      summary.domains.forEach(domain=>{
        const card=doc.querySelector('.domain-'+String(domain.id).toLowerCase());
        const small=card&&card.querySelector('.domain-map-head small');
        if(small) small.textContent=domain.taskAwards+'/'+domain.taskCount+' areas completed'+(domain.award?' · domain complete':'');
      });
      if(trailHost){
        const cells=Array.from(trailHost.querySelectorAll('.trail-summary-grid > div'));
        const values=[
          ['Areas completed',summary.counts.taskAwards+'/12'],
          ['Domains completed',summary.counts.domainAwards+'/4'],
          ['Checkpoint attempts',String(summary.counts.checkpoints)],
          ['Next area',summary.currentFocus&&summary.currentFocus.task||'Choose an area']
        ];
        cells.slice(0,4).forEach((cell,index)=>{
          const label=cell.querySelector('span');const strong=cell.querySelector('strong');
          if(label&&label.textContent!==values[index][0]) label.textContent=values[index][0];
          if(strong&&strong.textContent!==values[index][1]) strong.textContent=values[index][1];
        });
      }
    }

    function schedulePresentation(){
      if(state.presentationScheduled) return;
      state.presentationScheduled=true;
      win.requestAnimationFrame(()=>{state.presentationScheduled=false;updatePresentation();});
    }

    function injectRoutes(saved,record){
      const progress=checkpointHost.querySelector('.checkpoint-progress-copy strong');
      const result=checkpointHost.querySelector('.checkpoint-result');
      if(!progress||!result) return;
      const match=String(progress.textContent||'').match(/Question\s+(\d+)\s+of\s+(\d+)/i);
      if(!match||Number(match[1])!==Number(match[2])) return;
      if(checkpointHost.querySelector('[data-checkpoint-routes]')) return;

      const missed=asArray(record&&record.responses).filter(item=>item&&!item.correct);
      const route=nextTaskRoute(state.blueprint,state.taskCode);
      const panel=doc.createElement('section');
      panel.className='checkpoint-route-panel';
      panel.dataset.checkpointRoutes='true';
      panel.tabIndex=-1;
      const heading=doc.createElement('h3');
      heading.textContent='Choose your next step';
      const copy=doc.createElement('p');
      copy.textContent='You reviewed all '+String(record&&record.total||engine.BADGE_QUESTION_COUNT||15)+' answers. Continue with the study action that best fits this result.';
      const actions=doc.createElement('div');
      actions.className='checkpoint-route-actions';

      if(missed.length){
        const review=doc.createElement('a');
        review.className='btn secondary';
        review.href='review.html?list=missed';
        review.textContent='Review missed questions';
        actions.appendChild(review);
      }

      const retake=doc.createElement('button');
      retake.type='button';
      retake.className='btn secondary';
      retake.dataset.checkpointRetake='true';
      retake.textContent='Retake with new questions';

      const practice=doc.createElement('a');
      practice.className='btn secondary';
      practice.href='practice.html?task='+encodeURIComponent(state.taskCode);
      practice.textContent='Practice this task';

      const next=doc.createElement('button');
      next.type='button';
      next.className='btn primary';
      next.dataset.checkpointContinue='true';
      next.dataset.nextTask=route.next&&route.next.code||'';
      next.textContent=route.label;

      const map=doc.createElement('button');
      map.type='button';
      map.className='btn secondary';
      map.dataset.checkpointReturnMap='true';
      map.textContent='Return to Guided Study map';

      actions.append(retake,practice,next,map);
      panel.append(heading,copy,actions);
      const footer=checkpointHost.querySelector('.checkpoint-actions');
      if(footer) footer.insertAdjacentElement('beforebegin',panel); else checkpointHost.appendChild(panel);
    }

    function processResult(){
      if(!state.taskCode||!checkpointHost.querySelector('.checkpoint-result')) return;
      let saved=storage.load();
      const record=latestRecord(saved);
      if(!record) return;
      if(state.latestHandledId!==record.id){
        saved=updateMissedReview(saved,record);
        const ceremonies=unseenCeremonies(saved,awardCeremonies(saved,state.taskCode,state.awardsBeforeSubmit));
        saved=storage.save(saved);
        state.latestHandledId=record.id;
        state.ceremonyQueue.push(...ceremonies);
        state.awardsBeforeSubmit=null;
        schedulePresentation();
        openNextCeremony();
      }
      if(state.blueprint) injectRoutes(saved,record);
    }

    function scheduleProcess(){
      if(state.scheduled) return;
      state.scheduled=true;
      win.requestAnimationFrame(()=>{state.scheduled=false;processResult();});
    }

    doc.addEventListener('click',event=>{
      const start=event.target.closest('[data-checkpoint-start]');
      if(start){state.taskCode=text(start.getAttribute('data-checkpoint-start'));state.latestHandledId=null;}

      if(event.target.closest('[data-checkpoint-score]')&&state.taskCode){
        const saved=storage.load();
        const guided=saved.guidedStudy||{};
        const awards=guided.trailAwards||{};
        state.awardsBeforeSubmit={
          task:Boolean(awards.tasks&&awards.tasks[state.taskCode]),
          domain:Boolean(awards.domains&&awards.domains[state.taskCode.slice(0,2)])
        };
      }

      if(event.target.closest('[data-checkpoint-retake]')){
        const saved=storage.load();
        const record=latestRecord(saved);
        state.retakeExclusions.set(state.taskCode,asArray(record&&record.questionIds));
        const code=state.taskCode;
        closeCheckpoint();
        win.setTimeout(()=>doc.querySelector('[data-checkpoint-start="'+code+'"]')?.click(),0);
        return;
      }

      const continueButton=event.target.closest('[data-checkpoint-continue]');
      if(continueButton){
        const next=text(continueButton.dataset.nextTask);
        closeCheckpoint();
        if(next) win.setTimeout(()=>focusTask(next),0);
        return;
      }

      if(event.target.closest('[data-checkpoint-return-map]')){closeCheckpoint();return;}
    },true);

    doc.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&state.ceremonyOpen){event.preventDefault();closeCeremony();}
    });

    state.observer=new win.MutationObserver(scheduleProcess);
    state.observer.observe(checkpointHost,{childList:true,subtree:true});
    if(blueprintHost||trailHost){
      state.mapObserver=new win.MutationObserver(schedulePresentation);
      if(blueprintHost) state.mapObserver.observe(blueprintHost,{childList:true,subtree:true});
      if(trailHost) state.mapObserver.observe(trailHost,{childList:true,subtree:true});
    }
    loadJson('data/blueprint.json').then(value=>{state.blueprint=value;schedulePresentation();scheduleProcess();}).catch(error=>console.warn('Guided Study continuation map could not load.',error));
    return state;
  }

  return {
    VERSION,
    DOMAIN_AWARD_NAMES,
    uniqueIds,
    updateMissedReview,
    awardCeremonies,
    unseenCeremonies,
    markCeremonySeen,
    nextTaskRoute,
    filterRetakeRecords,
    mount
  };
});