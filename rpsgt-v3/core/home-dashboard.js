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

  function init(){
    loadResources();
    loadManifestCount();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
