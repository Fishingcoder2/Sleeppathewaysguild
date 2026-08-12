(function(root){
  'use strict';

  const APA={
    fundamentals:'Mattice, C. D., Brooks, R. J., & Lee-Chiong, T. L., Jr. (Eds.). (2020). Fundamentals of sleep technology (3rd ed.). Wolters Kluwer.',
    scoring:'American Academy of Sleep Medicine. (2023). The AASM manual for the scoring of sleep and associated events: Rules, terminology and technical specifications (Version 3).',
    icsd:'American Academy of Sleep Medicine. (2023). International classification of sleep disorders (3rd ed., text rev.).',
    pap:'American Association of Sleep Technologists. (2021). AAST manual PAP titration guideline.'
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
    'Circadian Rhythm Sleep-Wake Disorders',
    'Sleep Disorders & Clinical Terms',
    'Sleep-Related Breathing Disorders'
  ]);
  const PAP_CATEGORIES=new Set(['Oxygen, CO2 & Units','PAP & Oxygen Therapy']);

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
    ['aast-pap-titration-2021',APA.pap]
  ]);

  function unique(values){return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value||'').trim()).filter(Boolean))];}

  function referencesForCategory(category){
    const refs=[APA.fundamentals];
    if(SCORING_CATEGORIES.has(category)) refs.unshift(APA.scoring);
    if(DISORDER_CATEGORIES.has(category)) refs.unshift(APA.icsd);
    if(PAP_CATEGORIES.has(category)) refs.unshift(APA.pap);
    return unique(refs);
  }

  function looksApa(value){
    const text=String(value||'').trim();
    return /\(\d{4}[a-z]?\)\./.test(text)&&/[.!?]$/.test(text);
  }

  function apaOnly(values){
    return unique(values).map(value=>ALIASES.get(value.toLowerCase())||value).filter(looksApa);
  }

  function validatePayload(payload){
    if(!payload||!Array.isArray(payload.cards)) throw new Error('The preserved RPSGT v2 flashcard inventory is unavailable.');
    if(payload.cardCount!==payload.cards.length) throw new Error('The preserved RPSGT v2 flashcard count does not match its inventory.');
    if(payload.cardCount!==326||payload.categoryCount!==19) throw new Error('The preserved RPSGT v2 flashcard inventory does not match the reviewed 326-card / 19-category release source.');
    const ids=new Set();
    payload.cards.forEach(card=>{
      if(!card.id||!card.category||!card.front||!card.back) throw new Error('A preserved RPSGT v2 flashcard is incomplete.');
      if(ids.has(card.id)) throw new Error('Duplicate preserved RPSGT v2 flashcard id: '+card.id);
      ids.add(card.id);
    });
    return payload;
  }

  async function load(){
    const response=await fetch('data/flashcards-v2-extracted.json',{cache:'no-store'});
    if(!response.ok) throw new Error('The preserved RPSGT v2 flashcard library could not be loaded.');
    return validatePayload(await response.json());
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

  async function seed(storeApi){
    if(!storeApi||typeof storeApi.seedLibrary!=='function') throw new Error('The RPSGT v3 flashcard library seeding service is unavailable.');
    const payload=await load();
    const result=storeApi.seedLibrary(asV3Cards(payload),'2026-08-12T13:44:12.000Z');
    return Object.assign({inventory:payload},result);
  }

  root.RPSGTV2FlashcardLibrary={APA,referencesForCategory,apaOnly,load,asV3Cards,seed};
})(typeof window!=='undefined'?window:globalThis);
