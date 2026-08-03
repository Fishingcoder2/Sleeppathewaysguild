(function(){
  "use strict";

  const drilldown=window.RPSGTMockDrilldown;
  const state={manifest:null,blueprint:null,bank:[],questionMap:new Map(),taskMap:new Map(),session:null,timerId:null};
  const $=selector=>document.querySelector(selector);
  const $all=selector=>Array.from(document.querySelectorAll(selector));
  const sameId=(a,b)=>String(a)===String(b);

  function setText(selector,value){$all(selector).forEach(node=>node.textContent=value);}
  function show(selector){const node=$(selector);if(node) node.classList.remove("hidden");}
  function hide(selector){const node=$(selector);if(node) node.classList.add("hidden");}
  async function loadJson(path){const response=await fetch(path,{cache:"no-store"});if(!response.ok) throw new Error(path+" HTTP "+response.status);return response.json();}
  function savedState(){return window.RPSGTStorage.load();}
  function saveRoot(root){window.RPSGTStorage.save(root);if(window.RPSGTApp) window.RPSGTApp.refresh();}
  function currentItem(){return state.session&&state.session.items?state.session.items[state.session.index]:null;}
  function currentQuestion(){const item=currentItem();return item?state.questionMap.get(String(item.id)):null;}
  function formatElapsed(ms){const total=Math.max(0,Math.floor((Number(ms)||0)/1000));const hours=Math.floor(total/3600);const minutes=Math.floor((total%3600)/60);const seconds=total%60;return (hours?hours+":":"")+String(minutes).padStart(hours?2:1,"0")+":"+String(seconds).padStart(2,"0");}
  function elapsedMs(session){return session&&session.startedAt?Math.max(0,(session.completedAt||Date.now())-Number(session.startedAt)):0;}
  function taskLabel(question){const task=state.taskMap.get(question.taskCode);return question.taskCode+" · "+(task?task.title:question.task);}

  function buildTaskMap(){
    (state.blueprint&&state.blueprint.domains||[]).forEach(domain=>(domain.tasks||[]).forEach(task=>state.taskMap.set(task.code,task)));
  }

  async function loadBank(){
    state.manifest=await loadJson("data/question-bank/manifest.json");
    state.blueprint=await loadJson("data/blueprint.json");
    buildTaskMap();
    const metas=(state.manifest.modules||[]).filter(meta=>meta.taskCode!=="D2A/D2C");
    const packages=await Promise.all(metas.map(meta=>loadJson("data/question-bank/"+meta.path)));
    state.bank=packages.flatMap(data=>Array.isArray(data.questions)?data.questions:[]);
    state.questionMap=new Map(state.bank.map(question=>[String(question.id),question]));
  }

  function mockStore(){const root=savedState();root.mock=root.mock&&typeof root.mock==="object"?root.mock:{history:[],activeSession:null};root.mock.history=Array.isArray(root.mock.history)?root.mock.history:[];return root;}
  function saveActive(){const root=mockStore();root.mock.activeSession=state.session;saveRoot(root);}
  function clearActive(){const root=mockStore();root.mock.activeSession=null;saveRoot(root);}

  function detailHref(row){return row&&row.sessionId?"reports.html?mock="+encodeURIComponent(String(row.sessionId))+"#mock-detail":"reports.html#mock-detail";}

  function renderHistory(){
    const root=mockStore();const history=root.mock.history.slice().reverse();setText("[data-mock-history-count]",history.length+" saved");
    const host=$("[data-mock-history]");
    if(!history.length){host.innerHTML='<div class="empty">No completed mock attempts are saved yet.</div>';return;}
    host.innerHTML='<div class="mock-history-list">'+history.slice(0,10).map(row=>{
      const date=row.completedAt?new Date(row.completedAt).toLocaleString():"Saved attempt";
      return '<div class="mock-history-row"><div><strong>'+date+'</strong><small>'+row.answeredTotal+'/175 answered · '+row.scoredCorrect+'/150 scored correct</small></div><strong>'+row.scoredPercent+'%</strong><span>'+row.weightedPercent+'% weighted</span><span>'+(row.timed?formatElapsed(row.elapsedMs):"Untimed")+'</span><a class="btn secondary compact" href="'+detailHref(row)+'">View details</a></div>';
    }).join("")+'</div>';
  }

  function renderResume(){
    const root=mockStore();const active=root.mock.activeSession;
    const card=$("[data-resume-card]");
    if(!active||!Array.isArray(active.items)||active.items.length!==175){card.classList.add("hidden");return;}
    const answered=Object.keys(active.answers||{}).length;
    $("[data-resume-summary]").textContent=answered+" of 175 answered · question "+(Number(active.index||0)+1)+" · "+(active.timed?"elapsed "+formatElapsed(elapsedMs(active)):"untimed");
    card.classList.remove("hidden");
  }

  function renderHome(){
    stopTimer();state.session=null;hide("[data-mock-shell]");hide("[data-mock-results]");show("[data-mock-home]");renderResume();renderHistory();
  }

  function startNew(){
    const timed=Boolean($("[data-mock-timed]").checked);
    const built=window.RPSGTMockEngine.buildSession(state.bank);
    state.session={version:1,sessionId:"mock-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),items:built.items,index:0,answers:{},flags:[],timed:timed,startedAt:Date.now(),completedAt:null,timeLimitMinutes:built.timeLimitMinutes,blueprintCounts:built.blueprintCounts,scoredCount:built.scoredCount,pretestCount:built.pretestCount};
    saveActive();openSession();
  }

  function resume(){const root=mockStore();state.session=root.mock.activeSession;if(!state.session){renderHome();return;}openSession();}
  function discard(){if(!window.confirm("Discard the saved mock attempt?")) return;clearActive();renderHome();}

  function openSession(){
    hide("[data-mock-home]");hide("[data-mock-results]");show("[data-mock-shell]");renderQuestion();startTimer();
  }

  function createChoice(option,index,selected){
    const button=document.createElement("button");button.type="button";button.className="practice-choice"+(selected?" selected":"");button.dataset.choiceIndex=String(index);button.setAttribute("aria-pressed",selected?"true":"false");
    const marker=document.createElement("span");marker.className="choice-marker";marker.textContent=String.fromCharCode(65+index);
    const text=document.createElement("span");text.textContent=option;button.append(marker,text);button.addEventListener("click",()=>selectAnswer(index));return button;
  }

  function renderQuestion(){
    const item=currentItem();const question=currentQuestion();if(!item||!question){submitMock(true);return;}
    const selected=state.session.answers[String(item.id)]||"";
    $("[data-question-number]").textContent="Question "+(state.session.index+1)+" of 175";
    $("[data-question-task]").textContent=taskLabel(question);
    $("[data-question-difficulty]").textContent=(question.difficulty||"Mixed")+" · "+(question.questionType||"Question");
    $("[data-question-prompt]").textContent=window.RPSGTMockEngine.displayPrompt(question);
    const choices=$("[data-question-choices]");choices.innerHTML="";
    (question.options||[]).forEach((option,index)=>choices.appendChild(createChoice(option,index,option===selected)));
    const flag=$("[data-flag-question]");const flagged=(state.session.flags||[]).some(id=>sameId(id,item.id));flag.classList.toggle("flag-active",flagged);flag.textContent=flagged?"Flagged for review":"Flag for review";
    $("[data-prev-question]").disabled=state.session.index===0;
    $("[data-next-question]").textContent=state.session.index===174?"Review and submit":"Next";
    $("[data-mock-progress]").style.width=Math.round((state.session.index+1)/175*100)+"%";
    renderStats();renderPalette();
  }

  function selectAnswer(index){
    const item=currentItem();const question=currentQuestion();if(!item||!question) return;
    state.session.answers[String(item.id)]=question.options[index];saveActive();renderQuestion();
  }

  function move(delta){state.session.index=Math.max(0,Math.min(174,state.session.index+delta));saveActive();renderQuestion();}
  function goTo(index){state.session.index=Math.max(0,Math.min(174,Number(index)||0));saveActive();renderQuestion();}
  function toggleFlag(){const item=currentItem();if(!item) return;state.session.flags=Array.isArray(state.session.flags)?state.session.flags:[];const exists=state.session.flags.some(id=>sameId(id,item.id));state.session.flags=exists?state.session.flags.filter(id=>!sameId(id,item.id)):state.session.flags.concat([item.id]);saveActive();renderQuestion();}
  function pause(){saveActive();renderHome();}

  function renderStats(){const answered=Object.keys(state.session.answers||{}).length;setText("[data-mock-answered]",answered);setText("[data-mock-unanswered]",175-answered);setText("[data-mock-flagged]",(state.session.flags||[]).length);}
  function renderPalette(){
    const host=$("[data-mock-palette]");host.innerHTML="";
    state.session.items.forEach((item,index)=>{const button=document.createElement("button");button.type="button";button.textContent=String(index+1);button.classList.toggle("answered",Boolean(state.session.answers[String(item.id)]));button.classList.toggle("flagged",(state.session.flags||[]).some(id=>sameId(id,item.id)));button.classList.toggle("current",index===state.session.index);button.setAttribute("aria-label","Question "+(index+1));button.addEventListener("click",()=>goTo(index));host.appendChild(button);});
  }

  function startTimer(){stopTimer();renderTimer();if(state.session&&state.session.timed) state.timerId=setInterval(renderTimer,1000);}
  function stopTimer(){if(state.timerId){clearInterval(state.timerId);state.timerId=null;}}
  function renderTimer(){
    if(!state.session||!state.session.timed){setText("[data-mock-timer-label]","Untimed attempt");setText("[data-mock-timer]","—");return;}
    setText("[data-mock-timer-label]","Elapsed · 180-minute reference");setText("[data-mock-timer]",formatElapsed(elapsedMs(state.session)));
  }

  function submitMock(forced){
    const unanswered=175-Object.keys(state.session.answers||{}).length;
    if(!forced){const message=unanswered?"Submit with "+unanswered+" unanswered question"+(unanswered===1?"":"s")+"?":"Submit this mock attempt?";if(!window.confirm(message)) return;}
    state.session.completedAt=Date.now();
    const questionsById=Object.fromEntries(state.session.items.map(item=>[String(item.id),state.questionMap.get(String(item.id))]));
    const summary=window.RPSGTMockEngine.summarize(state.session.items,questionsById,state.session.answers);
    const itemResults=drilldown.compactItemResults(state.session.items,questionsById,state.session.answers,state.session.flags||[]);
    const taskBreakdown=drilldown.taskRows({itemResults:itemResults},state.questionMap);
    const flaggedIds=itemResults.filter(item=>item.flagged).map(item=>item.id);
    const unansweredIds=itemResults.filter(item=>!item.answered).map(item=>item.id);
    const result={resultVersion:2,sessionId:state.session.sessionId,completedAt:new Date(state.session.completedAt).toISOString(),timed:Boolean(state.session.timed),elapsedMs:elapsedMs(state.session),answeredTotal:summary.answeredTotal,scoredCount:summary.scoredCount,pretestCount:summary.pretestCount,scoredCorrect:summary.scoredCorrect,scoredPercent:summary.scoredPercent,weightedPercent:summary.weightedPercent,byDomain:summary.byDomain,weakestTasks:summary.weakestTasks,scoredMissedIds:summary.scoredMissedIds,unansweredCount:unansweredIds.length,unansweredIds:unansweredIds,flaggedCount:flaggedIds.length,flaggedIds:flaggedIds,taskBreakdown:taskBreakdown,itemResults:itemResults};
    const root=mockStore();root.mock.history.push(result);if(root.mock.history.length>20) root.mock.history=root.mock.history.slice(-20);root.mock.activeSession=null;saveRoot(root);stopTimer();renderResults(result);
  }

  function renderResults(result){
    hide("[data-mock-home]");hide("[data-mock-shell]");show("[data-mock-results]");
    setText("[data-result-correct]",result.scoredCorrect+" / 150");setText("[data-result-percent]",result.scoredPercent+"%");setText("[data-result-weighted]",result.weightedPercent+"%");setText("[data-result-time]",result.timed?formatElapsed(result.elapsedMs):"Not timed");setText("[data-result-answered]",result.answeredTotal+" / 175");
    const reportLink=$("[data-result-report-link]");if(reportLink) reportLink.href=detailHref(result);
    const domainHost=$("[data-mock-domain-results]");domainHost.innerHTML=["D1","D2","D3","D4"].map(code=>{const row=result.byDomain[code]||{correct:0,total:0,percent:0};return '<div class="readiness-domain-card"><strong>'+code+'</strong><div class="progress"><span style="width:'+row.percent+'%"></span></div><span>'+row.correct+' / '+row.total+' scored correct · '+row.percent+'%</span></div>';}).join("");
    const weakHost=$("[data-mock-weak-results]");
    weakHost.innerHTML=(result.weakestTasks||[]).map((task,index)=>{const blueprintTask=state.taskMap.get(task.taskCode);const next=blueprintTask&&blueprintTask.nextAction?blueprintTask.nextAction:"Review this task, then run focused practice.";const keys=(task.recommendationKeys||[]).slice(0,4).join(", ");return '<article class="readiness-target"><div class="readiness-target-rank">'+(index+1)+'</div><div><h3>'+task.taskCode+' · '+(blueprintTask?blueprintTask.title:task.title)+'</h3><p>'+task.correct+' / '+task.total+' correct · '+task.percent+'% · '+task.missed+' missed</p><p>'+next+'</p>'+(keys?'<small>Study keys: '+keys+'</small>':'')+'</div></article>';}).join("")||'<div class="empty">No weak-task pattern was available from the scored answers.</div>';
  }

  function bind(){
    $("[data-start-mock]").addEventListener("click",startNew);$("[data-resume-mock]").addEventListener("click",resume);$("[data-discard-mock]").addEventListener("click",discard);$("[data-prev-question]").addEventListener("click",()=>move(-1));$("[data-next-question]").addEventListener("click",()=>state.session.index===174?submitMock(false):move(1));$("[data-flag-question]").addEventListener("click",toggleFlag);$("[data-pause-mock]").addEventListener("click",pause);$("[data-submit-mock]").addEventListener("click",()=>submitMock(false));$("[data-new-mock]").addEventListener("click",renderHome);
  }

  function showError(error){const host=$("[data-mock-load]");host.className="section notice error";host.textContent="The mock system could not be loaded. "+error.message;}
  async function init(){try{if(!drilldown) throw new Error("The mock drill-down module is unavailable.");await loadBank();hide("[data-mock-load]");bind();renderHome();}catch(error){showError(error);}}
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);else init();
})();
