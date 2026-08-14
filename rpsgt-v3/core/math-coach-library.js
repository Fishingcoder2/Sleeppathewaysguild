(function(){
  'use strict';
  const library=window.RPSGTLearningLibrary;
  const list=document.querySelector('[data-math-library-list]');
  const detail=document.querySelector('[data-math-library-detail]');
  if(!library||!list||!detail) return;

  const state={lessons:[],index:0,questionIndex:0,score:0,answered:false};
  const clean=value=>String(value==null?'':value).trim();

  function make(tag,text,className){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
  function lessonButton(item,index){
    const button=make('button',undefined,'math-lesson-button');button.type='button';
    button.append(make('strong',(index+1)+'. '+(item.short||item.title)),make('span',item.title));
    button.classList.toggle('active',index===state.index);button.setAttribute('aria-pressed',index===state.index?'true':'false');
    button.addEventListener('click',()=>{state.index=index;state.questionIndex=0;state.score=0;state.answered=false;render();detail.scrollIntoView({behavior:'smooth',block:'start'});});
    return button;
  }
  function renderList(){list.replaceChildren(...state.lessons.map(lessonButton));}
  function steps(items){const ol=make('ol',undefined,'math-steps');(items||[]).forEach(value=>ol.append(make('li',value)));return ol;}
  function info(title,text){const box=make('div',undefined,'math-info');box.append(make('h3',title),make('p',text||'—'));return box;}

  function renderQuestion(container,item){
    const questions=Array.isArray(item.questions)?item.questions:[];
    const q=questions[state.questionIndex];if(!q)return;
    const section=make('section',undefined,'math-question');
    const heading=make('div');heading.append(make('span','Practice '+(state.questionIndex+1)+' of '+questions.length,'status'),make('span',state.score+' correct','status green'));section.append(heading,make('h3',q.q));
    const choices=make('div',undefined,'recall-choice-grid');
    (q.choices||[]).forEach(value=>{
      const button=make('button',value,'math-question-choice');button.type='button';
      button.addEventListener('click',()=>answer(button,value,q,choices,feedback,next));choices.append(button);
    });
    const feedback=make('div','', 'math-question-feedback');feedback.hidden=true;
    const next=make('button',state.questionIndex===questions.length-1?'Finish lesson check':'Next question','btn primary');next.type='button';next.disabled=true;next.addEventListener('click',()=>nextQuestion(item,feedback));
    section.append(choices,feedback,next);container.append(section);
  }
  function answer(button,value,q,choices,feedback,next){
    if(state.answered)return;state.answered=true;const correct=value===q.a;if(correct)state.score+=1;
    [...choices.children].forEach(node=>{node.disabled=true;if(node.textContent===q.a)node.classList.add('correct');});if(!correct)button.classList.add('wrong');
    feedback.hidden=false;feedback.textContent=(correct?'Correct. ':'Review this one. ')+(q.why||'');next.disabled=false;
  }
  function nextQuestion(item,feedback){
    const questions=Array.isArray(item.questions)?item.questions:[];
    if(state.questionIndex>=questions.length-1){
      feedback.hidden=false;feedback.textContent='Lesson check complete: '+state.score+' of '+questions.length+' correct. Re-run the lesson if any formula, unit, or setup still feels uncertain.';
      return;
    }
    state.questionIndex+=1;state.answered=false;renderDetail();
  }

  function renderDetail(){
    const item=state.lessons[state.index];if(!item)return;
    detail.replaceChildren();detail.className='card math-lesson';
    const head=make('div','', 'section-head');const titleWrap=make('div');titleWrap.append(make('div','Lesson '+(state.index+1)+' of '+state.lessons.length,'eyebrow'),make('h2',item.title));
    const flash=make('a','Review as flashcard','btn secondary');flash.href='flashcards.html?search='+encodeURIComponent(clean(item.short||item.title));head.append(titleWrap,flash);detail.append(head);
    detail.append(make('p',item.concept));
    const formula=make('div',undefined,'math-formula');formula.append(make('strong','Formula or rule'),make('code',item.formula||'—'));detail.append(formula);
    const grid=make('div',undefined,'math-concept-grid');grid.append(info('Unit',item.unit),info('Common trap',item.trap));detail.append(grid);
    const example=make('div',undefined,'math-info');example.append(make('h3','Worked example'),steps(item.example||[]));detail.append(example);
    const solve=make('div',undefined,'math-info');solve.append(make('h3','How to solve it'),steps(item.solve||[]));detail.append(solve);
    renderQuestion(detail,item);
  }
  function render(){renderList();renderDetail();const count=document.querySelector('[data-math-library-count]');if(count)count.textContent=state.lessons.length+' lessons · '+state.lessons.reduce((sum,item)=>sum+(item.questions||[]).length,0)+' practice questions';}

  async function init(){
    try{await library.load();state.lessons=library.mathLessonRecords();render();}
    catch(error){detail.replaceChildren(make('h2','Lesson library could not load'),make('p',error.message));}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
