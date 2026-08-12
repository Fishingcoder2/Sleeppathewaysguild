(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTPracticeCoach=api;
  if(root&&root.document){
    const start=()=>api.mount(root);
    if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',start); else start();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const clean=value=>String(value==null?'':value).replace(/\uFFFD/g,'').trim();
  const esc=value=>clean(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function priorPracticeMisses(storage,questionId,currentIncorrect){
    if(!storage||typeof storage.load!=='function') return 0;
    try{
      const saved=storage.load();
      const history=saved&&saved.progress&&Array.isArray(saved.progress.history)?saved.progress.history:[];
      const misses=history.reduce((sum,record)=>{
        if(!record||String(record.questionId)!==String(questionId)||record.correct!==false) return sum;
        if(record.source&&record.source!=='v3-practice-full-bank') return sum;
        if(record.pool&&record.pool!=='learner') return sum;
        return sum+1;
      },0);
      return Math.max(0,misses-(currentIncorrect?1:0));
    }catch(error){return 0;}
  }

  function mount(root){
    const document=root&&root.document;
    const coach=root&&root.RPSGTCoachBobEngine;
    const resources=root&&root.RPSGTStudyResourceCatalog;
    const storage=root&&root.RPSGTStorage;
    if(!document||!coach) return false;

    const state={question:null,renderToken:0};
    const host=()=>document.querySelector('[data-practice-coach]');

    async function resourceTitles(question){
      if(!resources) return [];
      try{
        await resources.load();
        const result=resources.resolveQuestion(question);
        return Array.isArray(result&&result.titles)?result.titles:[];
      }catch(error){return [];}
    }

    function selectedAnswer(){
      const selected=document.querySelector('[data-choice-index].selected span:last-child');
      return selected?clean(selected.textContent):'No answer selected';
    }

    function reviewHtml(payload,question,correct,selected){
      const sources=payload.resources.length
        ?`<div class="practice-coach-sources"><strong>Verified study resources</strong><ul>${payload.resources.map(title=>`<li>${esc(title)}</li>`).join('')}</ul></div>`
        :'';
      return `<p><strong>Exam trap:</strong> ${esc(payload.examTrap)}</p>
        <p><strong>PSG connection:</strong> ${esc(payload.practiceConnection)}</p>
        <dl class="practice-coach-review-list"><div><dt>Your answer</dt><dd>${esc(selected)}</dd></div><div><dt>Correct answer</dt><dd>${esc(question.answer)}</dd></div></dl>
        ${payload.rationale?`<p><strong>Why:</strong> ${esc(payload.rationale)}</p>`:''}
        ${payload.whyTricky?`<p><strong>Why it is tricky:</strong> ${esc(payload.whyTricky)}</p>`:''}
        ${sources}
        <p class="practice-coach-next"><strong>Next move:</strong> ${esc(payload.nextAction)}</p>
        ${!correct&&payload.repeatPattern?'<p class="practice-coach-repeat"><strong>Repeat pattern:</strong> You have missed this item before in Practice. Repair the reasoning step before memorizing the answer.</p>':''}`;
    }

    function panelHtml(payload,question,submitted,correct,selected){
      const body=submitted
        ?reviewHtml(payload,question,correct,selected)
        :`<p class="practice-coach-next"><strong>Next move:</strong> ${esc(payload.nextAction)}</p><p class="practice-coach-boundary">This hint guides your reasoning without revealing the answer.</p>`;
      return `<details class="practice-coach-panel" data-practice-coach-panel${submitted?' open':''}>
        <summary class="practice-coach-summary" data-practice-coach-summary>
          <span class="status gold">${esc(payload.label)}</span>
          <span>${esc(payload.headline)}</span>
        </summary>
        <div class="practice-coach-body">
          <p class="practice-coach-note"><strong>Coach Bob:</strong> ${esc(payload.mentorMessage)}</p>
          <div class="practice-coach-compass"><strong>Reasoning Compass · ${esc(payload.compass.label)}</strong><p>${esc(payload.compass.prompt)}</p></div>
          ${body}
        </div>
      </details>`;
    }

    async function render(question,phase,{correct=false,selected='No answer selected',focus=false}={}){
      const target=host();
      if(!target||!question) return;
      const token=++state.renderToken;
      const titles=await resourceTitles(question);
      if(token!==state.renderToken||!target.isConnected||state.question!==question) return;
      const currentIncorrect=phase==='incorrect';
      const payload=coach.build({
        question,
        phase,
        resources:titles,
        priorMisses:priorPracticeMisses(storage,question.id,currentIncorrect)
      });
      const submitted=phase!=='pre';
      target.innerHTML=panelHtml(payload,question,submitted,correct,selected);
      target.dataset.coachBobEngineVersion=payload.version;
      if(focus&&submitted){
        const summary=target.querySelector('[data-practice-coach-summary]');
        const schedule=typeof root.requestAnimationFrame==='function'?root.requestAnimationFrame.bind(root):callback=>root.setTimeout(callback,0);
        schedule(()=>{if(summary&&summary.isConnected) summary.focus({preventScroll:false});});
      }
    }

    function renderPre(question){
      state.question=question;
      render(question,'pre').catch(error=>console.warn('Coach Bob Practice hint was not rendered.',error));
    }

    function renderScored({focus=true}={}){
      const question=state.question;
      if(!question) return;
      const feedback=document.querySelector('[data-answer-feedback]');
      if(!feedback||feedback.classList.contains('hidden')) return;
      const correct=feedback.classList.contains('correct');
      render(question,correct?'correct':'incorrect',{correct,selected:selectedAnswer(),focus})
        .catch(error=>console.warn('Coach Bob Practice review was not rendered.',error));
    }

    document.addEventListener('rpsgt:practice-question',event=>{
      const question=event&&event.detail&&event.detail.question;
      if(!question) return;
      state.question=question;
      const feedback=document.querySelector('[data-answer-feedback]');
      if(feedback&&!feedback.classList.contains('hidden')) renderScored({focus:false});
      else renderPre(question);
    });
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-submit-answer]')) queueMicrotask(()=>renderScored({focus:true}));
    });
    if(resources) resources.load().catch(()=>null);
    return true;
  }

  return {mount,priorPracticeMisses};
});
