(function(){
  "use strict";

  const state={
    manifest:null,
    moduleCache:new Map(),
    listType:"missed",
    ids:[],
    questions:[],
    index:0,
    selected:null,
    answered:false,
    correct:0,
    answeredCount:0,
    unresolved:[]
  };
  const $=selector=>document.querySelector(selector);
  const $all=selector=>Array.from(document.querySelectorAll(selector));
  const sameId=(a,b)=>String(a)===String(b);
  const addUnique=(list,value)=>list.some(item=>sameId(item,value))?list:list.concat([value]);
  const removeValue=(list,value)=>list.filter(item=>!sameId(item,value));

  function listKey(){return state.listType==="mastered"?"masteredIds":"missedIds";}
  function listLabel(){return state.listType==="mastered"?"Mastered Question Review":"Missed Question Review";}
  function sourceLabel(){return state.listType==="mastered"?"v3-review-mastered":"v3-review-missed";}
  function isManualReview(question){return Boolean(question&&question.qa&&question.qa.manualReviewRecommended);}

  function readIds(){
    const saved=window.RPSGTStorage?window.RPSGTStorage.load():null;
    const values=saved&&saved.review&&Array.isArray(saved.review[listKey()])?saved.review[listKey()]:[];
    return Array.from(new Map(values.map(value=>[String(value),value])).values());
  }

  function historyTaskMap(){
    const saved=window.RPSGTStorage?window.RPSGTStorage.load():null;
    const history=saved&&saved.progress&&Array.isArray(saved.progress.history)?saved.progress.history:[];
    const map=new Map();
    history.slice().reverse().forEach(entry=>{
      if(entry&&entry.questionId!==undefined&&entry.taskCode&&!map.has(String(entry.questionId))) map.set(String(entry.questionId),entry.taskCode);
    });
    return map;
  }

  async function loadJson(path){
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok) throw new Error(path+" HTTP "+response.status);
    return response.json();
  }

  async function loadModule(meta){
    if(state.moduleCache.has(meta.path)) return state.moduleCache.get(meta.path);
    const data=await loadJson("data/question-bank/"+meta.path);
    const questions=Array.isArray(data.questions)?data.questions:[];
    state.moduleCache.set(meta.path,questions);
    return questions;
  }

  async function resolveQuestions(){
    const wanted=new Set(state.ids.map(String));
    const found=new Map();
    const taskMap=historyTaskMap();
    const modules=Array.isArray(state.manifest.modules)?state.manifest.modules:[];
    const inferredCodes=new Set(state.ids.map(id=>taskMap.get(String(id))).filter(Boolean));
    const firstPass=modules.filter(meta=>inferredCodes.has(meta.taskCode));
    const remaining=modules.filter(meta=>!inferredCodes.has(meta.taskCode));

    async function scan(batch){
      for(const meta of batch){
        if(found.size===wanted.size) break;
        const questions=await loadModule(meta);
        questions.forEach(question=>{
          const key=String(question.id);
          if(wanted.has(key)&&!isManualReview(question)) found.set(key,question);
        });
      }
    }

    await scan(firstPass);
    await scan(remaining);
    state.questions=state.ids.map(id=>found.get(String(id))).filter(Boolean);
    state.unresolved=state.ids.filter(id=>!found.has(String(id)));
  }

  function renderCounts(){
    $all("[data-review-list-label]").forEach(node=>node.textContent=listLabel());
    $all("[data-review-count]").forEach(node=>node.textContent=state.questions.length.toLocaleString());
    $all("[data-unresolved-count]").forEach(node=>node.textContent=state.unresolved.length.toLocaleString());
    const missed=window.RPSGTStorage.load().review.missedIds||[];
    const mastered=window.RPSGTStorage.load().review.masteredIds||[];
    $all("[data-missed-total]").forEach(node=>node.textContent=missed.length.toLocaleString());
    $all("[data-mastered-total]").forEach(node=>node.textContent=mastered.length.toLocaleString());
  }

  function updateSessionStats(){
    $("[data-session-answered]").textContent=state.answeredCount;
    $("[data-session-correct]").textContent=state.correct;
    $("[data-session-accuracy]").textContent=(state.answeredCount?Math.round(state.correct/state.answeredCount*100):0)+"%";
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

  function renderQuestion(){
    const question=state.questions[state.index];
    if(!question){renderComplete();return;}
    state.selected=null;
    state.answered=false;
    $("[data-question-number]").textContent="Question "+(state.index+1)+" of "+state.questions.length;
    $("[data-question-task]").textContent=question.taskCode+" · "+question.topic;
    $("[data-question-difficulty]").textContent=question.difficulty+" · "+question.questionType;
    $("[data-question-prompt]").textContent=question.prompt;
    const choices=$("[data-question-choices]");
    choices.innerHTML="";
    question.options.forEach((option,index)=>choices.appendChild(createChoice(option,index)));
    $("[data-submit-answer]").disabled=true;
    $("[data-submit-answer]").classList.remove("hidden");
    $("[data-next-question]").classList.add("hidden");
    $("[data-answer-feedback]").className="answer-feedback hidden";
    $("[data-answer-feedback]").innerHTML="";
    updateSessionStats();
  }

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

  function ensureBucket(parent,key){
    if(!parent[key]||typeof parent[key]!=="object") parent[key]={answered:0,correct:0};
    parent[key].answered=Number(parent[key].answered||0);
    parent[key].correct=Number(parent[key].correct||0);
    return parent[key];
  }

  function recordAnswer(question,isCorrect,selectedAnswer){
    const saved=window.RPSGTStorage.load();
    saved.progress.answered=Number(saved.progress.answered||0)+1;
    if(isCorrect) saved.progress.correct=Number(saved.progress.correct||0)+1;
    const domain=ensureBucket(saved.progress.byDomain,question.domain);
    const task=ensureBucket(saved.progress.byTask,question.taskCode);
    domain.answered+=1;
    task.answered+=1;
    if(isCorrect){domain.correct+=1;task.correct+=1;}
    saved.progress.history=Array.isArray(saved.progress.history)?saved.progress.history:[];
    saved.progress.history.push({questionId:question.id,domain:question.domain,taskCode:question.taskCode,correct:isCorrect,selectedAnswer,answeredAt:new Date().toISOString(),source:sourceLabel()});
    if(saved.progress.history.length>1000) saved.progress.history=saved.progress.history.slice(-1000);
    saved.review.missedIds=Array.isArray(saved.review.missedIds)?saved.review.missedIds:[];
    saved.review.masteredIds=Array.isArray(saved.review.masteredIds)?saved.review.masteredIds:[];
    if(isCorrect){
      saved.review.missedIds=removeValue(saved.review.missedIds,question.id);
      saved.review.masteredIds=addUnique(saved.review.masteredIds,question.id);
    }else{
      saved.review.missedIds=addUnique(saved.review.missedIds,question.id);
      saved.review.masteredIds=removeValue(saved.review.masteredIds,question.id);
    }
    window.RPSGTStorage.save(saved);
    if(window.RPSGTApp) window.RPSGTApp.refresh();
  }

  function submitAnswer(){
    if(state.selected===null||state.answered) return;
    const question=state.questions[state.index];
    const selectedAnswer=question.options[state.selected];
    const isCorrect=selectedAnswer===question.answer;
    state.answered=true;
    state.answeredCount+=1;
    if(isCorrect) state.correct+=1;
    $all("[data-choice-index]").forEach(button=>{
      const option=question.options[Number(button.dataset.choiceIndex)];
      button.disabled=true;
      button.classList.toggle("correct",option===question.answer);
      button.classList.toggle("incorrect",option===selectedAnswer&&!isCorrect);
    });
    const feedback=$("[data-answer-feedback]");
    feedback.className="answer-feedback "+(isCorrect?"correct":"incorrect");
    const heading=document.createElement("strong");
    heading.textContent=isCorrect?(state.listType==="missed"?"Correct — moved to mastered":"Correct — remains mastered"):(state.listType==="mastered"?"Review needed — moved back to missed":"Review this one again");
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
    $("[data-next-question]").textContent=state.index===state.questions.length-1?"View review result":"Next question";
    recordAnswer(question,isCorrect,selectedAnswer);
    renderCounts();
    updateSessionStats();
  }

  function nextQuestion(){state.index+=1;state.index>=state.questions.length?renderComplete():renderQuestion();}

  function renderComplete(){
    $("[data-question-panel]").classList.add("hidden");
    $("[data-review-complete]").classList.remove("hidden");
    $("[data-complete-score]").textContent=state.correct+" / "+state.answeredCount;
    $("[data-complete-percent]").textContent=(state.answeredCount?Math.round(state.correct/state.answeredCount*100):0)+"%";
  }

  function renderEmpty(){
    $("[data-review-shell]").classList.add("hidden");
    $("[data-review-empty]").classList.remove("hidden");
    const text=state.listType==="mastered"?"No mastered questions are stored yet. Correctly answer a missed question to move it here.":"No missed questions are stored. Continue learner practice to build a focused review list.";
    $("[data-empty-message]").textContent=text;
  }

  function showError(error){
    const host=$("[data-review-load]");
    host.className="section notice error";
    host.textContent="The review list could not be loaded. "+error.message;
  }

  async function init(){
    try{
      state.listType=new URLSearchParams(location.search).get("list")==="mastered"?"mastered":"missed";
      state.ids=readIds();
      $("[data-review-load]").textContent="Resolving "+state.ids.length.toLocaleString()+" stored question IDs against the complete modular bank…";
      state.manifest=await loadJson("data/question-bank/manifest.json");
      await resolveQuestions();
      $("[data-review-load]").classList.add("hidden");
      renderCounts();
      if(!state.questions.length){renderEmpty();return;}
      $("[data-review-shell]").classList.remove("hidden");
      $("[data-question-panel]").classList.remove("hidden");
      $("[data-submit-answer]").addEventListener("click",submitAnswer);
      $("[data-next-question]").addEventListener("click",nextQuestion);
      renderQuestion();
    }catch(error){showError(error);}
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
