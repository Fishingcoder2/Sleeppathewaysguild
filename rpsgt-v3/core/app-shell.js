(function(){
  "use strict";
  const modules={
    home:{file:"index.html",label:"Dashboard"},
    study:{file:"study.html",label:"Guided Study"},
    practice:{file:"practice.html",label:"Practice"},
    labs:{file:"labs.html",label:"Skills Labs"},
    reports:{file:"reports.html",label:"Reports"}
  };

  function currentModule(){return document.body.getAttribute("data-module")||"home";}
  function setActiveNav(){
    const active=currentModule();
    document.querySelectorAll("[data-nav]").forEach(function(link){
      const isActive=link.getAttribute("data-nav")===active;
      link.classList.toggle("active",isActive);
      if(isActive) link.setAttribute("aria-current","page"); else link.removeAttribute("aria-current");
    });
  }
  function percent(correct,answered){return answered?Math.round((correct/answered)*100):0;}
  function renderSnapshot(){
    if(!window.RPSGTStorage) return;
    const state=window.RPSGTStorage.load();
    const answered=Number(state.progress&&state.progress.answered||0);
    const correct=Number(state.progress&&state.progress.correct||0);
    document.querySelectorAll("[data-stat=answered]").forEach(function(node){node.textContent=answered.toLocaleString();});
    document.querySelectorAll("[data-stat=accuracy]").forEach(function(node){node.textContent=percent(correct,answered)+"%";});
    document.querySelectorAll("[data-stat=missed]").forEach(function(node){node.textContent=(state.review&&state.review.missedIds||[]).length.toLocaleString();});
    document.querySelectorAll("[data-stat=awards]").forEach(function(node){
      const tasks=state.guidedStudy&&state.guidedStudy.trailAwards&&state.guidedStudy.trailAwards.tasks||{};
      const domains=state.guidedStudy&&state.guidedStudy.trailAwards&&state.guidedStudy.trailAwards.domains||{};
      node.textContent=(Object.keys(tasks).length+Object.keys(domains).length).toLocaleString();
    });
    document.querySelectorAll("[data-progress=accuracy]").forEach(function(node){node.style.width=percent(correct,answered)+"%";});
    document.querySelectorAll("[data-continue]").forEach(function(link){
      const destination=state.lastLocation&&state.lastLocation!=="index.html"?state.lastLocation:"study.html";
      link.setAttribute("href",destination);
    });
  }
  function rememberClicks(){
    document.querySelectorAll("a[href]").forEach(function(link){
      const href=link.getAttribute("href")||"";
      if(!/^(index|study|practice|review|readiness|mock|labs|reports)\.html(?:[?#]|$)/.test(href)) return;
      link.addEventListener("click",function(){window.RPSGTStorage&&window.RPSGTStorage.rememberLocation(href.split("#")[0]);});
    });
  }
  function ensureDisclosureLinks(){
    document.querySelectorAll('.footer').forEach(function(footer){
      if(footer.querySelector('a[href="sources-disclosures.html"]')) return;
      footer.appendChild(document.createTextNode(' · '));
      const link=document.createElement('a');
      link.href='sources-disclosures.html';
      link.textContent='Sources & disclosures';
      footer.appendChild(link);
    });
  }
  function renderMigrationPreview(){
    const host=document.querySelector("[data-migration-preview]");
    if(!host||!window.RPSGTStorage) return;
    const preview=window.RPSGTStorage.previewLegacy();
    const s=preview.summary;
    if(!s.sourceCount){host.innerHTML='<div class="empty">No legacy RPSGT browser data was found on this device. This is normal for a new browser or private session.</div>';return;}
    host.innerHTML='\
      <div class="migration-list">\
        <div class="migration-row"><div><strong>Legacy records found</strong><small>'+s.sourceCount+' storage records, '+s.totalBytes.toLocaleString()+' bytes total</small></div><span class="status green">Read only</span></div>\
        <div class="migration-row"><div><strong>Practice history</strong><small>'+s.answered.toLocaleString()+' answered · '+s.correct.toLocaleString()+' correct · '+s.history.toLocaleString()+' history entries</small></div><span class="status">Previewed</span></div>\
        <div class="migration-row"><div><strong>Review lists</strong><small>'+s.missed+' missed · '+s.mastered+' mastered · '+s.flagged+' flagged</small></div><span class="status">Previewed</span></div>\
        <div class="migration-row"><div><strong>Guided Trail</strong><small>'+s.taskAwards+' task awards · '+s.domainAwards+' domain awards</small></div><span class="status">Previewed</span></div>\
        <div class="migration-row"><div><strong>Notes</strong><small>'+(s.hasGeneralNotes?'General notes found':'No general notes found')+' · '+s.mathNotes+' Math Coach note records</small></div><span class="status">Previewed</span></div>\
      </div>\
      <p class="notice"><strong>No data was imported or changed.</strong> The actual import button will be added only after field-by-field migration tests pass.</p>';
  }
  function init(){setActiveNav();renderSnapshot();rememberClicks();ensureDisclosureLinks();renderMigrationPreview();}
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
  window.RPSGTApp={modules:modules,refresh:renderSnapshot};
})();
