(function(){
  'use strict';

  const host=document.querySelector('[data-respiratory-study-trail]');
  if(!host) return;

  const state={trail:null,chapters:new Map(),activeIndex:0,taskEntryObserver:null};
  const text=value=>String(value==null?'':value).trim();
  const esc=value=>text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function chapterRecord(number){
    return state.chapters.get(Number(number))||null;
  }

  function chapterHtml(step){
    const chapter=chapterRecord(step.studyChapter);
    if(!chapter) return '<span class="muted">Verified chapter locator unavailable.</span>';
    const section=chapter.sectionLabel?'<span>'+esc(chapter.sectionLabel)+'</span>':'';
    return '<strong>Chapter '+esc(chapter.chapter)+' · '+esc(chapter.label)+'</strong>'+section+'<small>Printed start p. '+esc(chapter.printedStartPage)+' · study support</small>';
  }

  function referenceHref(step){
    const params=new URLSearchParams({task:text(step.taskCode)});
    if(text(step.referenceTopic)) params.set('topic',text(step.referenceTopic));
    return 'sources-disclosures.html?'+params.toString();
  }

  function panelHtml(step,index){
    const lab=step.lab&&text(step.lab.href)&&text(step.lab.label)?'<a class="respiratory-trail-link" href="'+esc(step.lab.href)+'">'+esc(step.lab.label)+'</a>':'';
    return '<article class="respiratory-trail-panel" aria-labelledby="respiratory-trail-title">'+
      '<div class="respiratory-trail-progress"><span class="status green">Step '+(index+1)+' of '+state.trail.steps.length+'</span><span>'+esc(step.taskCode)+' pathway</span></div>'+
      '<h3 id="respiratory-trail-title">'+esc(step.title)+'</h3>'+
      '<div class="respiratory-trail-learning-grid">'+
        '<section><span>Why this matters</span><p>'+esc(step.whyThisMatters)+'</p></section>'+
        '<section><span>Primary authority</span><p>'+esc(step.primaryAuthority)+'</p></section>'+
        '<section class="respiratory-study-chapter"><span>Best study chapter</span>'+chapterHtml(step)+'</section>'+
      '</div>'+
      '<aside class="respiratory-rule-warning"><strong>Current-rule warning</strong><p>'+esc(step.warning)+'</p></aside>'+
      '<div class="respiratory-trail-actions">'+
        '<a class="btn primary" href="practice.html?task='+encodeURIComponent(text(step.taskCode))+'">Practice this concept</a>'+
        '<a class="respiratory-trail-link" href="'+esc(referenceHref(step))+'">Related reference materials</a>'+lab+
        '<button class="respiratory-trail-link respiratory-coach-link" type="button" data-checkpoint-start="'+esc(step.taskCode)+'">Ask Coach Bob</button>'+
      '</div>'+
      '<p class="respiratory-coach-note">Coach Bob opens the existing 15-question badge checkpoint. Use “Ask Coach Bob” inside a question for reasoning help without revealing the answer.</p>'+
    '</article>';
  }

  function render(){
    const steps=Array.isArray(state.trail&&state.trail.steps)?state.trail.steps:[];
    if(!steps.length) throw new Error('Respiratory/PAP trail has no learner steps.');
    const active=steps[state.activeIndex]||steps[0];
    host.innerHTML='<div class="section-head respiratory-trail-head"><div><div class="eyebrow">Featured Study Trail · Respiratory / PAP</div><h2>'+esc(state.trail.title)+'</h2><p>'+esc(state.trail.description)+'</p></div><span class="status">Authority-aware</span></div>'+
      '<div class="respiratory-trail-shell">'+
        '<nav class="respiratory-trail-steps" aria-label="Respiratory and PAP study steps">'+
          steps.map((step,index)=>'<button type="button" data-respiratory-step="'+index+'" aria-current="'+(index===state.activeIndex?'step':'false')+'"><span>'+(index+1)+'</span><strong>'+esc(step.navLabel||step.title)+'</strong></button>').join('')+
        '</nav>'+
        '<div data-respiratory-trail-panel>'+panelHtml(active,state.activeIndex)+'</div>'+
      '</div>'+
      '<p class="respiratory-trail-boundary">'+esc(state.trail.learnerBoundary)+'</p>';
  }

  function addD4AEntryPoint(){
    const taskCard=document.getElementById('D4A');
    const actions=taskCard&&taskCard.querySelector('.trail-actions');
    if(!actions) return false;
    if(actions.querySelector('[data-respiratory-task-entry]')) return true;
    const link=document.createElement('a');
    link.className='btn secondary';
    link.href='#respiratory-pap-trail';
    link.dataset.respiratoryTaskEntry='true';
    link.textContent='Open Respiratory/PAP Study Trail';
    actions.prepend(link);
    return true;
  }

  function wireD4AEntryPoint(){
    if(addD4AEntryPoint()) return;
    if(typeof MutationObserver!=='function') return;
    state.taskEntryObserver=new MutationObserver(()=>{
      if(addD4AEntryPoint()&&state.taskEntryObserver){
        state.taskEntryObserver.disconnect();
        state.taskEntryObserver=null;
      }
    });
    state.taskEntryObserver.observe(document.body,{childList:true,subtree:true});
  }

  async function init(){
    wireD4AEntryPoint();
    try{
      const [trail,ppsm]=await Promise.all([
        loadJson('data/learner-trails/respiratory-pap.json'),
        loadJson('data/study-sources/principles-practice-sleep-medicine-7e.json')
      ]);
      state.trail=trail;
      state.chapters=new Map((Array.isArray(ppsm&&ppsm.verifiedChapterLocators)?ppsm.verifiedChapterLocators:[]).map(chapter=>[Number(chapter.chapter),chapter]));
      render();
    }catch(error){
      console.error(error);
      host.innerHTML='<div class="card notice"><h2>Respiratory Study Trail unavailable</h2><p>The learner pathway could not be loaded. The standard Guided Study map remains available below.</p></div>';
    }
  }

  host.addEventListener('click',event=>{
    const button=event.target.closest('[data-respiratory-step]');
    if(!button||!state.trail) return;
    const index=Number(button.dataset.respiratoryStep);
    if(!Number.isInteger(index)||index<0||index>=state.trail.steps.length||index===state.activeIndex) return;
    state.activeIndex=index;
    render();
    const nextButton=host.querySelector('[data-respiratory-step="'+index+'"]');
    if(nextButton) nextButton.focus({preventScroll:true});
  });

  init();
})();
