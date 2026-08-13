(function(){
  'use strict';

  const eligibility=window.RPSGTGuidedTrailEngine;
  const resources=window.RPSGTStudyResourceCatalog;
  if(!eligibility) return;

  const originalFetch=window.fetch.bind(window);
  const questionCache=[];
  const taskMap=new Map();
  const normalize=value=>String(value==null?'':value).trim().toLowerCase().replace(/\s+/g,' ');
  const unique=values=>[...new Set((Array.isArray(values)?values:[]).filter(Boolean))];

  function questionModulePath(input){
    const value=typeof input==='string'?input:String(input&&input.url||'');
    return /(?:^|\/)data\/question-bank\/(?!manifest\.json(?:$|\?))[^/?]+\.json(?:$|\?)/i.test(value);
  }

  function learnerQuestions(payload){
    if(!payload||!Array.isArray(payload.questions)) return payload;
    const questions=payload.questions.filter(question=>eligibility.eligibleQuestion(question,question&&question.taskCode));
    questions.forEach(question=>questionCache.push(question));
    return Object.assign({},payload,{questions});
  }

  window.fetch=async function(input,init){
    const response=await originalFetch(input,init);
    if(!questionModulePath(input)||!response.ok) return response;
    const payload=await response.clone().json();
    const filtered=learnerQuestions(payload);
    return new Response(JSON.stringify(filtered),{
      status:response.status,
      statusText:response.statusText,
      headers:{'content-type':'application/json; charset=utf-8'}
    });
  };

  async function loadBlueprint(){
    try{
      const response=await originalFetch('data/blueprint.json',{cache:'no-store'});
      if(!response.ok) return;
      const blueprint=await response.json();
      (blueprint.domains||[]).forEach(domain=>(domain.tasks||[]).forEach(task=>taskMap.set(task.code,{title:task.title,domainName:domain.fullName})));
    }catch(error){console.warn('Practice learner task titles could not be loaded.',error);}
  }

  function taskTitle(code){return taskMap.get(String(code||''))?.title||'RPSGT task';}
  function stripCode(value){return String(value||'').replace(/^D[1-4][A-C]\s*·\s*/i,'').trim();}

  function sanitizeSetup(){
    const mode=document.querySelector('[data-practice-mode]');
    if(mode&&mode.value!=='learner') mode.value='learner';
    const notice=document.querySelector('[data-mode-notice]');
    if(notice){
      if(notice.className!=='mode-notice learner') notice.className='mode-notice learner';
      const message='<strong>Learner-ready questions only:</strong> Questions with incomplete prompts, invalid answer sets, or unresolved learner-readiness issues are excluded from practice.';
      if(notice.innerHTML!==message) notice.innerHTML=message;
    }
    const domain=document.querySelector('[data-practice-domain]');
    if(domain) [...domain.options].forEach(option=>{if(option.value!=='all'){const title=stripCode(option.textContent);if(option.textContent!==title) option.textContent=title;}});
    const task=document.querySelector('[data-practice-task]');
    if(task) [...task.options].forEach(option=>{if(option.value!=='all'){const title=taskTitle(option.value);if(option.textContent!==title) option.textContent=title;}});
  }

  function currentQuestion(){
    const prompt=normalize(document.querySelector('[data-question-prompt]')?.textContent);
    if(!prompt) return null;
    const options=[...document.querySelectorAll('[data-choice-index] span:last-child')].map(node=>normalize(node.textContent));
    let matches=questionCache.filter(question=>normalize(question.prompt)===prompt);
    if(options.length) matches=matches.filter(question=>Array.isArray(question.options)&&question.options.length===options.length&&question.options.every((option,index)=>normalize(option)===options[index]));
    return matches.length===1?matches[0]:null;
  }

  function sanitizeQuestion(){
    const question=currentQuestion();
    if(!question) return;
    const meta=document.querySelector('[data-question-task]');
    if(meta){const label=taskTitle(question.taskCode)+(question.topic?' · '+question.topic:'');if(meta.textContent!==label) meta.textContent=label;}
    const host=document.querySelector('[data-practice-question-actions]');
    if(host&&host.dataset.questionId!==String(question.id)){
      host.dataset.questionId=String(question.id);
      document.dispatchEvent(new CustomEvent('rpsgt:practice-question',{detail:{question,context:{
        domainTitle:taskMap.get(question.taskCode)?.domainName||question.domain,
        taskTitle:taskTitle(question.taskCode),
        taskCode:question.taskCode,
        sourceContext:'Learner Practice'
      }}}));
    }
  }

  function resourceTitles(question){
    if(!resources||!resources.isReady()) return [];
    return unique(resources.titlesForQuestion(question));
  }

  function sanitizeFeedback(){
    const feedback=document.querySelector('[data-answer-feedback]');
    if(!feedback||feedback.classList.contains('hidden')) return;
    const question=currentQuestion();
    if(!question) return;
    feedback.querySelectorAll('.feedback-references').forEach(node=>node.remove());
    if(feedback.querySelector('.feedback-resources')) return;
    const titles=resourceTitles(question);
    if(!titles.length) return;
    const section=document.createElement('section');
    section.className='feedback-resources';
    const heading=document.createElement('h4');
    heading.textContent='Recommended study resources';
    const list=document.createElement('ul');
    titles.forEach(title=>{const item=document.createElement('li');item.textContent=title;list.appendChild(item);});
    section.append(heading,list);
    feedback.appendChild(section);
  }

  function sanitizeAll(){sanitizeSetup();sanitizeQuestion();sanitizeFeedback();}

  function start(){
    loadBlueprint().then(sanitizeAll);
    if(resources) resources.load().then(sanitizeAll).catch(()=>null);
    const observer=new MutationObserver(sanitizeAll);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    sanitizeAll();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
