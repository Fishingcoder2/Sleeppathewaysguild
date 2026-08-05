(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTGuidedStudyCoachSafety=api;
  if(root.document) api.mount(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='1.0.0';
  const headings=[
    'Start with the clinical clue.',
    'Picture the technologist’s next decision.',
    'Name the finding before choosing.',
    'Use the stem to narrow the pathway.',
    'Separate the key clue from the distractors.'
  ];
  const text=value=>String(value==null?'':value).trim();

  function headingForTopic(topic){
    const value=text(topic)||'RPSGT review';
    let hash=0;
    for(let index=0;index<value.length;index+=1) hash=(hash*31+value.charCodeAt(index))>>>0;
    return headings[hash%headings.length];
  }

  function clueForTopic(topic){
    const value=text(topic);
    const label=/^D[1-4][A-C]$/i.test(value)||!value?'this RPSGT concept':value;
    return 'Focus on '+label+'. Name the finding, action, or rule the stem is asking for, then remove choices that do not fit that pathway.';
  }

  function mount(win){
    const doc=win.document;
    const host=doc.querySelector('[data-checkpoint-workspace]');
    if(!host) return null;

    function sanitize(){
      if(host.querySelector('.answer-status')) return;
      const panel=host.querySelector('.coach-question-panel');
      if(!panel) return;
      const topic=text(host.querySelector('.checkpoint-question-meta .status')?.textContent);
      const heading=panel.querySelector('h3');
      const paragraph=[...panel.querySelectorAll('p')].find(node=>!node.classList.contains('coach-boundary'));
      if(heading) heading.textContent=headingForTopic(topic);
      if(paragraph) paragraph.textContent=clueForTopic(topic);
    }

    const observer=new win.MutationObserver(sanitize);
    observer.observe(host,{childList:true,subtree:true,characterData:true});
    sanitize();
    return {observer,sanitize};
  }

  return {VERSION,headingForTopic,clueForTopic,mount};
});
