(function(){
  'use strict';
  const host=document.querySelector('[data-lab-catalog]');const summaryHost=document.querySelector('[data-lab-summary]');const engine=window.RPSGTLabCatalogEngine;
  if(!host) return;
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const contentLabel=status=>({'interactive-foundation':'Interactive lab','interactive-rich':'Interactive lab','interactive-in-progress':'Interactive lab · expanding','review-shell':'Review + checkpoint','assessment-tool':'Assessment tool','interactive-tool':'Learning tool'}[status]||'Skills Lab');
  const contentClass=status=>status==='review-shell'?'gold':status==='interactive-in-progress'?'gold':'green';
  const trailLabs=new Set(['respiratory','pap','troubleshooting']);
  const studyTrailAction=lab=>trailLabs.has(lab.id)?'<a class="btn secondary" href="study.html#respiratory-pap-trail">Study respiratory/PAP trail first</a>':'';
  function render(catalog,report){
    const counts=report.counts;
    summaryHost.innerHTML=`<div><span>Lab families</span><strong>${counts.total}</strong></div><div><span>Completed</span><strong>${counts.completed}</strong></div><div><span>In progress</span><strong>${counts.started}</strong></div><div><span>Interactive labs</span><strong>${counts.interactiveLabs}</strong></div>`;
    host.innerHTML=report.rows.map(lab=>`<article class="card lab-card" id="lab-${esc(lab.id)}">
      <div class="lab-card-head"><div class="lab-icon" aria-hidden="true">${esc(lab.icon)}</div><div><span class="status ${contentClass(lab.contentStatus)}">${esc(contentLabel(lab.contentStatus))}</span><h2>${esc(lab.title)}</h2></div></div>
      <p>${esc(lab.description)}</p>
      <div class="lab-task-map"><strong>Blueprint tasks</strong><div>${lab.taskCodes.map(code=>`<span>${esc(code)}</span>`).join('')}</div></div>
      <div class="lab-progress-row"><span>${lab.completed?'Completed':lab.started?'In progress':lab.isLast?'Last activity':'Not started'}</span><strong>${lab.completed?'✓':lab.started?'In progress':'—'}</strong></div>
      <div class="actions">${lab.status==='legacy-linked'?`<a class="btn primary" href="${esc(lab.legacyHref)}">Open ${esc(lab.shortTitle)} lab</a>`:lab.status==='v3-ready'?`<a class="btn primary" href="${esc(lab.plannedRoute)}">Open ${esc(lab.shortTitle)} lab</a>`:'<span class="btn secondary disabled" aria-disabled="true">Lab unavailable</span>'}${studyTrailAction(lab)}</div>
    </article>`).join('');
    const last=document.querySelector('[data-lab-last]');if(last) last.textContent=report.last?`Last activity: ${report.last.title}`:'No prior lab activity yet.';
    const boundary=document.querySelector('[data-lab-boundary]');if(boundary) boundary.textContent=catalog.meta&&catalog.meta.copyrightBoundary||'';
  }
  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error('A required laboratory catalog module is unavailable.');
      const response=await fetch('data/labs/catalog.json',{cache:'no-store'});if(!response.ok) throw new Error('Laboratory catalog HTTP '+response.status);
      const catalog=await response.json();const validation=engine.validateCatalog(catalog);if(!validation.valid) throw new Error('Laboratory catalog validation failed.');
      const saved=window.RPSGTStorage.load();render(catalog,engine.summarize(catalog,saved.labs));
    }catch(error){host.innerHTML=`<div class="notice error"><strong>Laboratory catalog unavailable.</strong> ${esc(error.message)} No learner progress was changed.</div>`;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
