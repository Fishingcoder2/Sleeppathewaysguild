(function(){
  'use strict';

  if(window.__RPSGTLearnerSurfaceGuardLoaded) return;
  window.__RPSGTLearnerSurfaceGuardLoaded=true;
  window.__RPSGTLearnerSurfaceGuardRequested=true;

  const REVIEW_STAGE_PAGES=new Set([
    'lab-ekg.html',
    'lab-scoring.html',
    'lab-respiratory.html',
    'lab-pap.html',
    'lab-instrumentation.html',
    'lab-pediatric.html',
    'lab-daytime-testing.html',
    'lab-troubleshooting.html'
  ]);

  const COPY_REPLACEMENTS=[
    [/Development branch only/gi,'Sleep Pathways Guild'],
    [/Development boundary/gi,'Learning boundary'],
    [/Stored only in spg_rpsgt_v3(?:\.[A-Za-z0-9_.-]+)*/gi,'Your lab progress'],
    [/Stored in spg_rpsgt_v3(?:\.[A-Za-z0-9_.-]+)*/gi,'Your lab progress'],
    [/Stored only in v3/gi,'Saved in this browser'],
    [/validated learner bank/gi,'learner question library'],
    [/validated bank/gi,'learner question library'],
    [/app-authored/gi,'Sleep Pathways Guild original'],
    [/source bank/gi,'question library'],
    [/study keys?/gi,'Related reference materials'],
    [/source keys?/gi,'Related reference materials'],
    [/registry keys?/gi,'Related reference materials'],
    [/source metadata/gi,'reference information'],
    [/Exact task mapping:/gi,'RPSGT task:'],
    [/Mapped complete/gi,'Completed'],
    [/Mapped progress/gi,'Progress'],
    [/v3-ready labs/gi,'Skills Labs'],
    [/No prior laboratory position is mapped/gi,'No prior lab activity is saved yet'],
    [/manual[- ]review/gi,'additional review'],
    [/release process/gi,'review process'],
    [/development branch/gi,'review version'],
    [/\bv3-ready\b/gi,'ready'],
    [/\bprovenance\b/gi,'reference information'],
    [/\bregistry\b/gi,'reference list'],
    [/\bmigration\b/gi,'data transfer'],
    [/\bmapped\b/gi,'related']
  ];

  const REVIEW_REPLACEMENTS=[
    [/\blab completed\b/gi,'review completed'],
    [/\bcomplete the lab\b/gi,'finish this review'],
    [/\bto complete the lab\b/gi,'to finish this review'],
    [/Completion rule:/gi,'Current review milestone:'],
    [/Study checklist/gi,'Study review'],
    [/Completion requires/gi,'This study review currently uses']
  ];

  function currentPage(){return (location.pathname.split('/').pop()||'index.html').toLowerCase();}
  function isReviewStage(){return REVIEW_STAGE_PAGES.has(currentPage());}

  function suppressLegacyOptionalShelf(){
    document.getElementById('rpsgt-book-shelf')?.remove();
    document.querySelectorAll('[data-rpsgt-settings-body] .rpsgt-settings-row').forEach(row=>{
      const text=(row.textContent||'').trim();
      if(/optional book suggestions|book preferences/i.test(text)) row.remove();
    });
  }

  function rewriteText(value){
    let next=String(value||'');
    COPY_REPLACEMENTS.forEach(([pattern,replacement])=>{next=next.replace(pattern,replacement);});
    if(isReviewStage()) REVIEW_REPLACEMENTS.forEach(([pattern,replacement])=>{next=next.replace(pattern,replacement);});
    return next;
  }

  function sanitizeTextNodes(root){
    if(!root||typeof document.createTreeWalker!=='function') return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const parent=node.parentElement;
      if(!parent||/^(SCRIPT|STYLE|NOSCRIPT)$/i.test(parent.tagName)) return;
      const next=rewriteText(node.nodeValue);
      if(next!==node.nodeValue) node.nodeValue=next;
    });
  }

  function addReviewStageBoundary(){
    if(!isReviewStage()||document.querySelector('[data-review-stage-boundary]')) return;
    const hero=document.querySelector('main .hero');
    if(!hero||!hero.parentNode) return;
    const notice=document.createElement('section');
    notice.className='section notice';
    notice.dataset.reviewStageBoundary='true';
    notice.innerHTML='<strong>Current lab depth:</strong> This version is available for study review and checkpoint practice while its interaction-based skill pack is being rebuilt. Checklist review does not count as demonstrated Skills Lab completion on the Labs page.';
    hero.insertAdjacentElement('afterend',notice);
    document.body.classList.add('rpsgt-review-stage-lab');
  }

  function relabelReviewSummary(){
    if(!isReviewStage()) return;
    const selectors=[
      '[data-ekg-summary]','[data-scoring-summary]','[data-respiratory-summary]','[data-pap-summary]',
      '[data-instrumentation-summary]','[data-pediatric-summary]','[data-daytime-summary]','[data-troubleshooting-summary]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(host=>{
      host.querySelectorAll('strong').forEach(node=>{
        if((node.textContent||'').trim()==='Completed') node.textContent='Review complete';
      });
    });
  }

  function sanitizeAll(){
    suppressLegacyOptionalShelf();
    addReviewStageBoundary();
    sanitizeTextNodes(document.body);
    relabelReviewSummary();
  }

  function init(){
    sanitizeAll();
    if(typeof MutationObserver!=='function') return;
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      queueMicrotask(()=>{queued=false;sanitizeAll();});
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();