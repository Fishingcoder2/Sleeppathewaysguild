(function(){
  'use strict';
  const engine=window.RPSGTStudySummaryEngine;
  const insightsEngine=window.RPSGTReportInsights;
  const state={saved:null,blueprint:null,index:null,catalog:null,studySources:null,summary:null,insights:null,profile:'full'};
  const $=selector=>document.querySelector(selector);
  const $all=selector=>Array.from(document.querySelectorAll(selector));
  const esc=value=>String(value==null?'':value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[char]);
  const PROFILES={
    full:{label:'Full progress report',title:'RPSGT Learning Center Progress Report',sections:['snapshot','domain','trend','plan','tasks','readiness','mock','trail','labs','followup','privacy']},
    practice:{label:'Practice & remediation report',title:'RPSGT Practice & Remediation Report',sections:['snapshot','domain','trend','plan','tasks','followup','privacy']},
    readiness:{label:'Readiness report',title:'RPSGT Readiness Check Report',sections:['snapshot','domain','plan','readiness','followup','privacy']},
    mock:{label:'175-question Mock report',title:'RPSGT 175-Question Mock Report',sections:['snapshot','domain','plan','mock','followup','privacy']},
    guided:{label:'Guided Study & labs report',title:'RPSGT Guided Study & Skills Report',sections:['snapshot','trail','labs','followup','privacy']}
  };
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}
  async function loadStudySources(){
    const base='data/study-sources/';const manifest=await loadJson(base+'manifest.json');
    const [sources,taskPlans,...topicPackages]=await Promise.all([
      Promise.all((manifest.sourceFiles||[]).map(file=>loadJson(base+file))),
      loadJson(base+(manifest.taskPlanFile||'task-plans.json')),
      ...(manifest.topicFamilyFiles||[]).map(file=>loadJson(base+file))
    ]);
    return {sources,taskPlans:taskPlans.taskPlans||{},topicFamilies:topicPackages.flatMap(pkg=>pkg.topicFamilies||[])};
  }
  function formatDate(value){if(!value)return 'Not recorded';const date=new Date(value);return Number.isNaN(date.getTime())?'Not recorded':date.toLocaleString();}
  function formatShortDate(value){if(!value)return 'Not recorded';const date=new Date(value);return Number.isNaN(date.getTime())?'Not recorded':date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}
  function formatDuration(ms){const total=Math.max(0,Math.floor((Number(ms)||0)/1000));const hours=Math.floor(total/3600);const minutes=Math.floor((total%3600)/60);const seconds=total%60;return (hours?hours+':':'')+String(minutes).padStart(hours?2:1,'0')+':'+String(seconds).padStart(2,'0');}
  function includeName(){const input=$('[data-summary-include-name]');return Boolean(input&&input.checked);}
  function sourceById(id){return (state.studySources&&state.studySources.sources||[]).find(source=>source.id===id)||null;}
  function sourceApa(group){
    const source=sourceById(group&&group.sourceId)||{};
    if(source.apaCitation)return source.apaCitation;
    const title=source.fullTitle||source.title||source.shortTitle||group.sourceTitle||'Study reference';
    const author=source.author||source.organization||source.publisher||group.sourceTitle||'Sleep medicine source';
    const year=source.year||'n.d.';
    const edition=source.edition?' ('+source.edition+' ed.)':'';
    const publisher=source.publisher&&String(source.publisher).toLowerCase()!==String(author).toLowerCase()?' '+source.publisher+'.':'';
    return author+'. ('+year+'). '+title+edition+'.'+publisher;
  }
  function profileFromUrl(){const value=new URLSearchParams(location.search).get('report');return PROFILES[value]?value:'full';}
  function setProfile(value,updateUrl){
    state.profile=PROFILES[value]?value:'full';
    const select=$('[data-summary-report-type]');if(select)select.value=state.profile;
    if(updateUrl&&window.history&&window.history.replaceState){const url=new URL(location.href);url.searchParams.set('report',state.profile);history.replaceState(null,'',url.toString());}
    applyProfile();
  }
  function applyProfile(){
    const profile=PROFILES[state.profile]||PROFILES.full;document.body.dataset.reportProfile=state.profile;
    const allowed=new Set(profile.sections);$all('[data-report-section]').forEach(section=>{section.hidden=!allowed.has(section.dataset.reportSection);});
    const title=$('[data-summary-title]');if(title)title.textContent=profile.title;
    const label=$('[data-summary-report-label]');if(label)label.textContent=profile.label;
    if(state.summary)document.title=profile.label+' · '+new Date(state.summary.generatedAt).toLocaleDateString();
  }
  function rebuild(){
    state.summary=engine.buildSummary({saved:state.saved,blueprint:state.blueprint,questionIndex:state.index,catalog:state.catalog,studySources:state.studySources,includeLearnerName:includeName(),generatedAt:new Date().toISOString()});
    state.insights=insightsEngine.build(state.saved,state.blueprint);render();
  }
  function statusLabel(item){return item.completed?'Completed':item.started?'Started':'Not started';}
  function renderSnapshot(summary){
    const s=summary.snapshot;const cards=[['Practice answered',s.practiceAnswered],['Practice accuracy',s.practiceAccuracy+'%'],['Missed queue',s.missedCount],['Mastered queue',s.masteredCount],['Readiness attempts',s.readinessAttempts],['Mock attempts',s.mockAttempts],['Trail awards',s.trailTaskAwards+s.trailDomainAwards],['Labs completed',s.labsCompleted+' / '+s.labsTotal]];
    $('[data-summary-snapshot]').innerHTML=cards.map(card=>'<article class="summary-stat"><span>'+esc(card[0])+'</span><strong>'+esc(card[1])+'</strong></article>').join('');
  }
  function domainScore(stat){
    if(!stat||stat.percent===null||!stat.answered)return '<td class="summary-domain-score empty"><strong>—</strong><small>No result</small></td>';
    return '<td class="summary-domain-score"><strong>'+esc(stat.percent)+'%</strong><small>'+esc(stat.correct)+' / '+esc(stat.answered)+' correct</small></td>';
  }
  function renderDomainEvidence(){
    const host=$('[data-summary-domain-evidence]');if(!host)return;
    const rows=state.insights&&state.insights.domainEvidence||[];
    if(!rows.length){host.innerHTML='<div class="summary-empty">No domain evidence is available yet.</div>';return;}
    host.innerHTML='<table class="summary-domain-table"><thead><tr><th>Domain</th><th>Practice</th><th>Latest Readiness</th><th>Latest Mock</th></tr></thead><tbody>'+rows.map(row=>'<tr><td class="summary-domain-name"><strong>'+esc(row.id)+'</strong><span>'+esc(row.title)+'</span></td>'+domainScore(row.practice)+domainScore(row.readiness)+domainScore(row.mock)+'</tr>').join('')+'</tbody></table>';
  }
  function renderPracticeTrend(){
    const host=$('[data-summary-practice-trend]');if(!host)return;
    const trend=state.insights&&state.insights.practiceTrend;
    if(!trend||!trend.current.answered){host.innerHTML='<div class="summary-empty">Complete Focused Practice or remediation answers to create a recent-answer trend.</div>';return;}
    const current=trend.current,previous=trend.previous;
    const change=trend.comparable?(trend.delta>0?'+':'')+trend.delta+' percentage points':'Not enough earlier answers';
    const changeClass=trend.direction==='improving'?'up':trend.direction==='declining'?'down':'steady';
    host.innerHTML='<div class="summary-trend-grid"><article class="summary-trend-card"><span>Most recent block</span><strong>'+esc(current.percent)+'%</strong><small>'+esc(current.correct)+' / '+esc(current.answered)+' correct</small></article><article class="summary-trend-card"><span>Previous block</span><strong>'+(previous.answered?esc(previous.percent)+'%':'—')+'</strong><small>'+(previous.answered?esc(previous.correct)+' / '+esc(previous.answered)+' correct':'No comparable block yet')+'</small></article><article class="summary-trend-card change '+changeClass+'"><span>Change</span><strong>'+esc(change)+'</strong><small>Ordinary Practice and remediation only</small></article></div><p class="summary-trend-note">Readiness and Mock answers are excluded from this trend so those diagnostic records keep their separate meaning.</p>';
  }
  function resourceHtml(item){
    if(!item.resources||!item.resources.length)return '<div class="summary-resource-empty">No related section-level reference is available for this priority yet.</div>';
    return '<div class="summary-resource-route"><strong>Related study resources</strong><p class="summary-resource-note">Selected from your question interactions and weak-task evidence. Current official sources are listed before supporting texts when available.</p>'+item.resources.map((group,index)=>'<div class="summary-resource-group"><div><span class="summary-resource-order">'+(index+1)+'</span><div><strong>'+esc(sourceApa(group))+'</strong><small>'+esc(group.sourceType)+(group.bestFor?' · '+esc(group.bestFor):'')+'</small></div></div><ul>'+group.sections.map(section=>'<li>'+esc(section.label)+(section.reason?'<small>'+esc(section.reason)+'</small>':'')+'</li>').join('')+'</ul></div>').join('')+'</div>';
  }
  function renderPlan(summary){const host=$('[data-summary-plan]');host.innerHTML=summary.studyPlan.length?summary.studyPlan.map((item,index)=>'<article class="summary-plan-item"><span class="summary-rank">'+(index+1)+'</span><div><h3>'+esc(item.taskCode)+' · '+esc(item.title)+'</h3><p>'+esc(item.practiceCorrect)+' / '+esc(item.practiceAnswered)+' practice correct · '+esc(item.practiceAccuracy)+'% · '+esc(item.missed)+' currently missed</p>'+(item.topics.length?'<p><strong>Interaction signals:</strong> '+item.topics.map(topic=>esc(topic.label)+' (evidence '+esc(topic.count)+')').join(', ')+'</p>':'')+'<p><strong>Next move:</strong> '+esc(item.nextAction)+'</p>'+resourceHtml(item)+'</div></article>').join(''):'<div class="summary-empty">Complete Practice, Readiness, or Mock work to generate a prioritized study plan.</div>';}
  function renderTasks(summary){const host=$('[data-summary-tasks]');host.innerHTML='<table><thead><tr><th>Task</th><th>Practice</th><th>Accuracy</th><th>Missed</th><th>Mastered</th></tr></thead><tbody>'+summary.practice.tasks.map(task=>'<tr><td><strong>'+esc(task.code)+'</strong><span>'+esc(task.title)+'</span></td><td>'+esc(task.correct)+' / '+esc(task.answered)+'</td><td>'+esc(task.accuracy)+'%</td><td>'+esc(task.missed)+'</td><td>'+esc(task.mastered)+'</td></tr>').join('')+'</tbody></table>';}
  function diagnosticCard(title,record,type){
    if(!record)return '<article class="summary-diagnostic"><h3>'+esc(title)+'</h3><p>No completed attempt is saved.</p></article>';
    if(type==='readiness')return '<article class="summary-diagnostic"><h3>'+esc(title)+'</h3><strong>'+esc(record.percent)+'%</strong><p>'+esc(record.correct)+' / '+esc(record.size)+' correct · '+esc(record.weightedPercent)+'% study-weighted</p><small>'+esc(formatDate(record.completedAt))+'</small></article>';
    return '<article class="summary-diagnostic"><h3>'+esc(title)+'</h3><strong>'+esc(record.scoredPercent)+'%</strong><p>'+esc(record.scoredCorrect)+' / '+esc(record.scoredCount)+' scored correct · '+esc(record.answeredTotal)+' / 175 answered</p><p>'+esc(record.weightedPercent)+'% study-weighted · '+(record.timed?esc(formatDuration(record.elapsedMs)):'Untimed')+'</p><small>'+esc(formatDate(record.completedAt))+'</small></article>';
  }
  function renderReadiness(summary){
    $('[data-summary-readiness-latest]').innerHTML=diagnosticCard('Latest Readiness Check',summary.readiness.latest,'readiness');
    const host=$('[data-summary-readiness-history]');const rows=summary.readiness.history.slice(0,8);
    host.innerHTML=rows.length?'<h3 class="summary-history-title">Recent Readiness history</h3><table class="summary-history-table"><thead><tr><th>Date</th><th>Size</th><th>Raw</th><th>Study-weighted</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(formatShortDate(row.completedAt))+'</td><td>'+esc(row.size)+'</td><td>'+esc(row.percent)+'%</td><td>'+esc(row.weightedPercent)+'%</td></tr>').join('')+'</tbody></table>':'<div class="summary-history-empty">No completed Readiness history is saved.</div>';
  }
  function renderMock(summary){
    $('[data-summary-mock-latest]').innerHTML=diagnosticCard('Latest 175-question Mock',summary.mock.latest,'mock');
    const host=$('[data-summary-mock-history]');const rows=summary.mock.history.slice().reverse().slice(0,8);
    host.innerHTML=rows.length?'<h3 class="summary-history-title">Recent Mock history</h3><table class="summary-history-table"><thead><tr><th>Date</th><th>Scored</th><th>Answered</th><th>Timing</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(formatShortDate(row.completedAt))+'</td><td>'+esc(row.scoredPercent)+'%</td><td>'+esc(row.answeredTotal)+' / 175</td><td>'+(row.timed?esc(formatDuration(row.elapsedMs)):'Untimed')+'</td></tr>').join('')+'</tbody></table>':'<div class="summary-history-empty">No completed Mock history is saved.</div>';
  }
  function renderTrail(summary){const host=$('[data-summary-trail]');host.innerHTML='<div class="summary-mini-grid"><div><span>Study marks</span><strong>'+esc(summary.guidedTrail.counts.studyMarks)+'</strong></div><div><span>Task awards</span><strong>'+esc(summary.guidedTrail.counts.taskAwards)+'</strong></div><div><span>Domain awards</span><strong>'+esc(summary.guidedTrail.counts.domainAwards)+'</strong></div><div><span>Checkpoints</span><strong>'+esc(summary.guidedTrail.counts.checkpoints)+'</strong></div></div><div class="summary-domain-list">'+summary.guidedTrail.domains.map(domain=>'<div><strong>'+esc(domain.domain)+' · '+esc(domain.title)+'</strong><span>'+esc(domain.studyMarked)+' / '+esc(domain.taskCount)+' studied · '+esc(domain.taskAwards)+' task awards'+(domain.domainAwardEarned?' · domain award earned':'')+'</span></div>').join('')+'</div>';}
  function renderLabs(summary){const host=$('[data-summary-labs]');host.innerHTML='<div class="summary-lab-list">'+summary.labs.rows.map(lab=>'<div><span class="summary-check '+(lab.completed?'done':lab.started?'started':'')+'">'+(lab.completed?'✓':lab.started?'•':'○')+'</span><div><strong>'+esc(lab.title)+'</strong><small>'+esc(statusLabel(lab))+' · '+esc(lab.taskCodes.join(', '))+(lab.attempts?' · '+esc(lab.attempts)+' attempts':'')+'</small></div></div>').join('')+'</div>';}
  function renderActivity(){
    const host=$('[data-summary-activity]');if(!host)return;const activity=state.insights&&state.insights.activity;
    if(!activity||!activity.firstAt){host.textContent='Not recorded';return;}
    const first=formatShortDate(activity.firstAt),last=formatShortDate(activity.lastAt);host.textContent=first===last?first:first+' – '+last;
  }
  function render(){
    const summary=state.summary;
    $('[data-summary-generated]').textContent=formatDate(summary.generatedAt);
    $('[data-summary-name]').textContent=summary.learner.displayName||'Learner name omitted';
    $('[data-summary-name]').classList.toggle('muted',!summary.learner.displayName);
    renderActivity();renderSnapshot(summary);renderDomainEvidence();renderPracticeTrend();renderPlan(summary);renderTasks(summary);renderReadiness(summary);renderMock(summary);renderTrail(summary);renderLabs(summary);
    $('[data-summary-privacy]').textContent=summary.privacy.learnerNameIncluded?'Learner name included by choice. Notes, searches, question text, answer text, rationales, private links, and raw browser state remain excluded.':'Learner name omitted. Notes, searches, question text, answer text, rationales, private links, and raw browser state are excluded.';
    applyProfile();
  }
  function filename(extension){const stamp=new Date().toISOString().slice(0,10);return 'rpsgt-'+state.profile+'-report-'+stamp+'.'+extension;}
  function download(content,type,name){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);}
  function bind(){
    $('[data-summary-include-name]').addEventListener('change',rebuild);
    $('[data-summary-report-type]').addEventListener('change',event=>setProfile(event.target.value,true));
    $('[data-summary-print]').addEventListener('click',()=>window.print());
    $('[data-summary-json]').addEventListener('click',()=>download(JSON.stringify({...state.summary,reportProfile:state.profile,reportLabel:PROFILES[state.profile].label},null,2)+'\n','application/json',filename('json')));
    $('[data-summary-csv]').addEventListener('click',()=>download(engine.toCsv(state.summary),'text/csv;charset=utf-8',filename('csv')));
  }
  function showError(error){const host=$('[data-summary-load]');host.className='summary-notice error';host.textContent='The study summary could not be loaded. '+error.message;}
  async function init(){try{
    if(!window.RPSGTStorage||!engine||!insightsEngine)throw new Error('A required summary module is unavailable.');
    state.profile=profileFromUrl();
    [state.blueprint,state.index,state.catalog,state.studySources]=await Promise.all([loadJson('data/blueprint.json'),loadJson('data/question-bank/feedback-index.json'),loadJson('data/labs/catalog.json'),loadStudySources()]);
    state.saved=window.RPSGTStorage.load();bind();setProfile(state.profile,false);rebuild();$('[data-summary-load]').hidden=true;$('[data-summary-content]').hidden=false;
  }catch(error){showError(error);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
