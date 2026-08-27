(function(){
  'use strict';

  const host=document.querySelector('[data-respiratory-study-trail]');
  if(!host) return;
  const guidedEngine=window.RPSGTGuidedTrailEngine;

  const state={trail:null,source:null,chapters:new Map(),activeIndex:0,completedThrough:-1,taskEntryObserver:null};
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
    const sourceTitle=text(state.source&&state.source.fullTitle)||'Principles and Practice of Sleep Medicine';
    const edition=text(state.source&&state.source.edition);
    const sourceLabel=sourceTitle+(edition?', '+edition:'');
    return '<strong class="respiratory-study-book">Book: <em>'+esc(sourceLabel)+'</em></strong><strong>Chapter '+esc(chapter.chapter)+' · '+esc(chapter.label)+'</strong>'+section+'<small>Printed start p. '+esc(chapter.printedStartPage)+' · study support</small>';
  }

  function referenceHref(step){
    const params=new URLSearchParams({task:text(step.taskCode)});
    if(text(step.referenceTopic)) params.set('topic',text(step.referenceTopic));
    return 'sources-disclosures.html?'+params.toString();
  }

  function indexForStepId(stepId){
    const steps=Array.isArray(state.trail&&state.trail.steps)?state.trail.steps:[];
    const index=steps.findIndex(step=>step.id===stepId);
    return index>=0?index:null;
  }

  function loadProgress(){
    if(!window.RPSGTStorage||!state.trail) return;
    const saved=window.RPSGTStorage.load();
    const guided=saved&&saved.guidedStudy&&typeof saved.guidedStudy==='object'?saved.guidedStudy:{};
    const progress=guided.respiratoryStudyTrail&&typeof guided.respiratoryStudyTrail==='object'?guided.respiratoryStudyTrail:{};
    const active=indexForStepId(progress.activeStepId);
    const completed=indexForStepId(progress.completedThroughStepId);
    state.completedThrough=completed==null?-1:completed;
    const unlocked=Math.min(state.completedThrough+1,state.trail.steps.length-1);
    state.activeIndex=active==null?Math.max(0,unlocked):Math.min(active,Math.max(0,unlocked));
  }

  function saveProgress(){
    if(!window.RPSGTStorage||!state.trail) return;
    const saved=window.RPSGTStorage.load();
    if(!saved.guidedStudy||typeof saved.guidedStudy!=='object') saved.guidedStudy={};
    const active=state.trail.steps[state.activeIndex]||state.trail.steps[0];
    const completed=state.completedThrough>=0?state.trail.steps[state.completedThrough]:null;
    saved.guidedStudy.respiratoryStudyTrail={
      activeStepId:active&&active.id||null,
      completedThroughStepId:completed&&completed.id||null,
      updatedAt:new Date().toISOString()
    };
    window.RPSGTStorage.save(saved);
  }

  function progressHtml(){
    const total=state.trail.steps.length;
    const completed=Math.max(0,state.completedThrough+1);
    const percent=Math.round(completed/total*100);
    const finished=completed===total;
    const active=state.trail.steps[state.activeIndex]||null;
    return '<div class="respiratory-route-overview" aria-live="polite">'+
      '<div class="respiratory-route-copy"><span class="eyebrow">Your learning path</span><strong>'+(finished?'Respiratory trail complete':('Lesson '+(state.activeIndex+1)+' of '+total))+'</strong><small>'+(finished?'All '+total+' lessons completed':('Continue with '+esc(active&&active.navLabel||active&&active.title||'your next lesson')))+'</small></div>'+
      '<div class="respiratory-route-progress"><div class="respiratory-route-meter" aria-hidden="true"><span style="width:'+percent+'%"></span></div><small>'+completed+' / '+total+' complete</small></div>'+
    '</div>';
  }

  function workflowHtml(step,index){
    const last=index===state.trail.steps.length-1;
    const next=state.trail.steps[index+1]||null;
    const alreadyComplete=index<=state.completedThrough;
    const labLabel=step.lab&&text(step.lab.label)?text(step.lab.label):'Skills Lab';
    const labLink=step.lab&&text(step.lab.href)?'<a class="btn secondary" href="'+esc(step.lab.href)+'">Open '+esc(labLabel)+'</a>':'';
    const nextLabel=last?(alreadyComplete?'Trail complete ✓':'Finish respiratory trail'):'Finish lesson → Unlock '+esc(next.navLabel||next.title);
    const continueButton='<button class="btn '+(last&&alreadyComplete?'secondary':'primary')+'" type="button" data-respiratory-next '+(last&&alreadyComplete?'disabled':'')+'>'+nextLabel+'</button>';
    return '<section class="respiratory-guided-sequence" aria-label="What to do in this lesson">'+
      '<div class="respiratory-guided-title"><span class="eyebrow">Lesson route</span><h4>Learn → Apply → Check</h4><p>Finish these three activities, then unlock the next lesson.</p></div>'+
      '<ol class="respiratory-guided-list">'+
        '<li><span>1</span><div><strong>Learn this first</strong><p>Read why this matters, the primary authority, the textbook study support, and the current-rule warning below.</p></div></li>'+
        '<li><span>2</span><div><strong>Apply it</strong><p>Use the related skills lab to see the concept in a practical sleep-tech workflow.</p>'+labLink+'</div></li>'+
        '<li><span>3</span><div><strong>Check understanding</strong><p>Take the 15-question checkpoint matched to <strong>this respiratory concept</strong>. If you need help, Ask Coach Bob from inside a question for a reasoning hint.</p><button class="btn primary" type="button" data-checkpoint-start="'+esc(step.taskCode)+'" data-checkpoint-concept="'+esc(step.id)+'">Take 15-question concept checkpoint</button></div></li>'+
      '</ol>'+
      '<div class="respiratory-lesson-finish"><span>Ready to move on?</span>'+continueButton+'</div>'+
    '</section>';
  }

  function panelHtml(step,index){
    const complete=index<=state.completedThrough;
    const previous=index>0?'<button class="respiratory-trail-link" type="button" data-respiratory-prev>← Previous lesson</button>':'';
    return '<article class="respiratory-trail-panel" aria-labelledby="respiratory-trail-title">'+
      '<div class="respiratory-lesson-kicker"><span class="status '+(complete?'green':'')+'">'+(complete?'Completed lesson':'Current lesson')+'</span><span>Lesson '+(index+1)+' · '+esc(step.taskCode)+'</span></div>'+
      '<h3 id="respiratory-trail-title">'+esc(step.title)+'</h3>'+
      '<p class="respiratory-lesson-prompt">Complete this lesson to move one step farther along the Respiratory/PAP path.</p>'+
      workflowHtml(step,index)+
      '<div class="respiratory-trail-learning-grid">'+
        '<section><span>Why this matters</span><p>'+esc(step.whyThisMatters)+'</p></section>'+
        '<section><span>Primary authority</span><p>'+esc(step.primaryAuthority)+'</p></section>'+
        '<section class="respiratory-study-chapter"><span>Best textbook study support</span>'+chapterHtml(step)+'</section>'+
      '</div>'+
      '<aside class="respiratory-rule-warning"><strong>Current-rule warning</strong><p>'+esc(step.warning)+'</p></aside>'+
      '<details class="respiratory-extra-study"><summary>Need more study before the checkpoint?</summary><div class="respiratory-extra-study-links"><a class="respiratory-trail-link" href="'+esc(referenceHref(step))+'">Related reference materials</a><a class="respiratory-trail-link" href="practice.html?task='+encodeURIComponent(text(step.taskCode))+'">Extra practice questions</a></div></details>'+
      '<div class="respiratory-panel-footer">'+previous+'<span>Your next unlocked lesson is always highlighted on the path.</span></div>'+
    '</article>';
  }

  function stepButton(step,index){
    const unlocked=Math.min(state.completedThrough+1,state.trail.steps.length-1);
    const locked=index>unlocked;
    const complete=index<=state.completedThrough;
    const current=index===state.activeIndex;
    const marker=complete?'✓':locked?'🔒':String(index+1);
    const stateLabel=complete?'Completed':current?'Continue here':locked?'Locked':'Available';
    const classes=['respiratory-path-node'];
    if(complete) classes.push('is-complete');
    if(current) classes.push('is-current');
    if(locked) classes.push('is-locked');
    return '<div class="respiratory-path-stop stop-'+((index%3)+1)+'">'+
      '<button type="button" data-respiratory-step="'+index+'" aria-current="'+(current?'step':'false')+'" '+(locked?'disabled aria-disabled="true"':'')+' class="'+classes.join(' ')+'">'+
        '<span class="respiratory-path-orb" aria-hidden="true">'+marker+'</span>'+
        '<span class="respiratory-path-copy"><strong>'+esc(step.navLabel||step.title)+'</strong><small>'+stateLabel+'</small></span>'+
      '</button>'+
      (current?'<span class="respiratory-path-callout">Continue</span>':'')+
    '</div>';
  }

  function render(){
    const steps=Array.isArray(state.trail&&state.trail.steps)?state.trail.steps:[];
    if(!steps.length) throw new Error('Respiratory/PAP trail has no learner steps.');
    const active=steps[state.activeIndex]||steps[0];
    host.innerHTML='<div class="section-head respiratory-trail-head"><div><div class="eyebrow">Featured Study Trail · Respiratory / PAP</div><h2>'+esc(state.trail.title)+'</h2><p>'+esc(state.trail.description)+'</p></div><span class="status">Guided learning path</span></div>'+progressHtml()+
      '<div class="respiratory-trail-shell">'+
        '<nav class="respiratory-trail-steps respiratory-learning-path" aria-label="Respiratory and PAP learning path">'+steps.map(stepButton).join('')+'</nav>'+
        '<div class="respiratory-current-lesson" data-respiratory-trail-panel>'+panelHtml(active,state.activeIndex)+'</div>'+
      '</div>'+
      '<p class="respiratory-trail-boundary">'+esc(state.trail.learnerBoundary)+'</p>';
  }

  function focusPanel(){
    const title=host.querySelector('#respiratory-trail-title');
    if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true});}
  }

  function setActive(index){
    const unlocked=Math.min(state.completedThrough+1,state.trail.steps.length-1);
    if(!Number.isInteger(index)||index<0||index>unlocked||index>=state.trail.steps.length) return;
    state.activeIndex=index;
    saveProgress();
    render();
    focusPanel();
  }

  function completeAndContinue(){
    const last=state.trail.steps.length-1;
    if(state.activeIndex===last&&state.completedThrough===last) return;
    state.completedThrough=Math.max(state.completedThrough,state.activeIndex);
    if(state.activeIndex<last) state.activeIndex+=1;
    saveProgress();
    render();
    focusPanel();
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
      state.source=ppsm;
      state.chapters=new Map((Array.isArray(ppsm&&ppsm.verifiedChapterLocators)?ppsm.verifiedChapterLocators:[]).map(chapter=>[Number(chapter.chapter),chapter]));
      loadProgress();
      render();
    }catch(error){
      console.error(error);
      host.innerHTML='<div class="card notice"><h2>Respiratory Study Trail unavailable</h2><p>The learner pathway could not be loaded. The standard Guided Study map remains available below.</p></div>';
    }
  }

  host.addEventListener('click',event=>{
    const checkpoint=event.target.closest('[data-checkpoint-start][data-checkpoint-concept]');
    if(checkpoint&&state.trail&&guidedEngine&&typeof guidedEngine.queueQuestionFilter==='function'){
      const concept=state.trail.steps.find(step=>step.id===checkpoint.dataset.checkpointConcept);
      if(concept) guidedEngine.queueQuestionFilter(concept.taskCode,concept.checkpointFilter,{conceptId:concept.id,conceptLabel:concept.title});
      return;
    }
    const next=event.target.closest('[data-respiratory-next]');
    if(next&&state.trail){completeAndContinue();return;}
    const previous=event.target.closest('[data-respiratory-prev]');
    if(previous&&state.trail){setActive(Math.max(0,state.activeIndex-1));return;}
    const button=event.target.closest('[data-respiratory-step]');
    if(!button||!state.trail) return;
    const index=Number(button.dataset.respiratoryStep);
    if(index===state.activeIndex) return;
    setActive(index);
  });

  init();
})();
