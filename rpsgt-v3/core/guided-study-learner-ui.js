(function(){
  'use strict';

  const mapHost=document.querySelector('[data-blueprint-map]');
  const summaryHost=document.querySelector('[data-blueprint-summary]');
  const trailHost=document.querySelector('[data-guided-trail-dashboard]');
  const checkpointHost=document.querySelector('[data-checkpoint-workspace]');
  if(!mapHost) return;

  const state={taskPlans:{},sourceTitles:new Map(),resourcesReady:false};
  const taskCodePattern=/^D[1-4][A-C]$/i;
  const coachHeadings=[
    'Start with the clinical clue.',
    'Picture the technologist’s next decision.',
    'Name the finding before choosing.',
    'Use the stem to narrow the pathway.',
    'Separate the key clue from the distractors.'
  ];

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function unique(values){return [...new Set(values.filter(Boolean))];}

  function titleForSource(source){
    return String(source&&(
      source.shortTitle||
      source.title||
      source.name||
      source.label||
      source.id
    )||'').trim();
  }

  async function loadResourceCatalog(){
    try{
      const manifest=await loadJson('data/study-sources/manifest.json');
      const [plans,...sources]=await Promise.all([
        loadJson('data/study-sources/'+String(manifest.taskPlanFile||'task-plans.json')),
        ...(manifest.sourceFiles||[]).map(file=>loadJson('data/study-sources/'+file))
      ]);
      state.taskPlans=plans&&plans.taskPlans||{};
      sources.forEach(source=>{
        const id=String(source&&source.id||'').trim();
        const title=titleForSource(source);
        if(id&&title) state.sourceTitles.set(id,title);
      });
    }catch(error){
      console.warn('Guided Study reference titles could not be loaded.',error);
      state.taskPlans={};
      state.sourceTitles.clear();
    }finally{
      state.resourcesReady=true;
      document.body.classList.add('guided-resources-ready');
      sanitizeAll();
    }
  }

  function resourceTitlesForTask(taskCode){
    const plan=state.taskPlans[taskCode];
    if(!plan||!Array.isArray(plan.sequence)) return [];
    return unique(plan.sequence.map(item=>state.sourceTitles.get(String(item&&item.sourceId||''))||''));
  }

  function replaceResourceList(card){
    const details=[...card.querySelectorAll('details')].find(node=>node.querySelector('.data-chip-list'));
    if(!details) return;
    if(details.dataset.resourcePanel!=='true') details.dataset.resourcePanel='true';
    const summary=details.querySelector('summary');
    if(summary&&summary.textContent!=='Related reference materials') summary.textContent='Related reference materials';
    if(!state.resourcesReady){if(!details.hidden) details.hidden=true;return;}
    if(details.dataset.resourceReady==='true') return;
    const titles=resourceTitlesForTask(card.id);
    if(!titles.length){details.remove();return;}
    const list=details.querySelector('.data-chip-list');
    if(!list){details.remove();return;}
    list.replaceChildren(...titles.map(title=>{
      const item=document.createElement('span');
      item.className='resource-title-chip';
      item.textContent=title;
      return item;
    }));
    if(details.hidden) details.hidden=false;
    details.dataset.resourceReady='true';
  }

  function sanitizeTaskCards(){
    mapHost.querySelectorAll('.task-map-card').forEach(card=>{
      card.querySelectorAll('.mapping-warning').forEach(node=>node.remove());
      replaceResourceList(card);
      card.querySelectorAll('.trail-status-row .status').forEach(node=>{
        node.textContent=node.textContent.replace(/Task award earned/gi,'Task badge earned');
      });
    });
    mapHost.querySelectorAll('.domain-map-head .status').forEach(node=>{
      node.textContent=node.textContent.replace(/domain award/gi,'domain medal');
    });
    mapHost.querySelectorAll('.domain-weight span').forEach(node=>{
      if(/app blueprint weight/i.test(node.textContent||'')) node.textContent='RPSGT blueprint weight';
    });
  }

  function sanitizeSummary(){
    if(!summaryHost) return;
    const items=[...summaryHost.children];
    if(items.length<4) return;
    if(items[2].dataset.learnerMetric!=='checkpoint-size'){
      items[2].innerHTML='<strong>15</strong> questions per checkpoint';
      items[2].dataset.learnerMetric='checkpoint-size';
    }
    if(items[3].dataset.learnerMetric!=='badge-goal'){
      items[3].innerHTML='<strong>80%</strong> task-badge goal';
      items[3].dataset.learnerMetric='badge-goal';
    }
  }

  function sanitizeTrailSummary(){
    if(!trailHost) return;
    const status=trailHost.querySelector('.section-head .status');
    if(status&&/stored only in v3/i.test(status.textContent||'')) status.textContent='Your Guided Study progress';
    trailHost.querySelectorAll('.trail-summary-grid span').forEach(node=>{
      if((node.textContent||'').trim()==='Task awards') node.textContent='Task badges';
      if((node.textContent||'').trim()==='Domain awards') node.textContent='Domain medals';
    });
    const heading=trailHost.querySelector('.section-head h2');
    if(heading&&/earn awards/i.test(heading.textContent||'')) heading.textContent='Study, check, and move down the trail';
  }

  function topicFromCheckpoint(){
    const topic=checkpointHost&&checkpointHost.querySelector('.checkpoint-question-meta .status');
    const value=String(topic&&topic.textContent||'').trim();
    return taskCodePattern.test(value)?'RPSGT review':value||'RPSGT review';
  }

  function headingForTopic(topic){
    let hash=0;
    for(let index=0;index<topic.length;index+=1) hash=(hash*31+topic.charCodeAt(index))>>>0;
    return coachHeadings[hash%coachHeadings.length];
  }

  function sanitizeCheckpoint(){
    if(!checkpointHost) return;
    const header=checkpointHost.querySelector('.checkpoint-modal-head');
    if(header){
      const eyebrow=header.querySelector('.eyebrow');
      if(eyebrow&&eyebrow.textContent!=='Guided Study checkpoint') eyebrow.textContent='Guided Study checkpoint';
      const label=header.querySelector('.checkpoint-task-label');
      if(label&&!label.dataset.learnerTitle){
        const raw=String(label.textContent||'').trim();
        const parts=raw.split('·').map(value=>value.trim()).filter(Boolean);
        const title=parts.length>1?parts.slice(1).join(' · '):raw.replace(/^D[1-4][A-C]\s*/i,'').trim();
        label.textContent=title;
        label.dataset.learnerTitle='true';
      }
    }

    const meta=checkpointHost.querySelector('.checkpoint-question-meta');
    if(meta){
      [...meta.children].forEach(node=>{
        const text=String(node.textContent||'').trim();
        if(/^Exact task mapping:/i.test(text)) node.remove();
        else if(node.classList.contains('status')&&taskCodePattern.test(text)&&text!=='RPSGT review') node.textContent='RPSGT review';
      });
    }

    const coach=checkpointHost.querySelector('.coach-question-panel');
    if(coach){
      const heading=coach.querySelector('h3');
      if(heading&&String(heading.textContent||'').trim()==='Slow down and match the task.') heading.textContent=headingForTopic(topicFromCheckpoint());
    }
  }

  function sanitizeAll(){
    sanitizeSummary();
    sanitizeTrailSummary();
    sanitizeTaskCards();
    sanitizeCheckpoint();
  }

  window.RPSGTGuidedStudyResources={
    titlesForTask(taskCode){return resourceTitlesForTask(String(taskCode||'')).slice();},
    isReady(){return state.resourcesReady;}
  };

  const observer=new MutationObserver(sanitizeAll);
  observer.observe(mapHost,{childList:true,subtree:true});
  if(summaryHost) observer.observe(summaryHost,{childList:true,subtree:true});
  if(trailHost) observer.observe(trailHost,{childList:true,subtree:true});
  if(checkpointHost) observer.observe(checkpointHost,{childList:true,subtree:true});

  sanitizeAll();
  loadResourceCatalog();
})();