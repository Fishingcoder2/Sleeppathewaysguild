(function(){
  "use strict";
  const engine=window.RPSGTMockDrilldown;
  const host=document.querySelector("[data-mock-drilldown]");
  if(!host) return;
  const state={saved:null,history:[],attempt:null,indexMap:new Map(),questionMap:null,filter:"missed",loading:false};
  const esc=value=>String(value==null?"":value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const formatDate=value=>value?new Date(value).toLocaleString():"Date not recorded";
  const formatElapsed=ms=>{const total=Math.max(0,Math.floor((Number(ms)||0)/1000));const hours=Math.floor(total/3600);const minutes=Math.floor((total%3600)/60);const seconds=total%60;return (hours?hours+":":"")+String(minutes).padStart(hours?2:1,"0")+":"+String(seconds).padStart(2,"0");};
  async function loadJson(path){const response=await fetch(path,{cache:"no-store"});if(!response.ok) throw new Error(path+" HTTP "+response.status);return response.json();}
  function attemptHref(attempt){return "reports.html?mock="+encodeURIComponent(String(attempt&&attempt.sessionId||""))+"#mock-detail";}
  function requestedSession(){try{return new URLSearchParams(window.location.search).get("mock")||"";}catch(error){return "";}}

  function pickerHtml(){
    if(!state.history.length) return '<div class="empty-report">No completed Mock attempt is available. Complete a mock-style study run to create this report.</div>';
    return '<div class="mock-attempt-picker">'+state.history.slice().reverse().map(function(record){
      const active=state.attempt&&String(record.sessionId)===String(state.attempt.sessionId);
      const detail=engine.detailLevel(record)==="question-review"?"Question review saved":"Aggregate only";
      return `<button type="button" class="mock-attempt-choice ${active?"active":""}" data-mock-attempt="${esc(record.sessionId)}" aria-pressed="${active?"true":"false"}"><span><strong>${esc(formatDate(record.completedAt))}</strong><small>${esc(record.scoredPercent)}% scored · ${esc(record.answeredTotal)}/175 answered</small></span><span>${esc(detail)}</span></button>`;
    }).join("")+'</div>';
  }

  function domainHtml(attempt){
    return '<div class="mock-detail-domains">'+["D1","D2","D3","D4"].map(function(code){
      const row=attempt.byDomain&&attempt.byDomain[code]||{correct:0,total:0,percent:0};
      return `<div class="mock-detail-domain"><div><strong>${code}</strong><span>${esc(row.correct)} / ${esc(row.total)} scored correct</span></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,Number(row.percent)||0))}%"></span></div><strong>${esc(row.percent||0)}%</strong></div>`;
    }).join("")+'</div>';
  }

  function taskHtml(attempt){
    const rows=engine.taskRows(attempt,state.indexMap);
    if(rows.length){
      return '<div class="mock-task-detail-list">'+rows.map(function(row){
        const topics=Array.isArray(row.topics)&&row.topics.length?`<small>Topics: ${row.topics.map(esc).join(" · ")}</small>`:"";
        return `<article class="mock-task-detail"><div><h3>${esc(row.taskCode)} · ${esc(row.title||row.taskCode)}</h3>${topics}</div><div><span>Scored</span><strong>${esc(row.correct)} / ${esc(row.scoredTotal)}</strong><small>${esc(row.percent)}%</small></div><div><span>Missed</span><strong>${esc(row.missed)}</strong><small>${esc(row.unanswered)} unanswered</small></div><div><span>Flags</span><strong>${esc(row.flagged)}</strong><small>${esc(row.pretestTotal)} unscored-style</small></div></article>`;
      }).join("")+'</div>';
    }
    const weak=attempt.weakestTasks||[];
    if(!weak.length) return '<div class="empty-report">No task-level evidence was saved with this attempt.</div>';
    return '<div class="mock-task-detail-list">'+weak.map(function(row){return `<article class="mock-task-detail aggregate"><div><h3>${esc(row.taskCode)} · ${esc(row.title||row.taskCode)}</h3><small>Older aggregate weak-task record</small></div><div><span>Correct</span><strong>${esc(row.correct)} / ${esc(row.total)}</strong><small>${esc(row.percent)}%</small></div><div><span>Missed</span><strong>${esc(row.missed)}</strong></div></article>`;}).join("")+'</div>';
  }

  function filterCounts(attempt){return {missed:engine.filterItems(attempt,"missed").length,unanswered:engine.filterItems(attempt,"unanswered").length,flagged:engine.filterItems(attempt,"flagged").length,all:engine.filterItems(attempt,"all").length};}

  function reviewShell(attempt){
    if(engine.detailLevel(attempt)!=="question-review") return '<div class="notice"><strong>Aggregate-only historical attempt:</strong> This result was saved before compact per-question evidence was introduced. Its score, domain results, and weak tasks remain available, but question answers and flags cannot be reconstructed safely.</div>';
    const counts=filterCounts(attempt);
    return `<div class="mock-review-controls"><div class="mock-review-filters">${engine.FILTERS.map(filter=>`<button type="button" class="btn secondary compact ${state.filter===filter?"active":""}" data-mock-filter="${filter}">${filter==="all"?"All questions":filter.charAt(0).toUpperCase()+filter.slice(1)} · ${counts[filter]}</button>`).join("")}</div><button type="button" class="btn primary" data-mock-load-review>${state.questionMap?"Refresh question review":"Load question review"}</button></div><p class="report-intro">Question text and answer explanations are loaded from the current validated bank only after you open the review. The saved attempt contains IDs and answer indexes, not copied prompt or answer text.</p><div data-mock-review-list>${state.questionMap?questionListHtml(attempt):'<div class="empty-report">Choose a filter, then load the question review.</div>'}</div>`;
  }

  function questionListHtml(attempt){
    if(!state.questionMap) return '<div class="empty-report">Question content has not been loaded.</div>';
    const rows=engine.questionRows(attempt,state.questionMap,state.filter);
    if(!rows.length) return '<div class="empty-report">No questions match this filter.</div>';
    return '<div class="mock-question-review-list">'+rows.map(function(row){
      const item=row.item;const status=!item.answered?"Unanswered":item.correct?"Correct":"Missed";const role=item.role==="pretest"?"Unscored-style":"Scored-style";
      if(row.missing) return `<details class="mock-question-review missing"><summary><span>#${esc(item.position)} · ${esc(item.taskCode)}</span><strong>Question content unavailable</strong></summary><p>${esc(row.prompt)}</p></details>`;
      const selected=item.answered?(row.selectedAnswer||"Saved answer index no longer matches the current option set."):"No answer recorded";
      return `<details class="mock-question-review ${item.correct?"correct":item.answered?"missed":"unanswered"}"><summary><span>#${esc(item.position)} · ${esc(item.taskCode)}${item.flagged?' · Flagged':''}</span><strong>${esc(status)} · ${esc(role)}</strong></summary><div class="mock-review-body"><h3>${esc(row.prompt)}</h3><div class="mock-answer-grid"><div><span>Your answer</span><strong>${esc(selected)}</strong></div><div><span>Correct answer</span><strong>${esc(row.correctAnswer||"Not available")}</strong></div></div>${row.rationale?`<p><strong>Why:</strong> ${esc(row.rationale)}</p>`:""}${row.topic?`<small>${esc(row.task||item.taskCode)} · ${esc(row.topic)}</small>`:""}</div></details>`;
    }).join("")+'</div>';
  }

  function attemptHtml(record){
    const attempt=engine.normalizeAttempt(record);
    const detail=engine.detailLevel(attempt)==="question-review"?"Question-level evidence available":"Aggregate-only history";
    return `<div class="mock-detail-summary"><div><span>Scored correct</span><strong>${esc(attempt.scoredCorrect)} / 150</strong></div><div><span>Scored percent</span><strong>${esc(attempt.scoredPercent)}%</strong></div><div><span>Study-weighted</span><strong>${esc(attempt.weightedPercent)}%</strong></div><div><span>Answered</span><strong>${esc(attempt.answeredTotal)} / 175</strong></div><div><span>Unanswered</span><strong>${esc(attempt.unansweredCount)}</strong></div><div><span>Flagged</span><strong>${esc(attempt.flaggedCount)}</strong></div><div><span>Timing</span><strong>${attempt.timed?esc(formatElapsed(attempt.elapsedMs)):"Untimed"}</strong></div><div><span>Detail level</span><strong>${esc(detail)}</strong></div></div><h3>Scored domain breakdown</h3>${domainHtml(attempt)}<h3>Task drill-down</h3>${taskHtml(attempt)}<h3>Question review</h3>${reviewShell(attempt)}`;
  }

  function render(){
    if(!state.history.length){host.innerHTML=pickerHtml();return;}
    host.innerHTML=`${pickerHtml()}<div class="mock-detail-attempt"><div class="mock-detail-heading"><div><strong>${esc(formatDate(state.attempt.completedAt))}</strong><span>${state.attempt.timed?"Timed mock-style attempt":"Untimed mock-style attempt"}</span></div><a class="btn secondary compact" href="${attemptHref(state.attempt)}">Link to this result</a></div>${attemptHtml(state.attempt)}</div>`;
  }

  async function ensureQuestionBank(){
    if(state.questionMap) return state.questionMap;
    if(state.loading) return null;
    state.loading=true;
    const list=host.querySelector("[data-mock-review-list]");if(list) list.innerHTML='<div class="empty-report">Loading question content for this completed attempt…</div>';
    try{
      const manifest=await loadJson("data/question-bank/manifest.json");
      const taskCodes=new Set((engine.normalizeAttempt(state.attempt).itemResults||[]).map(item=>item.taskCode));
      const metas=(manifest.modules||[]).filter(meta=>taskCodes.has(meta.taskCode));
      const packages=await Promise.all(metas.map(meta=>loadJson("data/question-bank/"+meta.path)));
      state.questionMap=new Map(packages.flatMap(pkg=>pkg.questions||[]).map(question=>[String(question.id),question]));
      return state.questionMap;
    }finally{state.loading=false;}
  }

  async function loadReview(){
    try{await ensureQuestionBank();render();const target=host.querySelector("[data-mock-review-list]");if(target) target.scrollIntoView({behavior:"smooth",block:"start"});}
    catch(error){const list=host.querySelector("[data-mock-review-list]");if(list) list.innerHTML=`<div class="notice error"><strong>Question review could not load.</strong> ${esc(error.message)}</div>`;}
  }

  function chooseAttempt(sessionId){
    const found=engine.findAttempt(state.history,sessionId);if(!found) return;
    state.attempt=found;state.filter="missed";state.questionMap=null;render();
    try{window.history.replaceState(null,"",attemptHref(found));}catch(error){}
  }

  function bind(){
    host.addEventListener("click",function(event){
      const attemptButton=event.target.closest("[data-mock-attempt]");if(attemptButton){chooseAttempt(attemptButton.dataset.mockAttempt);return;}
      const filterButton=event.target.closest("[data-mock-filter]");if(filterButton){state.filter=filterButton.dataset.mockFilter;render();return;}
      if(event.target.closest("[data-mock-load-review]")){loadReview();}
    });
  }

  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error("A required mock report module is unavailable.");
      const index=await loadJson("data/question-bank/feedback-index.json");state.indexMap=new Map((index.records||[]).map(record=>[String(record.id),record]));
      state.saved=window.RPSGTStorage.load();state.history=state.saved.mock&&Array.isArray(state.saved.mock.history)?state.saved.mock.history:[];
      state.attempt=engine.findAttempt(state.history,requestedSession());bind();render();
    }catch(error){host.innerHTML=`<div class="notice error"><strong>Mock drill-down could not load.</strong> ${esc(error.message)}</div>`;}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);else init();
})();
