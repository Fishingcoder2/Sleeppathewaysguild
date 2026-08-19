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
    correct:0,
    answeredCount:0,
    unresolved:[],
    selections:new Map(),
    responses:new Map()
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
  function questionKey(question){return String(question&&question.id||state.index);}

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

  async function loadJson(path){const response=await fetch(path,{cache:"no-store"});if(!response.ok) throw new Error(path+" HTTP "+response.status);return response.json();}
  async function loadModule(meta){if(state.moduleCache.has(meta.path)) return state.moduleCache.get(meta.path);const data=await loadJson("data/question-bank/"+meta.path);const questions=Array.isArray(data.questions)?data.questions:[];state.moduleCache.set(meta.path,questions);return questions;}

  async function resolveQuestions(){
    const wanted=new Set(state.ids.map(String)),found=new Map(),taskMap=historyTaskMap(),modules=Array.isArray(state.manifest.modules)?state.manifest.modules:[];
    const inferredCodes=new Set(state.ids.map(id=>taskMap.get(String(id))).filter(Boolean));
    const firstPass=modules.filter(meta=>inferredCodes.has(meta.taskCode)),remaining=modules.filter(meta=>!inferredCodes.has(meta.taskCode));
    async function scan(batch){for(const meta of batch){if(found.size===wanted.size) break;const questions=await loadModule(meta);questions.forEach(question=>{const key=String(question.id);if(wanted.has(key)&&!isManualReview(question)) found.set(key,question);});}}
    await scan(firstPass);await scan(remaining);
    state.questions=state.ids.map(id=>found.get(String(id))).filter(Boolean);state.unresolved=state.ids.filter(id=>!found.has(String(id)));
  }

  function renderCounts(){
    $all("[data-review-list-label]").forEach(node=>node.textContent=listLabel());
    $all("[data-review-count]").forEach(node=>node.textContent=state.questions.length.toLocaleString());
    $all("[data-unresolved-count]").forEach(node=>node.textContent=state.unresolved.length.toLocaleString());
    const saved=window.RPSGTStorage.load(),missed=saved.review.missedIds||[],mastered=saved.review.masteredIds||[];
    $all("[data-missed-total]").forEach(node=>node.textContent=missed.length.toLocaleString());$all("[data-mastered-total]").forEach(node=>node.textContent=mastered.length.toLocaleString());
  }
  function updateSessionStats(){
    $("[data-session-answered]").textContent=state.answeredCount;$("[data-session-correct]").textContent=state.correct;$("[data-session-accuracy]").textContent=(state.answeredCount?Math.round(state.correct/state.answeredCount*100):0)+"%";
  }
  function createChoice(option,index,question,response){
    const button=document.createElement("button");button.type="button";button.className="practice-choice";button.dataset.choiceIndex=String(index);button.setAttribute("aria-pressed","false");
    const marker=document.createElement("span");marker.className="choice-marker";marker.textContent=String.fromCharCode(65+index);const copy=document.createElement("span");copy.textContent=option;button.append(marker,copy);
    const key=questionKey(question),selected=state.selections.get(key);if(selected===index){button.classList.add("selected");button.setAttribute("aria-pressed","true");}
    if(response){button.disabled=true;button.classList.toggle("correct",option===question.answer);button.classList.toggle("incorrect",index===response.selectedIndex&&!response.isCorrect);}
    button.addEventListener("click",()=>selectChoice(index));return button;
  }
  function renderFeedback(question,response){
    const feedback=$("[data-answer-feedback]");if(!response){feedback.className="answer-feedback hidden";feedback.innerHTML="";return;}
    feedback.className="answer-feedback reasoning-panel "+(response.isCorrect?"correct":"incorrect");
    const status=document.createElement("span");status.className="reasoning-status";status.textContent=response.isCorrect?(state.listType==="missed"?"Correct — moved to mastered":"Correct — remains mastered"):(state.listType==="mastered"?"Review needed — moved back to missed":"Review this one again");
    const heading=document.createElement("h3");heading.textContent="Answer & reasoning";
    const answers=document.createElement("dl");answers.className="practice-answer-review";
    const yours=document.createElement("div"),yTerm=document.createElement("dt"),yDef=document.createElement("dd");yTerm.textContent="Your answer";yDef.textContent=response.selectedAnswer;yours.append(yTerm,yDef);
    const correct=document.createElement("div"),cTerm=document.createElement("dt"),cDef=document.createElement("dd");cTerm.textContent="Correct answer";cDef.textContent=question.answer;correct.append(cTerm,cDef);answers.append(yours,correct);
    const rationale=document.createElement("p");rationale.className="practice-reasoning-copy";rationale.textContent=question.rationale||"Review the complete evidence and current study material before continuing.";
    feedback.replaceChildren(status,heading,answers,rationale);
  }
  function updateNavigation(question,response){
    const previous=$("[data-previous-question]"),forward=$("[data-review-forward]");if(!previous||!forward)return;
    previous.disabled=state.index<=0;forward.disabled=!response&&!state.selections.has(questionKey(question));
    forward.textContent=response?(state.index===state.questions.length-1?"View review result":"Next question"):"Check answer";
  }
  function renderQuestion(){
    const question=state.questions[state.index];if(!question){renderComplete();return;}
    const key=questionKey(question),response=state.responses.get(key)||null;state.selected=state.selections.has(key)?state.selections.get(key):null;
    $("[data-question-number]").textContent="Question "+(state.index+1)+" of "+state.questions.length;$("[data-question-task]").textContent=question.taskCode+" · "+question.topic;$("[data-question-difficulty]").textContent=question.difficulty+" · "+question.questionType;$("[data-question-prompt]").textContent=question.prompt;
    const choices=$("[data-question-choices]");choices.innerHTML="";question.options.forEach((option,index)=>choices.appendChild(createChoice(option,index,question,response)));
    renderFeedback(question,response);updateNavigation(question,response);updateSessionStats();
  }
  function selectChoice(index){
    const question=state.questions[state.index],key=questionKey(question);if(state.responses.has(key))return;state.selected=index;state.selections.set(key,index);
    $all("[data-choice-index]").forEach(button=>{const selected=Number(button.dataset.choiceIndex)===index;button.classList.toggle("selected",selected);button.setAttribute("aria-pressed",selected?"true":"false");});updateNavigation(question,null);
  }

  function ensureBucket(parent,key){if(!parent[key]||typeof parent[key]!=="object") parent[key]={answered:0,correct:0};parent[key].answered=Number(parent[key].answered||0);parent[key].correct=Number(parent[key].correct||0);return parent[key];}
  function recordAnswer(question,isCorrect,selectedAnswer){
    const saved=window.RPSGTStorage.load();saved.progress.answered=Number(saved.progress.answered||0)+1;if(isCorrect) saved.progress.correct=Number(saved.progress.correct||0)+1;
    const domain=ensureBucket(saved.progress.byDomain,question.domain),task=ensureBucket(saved.progress.byTask,question.taskCode);domain.answered+=1;task.answered+=1;if(isCorrect){domain.correct+=1;task.correct+=1;}
    saved.progress.history=Array.isArray(saved.progress.history)?saved.progress.history:[];saved.progress.history.push({questionId:question.id,domain:question.domain,taskCode:question.taskCode,correct:isCorrect,selectedAnswer,answeredAt:new Date().toISOString(),source:sourceLabel()});if(saved.progress.history.length>1000)saved.progress.history=saved.progress.history.slice(-1000);
    saved.review.missedIds=Array.isArray(saved.review.missedIds)?saved.review.missedIds:[];saved.review.masteredIds=Array.isArray(saved.review.masteredIds)?saved.review.masteredIds:[];
    if(isCorrect){saved.review.missedIds=removeValue(saved.review.missedIds,question.id);saved.review.masteredIds=addUnique(saved.review.masteredIds,question.id);}else{saved.review.missedIds=addUnique(saved.review.missedIds,question.id);saved.review.masteredIds=removeValue(saved.review.masteredIds,question.id);}
    window.RPSGTStorage.save(saved);if(window.RPSGTApp)window.RPSGTApp.refresh();
  }
  function submitAnswer(){
    const question=state.questions[state.index],key=questionKey(question);if(state.responses.has(key)||!state.selections.has(key))return;
    const selectedIndex=state.selections.get(key),selectedAnswer=question.options[selectedIndex],isCorrect=selectedAnswer===question.answer,response={selectedIndex,selectedAnswer,isCorrect};state.responses.set(key,response);state.answeredCount+=1;if(isCorrect)state.correct+=1;
    recordAnswer(question,isCorrect,selectedAnswer);renderCounts();renderQuestion();
  }
  function previousQuestion(){if(state.index<=0)return;state.index-=1;renderQuestion();}
  function forward(){const question=state.questions[state.index],key=questionKey(question);if(!state.responses.has(key)){submitAnswer();return;}state.index+=1;state.index>=state.questions.length?renderComplete():renderQuestion();}
  function renderComplete(){
    $("[data-question-panel]").classList.add("hidden");$("[data-review-complete]").classList.remove("hidden");$("[data-complete-score]").textContent=state.correct+" / "+state.answeredCount;$("[data-complete-percent]").textContent=(state.answeredCount?Math.round(state.correct/state.answeredCount*100):0)+"%";
  }
  function renderEmpty(){
    $("[data-review-shell]").classList.add("hidden");$("[data-review-empty]").classList.remove("hidden");const copy=state.listType==="mastered"?"No mastered questions are stored yet. Correctly answer a missed question to move it here.":"No missed questions are stored. Continue learner practice to build a focused review list.";$("[data-empty-message]").textContent=copy;
  }
  function showError(error){const host=$("[data-review-load]");host.className="section notice error";host.textContent="The review list could not be loaded. "+error.message;}
  async function init(){
    try{
      state.listType=new URLSearchParams(location.search).get("list")==="mastered"?"mastered":"missed";state.ids=readIds();$("[data-review-load]").textContent="Resolving "+state.ids.length.toLocaleString()+" stored questions against the learner-practice bank…";state.manifest=await loadJson("data/question-bank/manifest.json");await resolveQuestions();$("[data-review-load]").classList.add("hidden");renderCounts();if(!state.questions.length){renderEmpty();return;}
      $("[data-review-shell]").classList.remove("hidden");$("[data-question-panel]").classList.remove("hidden");$("[data-review-forward]").addEventListener("click",forward);$("[data-previous-question]").addEventListener("click",previousQuestion);$("[data-review-close]").addEventListener("click",()=>{location.href="practice.html";});renderQuestion();
    }catch(error){showError(error);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
