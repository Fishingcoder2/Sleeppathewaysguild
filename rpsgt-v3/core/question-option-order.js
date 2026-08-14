(function(){
  "use strict";

  const originalFetch=window.fetch.bind(window);
  const sessionSalt=Math.floor(Math.random()*0x7fffffff).toString(36);

  function hash(value){
    let h=2166136261;
    const text=String(value||"");
    for(let i=0;i<text.length;i+=1){
      h^=text.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function seededShuffle(items,seed){
    const copy=items.slice();
    let state=(seed>>>0)||1;
    function next(){
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      return state/0x100000000;
    }
    for(let i=copy.length-1;i>0;i-=1){
      const j=Math.floor(next()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function reorderQuestion(question,index,moduleKey){
    if(!question||!Array.isArray(question.options)||question.options.length<2) return question;
    const answerIndex=question.options.findIndex(option=>option===question.answer);
    if(answerIndex<0) return question;

    const optionCount=question.options.length;
    const identity=String(question.id??question.prompt??index);
    const offset=hash(moduleKey+"|"+sessionSalt)%optionCount;
    const targetIndex=(index+offset)%optionCount;
    const distractors=question.options.filter((_,optionIndex)=>optionIndex!==answerIndex);
    const shuffledDistractors=seededShuffle(distractors,hash(identity+"|"+moduleKey+"|"+sessionSalt));
    const options=[];
    let distractorIndex=0;
    for(let position=0;position<optionCount;position+=1){
      options.push(position===targetIndex?question.answer:shuffledDistractors[distractorIndex++]);
    }
    return Object.assign({},question,{options});
  }

  function reorderPayload(payload,moduleKey){
    if(!payload||!Array.isArray(payload.questions)) return payload;
    return Object.assign({},payload,{
      questions:payload.questions.map((question,index)=>reorderQuestion(question,index,moduleKey))
    });
  }

  function isQuestionBankRequest(input){
    const raw=typeof input==="string"?input:(input&&input.url)||"";
    try{
      const url=new URL(raw,window.location.href);
      return /\/data\/question-bank\/[^/?#]+\.json$/i.test(url.pathname)&&!/\/manifest\.json$/i.test(url.pathname);
    }catch(_error){
      return /data\/question-bank\/[^/?#]+\.json/i.test(raw)&&!/manifest\.json/i.test(raw);
    }
  }

  window.fetch=async function(input,init){
    const response=await originalFetch(input,init);
    if(!isQuestionBankRequest(input)||!response.ok) return response;
    const requestKey=typeof input==="string"?input:(input&&input.url)||"question-bank";
    return new Proxy(response,{
      get(target,property){
        if(property==="json"){
          return async function(){
            const payload=await target.clone().json();
            return reorderPayload(payload,requestKey);
          };
        }
        const value=Reflect.get(target,property,target);
        return typeof value==="function"?value.bind(target):value;
      }
    });
  };

  window.RPSGTQuestionOptionOrder={reorderQuestion,reorderPayload,sessionSalt};
})();
