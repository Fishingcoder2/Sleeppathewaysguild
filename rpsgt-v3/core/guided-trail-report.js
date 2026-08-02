(function(){
  'use strict';
  const engine=window.RPSGTGuidedTrailEngine;
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>value?new Date(value).toLocaleString():'Date not recorded';
  async function waitForReports(){for(let i=0;i<100;i+=1){const content=document.querySelector('[data-reports-content]');if(content&&!content.classList.contains('hidden')) return;await new Promise(resolve=>setTimeout(resolve,50));}}
  async function render(){
    const family=document.querySelector('[data-trail-family]');const host=document.querySelector('[data-guided-trail-report]');
    if(!engine||!window.RPSGTStorage||!family||!host) return;
    try{
      const response=await fetch('data/blueprint.json',{cache:'no-store'});if(!response.ok) throw new Error('Blueprint HTTP '+response.status);
      const blueprint=await response.json();const saved=window.RPSGTStorage.load();const report=engine.summary(saved.guidedStudy,blueprint);const counts=report.counts;
      family.innerHTML=`<strong>${counts.taskAwards+counts.domainAwards} awards</strong><span>${counts.studyMarks}/12 study marks · ${counts.taskAwards}/12 task · ${counts.domainAwards}/4 domain · ${counts.checkpoints} checkpoints</span>`;
      const latest=report.latestCheckpoint;
      const domainRows=report.domains.map(domain=>`<article class="trail-domain-row"><div><strong>${esc(domain.id)} · ${esc(domain.name)}</strong><small>${domain.studyMarked}/${domain.taskCount} study marks · ${domain.taskAwards}/${domain.taskCount} task awards</small></div><span class="status ${domain.award?'green':''}">${domain.award?'Domain award':'In progress'}</span></article>`).join('');
      const history=report.state.checkpointHistory.slice(0,12).map(item=>`<div class="history-row"><div><strong>${esc(item.task)} task checkpoint</strong><small>${esc(formatDate(item.completedAt))}</small></div><div><strong>${esc(item.score)}%</strong><small>${item.passed?'passed':'review'}</small></div><div><strong>${esc(item.correct)}/${esc(item.total)}</strong><small>correct</small></div></div>`).join('');
      host.innerHTML=`<div class="trail-report-summary"><div><span>Study marks</span><strong>${counts.studyMarks}/12</strong></div><div><span>Task awards</span><strong>${counts.taskAwards}/12</strong></div><div><span>Domain awards</span><strong>${counts.domainAwards}/4</strong></div><div><span>Checkpoint attempts</span><strong>${counts.checkpoints}</strong></div></div><div class="report-callout"><strong>Current position:</strong> ${report.currentFocus?esc(report.currentFocus.task||report.currentFocus.domain):'No Guided Trail task selected yet.'}${latest?` · Latest checkpoint ${esc(latest.task)} ${esc(latest.score)}%`:''}</div><div class="trail-domain-list">${domainRows}</div><h3>Recent checkpoint history</h3>${history?`<div class="history-list">${history}</div>`:'<div class="empty-report">No Guided Trail checkpoint has been completed yet.</div>'}`;
    }catch(error){host.innerHTML=`<div class="empty-report">Guided Trail report unavailable: ${esc(error.message)}</div>`;}
  }
  async function init(){await waitForReports();await render();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);else init();
})();