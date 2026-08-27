(function(root){
  'use strict';

  const STYLE_ID='rpsgt-v3-learner-flow-styles';
  const STUDY_ROUTE_ID='guided-study-area-chooser';
  const TOPBAR_VAR='--rpsgt-topbar-height';
  const INTERNAL_PAGE=/^(?:index|study|practice|review|review-queue|readiness|mock|labs|reports|study-summary|flashcards|math-coach|sources-disclosures|lab-[a-z-]+)\.html$/i;
  let hashObserver=null;
  let hashTimer=null;
  let studyObserver=null;
  let shellObserver=null;

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      :root{${TOPBAR_VAR}:68px}
      .main [id]{scroll-margin-top:calc(var(${TOPBAR_VAR}) + 16px)}
      [data-toggle-menu]{display:none!important}
      .guided-study-area-chooser{border-top:6px solid var(--teal);background:linear-gradient(145deg,#fff,#f5fbfd)}
      .guided-study-area-chooser .section-head{margin-bottom:10px}
      .guided-study-area-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .guided-study-area-link{display:grid;gap:4px;min-height:94px;padding:14px;border:1px solid var(--line);border-radius:15px;background:#fff;color:var(--ink);text-decoration:none;box-shadow:0 4px 14px rgba(8,43,87,.05)}
      .guided-study-area-link:hover,.guided-study-area-link:focus-visible{border-color:#8cbccc;background:var(--sky);outline:3px solid rgba(7,95,168,.14);outline-offset:2px}
      .guided-study-area-link strong{color:var(--navy)}
      .guided-study-area-link span{color:var(--muted);font-size:.84rem;line-height:1.42}
      @media(max-width:1050px){
        [data-toggle-menu]{display:inline-flex!important}
        body.rpsgt-menu-open .sidebar{top:var(${TOPBAR_VAR})!important;height:calc(100dvh - var(${TOPBAR_VAR}))!important}
        body.rpsgt-menu-open:after{inset:var(${TOPBAR_VAR}) 0 0!important}
        .guided-study-area-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:760px){
        .top-actions>a{display:none!important}
        .top-actions{flex-wrap:nowrap;gap:6px}
        .top-actions button{min-height:42px;padding:7px 10px}
        .guided-study-area-grid{grid-template-columns:1fr 1fr}
      }
      @media(max-width:480px){
        .settings-button-label{display:none}
        .guided-study-area-grid{grid-template-columns:1fr}
        .guided-study-area-link{min-height:0}
      }
    `;
    document.head.appendChild(style);
  }

  function syncTopbarHeight(){
    const topbar=document.querySelector('.topbar');
    if(!topbar) return;
    const height=Math.max(0,Math.ceil(topbar.getBoundingClientRect().height));
    if(height) document.documentElement.style.setProperty(TOPBAR_VAR,height+'px');
  }

  function syncMenuAccessibility(){
    const sidebar=document.querySelector('.sidebar');
    if(sidebar&&!sidebar.id) sidebar.id='rpsgt-primary-navigation';
    const open=document.body.classList.contains('rpsgt-menu-open');
    document.querySelectorAll('[data-toggle-menu]').forEach(button=>{
      button.setAttribute('aria-expanded',open?'true':'false');
      if(sidebar) button.setAttribute('aria-controls',sidebar.id);
      if(!button.getAttribute('aria-label')) button.setAttribute('aria-label','Open navigation menu');
    });
  }

  function normalizeNavigationLabels(){
    document.querySelectorAll('.sidebar a[href="readiness.html"]').forEach(link=>{
      if(/targeted review/i.test(link.textContent||'')){
        const icon=link.querySelector('span');
        link.textContent='Readiness Check';
        if(icon) link.prepend(icon);
      }
    });
  }

  function assignStudyAnchors(){
    if(document.body.dataset.module!=='study') return;
    const progress=document.querySelector('[data-guided-trail-dashboard]');
    const explorer=document.querySelector('[data-explorer-journey]');
    const map=document.querySelector('[data-blueprint-map]');
    if(progress&&!progress.id) progress.id='guided-study-progress';
    if(explorer&&!explorer.id) explorer.id='explorer-journey';
    if(map&&!map.id) map.id='rpsgt-domain-map';
    ['D1','D2','D3','D4'].forEach(code=>{
      const card=document.querySelector('.domain-'+code.toLowerCase());
      if(card&&card.id!==code) card.id=code;
    });
  }

  function renderStudyAreaChooser(){
    if(document.body.dataset.module!=='study'||document.getElementById(STUDY_ROUTE_ID)) return;
    const respiratory=document.querySelector('[data-respiratory-study-trail]');
    if(!respiratory) return;
    const section=document.createElement('section');
    section.id=STUDY_ROUTE_ID;
    section.className='section card guided-study-area-chooser';
    section.setAttribute('aria-labelledby','guided-study-area-title');
    section.innerHTML=`
      <div class="section-head"><div><div class="eyebrow">Choose your Guided Study area</div><h2 id="guided-study-area-title">Go straight to the learning area you need</h2><p>Use the guided respiratory path, check your progress, view Explorer rewards, or open the complete four-domain learning map.</p></div><span class="status green">Direct destinations</span></div>
      <nav class="guided-study-area-grid" aria-label="Guided Study areas">
        <a class="guided-study-area-link" href="#respiratory-pap-trail"><strong>Respiratory / PAP Trail</strong><span>Follow the ordered respiratory and therapy pathway.</span></a>
        <a class="guided-study-area-link" href="#guided-study-progress"><strong>My Guided Study progress</strong><span>See completed areas, checkpoints, and the next focus.</span></a>
        <a class="guided-study-area-link" href="#explorer-journey"><strong>Explorer rewards</strong><span>See XP, patches, ribbons, medals, and rank progress.</span></a>
        <a class="guided-study-area-link" href="#rpsgt-domain-map"><strong>All RPSGT domains</strong><span>Open the complete D1–D4 task map and choose a task.</span></a>
      </nav>`;
    respiratory.insertAdjacentElement('beforebegin',section);
  }

  function visibleTarget(target){
    if(!target||!target.isConnected) return false;
    const style=root.getComputedStyle?root.getComputedStyle(target):null;
    if(style&&(style.display==='none'||style.visibility==='hidden')) return false;
    return target.getClientRects().length>0;
  }

  function currentHashTarget(){
    if(!root.location||!root.location.hash) return null;
    let id='';
    try{id=decodeURIComponent(root.location.hash.slice(1));}catch{id=root.location.hash.slice(1);}
    return id?document.getElementById(id):null;
  }

  function scrollCurrentHash(){
    assignStudyAnchors();
    const target=currentHashTarget();
    if(!visibleTarget(target)) return false;
    target.scrollIntoView({block:'start',behavior:'auto'});
    return true;
  }

  function scheduleHashRestore(){
    if(!root.location||!root.location.hash) return;
    if(hashObserver){hashObserver.disconnect();hashObserver=null;}
    if(hashTimer){root.clearTimeout(hashTimer);hashTimer=null;}
    let done=false;
    const finish=()=>{
      if(done) return true;
      done=scrollCurrentHash();
      if(done&&hashObserver){hashObserver.disconnect();hashObserver=null;}
      return done;
    };
    root.requestAnimationFrame(()=>root.requestAnimationFrame(finish));
    if(done||typeof MutationObserver!=='function') return;
    hashObserver=new MutationObserver(()=>finish());
    hashObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','id']});
    hashTimer=root.setTimeout(()=>{
      finish();
      if(hashObserver){hashObserver.disconnect();hashObserver=null;}
      hashTimer=null;
    },4000);
  }

  function destinationFor(anchor){
    const raw=String(anchor&&anchor.getAttribute('href')||'').trim();
    if(!raw||raw.startsWith('#')) return null;
    let url;
    try{url=new URL(raw,root.location.href);}catch{return null;}
    if(url.origin!==root.location.origin) return null;
    const file=url.pathname.split('/').filter(Boolean).pop()||'index.html';
    if(!INTERNAL_PAGE.test(file)) return null;
    if(file.toLowerCase()==='index.html') return 'index.html';
    return file+url.search+url.hash;
  }

  function rememberExactDestination(event){
    const anchor=event.target&&event.target.closest?event.target.closest('a[href]'):null;
    if(!anchor||!root.RPSGTStorage||typeof root.RPSGTStorage.rememberLocation!=='function') return;
    const destination=destinationFor(anchor);
    if(!destination) return;
    root.RPSGTStorage.rememberLocation(destination);
  }

  function watchStudyMap(){
    if(document.body.dataset.module!=='study'||typeof MutationObserver!=='function') return;
    const map=document.querySelector('[data-blueprint-map]');
    if(!map) return;
    if(studyObserver) studyObserver.disconnect();
    studyObserver=new MutationObserver(()=>{
      assignStudyAnchors();
      if(root.location.hash) scheduleHashRestore();
    });
    studyObserver.observe(map,{childList:true,subtree:true});
  }

  function watchShell(){
    if(typeof ResizeObserver==='function'){
      const topbar=document.querySelector('.topbar');
      if(topbar) new ResizeObserver(()=>syncTopbarHeight()).observe(topbar);
    }else root.addEventListener('resize',syncTopbarHeight,{passive:true});
    if(typeof MutationObserver==='function'){
      shellObserver=new MutationObserver(()=>syncMenuAccessibility());
      shellObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    }
  }

  function init(){
    injectStyles();
    syncTopbarHeight();
    syncMenuAccessibility();
    normalizeNavigationLabels();
    assignStudyAnchors();
    renderStudyAreaChooser();
    watchStudyMap();
    watchShell();
    document.addEventListener('click',rememberExactDestination,false);
    root.addEventListener('hashchange',scheduleHashRestore);
    root.addEventListener('orientationchange',()=>root.setTimeout(syncTopbarHeight,80),{passive:true});
    scheduleHashRestore();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();

  root.RPSGTLearnerFlowNavigation={
    assignStudyAnchors,
    renderStudyAreaChooser,
    scheduleHashRestore,
    syncTopbarHeight,
    destinationFor
  };
})(typeof globalThis!=='undefined'?globalThis:this);
