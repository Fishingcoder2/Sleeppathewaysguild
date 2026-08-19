(function(){
'use strict';
const STAGE_ORDER=['W','N1','N2','N3','R'];
let originalRandom=null;
function preservePackOrderForStageStart(event){
  if(!event.target.closest('[data-scoring-stage-start]')||originalRandom)return;
  originalRandom=Math.random;
  Math.random=()=>0.999999999;
  queueMicrotask(()=>{
    if(originalRandom){Math.random=originalRandom;originalRandom=null;}
  });
}
document.addEventListener('click',preservePackOrderForStageStart,true);
window.RPSGTScoringStageOrder={STAGE_ORDER:STAGE_ORDER.slice()};
})();
