(function(root){
  'use strict';
  const BASE_PATH='data/flashcards-v2-extracted.json';
  const OVERLAY_PATH='data/flashcards-v2-current-overlay.json';
  const EXPECTED_CARD_COUNT=332;
  const EXPECTED_CATEGORY_COUNT=19;
  let payload=null;
  let loading=null;
  const text=value=>String(value==null?'':value).trim();
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  async function getJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
  function applyOverlay(base,overlay){
    if(!base||!Array.isArray(base.cards))throw new Error('Archived flashcard source unavailable.');
    if(!overlay||!Array.isArray(overlay.excludeArchivedIds)||!Array.isArray(overlay.addCards))throw new Error('Reviewed flashcard overlay unavailable.');
    const excluded=new Set(overlay.excludeArchivedIds.map(text));
    const cards=base.cards.filter(card=>!excluded.has(text(card.id))).map(card=>Object.assign({},card));
    const ids=new Set(cards.map(card=>text(card.id)));
    overlay.addCards.forEach(card=>{const id=text(card.id);if(!id||ids.has(id))throw new Error('Duplicate reviewed flashcard id.');ids.add(id);cards.push(Object.assign({},card));});
    const categories=[...new Set(cards.map(card=>text(card.category)).filter(Boolean))];
    if(cards.length!==Number(overlay.expectedFinalCardCount||EXPECTED_CARD_COUNT))throw new Error('Reviewed flashcard inventory did not produce 332 cards.');
    if(categories.length!==Number(overlay.expectedFinalCategoryCount||EXPECTED_CATEGORY_COUNT))throw new Error('Reviewed flashcard inventory did not produce 19 categories.');
    cards.forEach(card=>{if(!text(card.id)||!text(card.front)||!text(card.back)||!text(card.category))throw new Error('A reviewed flashcard is incomplete.');});
    return {cards,categories};
  }
  const api={
    VERSION:'2026-08-27-v2-reviewed-json-1',
    cards:[],
    categories:[],
    async load(){
      if(payload)return api;
      if(!loading)loading=Promise.all([getJson(BASE_PATH),getJson(OVERLAY_PATH)]).then(([base,overlay])=>{payload=applyOverlay(base,overlay);api.cards=clone(payload.cards);api.categories=clone(payload.categories);return api;}).catch(error=>{loading=null;throw error;});
      return loading;
    },
    asV3Cards(){if(!payload)throw new Error('Load the reviewed flashcard library first.');return clone(payload.cards);},
    seed(){return api.load();}
  };
  root.RPSGTV2FlashcardLibrary=api;
})(typeof window!=='undefined'?window:globalThis);
