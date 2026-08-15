(function(root){
  'use strict';

  const RETIRED_QUESTION_RULES=[
    {
      id:'malformed-mbm-scoring-item',
      questionId:'imp-046',
      reason:'Retired from learner use after content review: malformed self-referential answer construction.',
      matches(question){
        if(String(question&&question.id||'')==='imp-046') return true;
        const prompt=String(question&&question.prompt||'').toLowerCase().replace(/\s+/g,' ').trim();
        return prompt.includes('major body movement (mbm) artifact')&&
          prompt.includes('obscures the eeg')&&
          prompt.includes('more than 15 seconds')&&
          prompt.includes('should be scored as');
      }
    }
  ];

  function retirementFor(question){
    return RETIRED_QUESTION_RULES.find(rule=>rule.matches(question))||null;
  }

  function isRetiredQuestion(question){return Boolean(retirementFor(question));}

  function applyQuestionRetirements(payload){
    if(!payload||!Array.isArray(payload.questions)) return payload;
    let changed=false;
    const questions=payload.questions.map(question=>{
      const retirement=retirementFor(question);
      if(!retirement) return question;
      changed=true;
      const qa=question&&question.qa&&typeof question.qa==='object'&&!Array.isArray(question.qa)?{...question.qa}:{};
      qa.manualReviewRecommended=true;
      qa.learnerExcluded=true;
      qa.retirementId=retirement.id;
      qa.retirementReason=retirement.reason;
      return {...question,qa,manualReviewRecommended:true,reviewStatus:'retired'};
    });
    return changed?{...payload,questions}:payload;
  }

  function questionBankUrl(input){
    const value=typeof input==='string'?input:input&&input.url;
    if(!value) return false;
    try{
      const url=new URL(value,root.location&&root.location.href||'https://example.invalid/');
      return /\/data\/question-bank\/[^/]+\.json$/i.test(url.pathname);
    }catch{
      return /data\/question-bank\/[^?#]+\.json(?:[?#]|$)/i.test(String(value));
    }
  }

  function installQuestionBankRetirementFilter(){
    if(typeof root.fetch!=='function'||root.fetch.__spgQuestionRetirementFilter) return;
    const nativeFetch=root.fetch.bind(root);
    const wrapped=async function(input,init){
      const response=await nativeFetch(input,init);
      if(!response||!response.ok||!questionBankUrl(input)) return response;
      let payload;
      try{payload=await response.clone().json();}catch{return response;}
      const next=applyQuestionRetirements(payload);
      if(next===payload) return response;
      const headers=new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      headers.delete('content-length');
      return new Response(JSON.stringify(next),{status:response.status,statusText:response.statusText,headers});
    };
    wrapped.__spgQuestionRetirementFilter=true;
    root.fetch=wrapped;
  }

  function suppressLegacyOptionalShelf(){
    document.getElementById('rpsgt-book-shelf')?.remove();
    document.querySelectorAll('[data-rpsgt-settings-body] .rpsgt-settings-row').forEach(row=>{
      const text=(row.textContent||'').trim();
      if(/optional book suggestions|book preferences/i.test(text)) row.remove();
    });
  }

  function init(){
    suppressLegacyOptionalShelf();
    if(typeof MutationObserver!=='function') return;
    const observer=new MutationObserver(suppressLegacyOptionalShelf);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  root.RPSGTLearnerSurfaceGuard={
    retiredQuestionRules:RETIRED_QUESTION_RULES.map(rule=>({id:rule.id,questionId:rule.questionId,reason:rule.reason})),
    retirementFor,
    isRetiredQuestion,
    applyQuestionRetirements
  };
  installQuestionBankRetirementFilter();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})(typeof globalThis!=='undefined'?globalThis:this);