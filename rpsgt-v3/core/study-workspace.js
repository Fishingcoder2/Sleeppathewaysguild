(function(){
  'use strict';
  if(document.body.dataset.module!=='study') return;
  const main=document.querySelector('main.main');
  const views=[
    {key:'trail',label:'Guided pathway',icon:'🫁',selector:'#respiratory-pap-trail',hash:'#respiratory-pap-trail'},
    {key:'progress',label:'My progress',icon:'📊',selector:'[data-guided-trail-dashboard]',hash:'#guided-study-progress'},
    {key:'explorer',label:'Explorer rewards',icon:'🏅',selector:'[data-explorer-journey]',hash:'#explorer-journey'},
    {key:'map',label:'D1–D4 task map',icon:'🧭',selector:'[data-blueprint-map]',hash:'#rpsgt-domain-map'}
  ].map(view=>({...view,node:main&&main.querySelector(view.selector)}));
  if(!main||views.some(view=>!view.node)) return;
  const sectionByKey=new Map(views.map(view=>[view.key,view]));
  const nav=document.createElement('nav');
  nav.className='spg-study-chapter-nav';
  nav.setAttribute('aria-label','Guided Study chapters');
  nav.innerHTML='<p class="spg-study-nav-heading">Guided Study · Select a chapter <span>Click an icon or use Previous / Next</span></p><div class="spg-study-chapter-items">'+
    views.map((view,index)=>'<button type="button" class="spg-study-chapter-button" data-study-page="'+view.key+'" aria-pressed="false"><span class="spg-study-chapter-icon" aria-hidden="true">'+view.icon+'</span><strong>'+view.label+'</strong><small>'+(index+1)+' of '+views.length+'</small></button>').join('')+'</div>';
  views[0].node.before(nav);
  const pager=document.createElement('nav');
  pager.className='spg-study-page-pager';
  pager.setAttribute('aria-label','Chapter navigation');
  pager.innerHTML='<button class="btn secondary" type="button" data-study-previous>← Previous section</button><strong data-study-current-label aria-live="polite">Guided pathway</strong><button class="btn primary" type="button" data-study-next>Next section →</button>';
  // Section navigation belongs beside the chapter selector, not under a long lesson.
  nav.after(pager);
  let active='trail',activeDomain=0;

  function navigate(key,opts={}){
    const index=views.findIndex(view=>view.key===key);
    if(index<0) return;
    active=key;
    views.forEach(view=>{
      view.node.hidden=view.key!==key;
      view.node.classList.add('spg-study-page');
    });
    nav.querySelectorAll('[data-study-page]').forEach(button=>{
      const current=button.dataset.studyPage===key;
      button.classList.toggle('active',current);
      button.setAttribute('aria-pressed',current?'true':'false');
      if(current) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
    pager.querySelector('[data-study-previous]').disabled=index===0;
    pager.querySelector('[data-study-next]').disabled=index===views.length-1;
    pager.querySelector('[data-study-current-label]').textContent=(index+1)+' / '+views.length+' · '+views[index].label;
    if(opts.history!==false&&location.hash!==views[index].hash) history.pushState(null,'',views[index].hash);
    if(opts.scroll!==false) nav.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }

  function routeHash(){
    const hash=decodeURIComponent(location.hash||'');
    if(/^#D[1-4][A-C]$/i.test(hash)){
      const n=Number(hash[2])-1;
      if(n>=0) selectDomain(n);
      navigate('map',{history:false,scroll:false});
      return;
    }
    const key=hash==='#guided-study-progress'?'progress':hash==='#explorer-journey'?'explorer':hash==='#rpsgt-domain-map'?'map':'trail';
    navigate(key,{history:false,scroll:false});
  }

  function selectDomain(index){
    activeDomain=index;
    const map=sectionByKey.get('map').node;
    const cards=Array.from(map.querySelectorAll('.domain-map-card'));
    if(!cards.length) return;
    cards.forEach((card,i)=>{card.hidden=i!==index;});
    const tabs=map.querySelectorAll('[data-study-domain]');
    tabs.forEach(tab=>tab.setAttribute('aria-pressed',Number(tab.dataset.studyDomain)===index?'true':'false'));
  }

  function enhanceDomainMap(){
    const map=sectionByKey.get('map').node;
    const cards=Array.from(map.querySelectorAll('.domain-map-card'));
    if(cards.length!==4) return;
    if(!map.querySelector('.spg-study-domain-nav')){
      const rail=document.createElement('nav');
      rail.className='spg-study-domain-nav';
      rail.setAttribute('aria-label','RPSGT blueprint domains');
      rail.innerHTML=cards.map((card,i)=>'<button type="button" data-study-domain="'+i+'" aria-pressed="false">'+['D1 · Clinical','D2 · Signals','D3 · Scoring','D4 · Therapy'][i]+'</button>').join('');
      cards[0].before(rail);
    }
    const hash=location.hash;
    const match=/^#D([1-4])[A-C]$/i.exec(hash);
    if(match) activeDomain=Number(match[1])-1;
    selectDomain(activeDomain);
  }
  const blueprint=sectionByKey.get('map').node;
  const domainObserver=new MutationObserver(()=>{if(blueprint.querySelectorAll('.domain-map-card').length===4) enhanceDomainMap();});
  domainObserver.observe(blueprint,{childList:true});
  enhanceDomainMap();
  nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-study-page]');
    if(button) navigate(button.dataset.studyPage);
  });
  pager.addEventListener('click',event=>{
    const index=views.findIndex(view=>view.key===active);
    if(event.target.closest('[data-study-previous]')) navigate(views[Math.max(0,index-1)].key);
    if(event.target.closest('[data-study-next]')) navigate(views[Math.min(views.length-1,index+1)].key);
  });
  blueprint.addEventListener('click',event=>{
    const button=event.target.closest('[data-study-domain]');
    if(button) selectDomain(Number(button.dataset.studyDomain));
  });
  // Existing direct links and older bookmarks continue opening the correct section.
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if(!link) return;
    const href=link.getAttribute('href');
    if(href==='#respiratory-pap-trail') navigate('trail',{history:false,scroll:false});
    if(href==='#guided-study-progress') navigate('progress',{history:false,scroll:false});
    if(href==='#explorer-journey') navigate('explorer',{history:false,scroll:false});
    if(href==='#rpsgt-domain-map') navigate('map',{history:false,scroll:false});
    if(/^#D[1-4][A-C]$/i.test(href)){selectDomain(Number(href[2])-1);navigate('map',{history:false,scroll:false});}
  },true);
  window.addEventListener('hashchange',routeHash);
  routeHash();
})();