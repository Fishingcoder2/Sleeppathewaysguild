(function(){
  "use strict";

  const state={
    manifest:null,
    blueprint:null,
    moduleCache:new Map(),
    session:[],
    index:0,
    selected:null,
    answered:false,
    correct:0,
    answeredCount:0,
    selections:new Map(),
    responses:new Map(),
    mode:"learner",
    activePoolSize:0,
    loading:false
  };
  const taskOrder=["D1A","D1B","D1C","D2A","D2B","D2C","D2A/D2C","D3A","D3B","D3C","D4A","D4B","D4C"];
  const taskMap=new Map();
  const domainMap=new Map();

  function $(selector){return document.querySelector(selector);}
  function $all(selector){return Array.from(document.querySelectorAll(selector));}
  function setText(selector,value){$all(selector).forEach(function(node){node.textContent=value;});}
  function shuffle(items){
    const copy=items.slice();
    for(let i=copy.length-1;i>0;i-=1){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }
  function isManualReview(question){return Boolean(question&&question.qa&&question.qa.manualReviewRecommended);}
  function taskLabel(code){
    const task=taskMap.get(code);
    if(task) return code+" · "+task.title;
    if(code==="D2A/D2C") return "D2A/D2C · Cross-task review records";
    return code;
  }
  function domainLabel(code){
    const domain=domainMap.get(code);
    return domain?code+" · "+domain.fullName:code;
  }
  function learnerCount(){return Number(state.manifest?.meta?.questionCount||0)-Number(state.manifest?.integritySummary?.manualReviewRecommendedCount||0);}
  function qualityCount(){return Number(state.manifest?.integritySummary?.manualReviewRecommendedCount||0);}
  function selectedDifficulty(){return $("[data-practice-difficulty]")?.value||"all";}
  function matchesDifficulty(question,difficulty){
    if(!difficulty||difficulty==="all") return true;
    return String(question&&question.difficulty||"").trim().toLowerCase()===String(difficulty).trim().toLowerCase();
  }

  function buildBlueprintMaps(){
    (state.blueprint?.domains||[]).forEach(function(domain){
      domainMap.set(domain.id,domain);
      (domain.tasks||[]).forEach(function(task){taskMap.set(task.code,task);});
    });
  }

  function modeEligibleModule(moduleMeta){
    if(state.mode==="learner"&&moduleMeta.taskCode==="D2A/D2C") return false;
    return true;
  }

  function availableModules(){
    return (state.manifest?.modules||[]).filter(modeEligibleModule);
  }

  function populateDomains(){
    const select=$("[data-practice-domain]");
    select.innerHTML='<option value="all">All domains</option>';
    const domains=Array.from(new Set(availableModules().map(function(item){return item.domain;}))).sort();
    domains.forEach(function(code){
      const option=document.createElement("option");
      option.value=code;
      option.textContent=domainLabel(code);
      select.appendChild(option);
    });
  }

  function refreshTasks(){
    const domain=$("[data-practice-domain]").value;
    const select=$("[data-practice-task]");
    const previous=select.value;
    select.innerHTML='<option value="all">All tasks</option>';
    availableModules()
      .filter(function(item){return domain==="all"||item.domain===domain;})
      .sort(function(a,b){return taskOrder.indexOf(a.taskCode)-taskOrder.indexOf(b.taskCode);})
      .forEach(function(item){
        const option=document.createElement("option");
        option.value=item.taskCode;
        option.textContent=taskLabel(item.taskCode)+" · "+Number(item.questionCount||0).toLocaleString()+" source records";
        select.appendChild(option);
      });
    if(Array.from(select.options).some(function(option){return option.value===previous;})) select.value=previous;
  }

  function updateModeUi(){
    state.mode=$("[data-practice-mode]").value;
    populateDomains();
    refreshTasks();
    const quality=state.mode==="quality";
    document.body.classList.toggle("quality-review-mode",quality);
    setText("[data-active-mode]",quality?"Quality review":"Learner practice");
    setText("[data-progress-policy]",quality?"Not added to learner progress":"Recorded in the v3 learner record");
    const notice=$("[data-mode-notice]");
    notice.className="mode-notice "+(quality?"quality":"learner");
    notice.innerHTML=quality
      ?"<strong>Quality-review pool:</strong> Only records marked <code>manualReviewRecommended</code> are included. Answers are shown for editorial inspection, but attempts do not change learner totals, missed questions, mastery, readiness, or reports."
      :"<strong>Learner-practice pool:</strong> All records marked <code>manualReviewRecommended</code> are excluded. Correct and incorrect answers update only the new <code>spg_rpsgt_v3</code> learner record.";
  }

  function selectedModuleMetadata(){
    const domain=$("[data-practice-domain]").value;
    const task=$("[data-practice-task]").value;
    return availableModules().filter(function(item){
      return (domain==="all"||item.domain===domain)&&(task==="all"||item.taskCode===task);
    });
  }

  async function loadModule(moduleMeta){
    if(state.moduleCache.has(moduleMeta.path)) return state.moduleCache.get(moduleMeta.path);
    const response=await fetch("data/question-bank/"+moduleMeta.path,{cache:"no-store"});
    if(!response.ok) throw new Error(moduleMeta.path+" HTTP "+response.status);
    const packageData=await response.json();
    if(!packageData||!Array.isArray(packageData.questions)) throw new Error(moduleMeta.path+" is not a valid question module");
    state.moduleCache.set(moduleMeta.path,packageData.questions);
    return packageData.questions;
  }

  async function selectedPool(){
    const modules=selectedModuleMetadata();
    if(!modules.length) return [];
    const difficulty=selectedDifficulty();
    const status=$("[data-practice-load]");
    status.className="section notice";
    status.textContent="Loading "+modules.length+" selected task module"+(modules.length===1?"":"s")+"…";
    const packages=await Promise.all(modules.map(loadModule));
    const pool=packages.flat().filter(function(question){
      const eligible=state.mode==="quality"?isManualReview(question):!isManualReview(question);
      return eligible&&matchesDifficulty(question,difficulty);
    });
    state.activePoolSize=pool.length;
    return pool;
  }

  function setSetupBusy(busy){
    state.loading=busy;
    const button=$("[data-start-practice]");
    button.disabled=busy;
    button.textContent=busy?"Loading questions…":"Start practice";
  }

  async function startSession(){
    if(state.loading) return;
    setSetupBusy(true);
    try{
      const pool=await selectedPool();
      if(!pool.length) throw new Error("No learner-ready questions match the selected domain, task, and difficulty filters.");
      const requested=$("[data-practice-size]").value;
      const size=requested==="all"?pool.length:Math.min(Number(requested)||10,pool.length);
      state.session=shuffle(pool).slice(0,size);
      state.index=0;
      state.selected=null;
      state.answered=false;
      state.correct=0;
      state.answeredCount=0;
      state.selections=new Map();
      state.responses=new Map();
      setText("[data-session-pool]",pool.length.toLocaleString());
      $("[data-practice-load]").classList.add("hidden");
      $("[data-practice-setup]").classList.add("hidden");
      $("[data-practice-shell]").classList.remove("hidden");
      $("[data-session-complete]").classList.add("hidden");
      $("[data-question-panel]").classList.remove("hidden");
      renderQuestion();
    }catch(error){
      showLoadError(error);
    }finally{
      setSetupBusy(false);
    }
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
    button.addEventListener("click",function(){selectChoice(index);});
    return button;
  }

  function questionKey(question){return String(question&&question.id||state.index);}

  function renderFeedback(question,response){
    const feedback=$("[data-answer-feedback]");
    if(!response){
      feedback.className="answer-feedback hidden";
      feedback.innerHTML="";
      return;
    }
    feedback.className="answer-feedback reasoning-panel "+(response.isCorrect?"correct":"incorrect");
    const status=document.createElement("span");
    status.className="reasoning-status";
    status.textContent=response.isCorrect?"Correct":"Review this one";
    const heading=document.createElement("h3");
    heading.textContent="Answer & reasoning";
    const answers=document.createElement("dl");
    answers.className="practice-answer-review";
    const selectedWrap=document.createElement("div");
    const selectedTerm=document.createElement("dt");
    selectedTerm.textContent="Your answer";
    const selectedValue=document.createElement("dd");
    selectedValue.textContent=response.selectedAnswer;
    selectedWrap.append(selectedTerm,selectedValue);
    const correctWrap=document.createElement("div");
    const correctTerm=document.createElement("dt");
    correctTerm.textContent="Correct answer";
    const correctValue=document.createElement("dd");
    correctValue.textContent=question.answer;
    correctWrap.append(correctTerm,correctValue);
    answers.append(selectedWrap,correctWrap);
    const rationale=document.createElement("p");
    rationale.className="practice-reasoning-copy";
    const rationaleLabel=document.createElement("strong");
    rationaleLabel.textContent="Reasoning: ";
    rationale.append(rationaleLabel,document.createTextNode(question.rationale||"Review the question stem and compare each option with the concept being tested."));
    feedback.replaceChildren(status,heading,answers,rationale);
    appendQualityDetails(feedback,question);
  }

  function updateQuestionActions(question,response){
    const previous=$("[data-previous-question]");
    const next=$("[data-next-question]");
    const compatibility=$("[data-submit-answer]");
    if(previous) previous.disabled=state.index===0;
    if(compatibility){
      compatibility.disabled=state.selected===null||Boolean(response);
      compatibility.classList.add("hidden");
    }
    if(next){
      next.classList.remove("hidden");
      next.disabled=!response&&state.selected===null;
      next.textContent=response
        ?(state.index===state.session.length-1?"Finish practice":"Next question")
        :"Next";
    }
  }

  function renderQuestion(){
    const question=state.session[state.index];
    if(!question){renderComplete();return;}
    const key=questionKey(question);
    const response=state.responses.get(key)||null;
    state.selected=state.selections.has(key)?state.selections.get(key):null;
    state.answered=Boolean(response);
    $("[data-question-number]").textContent="Question "+(state.index+1)+" of "+state.session.length;
    $("[data-question-task]").textContent=question.taskCode+" · "+question.topic;
    $("[data-question-difficulty]").textContent=question.difficulty+" · "+question.questionType;
    $("[data-question-prompt]").textContent=question.prompt;
    const reviewBadge=$("[data-question-review]");
    reviewBadge.classList.toggle("hidden",state.mode!=="quality");
    reviewBadge.textContent=state.mode==="quality"?"Manual review record":"";
    const choices=$("[data-question-choices]");
    choices.innerHTML="";
    question.options.forEach(function(option,index){
      const button=createChoice(option,index);
      const selected=state.selected===index;
      button.classList.toggle("selected",selected);
      button.setAttribute("aria-pressed",selected?"true":"false");
      if(response){
        button.disabled=true;
        button.classList.toggle("correct",option===question.answer);
        button.classList.toggle("incorrect",selected&&!response.isCorrect);
      }
      choices.appendChild(button);
    });
    renderFeedback(question,response);
    updateQuestionActions(question,response);
    updateSessionStats();
  }

  function selectChoice(index){
    if(state.answered) return;
    const question=state.session[state.index];
    state.selected=index;
    state.selections.set(questionKey(question),index);
    $all("[data-choice-index]").forEach(function(button){
      const selected=Number(button.dataset.choiceIndex)===index;
      button.classList.toggle("selected",selected);
      button.setAttribute("aria-pressed",selected?"true":"false");
    });
    const compatibility=$("[data-submit-answer]");
    if(compatibility) compatibility.disabled=false;
    const next=$("[data-next-question]");
    if(next) next.disabled=false;
  }

  function ensureBucket(parent,key){
    if(!parent[key]||typeof parent[key]!=="object") parent[key]={answered:0,correct:0};
    parent[key].answered=Number(parent[key].answered||0);
    parent[key].correct=Number(parent[key].correct||0);
    return parent[key];
  }
  function removeValue(list,value){return list.filter(function(item){return String(item)!==String(value);});}
  function addUnique(list,value){return list.some(function(item){return String(item)===String(value);})?list:list.concat([value]);}

  function recordAnswer(question,isCorrect,selectedAnswer){
    if(state.mode!=="learner"||!window.RPSGTStorage) return;
    const saved=window.RPSGTStorage.load();
    saved.progress.answered=Number(saved.progress.answered||0)+1;
    if(isCorrect) saved.progress.correct=Number(saved.progress.correct||0)+1;
    const domain=ensureBucket(saved.progress.byDomain,question.domain);
    const task=ensureBucket(saved.progress.byTask,question.taskCode);
    domain.answered+=1;
    task.answered+=1;
    if(isCorrect){domain.correct+=1;task.correct+=1;}
    saved.progress.history=Array.isArray(saved.progress.history)?saved.progress.history:[];
    saved.progress.history.push({
      questionId:question.id,
      domain:question.domain,
      taskCode:question.taskCode,
      difficulty:question.difficulty||null,
      correct:isCorrect,
      selectedAnswer:selectedAnswer,
      answeredAt:new Date().toISOString(),
      source:"v3-practice-full-bank",
      pool:"learner"
    });
    if(saved.progress.history.length>2500) saved.progress.history=saved.progress.history.slice(-2500);
    saved.review.missedIds=Array.isArray(saved.review.missedIds)?saved.review.missedIds:[];
    saved.review.masteredIds=Array.isArray(saved.review.masteredIds)?saved.review.masteredIds:[];
    if(isCorrect){
      if(saved.review.missedIds.some(function(id){return String(id)===String(question.id);})){
        saved.review.missedIds=removeValue(saved.review.missedIds,question.id);
        saved.review.masteredIds=addUnique(saved.review.masteredIds,question.id);
      }
    }else{
      saved.review.missedIds=addUnique(saved.review.missedIds,question.id);
      saved.review.masteredIds=removeValue(saved.review.masteredIds,question.id);
    }
    window.RPSGTStorage.save(saved);
    if(window.RPSGTApp) window.RPSGTApp.refresh();
  }

  function appendQualityDetails(feedback,question){
    if(state.mode!=="quality") return;
    const details=document.createElement("div");
    details.className="quality-details";
    const heading=document.createElement("strong");
    heading.textContent="Quality-review metadata";
    const status=document.createElement("p");
    status.textContent="QA status: "+(question.qa?.qaStatus||"Manual review recommended");
    const target=document.createElement("p");
    target.textContent="Review target: "+(question.qa?.scoringManualTarget||"Source-family and wording review");
    const mapping=document.createElement("p");
    mapping.textContent="Source mapping: "+(question.qa?.sourceMappingStatus||"Not stated");
    details.append(heading,status,target,mapping);
    feedback.appendChild(details);
  }

  function submitAnswer(){
    if(state.selected===null||state.answered) return;
    const question=state.session[state.index];
    const key=questionKey(question);
    if(state.responses.has(key)) return;
    const selectedAnswer=question.options[state.selected];
    const isCorrect=selectedAnswer===question.answer;
    const response={selectedIndex:state.selected,selectedAnswer,isCorrect};
    state.responses.set(key,response);
    state.answered=true;
    state.answeredCount+=1;
    if(isCorrect) state.correct+=1;
    $all("[data-choice-index]").forEach(function(button){
      const option=question.options[Number(button.dataset.choiceIndex)];
      button.disabled=true;
      button.classList.toggle("correct",option===question.answer);
      button.classList.toggle("incorrect",option===selectedAnswer&&!isCorrect);
    });
    renderFeedback(question,response);
    updateQuestionActions(question,response);
    recordAnswer(question,isCorrect,selectedAnswer);
    if(window.RPSGTApp&&typeof window.RPSGTApp.playFeedbackSound==="function") window.RPSGTApp.playFeedbackSound(isCorrect?"correct":"incorrect");
    updateSessionStats();
  }

  function previousQuestion(){
    if(state.index<=0) return;
    state.index-=1;
    renderQuestion();
    requestAnimationFrame(function(){$("[data-question-prompt]")?.scrollIntoView({block:"nearest"});});
  }

  function nextQuestion(){
    if(!state.answered){
      const compatibility=$("[data-submit-answer]");
      if(compatibility&&!compatibility.disabled) compatibility.click();
      else submitAnswer();
      return;
    }
    state.index+=1;
    if(state.index>=state.session.length) renderComplete(); else renderQuestion();
  }

  function updateSessionStats(){
    setText("[data-session-answered]",state.answeredCount.toLocaleString());
    setText("[data-session-correct]",state.correct.toLocaleString());
    setText("[data-session-accuracy]",(state.answeredCount?Math.round(state.correct/state.answeredCount*100):0)+"%");
  }

  function renderComplete(){
    $("[data-question-panel]").classList.add("hidden");
    const complete=$("[data-session-complete]");
    complete.classList.remove("hidden");
    $("[data-complete-score]").textContent=state.correct+" / "+state.answeredCount;
    $("[data-complete-percent]").textContent=(state.answeredCount?Math.round(state.correct/state.answeredCount*100):0)+"%";
    $("[data-complete-policy]").textContent=state.mode==="quality"
      ?"This quality-review session was not added to learner progress, missed questions, mastery, readiness, or reports."
      :"These answers were recorded only in the new RPSGT v3 learner record.";
    if(typeof complete.focus==="function") complete.focus({preventScroll:false});
  }

  function changeFilters(){
    $("[data-practice-shell]").classList.add("hidden");
    $("[data-practice-setup]").classList.remove("hidden");
    $("[data-practice-load]").classList.add("hidden");
  }

  function showLoadError(error){
    const host=$("[data-practice-load]");
    host.className="section notice error";
    host.textContent="The selected practice pool could not be loaded. "+error.message;
  }

  function renderBankSummary(){
    const total=Number(state.manifest.meta.questionCount||0);
    setText("[data-bank-total]",total.toLocaleString());
    setText("[data-learner-total]",learnerCount().toLocaleString());
    setText("[data-quality-total]",qualityCount().toLocaleString());
    setText("[data-module-total]",Number(state.manifest.meta.moduleCount||0).toLocaleString());
  }

  async function init(){
    try{
      const responses=await Promise.all([
        fetch("data/question-bank/manifest.json",{cache:"no-store"}),
        fetch("data/blueprint.json",{cache:"no-store"})
      ]);
      if(!responses[0].ok) throw new Error("Question-bank manifest HTTP "+responses[0].status);
      if(!responses[1].ok) throw new Error("Blueprint HTTP "+responses[1].status);
      state.manifest=await responses[0].json();
      state.blueprint=await responses[1].json();
      if(!state.manifest||!Array.isArray(state.manifest.modules)) throw new Error("Invalid question-bank manifest");
      if(!state.blueprint||!Array.isArray(state.blueprint.domains)) throw new Error("Invalid blueprint map");
      buildBlueprintMaps();
      renderBankSummary();
      populateDomains();
      refreshTasks();
      updateModeUi();
      $("[data-practice-load]").classList.add("hidden");
      $("[data-practice-setup]").classList.remove("hidden");
      $("[data-practice-mode]").addEventListener("change",updateModeUi);
      $("[data-practice-domain]").addEventListener("change",refreshTasks);
      $("[data-start-practice]").addEventListener("click",startSession);
      $("[data-submit-answer]").addEventListener("click",submitAnswer);
      $("[data-previous-question]").addEventListener("click",previousQuestion);
      $("[data-next-question]").addEventListener("click",nextQuestion);
      $all("[data-change-filters]").forEach(function(button){button.addEventListener("click",changeFilters);});
      $all("[data-restart-session]").forEach(function(button){button.addEventListener("click",startSession);});
    }catch(error){showLoadError(error);}
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
