(function(){
  'use strict';

  const storage=window.RPSGTStorage;
  const flashcards=window.RPSGTFlashcardStore;
  const resources=window.RPSGTStudyResourceCatalog;
  const listHost=document.querySelector('[data-queue-list]');
  const emptyHost=document.querySelector('[data-queue-empty]');
  const statusHost=document.querySelector('[data-queue-status]');
  if(!storage||!flashcards||!listHost||!emptyHost) return;

  const requested=new URLSearchParams(location.search).get('list');
  const type=requested==='review-later'?'review-later':'flagged';
  const config=type==='review-later'
    ?{key:'reviewLaterIds',heading:'Review later',label:'Review-later questions',intro:'Return to questions you intentionally saved for another study session.',remove:'Remove from review later',empty:'No questions are currently marked for later review.',sourceContext:'Guided Study review-later queue'}
    :{key:'flaggedIds',heading:'Flagged Questions',label:'Flagged questions',intro:'Revisit questions you flagged for focused follow-up.',remove:'Remove flag',empty:'No questions are currently flagged for review.',sourceContext:'Guided Study flagged queue'};

  const state={saved:null,ids:[],questions:[],taskMap:new Map(),unresolved:0};
  const text=(selector,value)=>{document.querySelectorAll(selector).forEach(node=>{node.textContent=value;});};
  const uniqueIds=values=>[...new Map((Array.isArray(values)?values:[]).map(value=>[String(value),value])).values()];

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function taskFile(code){return 'data/question-bank/'+String(code).toLowerCase()+'.json';}

  function buildTaskMap(blueprint){
    state.taskMap.clear();
    (blueprint.domains||[]).forEach(domain=>(domain.tasks||[]).forEach(task=>state.taskMap.set(task.code,{...task,domainName:domain.fullName})));
  }

  function setPageCopy(){
    text('[data-queue-heading]',config.heading);
    text('[data-queue-label]',config.label);
    text('[data-queue-intro]',config.intro);
    text('[data-queue-empty-copy]',config.empty);
  }

  function setCounts(){
    text('[data-queue-total]',String(state.ids.length));
    text('[data-queue-resolved]',String(state.questions.length));
    text('[data-queue-unresolved]',String(state.unresolved));
  }

  function queueIds(){
    const review=state.saved&&state.saved.review||{};
    return uniqueIds(review[config.key]);
  }

  function removeSavedId(id){
    const saved=storage.load();
    saved.review=saved.review&&typeof saved.review==='object'?saved.review:{};
    saved.review[config.key]=uniqueIds(saved.review[config.key]).filter(value=>String(value)!==String(id));
    state.saved=storage.save(saved);
    state.ids=queueIds();
    state.questions=state.questions.filter(question=>String(question.id)!==String(id));
    state.unresolved=Math.max(0,state.ids.length-state.questions.length);
    render();
  }

  function makeButton(label,className){
    const button=document.createElement('button');
    button.type='button';
    button.className=className;
    button.textContent=label;
    return button;
  }

  function makeCard(question,index){
    const task=state.taskMap.get(question.taskCode)||{};
    const article=document.createElement('article');
    article.className='card queue-item';

    const head=document.createElement('div');
    head.className='queue-item-head';
    const title=document.createElement('h2');
    title.textContent=question.topic||task.title||'RPSGT review question';
    const number=document.createElement('span');
    number.className='status';
    number.textContent='Saved question '+(index+1);
    head.append(title,number);

    const meta=document.createElement('div');
    meta.className='queue-item-meta';
    [task.domainName,task.title].filter(Boolean).forEach(value=>{const item=document.createElement('span');item.className='status green';item.textContent=value;meta.appendChild(item);});

    const prompt=document.createElement('div');
    prompt.className='queue-item-prompt';
    prompt.textContent=question.prompt;

    const actions=document.createElement('div');
    actions.className='queue-item-actions';
    const remove=makeButton(config.remove,'btn secondary');
    const makeFlashcard=makeButton('Make flashcard','btn primary');
    const taskLink=document.createElement('a');
    taskLink.className='btn secondary';
    taskLink.href='study.html#'+encodeURIComponent(question.taskCode);
    taskLink.textContent='Open this study task';
    const actionStatus=document.createElement('div');
    actionStatus.className='queue-item-status';
    actionStatus.setAttribute('aria-live','polite');

    remove.addEventListener('click',()=>removeSavedId(question.id));
    makeFlashcard.addEventListener('click',()=>{
      const recommendationTitles=resources&&resources.isReady()?resources.titlesForTask(question.taskCode):[];
      const result=flashcards.addQuestion(question,{
        domainTitle:task.domainName||question.domain,
        taskTitle:task.title||question.task,
        taskCode:question.taskCode,
        sourceContext:config.sourceContext,
        recommendedResources:recommendationTitles
      },new Date().toISOString());
      makeFlashcard.textContent=result.created?'Flashcard saved':'Flashcard already saved';
      actionStatus.textContent=result.created?'The card is ready in the RPSGT Flashcard Center.':'This question is already in your flashcard deck.';
    });

    actions.append(remove,makeFlashcard,taskLink);
    article.append(head,meta,prompt,actions,actionStatus);
    return article;
  }

  function render(){
    setCounts();
    listHost.replaceChildren(...state.questions.map(makeCard));
    const hasQuestions=state.questions.length>0;
    listHost.hidden=!hasQuestions;
    emptyHost.hidden=state.ids.length>0;
    if(statusHost){
      statusHost.hidden=state.ids.length===0||hasQuestions;
      statusHost.textContent=state.unresolved?'Some saved questions are currently unavailable because their learner-ready record could not be resolved. No identifiers are shown.':'Loading saved questions…';
    }
  }

  async function resolveQuestions(feedback){
    const wanted=new Set(state.ids.map(String));
    const records=(feedback.records||[]).filter(record=>wanted.has(String(record.id))&&!record.manualReviewRecommended&&record.taskCode!=='D2A/D2C');
    const taskCodes=[...new Set(records.map(record=>record.taskCode))];
    const modules=await Promise.all(taskCodes.map(async code=>[code,await loadJson(taskFile(code))]));
    const questionMap=new Map();
    modules.forEach(([,module])=>(module.questions||[]).forEach(question=>{if(wanted.has(String(question.id))&&!question.qa?.manualReviewRecommended) questionMap.set(String(question.id),question);}));
    state.questions=state.ids.map(id=>questionMap.get(String(id))).filter(Boolean);
    state.unresolved=Math.max(0,state.ids.length-state.questions.length);
  }

  async function init(){
    setPageCopy();
    state.saved=storage.load();
    state.ids=queueIds();
    setCounts();
    if(!state.ids.length){render();return;}
    try{
      const [feedback,blueprint]=await Promise.all([
        loadJson('data/question-bank/feedback-index.json'),
        loadJson('data/blueprint.json'),
        resources?resources.load().catch(()=>null):Promise.resolve(null)
      ]);
      buildTaskMap(blueprint);
      await resolveQuestions(feedback);
      render();
    }catch(error){
      statusHost.hidden=false;
      statusHost.className='section notice error';
      statusHost.textContent='The review queue could not be loaded. '+error.message+' No learner data was changed.';
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
