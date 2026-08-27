(function(root){
  'use strict';

  const VERSION='2026-08-27-v2-332-forward-catalog-1';
  const EXPECTED_CARDS=332;
  const EXPECTED_CATEGORIES=19;
  let payload=null;
  let loading=null;

  const APA={
    fundamentals:'Mattice, C. D., Brooks, R. J., & Lee-Chiong, T. L., Jr. (Eds.). (2020). Fundamentals of sleep technology (3rd ed.). Wolters Kluwer.',
    scoring:'American Academy of Sleep Medicine. (2023). The AASM manual for the scoring of sleep and associated events: Rules, terminology and technical specifications (Version 3). American Academy of Sleep Medicine.',
    icsd:'American Academy of Sleep Medicine. (2023). International classification of sleep disorders (3rd ed., text rev.). American Academy of Sleep Medicine.',
    pap:'American Association of Sleep Technologists. (2021). AAST manual PAP titration guideline. American Association of Sleep Technologists.',
    brpt:'Board of Registered Polysomnographic Technologists. (n.d.). RPSGT candidate handbook.'
  };

  const SCORING_CATEGORIES=new Set([
    'Cardiac & ECG Recognition','Montage & Electrode Placement','Report Math & Indexes',
    'Respiratory Events & Patterns','Sensors, Equipment & Standards','Signals, Filters & Instrumentation',
    'Sleep Staging & EEG Clues'
  ]);
  const DISORDER_CATEGORIES=new Set([
    'Central Disorders of Hypersomnolence','Circadian Rhythm Sleep-Wake Disorders','Parasomnias',
    'Sleep Disorders & Clinical Terms','Sleep-Related Breathing Disorders','Sleep-Related Movement Disorders'
  ]);
  const PAP_CATEGORIES=new Set(['Oxygen, CO2 & Units','PAP & Oxygen Therapy']);
  const EXAM_CATEGORIES=new Set(['Exam Strategy & Question Traps']);

  const text=value=>String(value==null?'':value).trim();
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const unique=values=>[...new Set((Array.isArray(values)?values:[]).map(text).filter(Boolean))];

  function referencesForCategory(category){
    const refs=[APA.fundamentals];
    if(SCORING_CATEGORIES.has(category)) refs.unshift(APA.scoring);
    if(DISORDER_CATEGORIES.has(category)) refs.unshift(APA.icsd);
    if(PAP_CATEGORIES.has(category)) refs.unshift(APA.pap);
    if(EXAM_CATEGORIES.has(category)) refs.unshift(APA.brpt);
    return unique(refs);
  }

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function applyOverlay(base,overlay){
    if(!base||!Array.isArray(base.cards)) throw new Error('The archived RPSGT flashcard source is unavailable.');
    if(!overlay||!Array.isArray(overlay.excludeArchivedIds)||!Array.isArray(overlay.addCards)) throw new Error('The reviewed RPSGT flashcard overlay is unavailable.');
    if(Number(overlay.baseArchivedCardCount)!==base.cards.length) throw new Error('The RPSGT flashcard source count does not match the reviewed overlay.');
    const excluded=new Set(overlay.excludeArchivedIds.map(text).filter(Boolean));
    const cards=base.cards.filter(card=>!excluded.has(text(card.id))).map(card=>Object.assign({},card));
    const ids=new Set(cards.map(card=>text(card.id)));
    overlay.addCards.forEach(card=>{
      const id=text(card.id);
      if(!id||ids.has(id)) throw new Error('The reviewed RPSGT flashcard overlay contains a duplicate or missing id.');
      ids.add(id);cards.push(Object.assign({},card));
    });
    const categories=[...new Set(cards.map(card=>text(card.category)).filter(Boolean))];
    if(cards.length!==Number(overlay.expectedFinalCardCount||EXPECTED_CARDS)) throw new Error('The reviewed RPSGT flashcard catalog did not produce 332 cards.');
    if(categories.length!==Number(overlay.expectedFinalCategoryCount||EXPECTED_CATEGORIES)) throw new Error('The reviewed RPSGT flashcard catalog did not produce 19 categories.');
    cards.forEach(card=>{if(!text(card.id)||!text(card.front)||!text(card.back)||!text(card.category)) throw new Error('A reviewed RPSGT flashcard is incomplete.');});
    return {cards,categories};
  }

  function asCurrentCard(card){
    const category=text(card.category)||'RPSGT Review';
    return {
      id:'builtin:v2-'+text(card.id),
      legacyId:text(card.id),
      custom:false,
      category,
      topic:category,
      front:text(card.front),
      back:text(card.back),
      explanation:text(card.explanation),
      memoryClue:text(card.memoryClue||card.trap),
      coachBobNote:text(card.coachBobNote),
      domain:text(card.domain),
      task:text(card.task),
      taskCode:text(card.taskCode),
      recommendedResources:referencesForCategory(category),
      sourceContext:'Reviewed RPSGT V2 flashcard catalog in V3'
    };
  }

  const api={
    VERSION,
    source:'Reviewed 332-card RPSGT V2 inventory, forward-loaded into V3',
    counts:null,
    flashcards:[],
    glossary:[],
    mathLessons:[],
    isReady(){return Boolean(payload);},
    async load(){
      if(payload) return api;
      if(!loading){
        loading=Promise.all([
          loadJson('data/flashcards-v2-extracted.json'),
          loadJson('data/flashcards-v2-current-overlay.json')
        ]).then(([base,overlay])=>{
          const merged=applyOverlay(base,overlay);
          payload=merged;
          api.flashcards=clone(merged.cards);
          api.counts={flashcards:merged.cards.length,categories:merged.categories.length};
          return api;
        }).catch(error=>{loading=null;throw error;});
      }
      return loading;
    },
    flashcardRecords(){
      if(!payload) throw new Error('Load the reviewed RPSGT flashcard catalog before requesting cards.');
      return payload.cards.map(asCurrentCard);
    }
  };

  root.RPSGTV2ForwardCatalog=api;
  root.RPSGTLearningLibrary=api;
})(typeof window!=='undefined'?window:globalThis);
