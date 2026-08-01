(function(){
  "use strict";

  const state={bank:[],session:[],index:0,selected:null,answered:false,correct:0,answeredCount:0};
  const taskOrder=["D1A","D1B","D1C","D2A","D2B","D2C","D3A","D3B","D3C","D4A","D4B","D4C"];

  function $(selector){return document.querySelector(selector);}
  function $all(selector){return Array.from(document.querySelectorAll(selector));}
  function shuffle(items){
    const copy=items.slice();
    for(let i=copy.length-1;i>0;i-=1){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }
  function unique(values){return Array.from(new Set(values));}
  function taskLabel(code){
    const q=state.bank.find(function(item){return item.taskCode===code;});
    return q?code+" · "+q.task:code;
  }

  function populateFilters(){
    const domainSelect=$("[data-practice-domain]");
    const taskSelect=$("[data-practice-task]");
    unique(state.bank.map(function(q){return q.domain;})).sort().forEach(function(domain){
      const option=document.createElement("option");
      option.value=domain;
      option.textContent=domain;
      domainSelect.appendChild(option);
    });
    function refreshTasks(){
      const domain=domainSelect.value;
      taskSelect.innerHTML='<option value="all">All tasks</option>';
      unique(state.bank.filter(function(q){return domain==="all"||q.domain===domain;}).map(function(q){return q.taskCode;}))
        .sort(function(a,b){return taskOrder.indexOf(a)-taskOrder.indexOf(b);})
        .forEach(function(code){
          const option=document.createElement("option");
          option.value=code;
          option.textContent=taskLabel(code);
          taskSelect.appendChild(option);
        });
    }
    domainSelect.addEventListener("change",refreshTasks);
    refreshTasks();
  }

  function selectedPool(){
    const domain=$("[data-practice-domain]").value;
    const task=$("[data-practice-task]").value;
    return state.bank.filter(function(q){
      return (domain==="all"||q.domain===domain)&&(task==="all"||q.taskCode===task);
    });
  }

  function startSession(){
    const pool=selectedPool();
    const requested=$("[data-practice-size]").value;
    const size=requested==="all"?pool.length:Math.min(Number(requested)||5,pool.length);
    state.session=shuffle(pool).slice(0,size);
    state.index=0;
    state.selected=null;
    state.answered=false;
    state.correct=0;
    state.answeredCount=0;
    $("[data-practice-setup]").classList.add("hidden");
    $("[data-practice-shell]").classList.remove("hidden");
    $("[data-session-complete]").classList.add("hidden");
    $("[data-question-panel]").classList.remove("hidden");
    renderQuestion();
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

  function renderQuestion(){
    const q=state.session[state.index];
    if(!q){renderComplete();return;}
    state.selected=null;
    state.answered=false;
    $("[data-question-number]").textContent="Question "+(state.index+1)+" of "+state.session.length;
    $("[data-question-task]").textContent=q.taskCode+" · "+q.topic;
    $("[data-question-difficulty]").textContent=q.difficulty+" · "+q.questionType;
    $("[data-question-prompt]").textContent=q.prompt;
    const choices=$("[data-question-choices]");
    choices.innerHTML="";
    q.options.forEach(function(option,index){choices.appendChild(createChoice(option,index));});
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
    $all("[data-choice-index]").forEach(function(button){
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

  function removeValue(list,value){return list.filter(function(item){return String(item)!==String(value);});}
  function addUnique(list,value){return list.some(function(item){return String(item)===String(value);})?list:list.concat([value]);}

  function recordAnswer(q,isCorrect,selectedAnswer){
    if(!window.RPSGTStorage) return;
    const saved=window.RPSGTStorage.load();
    saved.progress.answered=Number(saved.progress.answered||0)+1;
    if(isCorrect) saved.progress.correct=Number(saved.progress.correct||0)+1;
    const domain=ensureBucket(saved.progress.byDomain,q.domain);
    const task=ensureBucket(saved.progress.byTask,q.taskCode);
    domain.answered+=1;
    task.answered+=1;
    if(isCorrect){domain.correct+=1;task.correct+=1;}
    saved.progress.history=Array.isArray(saved.progress.history)?saved.progress.history:[];
    saved.progress.history.push({
      questionId:q.id,
      domain:q.domain,
      taskCode:q.taskCode,
      correct:isCorrect,
      selectedAnswer:selectedAnswer,
      answeredAt:new Date().toISOString(),
      source:"v3-practice-slice"
    });
    if(saved.progress.history.length>1000) saved.progress.history=saved.progress.history.slice(-1000);
    saved.review.missedIds=Array.isArray(saved.review.missedIds)?saved.review.missedIds:[];
    saved.review.masteredIds=Array.isArray(saved.review.masteredIds)?saved.review.masteredIds:[];
    if(isCorrect){
      if(saved.review.missedIds.some(function(id){return String(id)===String(q.id);})){
        saved.review.missedIds=removeValue(saved.review.missedIds,q.id);
        saved.review.masteredIds=addUnique(saved.review.masteredIds,q.id);
      }
    }else{
      saved.review.missedIds=addUnique(saved.review.missedIds,q.id);
      saved.review.masteredIds=removeValue(saved.review.masteredIds,q.id);
    }
    window.RPSGTStorage.save(saved);
    if(window.RPSGTApp) window.RPSGTApp.refresh();
  }

  function submitAnswer(){
    if(state.selected===null||state.answered) return;
    const q=state.session[state.index];
    const selectedAnswer=q.options[state.selected];
    const isCorrect=selectedAnswer===q.answer;
    state.answered=true;
    state.answeredCount+=1;
    if(isCorrect) state.correct+=1;
    $all("[data-choice-index]").forEach(function(button){
      const option=q.options[Number(button.dataset.choiceIndex)];
      button.disabled=true;
      button.classList.toggle("correct",option===q.answer);
      button.classList.toggle("incorrect",option===selectedAnswer&&!isCorrect);
    });
    const feedback=$("[data-answer-feedback]");
    feedback.className="answer-feedback "+(isCorrect?"correct":"incorrect");
    const heading=document.createElement("strong");
    heading.textContent=isCorrect?"Correct":"Review this one";
    const answer=document.createElement("p");
    answer.textContent="Correct answer: "+q.answer;
    const rationale=document.createElement("p");
    rationale.textContent=q.rationale;
    const refs=document.createElement("p");
    refs.className="feedback-references";
    refs.textContent="Mapped source keys: "+(q.referenceKeys||[]).join(", ");
    feedback.replaceChildren(heading,answer,rationale,refs);
    $("[data-submit-answer]").classList.add("hidden");
    $("[data-next-question]").classList.remove("hidden");
    $("[data-next-question]").textContent=state.index===state.session.length-1?"View session result":"Next question";
    recordAnswer(q,isCorrect,selectedAnswer);
    updateSessionStats();
  }

  function nextQuestion(){
    state.index+=1;
    if(state.index>=state.session.length) renderComplete(); else renderQuestion();
  }

  function updateSessionStats(){
    $("[data-session-answered]").textContent=state.answeredCount;
    $("[data-session-correct]").textContent=state.correct;
    $("[data-session-accuracy]").textContent=(state.answeredCount?Math.round(state.correct/state.answeredCount*100):0)+"%";
  }

  function renderComplete(){
    $("[data-question-panel]").classList.add("hidden");
    const complete=$("[data-session-complete]");
    complete.classList.remove("hidden");
    $("[data-complete-score]").textContent=state.correct+" / "+state.answeredCount;
    $("[data-complete-percent]").textContent=(state.answeredCount?Math.round(state.correct/state.answeredCount*100):0)+"%";
  }

  function changeFilters(){
    $("[data-practice-shell]").classList.add("hidden");
    $("[data-practice-setup]").classList.remove("hidden");
  }

  function showLoadError(error){
    const host=$("[data-practice-load]");
    host.className="notice error";
    host.textContent="The development practice slice could not be loaded. "+error.message;
  }

  async function init(){
    try{
      const manifestResponse=await fetch("data/practice-slice/manifest.json",{cache:"no-store"});
      if(!manifestResponse.ok) throw new Error("Manifest HTTP "+manifestResponse.status);
      const manifest=await manifestResponse.json();
      if(!manifest||!Array.isArray(manifest.files)) throw new Error("Invalid practice manifest");
      const packages=await Promise.all(manifest.files.map(async function(file){
        const response=await fetch("data/practice-slice/"+file.path,{cache:"no-store"});
        if(!response.ok) throw new Error(file.path+" HTTP "+response.status);
        return response.json();
      }));
      state.bank=packages.flatMap(function(packageData){return Array.isArray(packageData.questions)?packageData.questions:[];});
      if(!state.bank.length) throw new Error("No practice questions loaded");
      $("[data-slice-count]").textContent=state.bank.length;
      $("[data-practice-load]").classList.add("hidden");
      $("[data-practice-setup]").classList.remove("hidden");
      populateFilters();
      $("[data-start-practice]").addEventListener("click",startSession);
      $("[data-submit-answer]").addEventListener("click",submitAnswer);
      $("[data-next-question]").addEventListener("click",nextQuestion);
      $all("[data-change-filters]").forEach(function(button){button.addEventListener("click",changeFilters);});
      $all("[data-restart-session]").forEach(function(button){button.addEventListener("click",startSession);});
    }catch(error){showLoadError(error);}
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
