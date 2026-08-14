(function(){
  'use strict';

  const content=document.querySelector('[data-reports-content]');
  if(!content) return;

  const taskCodePrefix=/^D[1-4][A-C]\s*·\s*/i;
  const domainCodePrefix=/^D[1-4]\s*·\s*/i;
  const internalLanguage=/\b(?:mapped|mapping|mappings|referenceKeys|studyRecommendationKeys|cross-task)\b/i;

  function learnerReason(detail){
    const text=String(detail&&detail.textContent||'').trim();
    if(!text) return '';
    const accuracy=text.match(/(\d+)\/(\d+)\s+practice correct\s*·\s*(\d+)%/i);
    const missed=text.match(/(\d+)\s+currently missed/i);
    const reasons=[];
    if(accuracy){
      const answered=Number(accuracy[2]);
      const percent=Number(accuracy[3]);
      if(answered>0&&percent<80) reasons.push(`Your recent practice accuracy in this area is ${percent}%.`);
      else if(answered>0) reasons.push(`Your recent practice record still shows review value in this area.`);
    }
    if(missed&&Number(missed[1])>0){
      const count=Number(missed[1]);
      reasons.push(`${count} related ${count===1?'question remains':'questions remain'} in your missed-review queue.`);
    }
    if(!reasons.length) reasons.push('Recent Readiness or Mock results identified this as a review priority.');
    return reasons.join(' ');
  }

  function personalizeCoachPlan(){
    content.querySelectorAll('.coach-plan-item').forEach(item=>{
      const heading=item.querySelector('.coach-plan-heading h3');
      if(heading&&!heading.dataset.learnerTitle){
        heading.textContent=heading.textContent.replace(taskCodePrefix,'').trim();
        heading.dataset.learnerTitle='true';
      }
      const detail=item.querySelector('.coach-plan-heading p');
      if(detail&&!detail.dataset.learnerReason){
        const reason=learnerReason(detail);
        detail.replaceChildren();
        const strong=document.createElement('strong');
        strong.textContent='Why review this: ';
        detail.append(strong,document.createTextNode(reason));
        detail.dataset.learnerReason='true';
      }
      item.querySelectorAll('.topic-chip').forEach(chip=>{
        if(chip.dataset.learnerTopic==='true') return;
        const raw=chip.textContent.trim();
        const parts=raw.match(/^(.*?)\s*·\s*(\d+)$/);
        chip.textContent=parts?`Review topic: ${parts[1].trim()}`:`Review topic: ${raw}`;
        chip.dataset.learnerTopic='true';
      });
      const practice=item.querySelector('a.btn.primary[href="practice.html"]');
      if(practice) practice.textContent='Practice this area';
      item.querySelectorAll('.study-route-group small').forEach(note=>{
        const raw=note.textContent.trim();
        const weak=raw.match(/^Matched weak topic:\s*(.+)$/i);
        const topic=raw.match(/^Matched topic:\s*(.+)$/i);
        if(weak) note.textContent=`Why this reference: Supports review of ${weak[1].trim()}.`;
        else if(topic) note.textContent=`Why this reference: Supports review of ${topic[1].trim()}.`;
        else if(internalLanguage.test(raw)) note.remove();
      });
    });
  }

  function personalizePracticeReport(){
    content.querySelectorAll('.task-report-row h3').forEach(heading=>{
      if(heading.dataset.learnerTitle==='true') return;
      heading.textContent=heading.textContent.replace(taskCodePrefix,'').trim();
      heading.dataset.learnerTitle='true';
    });
  }

  function personalizeDiagnostics(){
    content.querySelectorAll('.latest-result p').forEach(node=>{
      node.textContent=node.textContent
        .replace(/internal study-weighted gauge/gi,'study-weighted review gauge')
        .replace(/internal weighted gauge/gi,'study-weighted review gauge');
    });
    const trailFamily=document.querySelector('[data-trail-family] span');
    if(trailFamily&&/pending parity/i.test(trailFamily.textContent)){
      trailFamily.textContent=trailFamily.textContent.replace(/checkpoint report pending parity/gi,'Guided Study checkpoints tracked separately');
    }
  }

  function personalizeGuidedTrail(){
    content.querySelectorAll('.trail-domain-row strong').forEach(node=>{
      if(node.dataset.learnerTitle==='true') return;
      node.textContent=node.textContent.replace(domainCodePrefix,'').trim();
      node.dataset.learnerTitle='true';
    });
    content.querySelectorAll('.history-row strong').forEach(node=>{
      node.textContent=node.textContent.replace(/^D[1-4][A-C]\s+task checkpoint$/i,'Guided Study checkpoint');
    });
  }

  function removeGenericSourceShelf(){
    const shelf=document.querySelector('#source-outlines');
    const sourceHost=shelf&&shelf.querySelector('[data-source-outlines]');
    if(shelf&&sourceHost&&sourceHost.children.length){
      shelf.remove();
    }
  }

  function removeInternalLanguage(){
    const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);
    const removals=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(internalLanguage.test(node.nodeValue||'')){
        const parent=node.parentElement;
        if(parent) removals.push(parent.closest('p,small,span,div')||parent);
      }
    }
    removals.forEach(node=>{
      if(node&&node.isConnected&&node.id!=='study-plan'&&!node.matches('[data-coach-plan]')) node.remove();
    });
  }

  function personalize(){
    personalizeCoachPlan();
    personalizePracticeReport();
    personalizeDiagnostics();
    personalizeGuidedTrail();
    removeGenericSourceShelf();
    removeInternalLanguage();
  }

  const observer=new MutationObserver(personalize);
  observer.observe(content,{childList:true,subtree:true});
  personalize();
})();
