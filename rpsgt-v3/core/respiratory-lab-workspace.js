(function(){
  'use strict';
  if(document.body.dataset.module!=='labs') return;
  const main=document.querySelector('main.main');
  const timeline=document.getElementById('respiratory-timeline-lab');
  const patterns=document.getElementById('pattern-lab');
  const recognition=document.getElementById('visual-respiratory-challenge');
  const stationsHost=document.querySelector('[data-respiratory-stations]');
  const questions=document.querySelector('[data-respiratory-workspace]');
  const stationsSection=stationsHost&&stationsHost.closest('section.section');
  if(!main||!timeline||!patterns||!recognition||!stationsSection||!questions) return;
  // Keep the seven signal stations and their checkpoint in one activity.
  const stationPane=document.createElement('div');
  stationPane.className='spg-resp-lab-station-page';
  stationsSection.before(stationPane);
  stationPane.append(stationsSection,questions);
  const chapters=[
    {key:'timeline',label:'Trace timelines',icon:'〰️',node:timeline,hash:'#respiratory-timeline-lab'},
    {key:'patterns',label:'Compare signals',icon:'📈',node:patterns,hash:'#pattern-lab'},
    {key:'recognition',label:'Visual challenge',icon:'🔍',node:recognition,hash:'#visual-respiratory-challenge'},
    {key:'stations',label:'Stations & checkpoint',icon:'✅',node:stationPane,hash:'#respiratory-stations-page'}
  ];
  stationPane.id='respiratory-stations-page';
  const rail=document.createElement('nav');
  rail.className='spg-resp-lab-chapter-nav';
  rail.setAttribute('aria-label','Respiratory Lab activities');
  rail.innerHTML='<div class="spg-resp-lab-nav-title"><strong>Respiratory Lab · Activities</strong><span>One activity at a time · choose an icon or use Previous / Next</span></div>'+
    '<div class="spg-resp-lab-chapter-buttons">'+chapters.map((item,i)=>
      '<button type="button" data-resp-lab-chapter="'+item.key+'" aria-pressed="false"><span aria-hidden="true">'+item.icon+'</span><strong>'+item.label+'</strong><small>'+(i+1)+' / '+chapters.length+'</small></button>'
    ).join('')+'</div>';
  timeline.before(rail);
  const pager=document.createElement('nav');
  pager.className='spg-resp-lab-pager';
  pager.setAttribute('aria-label','Respiratory activity pagination');
  pager.innerHTML='<button type="button" class="btn secondary" data-resp-lab-previous>← Previous activity</button>'+
    '<strong data-resp-lab-current aria-live="polite"></strong>'+
    '<button type="button" class="btn primary" data-resp-lab-next>Next activity →</button>';
  stationPane.after(pager);
  let active='timeline';
  function show(key,options={}){
    const index=chapters.findIndex(item=>item.key===key);
    if(index<0) return;
    active=key;
    chapters.forEach(item=>{item.node.hidden=item.key!==key;item.node.classList.add('spg-resp-lab-pane');});
    rail.querySelectorAll('[data-resp-lab-chapter]').forEach(button=>{
      const selected=button.dataset.respLabChapter===key;
      button.setAttribute('aria-pressed',selected?'true':'false');
      button.classList.toggle('active',selected);
      if(selected) button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    pager.querySelector('[data-resp-lab-previous]').disabled=index===0;
    pager.querySelector('[data-resp-lab-next]').disabled=index===chapters.length-1;
    pager.querySelector('[data-resp-lab-current]').textContent='Activity '+(index+1)+' of '+chapters.length+' · '+chapters[index].label;
    if(options.history!==false&&location.hash!==chapters[index].hash)history.pushState(null,'',chapters[index].hash);
    if(options.scroll!==false)rail.scrollIntoView({behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  function fromHash(){
    const hash=location.hash;
    const chapter=chapters.find(item=>item.hash===hash);
    if(chapter)show(chapter.key,{history:false,scroll:false});
    else show('timeline',{history:false,scroll:false});
  }
  rail.addEventListener('click',event=>{
    const button=event.target.closest('[data-resp-lab-chapter]');
    if(button)show(button.dataset.respLabChapter);
  });
  pager.addEventListener('click',event=>{
    const index=chapters.findIndex(item=>item.key===active);
    if(event.target.closest('[data-resp-lab-previous]'))show(chapters[Math.max(0,index-1)].key);
    if(event.target.closest('[data-resp-lab-next]'))show(chapters[Math.min(chapters.length-1,index+1)].key);
  });
  // Capture before existing click handlers so launched exercises always appear.
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-respiratory-visual-start]')){show('recognition');return;}
    if(event.target.closest('[data-respiratory-start]')){show('stations');return;}
    const link=event.target.closest('a[href^="#"]');
    if(!link)return;
    const href=link.getAttribute('href');
    const destination=chapters.find(item=>item.hash===href);
    if(destination)show(destination.key,{history:false,scroll:false});
  },true);
  window.addEventListener('hashchange',fromHash);
  fromHash();
})();