(function(){
  "use strict";

  const engine=window.RPSGTReadinessEngine;
  const state={manifest:null,blueprint:null,moduleCache:new Map(),taskMap:new Map(),bank:[],questions:[],active:null,selected:null,answered:false,correct:0,answeredCount:0};
  const $=selector=>document.querySelector(selector);
  const $all=selector=>Array.from(document.querySelectorAll(selector));
  const escapeHtml=value=>String(value==null?"":value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);

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
    const position=state.active?Math.min(state.active.index,state.active.questionIds.length):0;
    $("[data-readiness-progress]").style.width=(state.active&&state.active.questionIds.length?Math.round(position/state.active.questionIds.length*100):0)+"%";
  }

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

  function currentQuestion(){return state.questions[state.active.index]||null;}

  function selectChoice(index){
    if(state.answered) return;
    state.selected=index;
    $all("[data-choice-index]").forEach(button=>{
      const selected=Number(button.dataset.choiceIndex)===index;
      button.classList.toggle("selected",selected);
      button.setAttribute("aria-pressed",selected?"true":"false");
    });
    $("[data-submit-answer]").disabled=false;
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
    const feedback=$("[data-answer-feedback]");
    feedback.className="answer-feedback "+(isCorrect?"correct":"incorrect");
    const heading=document.createElement("strong");
    heading.textContent=isCorrect?"Correct":"Review this one";
    const answer=document.createElement("p");
    answer.textContent="Correct answer: "+question.answer;
    const rationale=document.createElement("p");
    rationale.textContent=question.rationale;
    const refs=document.createElement("p");
    refs.className="feedback-references";
    refs.textContent="Mapped source keys: "+(question.referenceKeys||[]).join(", ");
    feedback.replaceChildren(heading,answer,rationale,refs);
    $("[data-submit-answer]").classList.add("hidden");
    $("[data-next-question]").classList.remove("hidden");
    $("[data-next-question]").textContent=state.active.index===state.active.questionIds.length-1?"View readiness result":"Next question";
  }

  function renderQuestion(){
    const question=currentQuestion();
    if(!question){finishReadiness();return;}
    state.selected=null;
    state.answered=false;
    $("[data-question-number]").textContent="Question "+(state.active.index+1)+" of "+state.active.questionIds.length;
    $("[data-question-task]").textContent=question.taskCode+" · "+question.topic;
    $("[data-question-difficulty]").textContent=question.difficulty+" · "+question.questionType;
    $("[data-question-prompt]").textContent=engine.displayPrompt(question);
    const choices=$("[data-question-choices]");
    choices.innerHTML="";
    question.options.forEach((option,index)=>choices.appendChild(createChoice(option,index)));
    $("[data-submit-answer]").disabled=true;
    $("[data-submit-answer]").classList.remove("hidden");
    $("[data-next-question]").classList.add("hidden");
    $("[data-answer-feedback]").className="answer-feedback hidden";
    $("[data-answer-feedback]").innerHTML="";
    const prior=(state.active.answers||{})[String(question.id)];
    if(prior) revealAnswer(question,prior);
    updateSessionStats();
  }

  function submitAnswer(){
    if(state.selected===null||state.answered) return;
    const question=currentQuestion();
    const selectedAnswer=question.options[state.selected];
    state.active.answers[String(question.id)]=selectedAnswer;
    state.active.updatedAt=new Date().toISOString();
    saveActive();
    revealAnswer(question,selectedAnswer);
    updateSessionStats();
  }

  function nextQuestion(){
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
      const keys=(task.recommendationKeys||[]).slice(0,6).join(", ");
      const topics=(task.topics||[]).join("; ");
      return `<article class="readiness-target"><div class="readiness-target-rank">${index+1}</div><div><h3>${escapeHtml(task.taskCode)} · ${escapeHtml(meta.title||task.title||"Task review")}</h3><p>${task.correct}/${task.total} correct · ${task.percent}% · ${task.missed} missed${topics?" · "+escapeHtml(topics):""}</p><p><strong>Next study move:</strong> ${escapeHtml(next)}</p>${keys?`<small><strong>Mapped study keys:</strong> ${escapeHtml(keys)}</small>`:""}</div></article>`;
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
      state.active={id:"readiness-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),size:Number(size),questionIds:built.questions.map(question=>question.id),blueprintCounts:built.blueprintCounts,index:0,answers:{},startedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
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
      [state.manifest,state.blueprint]=await Promise.all([loadJson("data/question-bank/manifest.json"),loadJson("data/blueprint.json")]);
      buildTaskMap();
      renderAllocations();
      $("[data-readiness-load]").classList.add("hidden");
      $all("[data-start-readiness]").forEach(button=>button.addEventListener("click",()=>startReadiness(Number(button.dataset.startReadiness))));
      $("[data-submit-answer]").addEventListener("click",submitAnswer);
      $("[data-next-question]").addEventListener("click",nextQuestion);
      $("[data-quit-readiness]").addEventListener("click",quitReadiness);
      $("[data-new-readiness]").addEventListener("click",showHome);
      const active=readinessRecord(storageState()).activeSession;
      if(active&&Array.isArray(active.questionIds)&&active.questionIds.length) await resumeReadiness(active); else showHome();
    }catch(error){showError(error);}
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
