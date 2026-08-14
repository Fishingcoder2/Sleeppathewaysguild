(function(){
  'use strict';
  const host=document.querySelector('[data-coach-plan]');
  if(!host) return;

  const mathPattern=/\b(?:calculate|calculation|formula|index|ahi|rdi|rei|plmi|odi|arousal index|sleep efficiency|stage percentage|total sleep time|tst|waso|latency|pressure support|ipap|epap|oxygen flow|sensitivity|frequency|ohm|10-20|epoch|minutes?|hours?|denominator|numerator)\b/i;
  const comparePattern=/\b(?:distinguish|differentiate|compare|confus|similar|versus|vs\.?|recognition clue|pattern recognition)\b/i;
  const termPattern=/\b(?:term|terminology|definition|abbreviation|acronym|meaning|name|nomenclature|criteria language)\b/i;

  function makeLink(href,label,kind){
    const link=document.createElement('a');
    link.className='btn secondary report-tool-link';
    link.href=href;link.textContent=label;link.dataset.studyTool=kind;
    return link;
  }
  function searchValue(item){
    const heading=item.querySelector('.coach-plan-heading h3');
    const chip=item.querySelector('.topic-chip');
    return String((chip&&chip.textContent.replace(/^Review topic:\s*/i,''))||(heading&&heading.textContent)||'').trim();
  }
  function toolFor(item){
    const text=String(item.textContent||'');
    const search=encodeURIComponent(searchValue(item));
    if(mathPattern.test(text)) return {href:'math-coach.html',label:'Review in Math Coach',kind:'math'};
    if(comparePattern.test(text)) return {href:'memory.html',label:'Practice in Memory Lab',kind:'memory'};
    if(termPattern.test(text)) return {href:'glossary.html?search='+search,label:'Look up in Glossary',kind:'glossary'};
    return {href:'flashcards.html?search='+search,label:'Review with Flashcards',kind:'flashcards'};
  }
  function enhance(){
    host.querySelectorAll('.coach-plan-item').forEach(item=>{
      if(item.querySelector('[data-report-tool-actions]')) return;
      const tool=toolFor(item);
      const actions=document.createElement('div');actions.className='actions compact report-learning-tool-actions';actions.dataset.reportToolActions='true';
      const note=document.createElement('span');note.className='report-tool-note';note.textContent='Best review tool for this priority:';
      actions.append(note,makeLink(tool.href,tool.label,tool.kind));
      const practice=item.querySelector('a.btn.primary[href="practice.html"]');
      const parent=practice&&practice.parentElement;
      if(parent) parent.insertAdjacentElement('beforebegin',actions); else item.append(actions);
    });
  }
  const observer=new MutationObserver(enhance);observer.observe(host,{childList:true,subtree:true});enhance();
})();
