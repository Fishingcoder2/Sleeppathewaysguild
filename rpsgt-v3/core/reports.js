(function(){
  "use strict";
  const reportEngine=window.RPSGTReportsEngine;
  const state={saved:null,blueprint:null,index:null,indexMap:null,taskMap:new Map()};
  const $=selector=>document.querySelector(selector);
  const $all=selector=>Array.from(document.querySelectorAll(selector));
  const esc=value=>String(value==null?"":value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const formatDate=value=>value?new Date(value).toLocaleString():"Date not recorded";

  async function loadJson(path){const response=await fetch(path,{cache:"no-store"});if(!response.ok) throw new Error(path+" HTTP "+response.status);return response.json();}
  function setText(selector,value){$all(selector).forEach(node=>node.textContent=value);}
  function buildMaps(){
    (state.blueprint.domains||[]).forEach(domain=>(domain.tasks||[]).forEach(task=>state.taskMap.set(task.code,{...task,domain:domain.id,domainName:domain.fullName})));
    state.indexMap=reportEngine.byId(state.index.records||[]);
  }

  function renderSnapshot(){
    const progress=state.saved.progress||{};
    const review=state.saved.review||{};
    const readiness=(state.saved.readiness&&state.saved.readiness.history)||[];
    const mock=(state.saved.mock&&state.saved.mock.history)||[];
    const answered=Number(progress.answered||0),correct=Number(progress.correct||0);
    setText("[data-report-practice-answered]",answered.toLocaleString());
    setText("[data-report-practice-accuracy]",reportEngine.percent(correct,answered)+"% accuracy");
    setText("[data-report-missed]",(review.missedIds||[]).length.toLocaleString());
    setText("[data-report-mastered]",(review.masteredIds||[]).length.toLocaleString());
    setText("[data-report-diagnostics]",(readiness.length+mock.length).toLocaleString());
    setText("[data-report-diagnostic-detail]",readiness.length+" readiness · "+mock.length+" mock");

    const history=reportEngine.historyCounts(state.saved);
    const awards=state.saved.guidedStudy&&state.saved.guidedStudy.trailAwards||{tasks:{},domains:{}};
    $("[data-practice-family]").innerHTML=`<strong>${answered.toLocaleString()} answers · ${reportEngine.percent(correct,answered)}%</strong><span>${(review.missedIds||[]).length} missed · ${(review.masteredIds||[]).length} mastered · ${history.review} review attempts</span>`;
    $("[data-readiness-family]").innerHTML=readiness.length?`<strong>${readiness.length} completed</strong><span>Latest score: ${esc(readiness[0].percent)}% · blueprint-weighted study view: ${esc(readiness[0].weightedPercent)}%</span>`:'<strong>No completed Readiness Check</strong><span>Use Readiness when you want a broader diagnostic across the blueprint.</span>';
    $("[data-mock-family]").innerHTML=mock.length?`<strong>${mock.length} completed</strong><span>Latest scored result: ${esc(mock.at(-1).scoredPercent)}% · ${esc(mock.at(-1).answeredTotal)} / 175 answered</span>`:'<strong>No completed Mock Exam</strong><span>The full-length Mock remains separate from Practice and Readiness.</span>';
    const taskAwards=Object.keys(awards.tasks||{}).length,domainAwards=Object.keys(awards.domains||{}).length;
    $("[data-trail-family]").innerHTML=`<strong>${taskAwards+domainAwards} Guild achievements</strong><span>${taskAwards} task badges · ${domainAwards} domain medals</span>`;
  }

  function renderTaskReport(){
    const rows=reportEngine.taskRows(state.saved,state.blueprint,state.indexMap);
    const weak=reportEngine.rankWeakTasks(rows,12);
    const progress=state.saved.progress||{};
    $("[data-practice-summary]").innerHTML=`<strong>${Number(progress.answered||0).toLocaleString()} Practice and review answers are included here.</strong> Readiness and Mock results stay in their own sections so each result keeps its meaning.`;
    const host=$("[data-task-report]");
    host.innerHTML=weak.length?weak.map(row=>`<article class="task-report-row"><div><h3>${esc(row.code)} · ${esc(row.title)}</h3><p>${esc(row.nextAction||"")}</p></div><div class="task-meter"><div class="progress"><span style="width:${row.percent}%"></span></div><small>${row.correct}/${row.answered} correct · ${row.percent}%</small></div><div class="task-numbers"><strong>${row.missed}</strong><small> currently missed<br>${row.mastered} mastered</small></div></article>`).join(""):'<div class="empty-report">No Practice results are available yet. Start a focused session to create task-level learning evidence.</div>';
  }

  function renderHistoryRows(history,type){
    if(!history.length) return '<div class="empty-report">No completed '+type+' result is saved yet.</div>';
    return '<div class="history-list">'+history.slice(0,6).map(record=>{
      if(type==="readiness") return `<div class="history-row"><div><strong>${esc(record.size)}-question Readiness</strong><small>${esc(formatDate(record.completedAt))}</small></div><div><strong>${esc(record.percent)}%</strong><small>score</small></div><div><strong>${esc(record.weightedPercent)}%</strong><small>blueprint-weighted study view</small></div></div>`;
      return `<div class="history-row"><div><strong>175-question Mock</strong><small>${esc(formatDate(record.completedAt))}${record.timed?" · timed":" · untimed"}</small></div><div><strong>${esc(record.scoredPercent)}%</strong><small>scored</small></div><div><strong>${esc(record.answeredTotal)}/175</strong><small>answered</small></div></div>`;
    }).join("")+'</div>';
  }

  function renderDiagnostics(){
    const readiness=(state.saved.readiness&&state.saved.readiness.history)||[];
    const mock=(state.saved.mock&&state.saved.mock.history)||[];
    const latestReady=readiness[0];
    const latestMock=mock.length?mock.at(-1):null;
    $("[data-readiness-report]").innerHTML=latestReady?`<div class="latest-result"><div class="latest-result-score">${esc(latestReady.percent)}%</div><p>Latest ${esc(latestReady.size)}-question score · ${esc(latestReady.weightedPercent)}% blueprint-weighted study view</p><div class="latest-result-grid"><div><span>Correct</span><strong>${esc(latestReady.correct)} / ${esc(latestReady.size)}</strong></div><div><span>Answered</span><strong>${esc(latestReady.answered)} / ${esc(latestReady.size)}</strong></div><div><span>Weak tasks</span><strong>${(latestReady.weakestTasks||[]).length}</strong></div></div></div>${renderHistoryRows(readiness,"readiness")}`:renderHistoryRows([],"readiness");
    $("[data-mock-report]").innerHTML=latestMock?`<div class="latest-result"><div class="latest-result-score">${esc(latestMock.scoredPercent)}%</div><p>Latest scored-style result · ${esc(latestMock.weightedPercent)}% blueprint-weighted study view</p><div class="latest-result-grid"><div><span>Scored correct</span><strong>${esc(latestMock.scoredCorrect)} / 150</strong></div><div><span>Answered</span><strong>${esc(latestMock.answeredTotal)} / 175</strong></div><div><span>Unanswered</span><strong>${esc(latestMock.unansweredCount)}</strong></div></div></div>${renderHistoryRows(mock.slice().reverse(),"mock")}`:renderHistoryRows([],"mock");
  }

  function referenceHref(taskCode){return 'sources-disclosures.html?task='+encodeURIComponent(taskCode||'');}

  function renderCoachPlan(){
    const plans=reportEngine.studyPlan(state.saved,state.blueprint,state.indexMap,3);
    const host=$("[data-coach-plan]");
    if(!plans.length){
      host.innerHTML='<div class="empty-report">No weak-area evidence is available yet. Complete Guided Study, Focused Practice, or a Readiness Check to create a personalized next step.</div>';
      return;
    }
    host.innerHTML='<div class="coach-plan-list">'+plans.map((plan,index)=>{
      const topics=plan.topics.map(item=>item.label);
      return `<article class="coach-plan-item"><div class="coach-plan-heading"><div class="coach-plan-rank">${index+1}</div><div><h3>${esc(plan.code)} · ${esc(plan.title)}</h3><p>${plan.answered?`${plan.correct}/${plan.answered} Practice correct · ${plan.percent}%`:"No Practice attempts yet"} · ${plan.missed} currently missed</p></div><span class="status ${index===0?"gold":""}">${index===0?"Start here":"Next opportunity"}</span></div>${topics.length?`<div class="topic-chip-row">${plan.topics.map(topic=>`<span class="topic-chip">${esc(topic.label)} · ${topic.count}</span>`).join("")}</div>`:""}<p><strong>Next step:</strong> ${esc(plan.nextAction||"Review the concept, then return to focused practice with a fresh question set.")}</p><div class="actions compact"><a class="btn secondary" href="study.html#${esc(plan.code)}">Open Guided Study</a><a class="btn primary" href="practice.html">Run Focused Practice</a><a class="text-link" href="${referenceHref(plan.code)}">Related reference materials</a></div></article>`;
    }).join("")+'</div>';
  }

  function showError(error){const host=$("[data-reports-load]");host.className="section notice error";host.textContent="Progress could not be loaded. "+error.message;}

  async function init(){
    try{
      if(!window.RPSGTStorage||!reportEngine) throw new Error("A required Progress module is unavailable.");
      [state.blueprint,state.index]=await Promise.all([loadJson("data/blueprint.json"),loadJson("data/question-bank/feedback-index.json")]);
      state.saved=window.RPSGTStorage.load();
      buildMaps();
      renderSnapshot();
      renderTaskReport();
      renderDiagnostics();
      renderCoachPlan();
      $("[data-reports-load]").classList.add("hidden");
      $("[data-reports-content]").classList.remove("hidden");
    }catch(error){showError(error);}
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);else init();
})();
