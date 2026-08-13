(function(){
  'use strict';

  const host=document.querySelector('[data-lab-catalog]');
  const summaryHost=document.querySelector('[data-lab-summary]');
  const engine=window.RPSGTLabCatalogEngine;
  if(!host) return;

  const PATHWAYS=[
    {id:'build',eyebrow:'Build the study',title:'Setup and signal foundations',description:'Prepare the patient, place sensors correctly, and understand how signals reach the recording system.',labs:['hookup','instrumentation']},
    {id:'read',eyebrow:'Read the study',title:'Recognize what the signals are showing',description:'Practice visual recognition, artifact decisions, scoring, respiratory interpretation, and EKG response.',labs:['visual','artifact','scoring','respiratory','ekg']},
    {id:'treat',eyebrow:'Treat & troubleshoot',title:'Respond when therapy or the study changes',description:'Work through PAP decisions and integrated troubleshooting with technologist-focused next actions.',labs:['pap','troubleshooting']},
    {id:'specialized',eyebrow:'Specialized skills',title:'Age- and protocol-specific work',description:'Apply pediatric/infant considerations and daytime testing protocols.',labs:['pediatric','daytime-testing']},
    {id:'tools',eyebrow:'Coaches & tools',title:'Calculation support',description:'Strengthen sleep-technology calculations with Math Coach.',labs:['math-coach']}
  ];
  const LEARNER_LAB_IDS=new Set(PATHWAYS.flatMap(path=>path.labs));
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function openHref(lab){return lab.status==='legacy-linked'?lab.legacyHref:lab.plannedRoute;}
  function statusLabel(lab){return lab.completed?'Completed':lab.started?'In progress':'Ready to practice';}
  function statusClass(lab){return lab.completed?'green':lab.started?'gold':'';}

  function labCard(lab){
    const href=openHref(lab);
    const button=href?`<a class="btn primary" href="${esc(href)}">Open ${esc(lab.shortTitle)} lab</a>`:'<span class="btn secondary disabled" aria-disabled="true">Coming later</span>';
    return `<article class="card lab-card" id="lab-${esc(lab.id)}">
      <div class="lab-card-head"><div class="lab-icon" aria-hidden="true">${esc(lab.icon)}</div><div><span class="status ${statusClass(lab)}">${statusLabel(lab)}</span><h3>${esc(lab.title)}</h3></div></div>
      <p>${esc(lab.description)}</p>
      <div class="lab-task-map"><strong>RPSGT tasks</strong><div>${lab.taskCodes.map(code=>`<span>${esc(code)}</span>`).join('')}</div></div>
      <div class="lab-progress-row"><span>${lab.completed?'Completed':lab.started?'Continue your work':'Not started yet'}</span><strong>${lab.completed?'✓':lab.started?'In progress':'Open'}</strong></div>
      <div class="actions">${button}</div>
    </article>`;
  }

  function learnerRows(report){return report.rows.filter(lab=>LEARNER_LAB_IDS.has(lab.id));}
  function findLast(rows,report){
    if(report.last&&LEARNER_LAB_IDS.has(report.last.id)) return rows.find(lab=>lab.id===report.last.id)||null;
    return rows.find(lab=>lab.started&&!lab.completed)||null;
  }
  function findRecommended(rows,last){
    if(last&&!last.completed) return last;
    return rows.find(lab=>lab.id==='hookup'&&!lab.completed)||rows.find(lab=>!lab.completed)||rows[0]||null;
  }

  function renderLaunchCards(rows,report){
    const last=findLast(rows,report);
    const recommended=findRecommended(rows,last);
    const continueCard=document.querySelector('[data-lab-continue-card]');
    const recommendedCard=document.querySelector('[data-lab-recommended-card]');

    if(continueCard){
      if(last){
        continueCard.classList.remove('empty');
        continueCard.querySelector('[data-lab-continue-title]').textContent=last.title;
        continueCard.querySelector('[data-lab-continue-copy]').textContent=last.completed?'Review this lab again or choose another pathway.':'Return to the lab where you most recently worked.';
        const link=continueCard.querySelector('[data-lab-continue-action]');
        link.href=openHref(last)||'labs.html';
        link.textContent=last.completed?'Review lab':'Continue lab';
      }else{
        continueCard.classList.add('empty');
        continueCard.querySelector('[data-lab-continue-title]').textContent='No lab in progress yet';
        continueCard.querySelector('[data-lab-continue-copy]').textContent='Choose one lab below and your latest lab activity will appear here.';
        const link=continueCard.querySelector('[data-lab-continue-action]');
        link.href='#lab-path-build';
        link.textContent='Choose a lab';
      }
    }

    if(recommendedCard&&recommended){
      recommendedCard.querySelector('[data-lab-recommended-title]').textContent=recommended.title;
      recommendedCard.querySelector('[data-lab-recommended-copy]').textContent=recommended.id==='hookup'?'Start with patient setup, measurement, placement, impedance, and correction decisions that support many other technical skills.':'This is the next open lab in your applied-learning pathway.';
      const link=recommendedCard.querySelector('[data-lab-recommended-action]');
      link.href=openHref(recommended)||'labs.html';
      link.textContent='Open recommended lab';
    }
  }

  function render(catalog,report){
    const rows=learnerRows(report);
    const completed=rows.filter(lab=>lab.completed).length;
    const started=rows.filter(lab=>lab.started&&!lab.completed).length;
    summaryHost.innerHTML=`<div><span>Learning labs</span><strong>${rows.length}</strong></div><div><span>Completed</span><strong>${completed}</strong></div><div><span>In progress</span><strong>${started}</strong></div>`;

    host.innerHTML=PATHWAYS.map(path=>{
      const labs=path.labs.map(id=>rows.find(lab=>lab.id===id)).filter(Boolean);
      if(!labs.length) return '';
      return `<section class="lab-pathway" id="lab-path-${esc(path.id)}"><div class="lab-pathway-head"><div><div class="eyebrow">${esc(path.eyebrow)}</div><h2>${esc(path.title)}</h2><p>${esc(path.description)}</p></div><span class="status">${labs.filter(lab=>lab.completed).length} / ${labs.length} completed</span></div><div class="lab-pathway-grid">${labs.map(labCard).join('')}</div></section>`;
    }).join('');

    renderLaunchCards(rows,report);
    const boundary=document.querySelector('[data-lab-boundary]');
    if(boundary) boundary.textContent='Lab scenarios, teaching visuals, and learning activities are original Sleep Pathways Guild educational material. Use current professional references when a rule, protocol, or requirement matters.';
  }

  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error('A required Skills Lab module is unavailable.');
      const response=await fetch('data/labs/catalog.json',{cache:'no-store'});
      if(!response.ok) throw new Error('Skills Lab catalog HTTP '+response.status);
      const catalog=await response.json();
      const validation=engine.validateCatalog(catalog);
      if(!validation.valid) throw new Error('Skills Lab catalog validation failed.');
      const saved=window.RPSGTStorage.load();
      render(catalog,engine.summarize(catalog,saved.labs));
    }catch(error){
      host.innerHTML=`<div class="notice error"><strong>Skills Labs could not be loaded.</strong> ${esc(error.message)} Your learner progress was not changed.</div>`;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
