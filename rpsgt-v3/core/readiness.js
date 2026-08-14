(function(){
  "use strict";

  const engine=window.RPSGTReadinessEngine;
  const questionActions=window.RPSGTPracticeQuestionActions;
  const flashcards=window.RPSGTFlashcardStore;
  const flashcardEngine=window.RPSGTFlashcardEngine;
  const state={manifest:null,blueprint:null,moduleCache:new Map(),taskMap:new Map(),bank:[],questions:[],active:null,selected:null,answered:false,correct:0,answeredCount:0};
  const $=selector=>document.querySelector(selector);
  const $all=selector=>Array.from(document.querySelectorAll(selector));
  const escapeHtml=value=>String(value==null?"":value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

  async function loadJson(path){
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok) throw new Error(path+" HTTP "+response.status);
    return response.json();
  }

  function storageState(){return window.RPSGTStorage.load();}
  function readinessRecord(saved){
    if(!saved.readiness||typeof saved.readiness!=="object") saved.readiness={history:[],activeSession:null};
    if(!Array.isArray(saved.readiness.history)) saved.readiness.history=[];
    return saved.readiness;
  }

  function saveActive(){
    if(!state.active) return;
    const saved=storageState();
    readinessRecord(saved).activeSession=state.active;
    window.RPSGTStorage.save(saved);
  }

  function clearActive(){
    const saved=storageState();
    readinessRecord(saved).activeSession=null;
    window.RPSGTStorage.save(saved);
    state.active=null;
  }

  function buildTaskMap(){
    (state.blueprint.domains||[]).forEach(domain=>(domain.tasks||[]).forEach(task=>state.taskMap.set(task.code,task)));
  }

  function renderAllocations(){
    $all("[data-allocation]").forEach(host=>{
      const size=Number(host.dataset.allocation);
      const counts=engine.allocateCounts(size,state.blueprint.domains||[]);
      host.innerHTML=Object.keys(counts).map(domain=>`<span>${escapeHtml(domain)} ${counts[domain]}</span>`).join("");
    });
  }

  function renderHistory(){
    const saved=storageState();
    const history=readinessRecord(saved).history;
    $("[data-readiness-history-count]").textContent=history.length+" saved";
    const host=$("[data-readiness-history]");
    if(!history.length){host.innerHTML='<div class="empty">No readiness checks are saved yet. Start with the recommended 50-question run.</div>';return;}
    host.innerHTML='<div class="readiness-history-list">'+history.slice(0,8).map(result=>{
      const date=result.completedAt?new Date(result.completedAt).toLocaleString():"Saved result";
      return `<div class="readiness-history-row"><div><strong>${escapeHtml(result.size)}-question readiness</strong><small>${escapeHtml(date)}</small></div><div><strong>${escapeHtml(result.percent)}%</strong><small>raw score</small></div><div><strong>${escapeHtml(result.weightedPercent)}%</strong><small>study-weighted</small></div></div>`;
    }).join("")+'</div>';
  }

  function showHome(){
    $("[data-readiness-home]").classList.remove("hidden");
    $("[data-readiness-shell]").classList.add("hidden");
    $("[data-readiness-results]").classList.add("hidden");
    renderHistory();
  }

  async function loadModule(meta){
    if(state.moduleCache.has(meta.path)) return state.moduleCache.get(meta.path);
    const data=await loadJson("data/question-bank/"+meta.path);
    const questions=Array.isArray(data.questions)?data.questions:[];
    state.moduleCache.set(meta.path,questions);
    return questions;
  }

  async function loadLearnerBank(){
    if(state.bank.length) return state.bank;
    const directModules=(state.manifest.modules||[]).filter(meta=>engine.DIRECT_TASKS.includes(meta.taskCode));
    const packages=await Promise.all(directModules.map(loadModule));
    state.bank=packages.flat().filter(engine.isEligible);
    return state.bank;
  }

  function sessionQuestionsFromIds(ids){
    const wanted=new Map((ids||[]).map((id,index)=>[String(id),index]));
    return state.bank.filter(question=>wanted.has(String(question.id))).sort((a,b)=>wanted.get(String(a.id))-wanted.get(String(b.id)));
  }

  function calculateSessionStats(){
    if(!state.active) return {answered:0,correct:0,percent:0};
    const answers=state.active.answers||{};
    let correct=0;
    Object.keys(answers).forEach(id=>{
      const question=state.questions.find(item=>String(item.id)===String(id));
      if(question&&answers[id]===question.answer) correct+=1;
    });
    const answered=Object.keys(answers).length;
    return {answered,correct,percent:answered?Math.round(correct/answered*100):0};
  }

  function updateSessionStats(){
    const stats=calculateSessionStats();
    state.answeredCount=stats.answered;
    state.correct=stats.correct;
    $("[data-session-answered]").textContent=stats.answered;
    $("[data-session-correct]").textContent=stats.correct;
    $("[data-session-accuracy]").textContent=stats.percent+"%";
    $("[data-session-size]").textContent=state.active?state.active.questionIds.length:0;
    const position=state.active?Math.min(state.active.index+1,state.active.questionIds.length):0;
    $("[data-readiness-progress]").style.width=(state.active&&state.active.questionIds.length?Math.round(position/state.active.questionIds.length*100):0)+"%";
  }

  function currentQuestion(){return state.active?state.questions[state.active.index]||null:null;}
  function questionId(question){return String(question&&question.id!=null?question.id:"");}

  function createChoice(option,index){
    const button=document.createElement("button");
    button.type="button";
    button.className="practice-choice";
    button.dataset.choiceIndex=String(index);
    button.setAttribute("aria-pressed","false");
    const marker=document.createElement("span");
    marker.className="choice-marker";
    marker.textContent=String.fromCharCode(65+index);
    const text=document.createElement("span");
    text.textContent=option;
    button.append(marker,text);
    button.addEventListener("click",()=>selectChoice(index));
    return button;
  }

  function setActionStatus(message){
    const host=$("[data-readiness-action-status]");
    if(host) host.textContent=message||"";
  }

  function ensureReview(saved){
    saved.review=saved.review&&typeof saved.review==="object"?saved.review:{};
    if(!Array.isArray(saved.review.flaggedIds)) saved.review.flaggedIds=[];
    return saved.review;
  }

  function hasId(list,id){
    return Array.isArray(list)&&list.some(value=>String(value)===String(id));
  }

  function updateQuestionTools(question){
    if(!question) return;
    const saved=storageState();
    const review=ensureReview(saved);
    const flagged=hasId(review.flaggedIds,question.id);
    const flagButton=$("[data-flag-question]");
    if(flagButton){
      flagButton.textContent=flagged?"Unflag question":"Flag question";
      flagButton.classList.toggle("active",flagged);
      flagButton.setAttribute("aria-pressed",flagged?"true":"false");
    }
    const cardButton=$("[data-make-flashcard]");
    if(cardButton&&flashcardEngine){
      const cardId=flashcardEngine.cardId({questionId:question.id});
      const exists=Boolean(saved.flashcards&&saved.flashcards.cards&&saved.flashcards.cards[cardId]);
      cardButton.textContent=exists?"Flashcard saved":"Make flashcard";
      cardButton.classList.toggle("active",exists);
      cardButton.setAttribute("aria-pressed",exists?"true":"false");
    }
  }

  function toggleFlag(){
    const question=currentQuestion();
    if(!question||!questionActions) return;
    const enabled=questionActions.toggleReview(window.RPSGTStorage,question.id,"flaggedIds");
    updateQuestionTools(question);
    setActionStatus(enabled?"Question added to your flagged queue.":"Question removed from your flagged queue.");
  }

  function makeFlashcard(){
    const question=currentQuestion();
    if(!question||!questionActions||!flashcards) return;
    const result=questionActions.saveFlashcard(
      flashcards,
      question,
      {recommendedResources:[],sourceContext:"Readiness Check"},
      new Date().toISOString()
    );
    updateQuestionTools(question);
    setActionStatus(result.created?"Flashcard saved in the RPSGT Flashcard Center.":"This question is already in your flashcard deck.");
  }

  function selectedAnswerFor(question){
    if(state.selected===null||!question) return null;
    return question.options[state.selected]??null;
  }

  function selectChoice(index){
    if(state.answered) return;
    const question=currentQuestion();
    if(!question) return;
    state.selected=index;
    state.active.drafts=state.active.drafts&&typeof state.active.drafts==="object"?state.active.drafts:{};
    state.active.drafts[questionId(question)]=question.options[index];
    state.active.updatedAt=new Date().toISOString();
    saveActive();
    $all("[data-choice-index]").forEach(button=>{
      const selected=Number(button.dataset.choiceIndex)===index;
      button.classList.toggle("selected",selected);
      button.setAttribute("aria-pressed",selected?"true":"false");
    });
    updateNavigation();
  }

  function referenceHref(question){
    const params=new URLSearchParams();
    if(question&&question.taskCode) params.set("task",question.taskCode);
    if(question&&question.topic) params.set("topic",question.topic);
    const query=params.toString();
    return "sources-disclosures.html"+(query?"?"+query:"");
  }

  function renderFeedback(question,selectedAnswer,isCorrect){
    const feedback=$("[data-answer-feedback]");
    const summary=$("[data-answer-feedback-summary]");
    const body=$("[data-answer-feedback-body]");
    if(!feedback||!summary||!body) return;
    feedback.className="answer-feedback readiness-answer-feedback "+(isCorrect?"correct":"incorrect");
    feedback.open=false;
    summary.textContent=isCorrect?"Correct — open answer & reasoning":"Review this one — open answer & reasoning";
    const answerReview=document.createElement("dl");
    answerReview.className="readiness-answer-review";
    const yourWrap=document.createElement("div");
    const yourTerm=document.createElement("dt");
    yourTerm.textContent="Your answer";
    const yourValue=document.createElement("dd");
    yourValue.textContent=selectedAnswer;
    yourWrap.append(yourTerm,yourValue);
    const correctWrap=document.createElement("div");
    const correctTerm=document.createElement("dt");
    correctTerm.textContent="Correct answer";
    const correctValue=document.createElement("dd");
    correctValue.textContent=question.answer;
    correctWrap.append(correctTerm,correctValue);
    answerReview.append(yourWrap,correctWrap);
    const rationale=document.createElement("p");
    rationale.className="readiness-reasoning-copy";
    const label=document.createElement("strong");
    label.textContent="Reasoning: ";
    rationale.append(label,document.createTextNode(question.rationale||"Review the question stem and compare each option with the concept being tested."));
    const related=document.createElement("a");
    related.className="readiness-reference-link";
    related.href=referenceHref(question);
    related.textContent="Related reference materials";
    body.replaceChildren(answerReview,rationale,related);
  }

  function hideFeedback(){
    const feedback=$("[data-answer-feedback]");
    const body=$("[data-answer-feedback-body]");
    if(feedback){
      feedback.className="answer-feedback hidden";
      feedback.open=false;
    }
    if(body) body.replaceChildren();
  }

  function revealAnswer(question,selectedAnswer){
    const isCorrect=selectedAnswer===question.answer;
    state.answered=true;
    state.selected=question.options.indexOf(selectedAnswer);
    $all("[data-choice-index]").forEach(button=>{
      const option=question.options[Number(button.dataset.choiceIndex)];
      button.disabled=true;
      button.classList.toggle("selected",option===selectedAnswer);
      button.classList.toggle("correct",option===question.answer);
      button.classList.toggle("incorrect",option===selectedAnswer&&!isCorrect);
      button.setAttribute("aria-pressed",option===selectedAnswer?"true":"false");
    });
    renderFeedback(question,selectedAnswer,isCorrect);
    updateNavigation();
  }

  function updateNavigation(){
    const previous=$("[data-previous-question]");
    const next=$("[data-next-question]");
    if(previous) previous.disabled=!state.active||state.active.index===0;
    if(next){
      const last=Boolean(state.active&&state.active.index===state.active.questionIds.length-1);
      next.disabled=!state.answered&&state.selected===null;
      next.textContent=state.answered&&last?"View readiness result":"Next question";
    }
  }

  function renderQuestion(){
    const question=currentQuestion();
    if(!question){finishReadiness();return;}
    state.selected=null;
    state.answered=false;
    setActionStatus("");
    $("[data-question-number]").textContent="Question "+(state.active.index+1)+" of "+state.active.questionIds.length;
    $("[data-question-task]").textContent=question.taskCode+" · "+question.topic;
    $("[data-question-difficulty]").textContent=question.difficulty+" · "+question.questionType;
    $("[data-question-prompt]").textContent=engine.displayPrompt(question);
    const choices=$("[data-question-choices]");
    choices.innerHTML="";
    question.options.forEach((option,index)=>choices.appendChild(createChoice(option,index)));
    hideFeedback();

    state.active.answers=state.active.answers&&typeof state.active.answers==="object"?state.active.answers:{};
    state.active.drafts=state.active.drafts&&typeof state.active.drafts==="object"?state.active.drafts:{};
    const key=questionId(question);
    const prior=state.active.answers[key];
    const draft=state.active.drafts[key];
    if(prior!==undefined&&prior!==null&&prior!==""){
      revealAnswer(question,prior);
    }else if(draft!==undefined&&draft!==null&&draft!==""){
      const index=question.options.indexOf(draft);
      if(index>=0){
        state.selected=index;
        $all("[data-choice-index]").forEach(button=>{
          const selected=Number(button.dataset.choiceIndex)===index;
          button.classList.toggle("selected",selected);
          button.setAttribute("aria-pressed",selected?"true":"false");
        });
      }
    }

    updateQuestionTools(question);
    updateNavigation();
    updateSessionStats();
  }

  function submitAnswer(){
    if(state.selected===null||state.answered) return false;
    const question=currentQuestion();
    if(!question) return false;
    const key=questionId(question);
    const selectedAnswer=selectedAnswerFor(question);
    state.active.answers[key]=selectedAnswer;
    if(state.active.drafts) delete state.active.drafts[key];
    state.active.updatedAt=new Date().toISOString();
    saveActive();
    revealAnswer(question,selectedAnswer);
    updateSessionStats();
    if(window.RPSGTApp&&typeof window.RPSGTApp.playFeedbackSound==="function"){
      window.RPSGTApp.playFeedbackSound(selectedAnswer===question.answer?"correct":"incorrect");
    }
    return true;
  }

  function previousQuestion(){
    if(!state.active||state.active.index<=0) return;
    state.active.index-=1;
    state.active.updatedAt=new Date().toISOString();
    saveActive();
    renderQuestion();
    requestAnimationFrame(()=>$('[data-question-prompt]')?.scrollIntoView({block:"nearest"}));
  }

  function nextQuestion(){
    if(!state.active) return;
    if(!state.answered){
      submitAnswer();
      return;
    }
    state.active.index+=1;
    state.active.updatedAt=new Date().toISOString();
    saveActive();
    if(state.active.index>=state.active.questionIds.length) finishReadiness(); else renderQuestion();
  }

  function summaryHistoryRecord(summary){
    return {
      sessionId:state.active.id,
      size:state.active.size,
      startedAt:state.active.startedAt,
      completedAt:new Date().toISOString(),
      percent:summary.percent,
      weightedPercent:summary.weightedPercent,
      correct:summary.correct,
      answered:summary.answered,
      blueprintCounts:state.active.blueprintCounts,
      byDomain:summary.byDomain,
      weakestTasks:summary.weakestTasks,
      questionIds:state.active.questionIds.slice(),
      missedIds:state.questions.filter(question=>(state.active.answers||{})[String(question.id)]!==question.answer).map(question=>question.id),
      source:"v3-readiness"
    };
  }

  function renderResults(summary){
    $("[data-readiness-home]").classList.add("hidden");
    $("[data-readiness-shell]").classList.add("hidden");
    $("[data-readiness-results]").classList.remove("hidden");
    $("[data-result-score]").textContent=summary.percent+"%";
    $("[data-result-weighted]").textContent=summary.weightedPercent+"%";
    $("[data-result-correct]").textContent=summary.correct+" / "+summary.total+" correct";
    $("[data-result-answered]").textContent=summary.answered+" / "+summary.total;
    const domainHost=$("[data-domain-results]");
    domainHost.innerHTML=(state.blueprint.domains||[]).map(domain=>{
      const row=summary.byDomain[domain.id]||{total:0,correct:0,percent:0};
      return `<article class="readiness-domain-card"><strong>${escapeHtml(domain.id)} · ${escapeHtml(domain.fullName)}</strong><div class="progress"><span style="width:${row.percent}%"></span></div><small>${row.correct}/${row.total} correct · ${row.percent}%</small></article>`;
    }).join("");
    const targetHost=$("[data-weak-task-results]");
    if(!summary.weakestTasks.length){targetHost.innerHTML='<div class="empty">No weak-task pattern was produced.</div>';return;}
    targetHost.innerHTML=summary.weakestTasks.map((task,index)=>{
      const meta=state.taskMap.get(task.taskCode)||{};
      const next=meta.nextAction||"Review this task, then use focused practice before another readiness check.";
      const topics=(task.topics||[]).join("; ");
      const params=new URLSearchParams({task:String(task.taskCode||"")});
      if(task.topics&&task.topics[0]) params.set("topic",String(task.topics[0]));
      return `<article class="readiness-target"><div class="readiness-target-rank">${index+1}</div><div><h3>${escapeHtml(task.taskCode)} · ${escapeHtml(meta.title||task.title||"Task review")}</h3><p>${task.correct}/${task.total} correct · ${task.percent}% · ${task.missed} missed${topics?" · "+escapeHtml(topics):""}</p><p><strong>Next study move:</strong> ${escapeHtml(next)}</p><a class="readiness-reference-link" href="sources-disclosures.html?${params.toString()}">Related reference materials</a></div></article>`;
    }).join("");
  }

  function finishReadiness(){
    const summary=engine.summarize(state.questions,state.active.answers||{});
    const record=summaryHistoryRecord(summary);
    const saved=storageState();
    const readiness=readinessRecord(saved);
    readiness.history.unshift(record);
    readiness.history=readiness.history.slice(0,20);
    readiness.activeSession=null;
    window.RPSGTStorage.save(saved);
    renderResults(summary);
    state.active=null;
  }

  async function startReadiness(size){
    const button=$(`[data-start-readiness="${size}"]`);
    if(button){button.disabled=true;button.textContent="Building readiness check…";}
    try{
      const bank=await loadLearnerBank();
      const built=engine.buildSession(bank,Number(size),state.blueprint.domains||[],Math.random);
      state.questions=built.questions;
      state.active={id:"readiness-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),size:Number(size),questionIds:built.questions.map(question=>question.id),blueprintCounts:built.blueprintCounts,index:0,answers:{},drafts:{},startedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      saveActive();
      $("[data-readiness-home]").classList.add("hidden");
      $("[data-readiness-results]").classList.add("hidden");
      $("[data-readiness-shell]").classList.remove("hidden");
      renderQuestion();
    }catch(error){showError(error);}
    finally{if(button){button.disabled=false;button.textContent="Start "+size;}}
  }

  async function resumeReadiness(active){
    await loadLearnerBank();
    const resolved=sessionQuestionsFromIds(active.questionIds);
    if(resolved.length!==active.questionIds.length) throw new Error("The saved readiness session could not resolve every question ID.");
    active.answers=active.answers&&typeof active.answers==="object"?active.answers:{};
    active.drafts=active.drafts&&typeof active.drafts==="object"?active.drafts:{};
    state.questions=resolved;
    state.active=active;
    $("[data-readiness-home]").classList.add("hidden");
    $("[data-readiness-results]").classList.add("hidden");
    $("[data-readiness-shell]").classList.remove("hidden");
    renderQuestion();
  }

  function quitReadiness(){
    if(!confirm("End this readiness check? The incomplete session will be removed, but completed readiness history will remain.")) return;
    clearActive();
    state.questions=[];
    showHome();
  }

  function showError(error){
    const host=$("[data-readiness-load]");
    host.className="section notice error";
    host.textContent="The readiness system could not be loaded. "+error.message;
  }

  async function init(){
    try{
      if(!engine) throw new Error("Readiness engine is unavailable.");
      if(!questionActions||!flashcards||!flashcardEngine) throw new Error("Readiness question tools are unavailable.");
      [state.manifest,state.blueprint]=await Promise.all([loadJson("data/question-bank/manifest.json"),loadJson("data/blueprint.json")]);
      buildTaskMap();
      renderAllocations();
      $("[data-readiness-load]").classList.add("hidden");
      $all("[data-start-readiness]").forEach(button=>button.addEventListener("click",()=>startReadiness(Number(button.dataset.startReadiness))));
      $("[data-previous-question]").addEventListener("click",previousQuestion);
      $("[data-next-question]").addEventListener("click",nextQuestion);
      $("[data-flag-question]").addEventListener("click",toggleFlag);
      $("[data-make-flashcard]").addEventListener("click",makeFlashcard);
      $("[data-quit-readiness]").addEventListener("click",quitReadiness);
      $("[data-new-readiness]").addEventListener("click",showHome);
      const active=readinessRecord(storageState()).activeSession;
      if(active&&Array.isArray(active.questionIds)&&active.questionIds.length) await resumeReadiness(active); else showHome();
    }catch(error){showError(error);}
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();