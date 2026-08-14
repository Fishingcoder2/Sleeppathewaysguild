(function(){
  "use strict";
  const reportEngine=window.RPSGTReportsEngine;
  const feedbackEngine=window.RPSGTStudyFeedback;
  const insightsEngine=window.RPSGTReportInsights;
  const state={saved:null,blueprint:null,outlines:null,index:null,indexMap:null,taskMap:new Map(),sourceMap:new Map(),sectionMap:new Map(),insights:null};
  const $=selector=>document.querySelector(selector);
  const $all=selector=>Array.from(document.querySelectorAll(selector));
  const esc=value=>String(value==null?"":value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const formatDate=value=>value?new Date(value).toLocaleString():"Date not recorded";
  const formatShortDate=value=>value?new Date(value).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"Not recorded";
  async function loadJson(path){const response=await fetch(path,{cache:"no-store"});if(!response.ok) throw new Error(path+" HTTP "+response.status);return response.json();}
  async function loadOutlines(){
    const base="data/study-sources/";const manifest=await loadJson(base+"manifest.json");
    const [sources,taskPlans,...topicPackages]=await Promise.all([
      Promise.all((manifest.sourceFiles||[]).map(file=>loadJson(base+file))),
      loadJson(base+manifest.taskPlanFile),
      ...(manifest.topicFamilyFiles||[]).map(file=>loadJson(base+file))
    ]);
    return {schemaVersion:manifest.schemaVersion,copyrightBoundary:manifest.copyrightBoundary,sources,taskPlans:taskPlans.taskPlans||{},topicFamilies:topicPackages.flatMap(pkg=>pkg.topicFamilies||[])};
  }
  function setText(selector,value){$all(selector).forEach(node=>node.textContent=value);}
  function buildMaps(){
    (state.blueprint.domains||[]).forEach(domain=>(domain.tasks||[]).forEach(task=>state.taskMap.set(task.code,{...task,domain:domain.id,domainName:domain.fullName})));
    (state.outlines.sources||[]).forEach(source=>{state.sourceMap.set(source.id,source);(source.sections||[]).forEach(section=>state.sectionMap.set(section.id,{...section,sourceId:source.id}));});
    state.indexMap=reportEngine.byId(state.index.records||[]);
  }
  function renderActivityRange(){
    const host=$("[data-report-activity-range]");if(!host) return;
    const activity=state.insights&&state.insights.activity;
    if(!activity||!activity.firstAt||!activity.lastAt){host.textContent="No dated learning activity is stored yet.";return;}
    const sameDay=formatShortDate(activity.firstAt)===formatShortDate(activity.lastAt);
    host.textContent=sameDay
      ?"Stored learning activity on "+formatShortDate(activity.firstAt)+"."
      :"Stored learning activity from "+formatShortDate(activity.firstAt)+" through "+formatShortDate(activity.lastAt)+".";
  }
  function renderSnapshot(){
    const progress=state.saved.progress||{};const review=state.saved.review||{};const readiness=(state.saved.readiness&&state.saved.readiness.history)||[];const mock=(state.saved.mock&&state.saved.mock.history)||[];
    const answered=Number(progress.answered||0),correct=Number(progress.correct||0);
    setText("[data-report-practice-answered]",answered.toLocaleString());setText("[data-report-practice-accuracy]",reportEngine.percent(correct,answered)+"% accuracy");
    setText("[data-report-missed]",(review.missedIds||[]).length.toLocaleString());setText("[data-report-mastered]",(review.masteredIds||[]).length.toLocaleString());
    setText("[data-report-diagnostics]",(readiness.length+mock.length).toLocaleString());setText("[data-report-diagnostic-detail]",readiness.length+" readiness · "+mock.length+" mock");
    const history=reportEngine.historyCounts(state.saved);const awards=state.saved.guidedStudy&&state.saved.guidedStudy.trailAwards||{tasks:{},domains:{}};
    $("[data-practice-family]").innerHTML=`<strong>${answered.toLocaleString()} answers · ${reportEngine.percent(correct,answered)}%</strong><span>${(review.missedIds||[]).length} missed · ${(review.masteredIds||[]).length} mastered · ${history.review} review attempts</span>`;
    $("[data-readiness-family]").innerHTML=readiness.length?`<strong>${readiness.length} completed</strong><span>Latest raw score: ${esc(readiness[0].percent)}% · study-weighted: ${esc(readiness[0].weightedPercent)}%</span>`:'<strong>No completed check</strong><span>Start with the recommended 50-question diagnostic.</span>';
    $("[data-mock-family]").innerHTML=mock.length?`<strong>${mock.length} completed</strong><span>Latest scored result: ${esc(mock.at(-1).scoredPercent)}% · ${esc(mock.at(-1).answeredTotal)} / 175 answered</span>`:'<strong>No completed mock</strong><span>The full-length attempt remains separate from Practice and Readiness.</span>';
    const taskAwards=Object.keys(awards.tasks||{}).length,domainAwards=Object.keys(awards.domains||{}).length;
    $("[data-trail-family]").innerHTML=`<strong>${taskAwards+domainAwards} awards</strong><span>${taskAwards} task · ${domainAwards} domain · Guided Study and labs stay separate</span>`;
  }
  function evidenceCell(label,stat){
    if(!stat||stat.percent===null||!stat.answered) return `<div class="domain-evidence-metric empty"><span>${esc(label)}</span><strong>—</strong><small>No result yet</small></div>`;
    return `<div class="domain-evidence-metric"><span>${esc(label)}</span><strong>${esc(stat.percent)}%</strong><small>${esc(stat.correct)} / ${esc(stat.answered)} correct</small></div>`;
  }
  function renderDomainEvidence(){
    const host=$("[data-domain-evidence]");if(!host) return;
    const rows=state.insights&&state.insights.domainEvidence||[];
    if(!rows.length){host.innerHTML='<div class="empty-report">No domain evidence is available yet.</div>';return;}
    host.innerHTML='<div class="domain-evidence-list">'+rows.map(row=>`<article class="domain-evidence-row"><div class="domain-evidence-title"><strong>${esc(row.id)}</strong><span>${esc(row.title)}</span></div>${evidenceCell("Practice",row.practice)}${evidenceCell("Latest Readiness",row.readiness)}${evidenceCell("Latest Mock",row.mock)}</article>`).join('')+'</div><p class="domain-evidence-note">Each percentage belongs to its own learning tool. The Reports Center does not average these values into a combined exam score.</p>';
  }
  function trendLabel(trend){
    if(!trend||!trend.comparable) return "Building evidence";
    if(trend.direction==="improving") return "Improving";
    if(trend.direction==="declining") return "Needs attention";
    return "Holding steady";
  }
  function renderPracticeTrend(){
    const host=$("[data-practice-trend]");const status=$("[data-practice-trend-status]");if(!host) return;
    const trend=state.insights&&state.insights.practiceTrend;
    if(status) status.textContent=trendLabel(trend);
    if(!trend||!trend.current.answered){host.innerHTML='<div class="empty-report">Complete Focused Practice or remediation answers to create a recent-answer trend.</div>';return;}
    const current=trend.current,previous=trend.previous;
    const delta=trend.comparable?(trend.delta>0?"+":"")+trend.delta+" percentage points":"Not enough earlier answers for comparison";
    const deltaClass=trend.direction==="improving"?"up":trend.direction==="declining"?"down":"steady";
    host.innerHTML=`<div class="practice-trend-summary"><div><span>Most recent block</span><strong>${esc(current.percent)}%</strong><small>${esc(current.correct)} / ${esc(current.answered)} correct</small></div><div><span>Previous block</span><strong>${previous.answered?esc(previous.percent)+"%":"—"}</strong><small>${previous.answered?esc(previous.correct)+" / "+esc(previous.answered)+" correct":"No comparable block yet"}</small></div></div><div class="practice-trend-change ${deltaClass}"><span>Change</span><strong>${esc(delta)}</strong></div><p class="domain-evidence-note">Uses only ordinary Focused Practice and remediation history. Readiness and Mock answers are not included.</p>`;
  }
  function renderTaskReport(){
    const rows=reportEngine.taskRows(state.saved,state.blueprint,state.indexMap);const weak=reportEngine.rankWeakTasks(rows,12);const progress=state.saved.progress||{};
    $("[data-practice-summary]").innerHTML=`<strong>${Number(progress.answered||0).toLocaleString()} ordinary practice and remediation answers are stored in the learner progress record.</strong> Quality Review, Readiness, and Mock attempts are excluded from these totals.`;
    const host=$("[data-task-report]");
    host.innerHTML=weak.length?weak.map(row=>`<article class="task-report-row"><div><h3>${esc(row.code)} · ${esc(row.title)}</h3><p>${esc(row.nextAction||"")}</p></div><div class="task-meter"><div class="progress"><span style="width:${row.percent}%"></span></div><small>${row.correct}/${row.answered} correct · ${row.percent}%</small></div><div class="task-numbers"><strong>${row.missed}</strong><small> currently missed<br>${row.mastered} mastered</small></div></article>`).join(""):'<div class="empty-report">No ordinary practice results are available yet. Start a focused session to create task-level evidence.</div>';
  }
  function renderHistoryRows(history,type){
    if(!history.length) return '<div class="empty-report">No completed '+type+' result is saved yet.</div>';
    return '<div class="history-list">'+history.slice(0,6).map(record=>{
      if(type==="readiness") return `<div class="history-row"><div><strong>${esc(record.size)}-question Readiness</strong><small>${esc(formatDate(record.completedAt))}</small></div><div><strong>${esc(record.percent)}%</strong><small>raw</small></div><div><strong>${esc(record.weightedPercent)}%</strong><small>weighted</small></div></div>`;
      return `<div class="history-row"><div><strong>175-question Mock</strong><small>${esc(formatDate(record.completedAt))}${record.timed?" · timed":" · untimed"}</small></div><div><strong>${esc(record.scoredPercent)}%</strong><small>scored</small></div><div><strong>${esc(record.answeredTotal)}/175</strong><small>answered</small></div></div>`;
    }).join("")+'</div>';
  }
  function renderDiagnostics(){
    const readiness=(state.saved.readiness&&state.saved.readiness.history)||[];const mock=(state.saved.mock&&state.saved.mock.history)||[];
    const latestReady=readiness[0];const latestMock=mock.length?mock.at(-1):null;
    $("[data-readiness-report]").innerHTML=latestReady?`<div class="latest-result"><div class="latest-result-score">${esc(latestReady.percent)}%</div><p>Latest ${esc(latestReady.size)}-question raw score · ${esc(latestReady.weightedPercent)}% internal study-weighted gauge</p><div class="latest-result-grid"><div><span>Correct</span><strong>${esc(latestReady.correct)} / ${esc(latestReady.size)}</strong></div><div><span>Answered</span><strong>${esc(latestReady.answered)} / ${esc(latestReady.size)}</strong></div><div><span>Weak tasks saved</span><strong>${(latestReady.weakestTasks||[]).length}</strong></div></div></div>${renderHistoryRows(readiness,"readiness")}`:renderHistoryRows([],"readiness");
    $("[data-mock-report]").innerHTML=latestMock?`<div class="latest-result"><div class="latest-result-score">${esc(latestMock.scoredPercent)}%</div><p>Latest scored-style result · ${esc(latestMock.weightedPercent)}% internal study-weighted gauge</p><div class="latest-result-grid"><div><span>Scored correct</span><strong>${esc(latestMock.scoredCorrect)} / 150</strong></div><div><span>Answered</span><strong>${esc(latestMock.answeredTotal)} / 175</strong></div><div><span>Unanswered</span><strong>${esc(latestMock.unansweredCount)}</strong></div></div></div>${renderHistoryRows(mock.slice().reverse(),"mock")}`:renderHistoryRows([],"mock");
  }
  function routeHtml(route){
    const groups=feedbackEngine.groupBySource(route);
    return '<div class="study-route">'+groups.map(group=>`<div class="study-route-group"><strong>${esc(group.sourceTitle)}</strong><div class="study-section-row">${group.sections.map(section=>`<span class="study-section">${esc(section.label)}</span>`).join("")}</div>${group.sections[0]&&group.sections[0].reason?`<small>${esc(group.sections[0].reason)}</small>`:""}</div>`).join("")+'</div>';
  }
  function renderCoachPlan(){
    const plans=reportEngine.studyPlan(state.saved,state.blueprint,state.indexMap,3);const host=$("[data-coach-plan]");
    if(!plans.length){host.innerHTML='<div class="empty-report">No weak-area evidence is available yet. Complete focused practice or a Readiness Check to create a personalized plan.</div>';return;}
    host.innerHTML='<div class="coach-plan-list">'+plans.map((plan,index)=>{
      const topics=plan.topics.map(item=>item.label);const route=feedbackEngine.taskRoute(plan.code,topics,state.outlines,7);
      return `<article class="coach-plan-item"><div class="coach-plan-heading"><div class="coach-plan-rank">${index+1}</div><div><h3>${esc(plan.code)} · ${esc(plan.title)}</h3><p>${plan.answered?`${plan.correct}/${plan.answered} practice correct · ${plan.percent}%`:"No ordinary practice attempts yet"} · ${plan.missed} currently missed</p></div><span class="status ${index===0?"gold":""}">${index===0?"Start here":"Then study"}</span></div>${topics.length?`<div class="topic-chip-row">${plan.topics.map(topic=>`<span class="topic-chip">${esc(topic.label)} · ${topic.count}</span>`).join("")}</div>`:""}<p><strong>After reading:</strong> ${esc(plan.nextAction||"Return to focused practice and confirm the weak concept with a new question set.")}</p>${routeHtml(route)}<div class="actions compact"><a class="btn secondary" href="study.html#${esc(plan.code)}">Open Guided Study</a><a class="btn primary" href="practice.html">Run focused practice</a></div></article>`;
    }).join("")+'</div>';
  }
  function renderSources(){
    const host=$("[data-source-outlines]");if(!host) return;
    const sources=state.outlines.sources||[];const sectionCount=sources.reduce((sum,source)=>sum+(source.sections||[]).length,0);setText("[data-outline-count]",sectionCount+" outlined sections");
    host.innerHTML='<div class="source-outline-list">'+sources.map(source=>`<details class="source-outline"><summary><span>${esc(source.shortTitle||source.title)}<small>${esc(source.sourceType)} · ${esc(source.year)}</small></span><span>${(source.sections||[]).length} sections</span></summary><div class="source-outline-body"><p><strong>Best for:</strong> ${esc(source.bestFor)}</p><p><strong>Copyright boundary:</strong> ${esc(source.copyrightUse)}</p><div class="outline-sections">${(source.sections||[]).map(section=>`<div class="outline-section">${esc(section.label||section.title)}</div>`).join("")}</div></div></details>`).join("")+'</div>';
  }
  function showError(error){const host=$("[data-reports-load]");host.className="section notice error";host.textContent="The Reports Center could not be loaded. "+error.message;}
  async function init(){
    try{
      if(!window.RPSGTStorage||!reportEngine||!feedbackEngine||!insightsEngine) throw new Error("A required report module is unavailable.");
      [state.blueprint,state.outlines,state.index]=await Promise.all([loadJson("data/blueprint.json"),loadOutlines(),loadJson("data/question-bank/feedback-index.json")]);
      state.saved=window.RPSGTStorage.load();state.insights=insightsEngine.build(state.saved,state.blueprint);buildMaps();renderActivityRange();renderSnapshot();renderDomainEvidence();renderPracticeTrend();renderTaskReport();renderDiagnostics();renderCoachPlan();renderSources();
      $("[data-reports-load]").classList.add("hidden");$("[data-reports-content]").classList.remove("hidden");
    }catch(error){showError(error);}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);else init();
})();
