(function(){
  'use strict';
  if(window.RPSGTInlineQuestionSet)return;
  const COUNT=5;
  const state={overlay:null,card:null,questions:[],index:0,answers:new Map(),seen:new Set(),source:null,loading:false,origin:null,title:'',previousOverflow:'',lastFocus:null};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const validCode=code=>/^D[1-4][A-D]$/.test(String(code||'').toUpperCase());
  const codeOf=value=>String(value||'').trim().toUpperCase();
  const normalizeStem=value=>String(value||'').toLowerCase().replace(/^\s*(?:practice\s*)?(?:item|question)\s*#?\d+\s*[:.)-]?\s*/,'').replace(/\s+/g,' ').replace(/[^a-z0-9 ]/g,'').trim();
  const unique=list=>[...new Set(list.filter(validCode).map(codeOf))];
  function eligible(q,code){
    if(!q||q.taskCode!==code||q.learnerExcluded===true||q.reviewStatus==='retired')return false;
    if(q.qa&&(q.qa.learnerExcluded===true||q.qa.manualReviewRecommended===true))return false;
    return typeof q.prompt==='string'&&q.prompt.trim().length>9&&Array.isArray(q.options)&&q.options.length>=2&&q.options.every(x=>String(x||'').trim())&&q.options.includes(q.answer);
  }
  function shuffle(list){
    const copy=list.slice();
    for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
    return copy;
  }
  function recentIdsAndStems(saved,all){
    const history=((saved||{}).progress||{}).history||[];
    const ids=new Set(history.slice(-200).map(h=>String(h.questionId)));
    const known=new Map(all.map(q=>[String(q.id),normalizeStem(q.prompt)]));
    const stems=new Set([...ids].map(id=>known.get(id)).filter(Boolean));
    return {ids,stems};
  }
  async function resolveTasks(link){
    const url=new URL(link.getAttribute('href')||'practice.html',location.href);
    const targeted=codeOf(url.searchParams.get('task')||link.dataset.questionSetTask);
    if(validCode(targeted))return [targeted];
    const saved=window.RPSGTStorage&&window.RPSGTStorage.load();
    const focused=codeOf(saved&&saved.guidedStudy&&saved.guidedStudy.trailFocus&&saved.guidedStudy.trailFocus.task);
    if(document.body.dataset.module==='study'){
      if(validCode(focused))return [focused];
      const awards=saved&&saved.guidedStudy&&saved.guidedStudy.trailAwards&&saved.guidedStudy.trailAwards.tasks||{};
      const completed=unique(Object.keys(awards));
      if(completed.length)return completed.slice(-3);
    }
    const path=location.pathname.split('/').pop();
    const result=await fetch('data/labs/catalog.json',{cache:'no-store'});
    if(!result.ok)throw Error('Unable to load the skill-to-task map.');
    const catalog=await result.json();
    const lab=(catalog.labs||[]).find(item=>item.plannedRoute===path);
    if(lab)return unique(lab.taskCodes||[]);
    return [];
  }
  async function loadQuestions(codes){
    const modules=await Promise.all(codes.map(async code=>{
      const response=await fetch('data/question-bank/'+code.toLowerCase()+'.json',{cache:'no-store'});
      if(!response.ok)throw Error('Question data for '+code+' is unavailable.');
      const data=await response.json();
      return (data.questions||[]).filter(question=>eligible(question,code));
    }));
    const pool=modules.flat(),saved=window.RPSGTStorage&&window.RPSGTStorage.load();
    const {ids,stems}=recentIdsAndStems(saved,pool);
    const seenIds=new Set(),seenStems=new Set(),chosen=[];
    const byTask=new Map(codes.map((code,index)=>[code,shuffle(modules[index])]));
    function take(freshOnly){
      let changed=true;
      while(chosen.length<COUNT&&changed){
        changed=false;
        for(const code of codes){
          const pack=byTask.get(code)||[];
          const at=pack.findIndex(question=>{
            const stem=normalizeStem(question.prompt);
            return !seenIds.has(String(question.id))&&!seenStems.has(stem)&&
              (!freshOnly||(!ids.has(String(question.id))&&!stems.has(stem)));
          });
          if(at<0)continue;
          const q=pack.splice(at,1)[0],stem=normalizeStem(q.prompt);
          chosen.push(q);seenIds.add(String(q.id));seenStems.add(stem);changed=true;
          if(chosen.length===COUNT)break;
        }
      }
    }
    take(true);
    take(false);
    return chosen;
  }
  function ensureModal(){
    if(state.overlay)return;
    const overlay=document.createElement('div');
    overlay.className='spg-quick-question-backdrop';overlay.hidden=true;
    overlay.innerHTML='<section class="spg-quick-question-dialog" role="dialog" aria-modal="true" aria-labelledby="spg-quick-question-title" tabindex="-1"><header class="spg-quick-question-header"><div><span class="eyebrow">Guided question set</span><h2 id="spg-quick-question-title">Related practice questions</h2></div><button type="button" data-quick-set-close aria-label="Close question set">✕</button></header><div class="spg-quick-question-body" data-quick-set-body aria-live="polite"></div><footer class="spg-quick-question-footer"><button type="button" class="btn secondary" data-quick-set-previous>Previous</button><span data-quick-set-counter></span><button type="button" class="btn primary" data-quick-set-next>Check answer</button></footer></section>';
    document.body.appendChild(overlay);
    state.overlay=overlay;state.card=overlay.querySelector('.spg-quick-question-dialog');
    overlay.addEventListener('click',event=>{
      if(event.target===overlay){close();return;}
      if(event.target.closest('[data-quick-set-close]')){close();return;}
      const select=event.target.closest('[data-quick-set-option]');
      if(select){selectAnswer(Number(select.dataset.quickSetOption));return;}
      if(event.target.closest('[data-quick-set-next]')){next();return;}
      if(event.target.closest('[data-quick-set-previous]')){if(state.index>0){state.index--;render();}return;}
      if(event.target.closest('[data-quick-set-restart]')){reopen();return;}
    });
  }
  function lockScroll(){
    state.previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
  }
  function close(){
    if(!state.overlay||state.overlay.hidden)return;
    state.overlay.hidden=true;
    document.body.style.overflow=state.previousOverflow;
    // Progress updates may replace the "Next best action" link while this
    // dialog is open. Restore focus to the current link if the original moved.
    const links=[state.origin,...document.querySelectorAll(
      '[data-route-recommendation] a[href], [data-sidebar-next] a[href], .main a[href], .mobile-nav a[href]'
    )].filter(Boolean);
    const visible=links.find(item=>document.contains(item)&&item.getClientRects().length>0&&
      window.getComputedStyle(item).visibility!=='hidden');
    const focusTarget=visible||document.querySelector('main');
    if(focusTarget&&typeof focusTarget.focus==='function'){
      if(focusTarget.tagName==='MAIN')focusTarget.tabIndex=-1;
      focusTarget.focus({preventScroll:true});
    }
    state.source=null;state.loading=false;
  }
  function announce(message){
    const body=state.overlay.querySelector('[data-quick-set-body]');
    body.innerHTML='<p class="spg-quick-set-message">'+esc(message)+'</p>';
    state.overlay.querySelector('[data-quick-set-previous]').hidden=true;
    state.overlay.querySelector('[data-quick-set-next]').hidden=true;
    state.overlay.querySelector('[data-quick-set-counter]').textContent='';
  }
  async function start(link){
    if(state.loading)return;
    state.loading=true;state.origin=link;
    ensureModal();if(state.overlay.hidden){state.overlay.hidden=false;lockScroll();}state.selected=null;
    state.card.focus();announce('Loading related questions…');
    try{
      const codes=await resolveTasks(link);
      if(!codes.length)throw Error('No specific BRPT task could be identified for this activity.');
      const questions=await loadQuestions(codes);
      if(!questions.length)throw Error('No reviewed practice questions are available for this topic.');
      state.questions=questions;state.index=0;state.answers=new Map();
      state.title=codes.join(' · ');state.codes=codes;render();
    }catch(err){announce(err.message||'This question set could not be opened.');}
    finally{state.loading=false;}
  }
  function selectAnswer(index){
    const question=state.questions[state.index];
    if(!question||state.answers.has(String(question.id))||index<0||index>=question.options.length)return;
    state.selected=index;
    render();
  }
  function record(question,selected){
    const storage=window.RPSGTStorage;
    if(!storage)return;
    const saved=storage.load();
    saved.progress=saved.progress||{};saved.progress.byDomain=saved.progress.byDomain||{};saved.progress.byTask=saved.progress.byTask||{};
    saved.progress.history=Array.isArray(saved.progress.history)?saved.progress.history:[];
    saved.review=saved.review||{};saved.review.missedIds=Array.isArray(saved.review.missedIds)?saved.review.missedIds:[];
    saved.review.masteredIds=Array.isArray(saved.review.masteredIds)?saved.review.masteredIds:[];
    const answer=question.options[selected],correct=answer===question.answer;
    saved.progress.answered=Number(saved.progress.answered||0)+1;
    saved.progress.correct=Number(saved.progress.correct||0)+(correct?1:0);
    for(const [code,key] of [[question.domain||String(question.taskCode).slice(0,2),'byDomain'],[question.taskCode,'byTask']]){
      const bucket=saved.progress[key][code]||{answered:0,correct:0};
      bucket.answered=Number(bucket.answered||0)+1;
      bucket.correct=Number(bucket.correct||0)+(correct?1:0);
      saved.progress[key][code]=bucket;
    }
    saved.progress.history.push({questionId:question.id,domain:question.domain||String(question.taskCode).slice(0,2),taskCode:question.taskCode,difficulty:question.difficulty||null,correct,selectedAnswer:answer,answeredAt:new Date().toISOString(),source:'v3-inline-question-set',pool:'learner'});
    if(saved.progress.history.length>2500)saved.progress.history=saved.progress.history.slice(-2500);
    const id=String(question.id);
    saved.review.missedIds=saved.review.missedIds.filter(item=>String(item)!==id);
    saved.review.masteredIds=saved.review.masteredIds.filter(item=>String(item)!==id);
    if(correct)saved.review.masteredIds.push(question.id);
    else saved.review.missedIds.push(question.id);
    storage.save(saved);
    window.RPSGTApp&&window.RPSGTApp.refresh&&window.RPSGTApp.refresh();
  }
  function next(){
    const question=state.questions[state.index];
    if(!question){close();return;}
    const id=String(question.id);
    if(!state.answers.has(id)){
      if(!Number.isInteger(state.selected))return;
      state.answers.set(id,state.selected);
      record(question,state.selected);
      render();return;
    }
    if(state.index===state.questions.length-1){state.index=state.questions.length;render();return;}
    state.index++;state.selected=null;render();
  }
  function render(){
    const body=state.overlay.querySelector('[data-quick-set-body]');
    const previous=state.overlay.querySelector('[data-quick-set-previous]');
    const nextButton=state.overlay.querySelector('[data-quick-set-next]');
    const counter=state.overlay.querySelector('[data-quick-set-counter]');
    previous.hidden=false;nextButton.hidden=false;
    if(state.index>=state.questions.length){
      const correct=state.questions.filter(q=>state.answers.get(String(q.id))!==undefined&&q.options[state.answers.get(String(q.id))]===q.answer).length;
      body.innerHTML='<div class="spg-quick-set-results"><h3>Question set complete</h3><p class="spg-quick-set-score">'+correct+' / '+state.questions.length+' correct · '+Math.round(100*correct/state.questions.length)+'%</p><p>Your answers have been added to Practice progress and Missed Question Review.</p><button class="btn secondary" type="button" data-quick-set-restart>Another question set</button></div>';
      counter.textContent='Completed';previous.hidden=true;nextButton.hidden=true;
      return;
    }
    const question=state.questions[state.index],saved=state.answers.get(String(question.id)),graded=saved!==undefined;
    if(graded)state.selected=saved;
    const correct=graded&&question.options[saved]===question.answer;
    const rationale=String(question.rationale||'Review the relevant textbook or current guideline for this task.');
    counter.textContent=(state.index+1)+' / '+state.questions.length;
    nextButton.textContent=graded?(state.index===state.questions.length-1?'View results':'Next question'):'Check answer';
    nextButton.disabled=!graded&&!Number.isInteger(state.selected);
    previous.disabled=state.index===0;
    body.innerHTML='<div class="spg-quick-set-context">'+esc(state.title)+' · Question '+(state.index+1)+' of '+state.questions.length+'</div>'+
      '<p class="spg-quick-set-prompt">'+esc(question.prompt)+'</p><fieldset class="spg-quick-set-options"><legend class="sr-only">Choose one answer</legend>'+
      question.options.map((option,index)=>{
        let cls='';
        if(graded&&option===question.answer)cls=' is-correct';
        else if(graded&&index===saved&&!correct)cls=' is-incorrect';
        else if(!graded&&index===state.selected)cls=' is-selected';
        return '<button type="button" class="spg-quick-set-option'+cls+'" data-quick-set-option="'+index+'" aria-pressed="'+(!graded&&index===state.selected?'true':'false')+'" '+(graded?'disabled':'')+'><span class="spg-quick-set-letter">'+String.fromCharCode(65+index)+'</span>'+esc(option)+'</button>';
      }).join('')+'</fieldset>'+
      (graded?'<section class="spg-quick-set-feedback"><strong>'+(correct?'Correct':'Review this answer')+'</strong><p><b>Correct answer:</b> '+esc(question.answer)+'</p><p>'+esc(rationale)+'</p></section>':'');
    body.scrollTop=0;
  }
  function reopen(){
    if(!state.source)return;
    state.answers=new Map();state.selected=null;state.index=0;
    const link=state.source;
    start(link);
  }
  function shouldHandle(link){
    if(!link||!link.getAttribute('href')||link.hasAttribute('download')||link.target==='_blank')return false;
    if(link.closest('.sidebar,.mobile-nav,.top-actions'))return false;
    const href=link.getAttribute('href'),label=link.textContent.trim();
    if(/^practice\.html\?task=D[1-4][A-D](?:[&#]|$)/i.test(href))return true;
    return href==='practice.html'&&/^(Practice Related Items|Practice Your Badges)$/i.test(label);
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest&&event.target.closest('a[href]');
    if(!shouldHandle(link)||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;
    event.preventDefault();
    // The app shell remembers clicked navigation links. Do not record a
    // Practice page visit when this task stays in its original lesson.
    event.stopPropagation();
    if(state.overlay&&!state.overlay.hidden)return;
    state.source=link;start(link);
  },true);
  document.addEventListener('keydown',event=>{
    if(!state.overlay||state.overlay.hidden)return;
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key==='Tab'){
      const items=[...state.card.querySelectorAll('button:not(:disabled):not([hidden]),a[href],input:not(:disabled)')].filter(el=>el.offsetParent!==null);
      if(!items.length){event.preventDefault();return;}
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  window.RPSGTInlineQuestionSet={COUNT,shouldHandle,close};
})();