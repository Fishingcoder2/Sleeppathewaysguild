(function(){
  'use strict';
  const engine=window.RPSGTStudySummaryEngine;
  const state={saved:null,blueprint:null,index:null,catalog:null,studySources:null,summary:null};
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value==null?'':value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[char]);
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
  function formatDuration(ms){const total=Math.max(0,Math.floor((Number(ms)||0)/1000));const hours=Math.floor(total/3600);const minutes=Math.floor((total%3600)/60);const seconds=total%60;return (hours?hours+':':'')+String(minutes).padStart(hours?2:1,'0')+':'+String(seconds).padStart(2,'0');}
  function includeName(){const input=$('[data-summary-include-name]');return Boolean(input&&input.checked);}
  function rebuild(){state.summary=engine.buildSummary({saved:state.saved,blueprint:state.blueprint,questionIndex:state.index,catalog:state.catalog,studySources:state.studySources,includeLearnerName:includeName(),generatedAt:new Date().toISOString()});render();}
  function statusLabel(item){return item.completed?'Completed':item.started?'Started':'Not started';}
  function renderSnapshot(summary){
    const s=summary.snapshot;const cards=[['Practice answered',s.practiceAnswered],['Practice accuracy',s.practiceAccuracy+'%'],['Missed queue',s.missedCount],['Readiness attempts',s.readinessAttempts],['Mock attempts',s.mockAttempts],['Trail awards',s.trailTaskAwards+s.trailDomainAwards],['Labs completed',s.labsCompleted+' / '+s.labsTotal],['Mastered queue',s.masteredCount]];
    $('[data-summary-snapshot]').innerHTML=cards.map(card=>'<article class="summary-stat"><span>'+esc(card[0])+'</span><strong>'+esc(card[1])+'</strong></article>').join('');
  }
  function resourceHtml(item){
    if(!item.resources||!item.resources.length)return '<div class="summary-resource-empty">No related section-level reference is available for this priority yet.</div>';
    return '<div class="summary-resource-route"><strong>Related study resources</strong><p class="summary-resource-note">Selected from your question interactions and weak-task evidence. Current official sources are listed before supporting texts when available.</p>'+item.resources.map((group,index)=>'<div class="summary-resource-group"><div><span class="summary-resource-order">'+(index+1)+'</span><div><strong>'+esc(group.sourceTitle)+'</strong><small>'+esc(group.sourceType)+(group.bestFor?' · '+esc(group.bestFor):'')+'</small></div></div><ul>'+group.sections.map(section=>'<li>'+esc(section.label)+(section.reason?'<small>'+esc(section.reason)+'</small>':'')+'</li>').join('')+'</ul></div>').join('')+'</div>';
  }
  function renderPlan(summary){const host=$('[data-summary-plan]');host.innerHTML=summary.studyPlan.length?summary.studyPlan.map((item,index)=>'<article class="summary-plan-item"><span class="summary-rank">'+(index+1)+'</span><div><h3>'+esc(item.taskCode)+' · '+esc(item.title)+'</h3><p>'+esc(item.practiceCorrect)+' / '+esc(item.practiceAnswered)+' practice correct · '+esc(item.practiceAccuracy)+'% · '+esc(item.missed)+' currently missed</p>'+(item.topics.length?'<p><strong>Interaction signals:</strong> '+item.topics.map(topic=>esc(topic.label)+' (evidence '+esc(topic.count)+')').join(', ')+'</p>':'')+'<p><strong>Next move:</strong> '+esc(item.nextAction)+'</p>'+resourceHtml(item)+'</div></article>').join(''):'<div class="summary-empty">Complete Practice, Readiness, or Mock work to generate a prioritized study plan.</div>';}
  function renderTasks(summary){const host=$('[data-summary-tasks]');host.innerHTML='<table><thead><tr><th>Task</th><th>Practice</th><th>Accuracy</th><th>Missed</th><th>Mastered</th></tr></thead><tbody>'+summary.practice.tasks.map(task=>'<tr><td><strong>'+esc(task.code)+'</strong><span>'+esc(task.title)+'</span></td><td>'+esc(task.correct)+' / '+esc(task.answered)+'</td><td>'+esc(task.accuracy)+'%</td><td>'+esc(task.missed)+'</td><td>'+esc(task.mastered)+'</td></tr>').join('')+'</tbody></table>';}
  function diagnosticCard(title,record,type){if(!record)return '<article class="summary-diagnostic"><h3>'+esc(title)+'</h3><p>No completed attempt is saved.</p></article>';if(type==='readiness')return '<article class="summary-diagnostic"><h3>'+esc(title)+'</h3><strong>'+esc(record.percent)+'%</strong><p>'+esc(record.correct)+' / '+esc(record.size)+' correct · '+esc(record.weightedPercent)+'% study-weighted</p><small>'+esc(formatDate(record.completedAt))+'</small></article>';return '<article class="summary-diagnostic"><h3>'+esc(title)+'</h3><strong>'+esc(record.scoredPercent)+'%</strong><p>'+esc(record.scoredCorrect)+' / '+esc(record.scoredCount)+' scored correct · '+esc(record.answeredTotal)+' / 175 answered</p><p>'+esc(record.weightedPercent)+'% study-weighted · '+(record.timed?esc(formatDuration(record.elapsedMs)):'Untimed')+'</p><small>'+esc(formatDate(record.completedAt))+'</small></article>';}
  function renderDiagnostics(summary){$('[data-summary-diagnostics]').innerHTML=diagnosticCard('Latest Readiness Check',summary.readiness.latest,'readiness')+diagnosticCard('Latest 175-question Mock',summary.mock.latest,'mock');}
  function renderTrail(summary){const host=$('[data-summary-trail]');host.innerHTML='<div class="summary-mini-grid"><div><span>Study marks</span><strong>'+esc(summary.guidedTrail.counts.studyMarks)+'</strong></div><div><span>Task awards</span><strong>'+esc(summary.guidedTrail.counts.taskAwards)+'</strong></div><div><span>Domain awards</span><strong>'+esc(summary.guidedTrail.counts.domainAwards)+'</strong></div><div><span>Checkpoints</span><strong>'+esc(summary.guidedTrail.counts.checkpoints)+'</strong></div></div><div class="summary-domain-list">'+summary.guidedTrail.domains.map(domain=>'<div><strong>'+esc(domain.domain)+' · '+esc(domain.title)+'</strong><span>'+esc(domain.studyMarked)+' / '+esc(domain.taskCount)+' studied · '+esc(domain.taskAwards)+' task awards'+(domain.domainAwardEarned?' · domain award earned':'')+'</span></div>').join('')+'</div>';}
  function renderLabs(summary){const host=$('[data-summary-labs]');host.innerHTML='<div class="summary-lab-list">'+summary.labs.rows.map(lab=>'<div><span class="summary-check '+(lab.completed?'done':lab.started?'started':'')+'">'+(lab.completed?'✓':lab.started?'•':'○')+'</span><div><strong>'+esc(lab.title)+'</strong><small>'+esc(statusLabel(lab))+' · '+esc(lab.taskCodes.join(', '))+(lab.attempts?' · '+esc(lab.attempts)+' attempts':'')+'</small></div></div>').join('')+'</div>';}
  function render(){
    const summary=state.summary;document.title='RPSGT Study Summary · '+new Date(summary.generatedAt).toLocaleDateString();
    $('[data-summary-generated]').textContent=formatDate(summary.generatedAt);
    $('[data-summary-name]').textContent=summary.learner.displayName||'Learner name omitted';
    $('[data-summary-name]').classList.toggle('muted',!summary.learner.displayName);
    renderSnapshot(summary);renderPlan(summary);renderTasks(summary);renderDiagnostics(summary);renderTrail(summary);renderLabs(summary);
    $('[data-summary-privacy]').textContent=summary.privacy.learnerNameIncluded?'Learner name included by choice. Notes, searches, question text, answer text, rationales, private links, and raw browser state remain excluded.':'Learner name omitted. Notes, searches, question text, answer text, rationales, private links, and raw browser state are excluded.';
  }
  function filename(extension){const stamp=new Date().toISOString().slice(0,10);return 'rpsgt-study-summary-'+stamp+'.'+extension;}
  function download(content,type,name){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);}
  function bind(){
    $('[data-summary-include-name]').addEventListener('change',rebuild);
    $('[data-summary-print]').addEventListener('click',()=>window.print());
    $('[data-summary-json]').addEventListener('click',()=>download(JSON.stringify(state.summary,null,2)+'\n','application/json',filename('json')));
    $('[data-summary-csv]').addEventListener('click',()=>download(engine.toCsv(state.summary),'text/csv;charset=utf-8',filename('csv')));
  }
  function showError(error){const host=$('[data-summary-load]');host.className='summary-notice error';host.textContent='The study summary could not be loaded. '+error.message;}
  async function init(){try{
    if(!window.RPSGTStorage||!engine)throw new Error('A required summary module is unavailable.');
    [state.blueprint,state.index,state.catalog,state.studySources]=await Promise.all([loadJson('data/blueprint.json'),loadJson('data/question-bank/feedback-index.json'),loadJson('data/labs/catalog.json'),loadStudySources()]);
    state.saved=window.RPSGTStorage.load();bind();rebuild();$('[data-summary-load]').hidden=true;$('[data-summary-content]').hidden=false;
  }catch(error){showError(error);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
