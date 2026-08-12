(function(root){
  'use strict';

  const APA={
    fundamentals:'Mattice, C. D., Brooks, R. J., & Lee-Chiong, T. L., Jr. (Eds.). (2020). Fundamentals of sleep technology (3rd ed.). Wolters Kluwer.',
    scoring:'American Academy of Sleep Medicine. (2023). The AASM manual for the scoring of sleep and associated events: Rules, terminology and technical specifications (Version 3). American Academy of Sleep Medicine.',
    icsd:'American Academy of Sleep Medicine. (2023). International classification of sleep disorders (3rd ed., text rev.). American Academy of Sleep Medicine.',
    pap:'American Association of Sleep Technologists. (2021). AAST manual PAP titration guideline. American Association of Sleep Technologists.',
    brpt:'Board of Registered Polysomnographic Technologists. (n.d.). RPSGT candidate handbook.'
  };

  const SCORING_CATEGORIES=new Set([
    'Cardiac & ECG Recognition',
    'Montage & Electrode Placement',
    'Report Math & Indexes',
    'Respiratory Events & Patterns',
    'Sensors, Equipment & Standards',
    'Signals, Filters & Instrumentation',
    'Sleep Staging & EEG Clues'
  ]);
  const DISORDER_CATEGORIES=new Set([
    'Central Disorders of Hypersomnolence',
    'Circadian Rhythm Sleep-Wake Disorders',
    'Parasomnias',
    'Sleep Disorders & Clinical Terms',
    'Sleep-Related Breathing Disorders',
    'Sleep-Related Movement Disorders'
  ]);
  const PAP_CATEGORIES=new Set(['Oxygen, CO2 & Units','PAP & Oxygen Therapy']);
  const EXAM_CATEGORIES=new Set(['Exam Strategy & Question Traps']);

  const ALIASES=new Map([
    ['fundamentals of sleep technology',APA.fundamentals],
    ['fundamentals of sleep technology (3rd ed.)',APA.fundamentals],
    ['fundamentals-sleep-technology-3e',APA.fundamentals],
    ['aasm scoring manual',APA.scoring],
    ['aasm scoring manual version 3',APA.scoring],
    ['aasm-scoring-manual-v3',APA.scoring],
    ['icsd-3-tr',APA.icsd],
    ['international classification of sleep disorders',APA.icsd],
    ['aast manual pap titration guideline',APA.pap],
    ['aast-pap-titration-2021',APA.pap],
    ['brpt rpsgt candidate handbook',APA.brpt],
    ['brpt-handbook',APA.brpt]
  ]);

  function unique(values){return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value||'').trim()).filter(Boolean))];}

  function looksApa(value){
    const text=String(value||'').trim();
    return /\((?:\d{4}[a-z]?|n\.d\.)\)\./i.test(text)&&/[.!?]$/.test(text);
  }

  function apaOnly(values){
    return unique(values).map(value=>ALIASES.get(value.toLowerCase())||value).filter(looksApa);
  }

  function referencesForCategory(category){
    const refs=[APA.fundamentals];
    if(SCORING_CATEGORIES.has(category)) refs.unshift(APA.scoring);
    if(DISORDER_CATEGORIES.has(category)) refs.unshift(APA.icsd);
    if(PAP_CATEGORIES.has(category)) refs.unshift(APA.pap);
    if(EXAM_CATEGORIES.has(category)) refs.unshift(APA.brpt);
    return apaOnly(refs);
  }

  function validateCard(card,label){
    if(!card||!card.id||!card.category||!card.front||!card.back) throw new Error((label||'A preserved RPSGT v2 flashcard')+' is incomplete.');
  }

  function applyOverlay(base,overlay){
    if(!base||!Array.isArray(base.cards)) throw new Error('The archived RPSGT v2 flashcard inventory is unavailable.');
    if(!overlay||!Array.isArray(overlay.excludeArchivedIds)||!Array.isArray(overlay.addCards)) throw new Error('The current RPSGT v2 flashcard overlay is unavailable.');
    if(Number(overlay.baseArchivedCardCount)!==base.cards.length) throw new Error('The archived RPSGT v2 flashcard count does not match the reviewed overlay base.');

    const excluded=new Set(overlay.excludeArchivedIds.map(value=>String(value||'').trim()).filter(Boolean));
    const cards=base.cards.filter(card=>!excluded.has(String(card.id||''))).map(card=>Object.assign({},card));
    const ids=new Set();
    cards.forEach((card,index)=>{
      validateCard(card,'Archived RPSGT v2 flashcard '+(index+1));
      if(ids.has(card.id)) throw new Error('Duplicate archived RPSGT v2 flashcard id: '+card.id);
      ids.add(card.id);
    });
    overlay.addCards.forEach((card,index)=>{
      validateCard(card,'Current-copy RPSGT v2 flashcard '+(index+1));
      if(ids.has(card.id)) throw new Error('Duplicate current-copy RPSGT v2 flashcard id: '+card.id);
      ids.add(card.id);
      cards.push(Object.assign({},card));
    });
    const categories=[...new Set(cards.map(card=>String(card.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    return {
      schemaVersion:2,
      source:{archived:base.source||null,currentCopy:overlay.source||null,overlayApplied:true},
      cardCount:cards.length,
      categoryCount:categories.length,
      categories,
      cards
    };
  }

  function validatePayload(payload,overlay){
    if(!payload||!Array.isArray(payload.cards)) throw new Error('The preserved RPSGT v2 flashcard inventory is unavailable.');
    if(payload.cardCount!==payload.cards.length) throw new Error('The preserved RPSGT v2 flashcard count does not match its inventory.');
    const expectedCards=Number(overlay&&overlay.expectedFinalCardCount)||332;
    const expectedCategories=Number(overlay&&overlay.expectedFinalCategoryCount)||19;
    if(payload.cardCount!==expectedCards||payload.categoryCount!==expectedCategories) throw new Error('The current RPSGT v2 flashcard inventory does not match the reviewed 332-card / 19-category source copy.');
    if(!Array.isArray(payload.categories)||payload.categories.length!==payload.categoryCount) throw new Error('The current RPSGT v2 flashcard category count does not match its inventory.');
    const ids=new Set();
    payload.cards.forEach((card,index)=>{
      validateCard(card,'Current RPSGT v2 flashcard '+(index+1));
      if(ids.has(card.id)) throw new Error('Duplicate preserved RPSGT v2 flashcard id: '+card.id);
      ids.add(card.id);
    });
    return payload;
  }

  async function load(){
    const [baseResponse,overlayResponse]=await Promise.all([
      fetch('data/flashcards-v2-extracted.json',{cache:'no-store'}),
      fetch('data/flashcards-v2-current-overlay.json',{cache:'no-store'})
    ]);
    if(!baseResponse.ok) throw new Error('The archived RPSGT v2 flashcard library could not be loaded.');
    if(!overlayResponse.ok) throw new Error('The current RPSGT v2 flashcard overlay could not be loaded.');
    const [base,overlay]=await Promise.all([baseResponse.json(),overlayResponse.json()]);
    return validatePayload(applyOverlay(base,overlay),overlay);
  }

  function asV3Cards(payload){
    return payload.cards.map(card=>({
      id:'v2:'+card.id,
      front:card.front,
      back:card.back,
      memoryClue:card.memoryClue||'',
      sourceContext:card.category,
      recommendedResources:referencesForCategory(card.category),
      custom:false
    }));
  }

  function sanitizeRenderedReferences(){
    if(!root.document) return 0;
    const host=root.document.querySelector('[data-card-resources]');
    if(!host) return 0;
    [...host.children].forEach(node=>{if(!looksApa(node.textContent)) node.remove();});
    const wrapper=root.document.querySelector('[data-card-resources-wrap]');
    if(wrapper) wrapper.hidden=!host.children.length;
    return host.children.length;
  }

  function installApaReferenceGuard(){
    if(!root.document) return;
    const start=()=>{
      const host=root.document.querySelector('[data-card-resources]');
      if(!host) return;
      sanitizeRenderedReferences();
      if(typeof root.MutationObserver!=='function') return;
      const observer=new root.MutationObserver(sanitizeRenderedReferences);
      observer.observe(host,{childList:true,subtree:true});
    };
    if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  }

  async function seed(storeApi){
    if(!storeApi||typeof storeApi.seedLibrary!=='function') throw new Error('The RPSGT v3 flashcard library seeding service is unavailable.');
    const payload=await load();
    const result=storeApi.seedLibrary(asV3Cards(payload),'2026-08-12T14:58:00.000Z');
    return Object.assign({inventory:payload},result);
  }

  root.RPSGTV2FlashcardLibrary={APA,referencesForCategory,looksApa,apaOnly,applyOverlay,validatePayload,load,asV3Cards,sanitizeRenderedReferences,installApaReferenceGuard,seed};
  installApaReferenceGuard();
})(typeof window!=='undefined'?window:globalThis);
