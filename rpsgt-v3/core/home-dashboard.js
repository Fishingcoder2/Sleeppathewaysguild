(function(){
  'use strict';

  const RESOURCE_URL='data/brpt-official-resources.json';
  const MANIFEST_URL='data/question-bank/manifest.json';
  const $=selector=>document.querySelector(selector);
  const setText=(selector,value)=>document.querySelectorAll(selector).forEach(node=>{node.textContent=value;});

  function externalLink(resource){
    const link=document.createElement('a');
    link.className='official-resource-card';
    link.href=resource.url;
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.dataset.officialResource=resource.id;

    const badge=document.createElement('span');
    badge.className='official-resource-badge';
    badge.textContent=resource.publisher==='BRPT'?'Official BRPT':'Official testing partner';

    const title=document.createElement('strong');
    title.textContent=resource.title;

    const description=document.createElement('span');
    description.className='official-resource-description';
    description.textContent=resource.description;

    const action=document.createElement('span');
    action.className='official-resource-action';
    action.textContent='Open official resource ↗';

    link.append(badge,title,description,action);
    return link;
  }

  function renderResourceBoard(payload){
    const host=$('[data-brpt-resource-board]');
    if(!host) return;
    const resources=Array.isArray(payload&&payload.resources)?payload.resources.slice():[];
    resources.sort((a,b)=>(Number(a.priority)||99)-(Number(b.priority)||99));
    host.replaceChildren();

    const groups=[];
    resources.forEach(resource=>{if(!groups.includes(resource.group)) groups.push(resource.group);});
    groups.forEach(group=>{
      const section=document.createElement('section');
      section.className='official-resource-group';
      const heading=document.createElement('h3');
      heading.textContent=group;
      const grid=document.createElement('div');
      grid.className='official-resource-grid';
      resources.filter(resource=>resource.group===group).forEach(resource=>grid.appendChild(externalLink(resource)));
      section.append(heading,grid);
      host.appendChild(section);
    });

    const verified=$('[data-brpt-verified-date]');
    if(verified&&payload&&payload.meta&&payload.meta.verifiedAt) verified.textContent=payload.meta.verifiedAt;
  }

  function renderResourceError(){
    const host=$('[data-brpt-resource-board]');
    if(!host) return;
    host.innerHTML='<div class="notice"><strong>Official resource board could not be loaded.</strong> Use the direct BRPT RPSGT credential link below and verify current requirements with BRPT.</div><div class="actions"><a class="btn primary" href="https://brpt.org/rpsgt/" target="_blank" rel="noopener noreferrer">Open BRPT RPSGT credential home ↗</a></div>';
  }

  async function loadResources(){
    try{
      const response=await fetch(RESOURCE_URL,{cache:'no-store'});
      if(!response.ok) throw new Error('BRPT resource catalog HTTP '+response.status);
      renderResourceBoard(await response.json());
    }catch(error){
      console.warn('RPSGT V3 official BRPT resource board could not be loaded.',error);
      renderResourceError();
    }
  }

  async function loadManifestCount(){
    try{
      const response=await fetch(MANIFEST_URL,{cache:'no-store'});
      if(!response.ok) return;
      const manifest=await response.json();
      const total=Number(manifest&&manifest.meta&&manifest.meta.questionCount||0);
      if(total) setText('[data-home-question-count]',total.toLocaleString());
    }catch(error){
      console.warn('RPSGT V3 question count could not be refreshed.',error);
    }
  }

  function counts(saved){
    const guided=saved&&saved.guidedStudy||{};
    const awards=guided.trailAwards||{};
    const taskBadges=Object.keys(awards.tasks||{}).length;
    const domainMedals=Object.keys(awards.domains||{}).length;
    const missed=Array.isArray(saved&&saved.review&&saved.review.missedIds)?saved.review.missedIds.length:0;
    const answered=Number(saved&&saved.progress&&saved.progress.answered||0);
    const correct=Number(saved&&saved.progress&&saved.progress.correct||0);
    const readiness=Array.isArray(saved&&saved.readiness&&saved.readiness.history)?saved.readiness.history:[];
    return {taskBadges,domainMedals,missed,answered,correct,readiness};
  }

  function recommendation(saved){
    const c=counts(saved);
    if(c.answered===0&&c.taskBadges===0){
      return {
        eyebrow:'Coach Bob recommends',
        title:'Start with one Guided Study task',
        copy:'Learn one RPSGT task first, then use its full 15-question checkpoint to test whether the reasoning is sticking.',
        href:'study.html',
        action:'Start Guided Study'
      };
    }
    if(c.missed>=5){
      return {
        eyebrow:'Coach Bob recommends',
        title:'Repair the pattern in your missed questions',
        copy:'You already have useful evidence. Review the misses, explain the deciding clue, and turn repeat trouble spots into flashcards when helpful.',
        href:'review.html?list=missed',
        action:'Review missed questions'
      };
    }
    if(c.taskBadges<12){
      return {
        eyebrow:'Coach Bob recommends',
        title:'Keep building your Guided Study trail',
        copy:'Your next full checkpoint can strengthen a task area and move your Explorer journey forward without scattering your attention.',
        href:'study.html',
        action:'Continue Guided Study'
      };
    }
    if(!c.readiness.length){
      return {
        eyebrow:'Coach Bob recommends',
        title:'Check your readiness across the blueprint',
        copy:'You have built substantial Guided Study evidence. A Readiness Check can show which task areas deserve the next focused review.',
        href:'readiness.html',
        action:'Start a Readiness Check'
      };
    }
    return {
      eyebrow:'Coach Bob recommends',
      title:'Use Progress to choose the next weak area',
      copy:'Your learner record now has enough evidence to compare task performance and choose a focused next move.',
      href:'reports.html',
      action:'Open Progress'
    };
  }

  function renderLearnerLaunchpad(){
    if(!window.RPSGTStorage) return;
    const saved=window.RPSGTStorage.load();
    const c=counts(saved);
    setText('[data-home-task-badges]',c.taskBadges+' / 12');
    setText('[data-home-domain-medals]',c.domainMedals+' / 4');
    setText('[data-home-missed]',c.missed.toLocaleString());
    setText('[data-home-accuracy]',(c.answered?Math.round(c.correct/c.answered*100):0)+'%');

    const plan=recommendation(saved);
    setText('[data-coach-recommendation-eyebrow]',plan.eyebrow);
    setText('[data-coach-recommendation-title]',plan.title);
    setText('[data-coach-recommendation-copy]',plan.copy);
    const action=$('[data-coach-recommendation-action]');
    if(action){action.href=plan.href;action.textContent=plan.action;}
  }

  function init(){
    renderLearnerLaunchpad();
    loadResources();
    loadManifestCount();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
