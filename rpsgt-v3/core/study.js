(function(){
  'use strict';

  const host=document.querySelector('[data-blueprint-map]');
  const summary=document.querySelector('[data-blueprint-summary]');
  if(!host) return;

  const esc=value=>String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  function taskCard(task){
    const targets=(task.studyTargets||[]).map((target,index)=>`<li><span>${index+1}</span><p>${esc(target)}</p></li>`).join('');
    const resources=(task.recommendedResourceKeys||[]).map(key=>`<span class="data-chip">${esc(key)}</span>`).join('');
    return `<article class="task-map-card" id="${esc(task.code)}">
      <div class="task-map-head">
        <div><span class="task-code">${esc(task.code)}</span><h3>${esc(task.title)}</h3></div>
        <strong class="question-count">${Number(task.questionCount||0).toLocaleString()} questions</strong>
      </div>
      <p class="task-focus">${esc(task.focus)}</p>
      <div class="task-next"><strong>Next study action</strong><span>${esc(task.nextAction||'')}</span></div>
      <details>
        <summary>Show five study targets</summary>
        <ol class="study-target-list">${targets}</ol>
      </details>
      <details>
        <summary>Show mapped resource keys</summary>
        <div class="data-chip-list">${resources||'<span class="muted">No mapped keys.</span>'}</div>
      </details>
      ${task.crossTaskQuestionCount?`<div class="mapping-warning"><strong>Mapping review:</strong> ${task.crossTaskQuestionCount} records also carry a cross-task code.</div>`:''}
    </article>`;
  }

  function domainCard(domain){
    return `<section class="domain-map-card domain-${esc(domain.id.toLowerCase())}">
      <header class="domain-map-head">
        <div><span class="status">${esc(domain.id)}</span><h2>${esc(domain.fullName)}</h2></div>
        <div class="domain-weight"><strong>${esc(domain.weight)}%</strong><span>app blueprint weight</span></div>
      </header>
      <div class="domain-task-grid">${(domain.tasks||[]).map(taskCard).join('')}</div>
    </section>`;
  }

  async function load(){
    host.innerHTML='<div class="card"><p>Loading the canonical RPSGT learning map…</p></div>';
    try{
      const response=await fetch('data/blueprint.json',{cache:'no-store'});
      if(!response.ok) throw new Error(`Blueprint request failed (${response.status})`);
      const data=await response.json();
      const domains=Array.isArray(data.domains)?data.domains:[];
      const tasks=domains.flatMap(domain=>domain.tasks||[]);
      const questionCount=tasks.reduce((sum,task)=>sum+Number(task.questionCount||0),0);
      const crossTaskCount=Math.max(...tasks.map(task=>Number(task.crossTaskQuestionCount||0)),0);
      if(summary){
        summary.innerHTML=`<span><strong>${domains.length}</strong> domains</span><span><strong>${tasks.length}</strong> tasks</span><span><strong>${questionCount.toLocaleString()}</strong> directly assigned questions</span><span><strong>${crossTaskCount}</strong> cross-task records awaiting mapping</span>`;
      }
      host.innerHTML=domains.map(domainCard).join('');
    }catch(error){
      console.error(error);
      host.innerHTML='<div class="card notice"><h2>Learning map unavailable</h2><p>The development shell could not load its canonical blueprint file. No learner progress was changed.</p></div>';
    }
  }

  load();
})();
