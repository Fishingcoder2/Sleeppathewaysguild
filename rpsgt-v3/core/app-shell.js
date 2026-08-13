(function(){
  "use strict";

  const modules={
    home:{file:"index.html",label:"Home"},
    study:{file:"study.html",label:"Guided Study"},
    practice:{file:"practice.html",label:"Practice"},
    labs:{file:"labs.html",label:"Skills Labs"},
    reports:{file:"reports.html",label:"Progress"}
  };

  function currentModule(){return document.body.getAttribute("data-module")||"home";}
  function percent(correct,answered){return answered?Math.round((correct/answered)*100):0;}
  function escapeHtml(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char];});}

  function settingsState(){
    if(!window.RPSGTStorage) return {state:null,settings:{soundEffects:false}};
    const state=window.RPSGTStorage.load();
    state.learner=state.learner&&typeof state.learner==="object"?state.learner:{};
    state.learner.settings=state.learner.settings&&typeof state.learner.settings==="object"?state.learner.settings:{};
    const settings=state.learner.settings;
    if(typeof settings.soundEffects!=="boolean") settings.soundEffects=false;
    return {state,settings};
  }

  function saveLearnerPreferences(mutator){
    if(!window.RPSGTStorage) return;
    const bundle=settingsState();
    mutator(bundle.settings,bundle.state);
    window.RPSGTStorage.save(bundle.state);
  }

  function injectExperienceStyles(){
    if(document.getElementById("rpsgt-v3-experience-styles")) return;
    const style=document.createElement("style");
    style.id="rpsgt-v3-experience-styles";
    style.textContent=`
      .brand-mark{overflow:hidden;background:linear-gradient(145deg,#0a356a,#0d8298);font-size:1.32rem;text-shadow:0 1px 2px rgba(0,0,0,.25)}
      .brand-copy strong{font-size:.98rem}.brand-copy span{max-width:36ch}
      .sidebar .nav-link{margin-bottom:4px}
      .rpsgt-settings-overlay{position:fixed;inset:0;z-index:2200;display:grid;place-items:center;padding:18px;background:rgba(4,26,53,.72);backdrop-filter:blur(4px)}
      .rpsgt-settings-overlay[hidden]{display:none}.rpsgt-settings-dialog{width:min(640px,100%);max-height:min(88vh,720px);overflow:auto;background:#f8fbfd;border:1px solid #bcd3df;border-radius:22px;box-shadow:0 30px 90px rgba(0,0,0,.35)}
      .rpsgt-settings-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:16px 18px;background:linear-gradient(110deg,#041a35,var(--navy),#08759a);color:#fff}.rpsgt-settings-head h2{margin:0;color:#fff;font-size:1.35rem}
      .rpsgt-settings-close{width:40px;height:40px;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:1.4rem}
      .rpsgt-settings-body{display:grid;gap:12px;padding:18px}.rpsgt-settings-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:15px;background:#fff}
      .rpsgt-settings-row h3{margin:0 0 4px}.rpsgt-settings-row p{margin:0;color:var(--muted);font-size:.86rem}.rpsgt-switch{display:inline-flex;align-items:center;gap:8px;font-weight:900}.rpsgt-switch input{width:22px;height:22px;accent-color:var(--teal)}
      .coach-bob-home{grid-template-columns:96px minmax(0,1fr)!important}.coach-bob-home img{width:96px!important;height:118px!important;object-fit:contain!important;object-position:center bottom!important;border-radius:18px!important;background:linear-gradient(180deg,#fff,#fff8e5)!important;image-rendering:auto!important}
      @media(max-width:1050px){body.rpsgt-menu-open .sidebar{display:block;position:fixed;z-index:2100;left:0;top:64px;bottom:0;width:min(330px,88vw);height:auto;box-shadow:18px 0 50px rgba(0,0,0,.25)}body.rpsgt-menu-open:after{content:"";position:fixed;z-index:2050;inset:64px 0 0;background:rgba(4,26,53,.55)}}
      @media(max-width:760px){.rpsgt-settings-row{grid-template-columns:1fr}.coach-bob-home{grid-template-columns:82px minmax(0,1fr)!important}.coach-bob-home img{width:82px!important;height:102px!important}.top-actions a:nth-child(3){display:none}}
    `;
    document.head.appendChild(style);
  }

  function loadLearnerSurfaceGuard(){
    if(window.__RPSGTLearnerSurfaceGuardLoaded||window.__RPSGTLearnerSurfaceGuardRequested) return;
    window.__RPSGTLearnerSurfaceGuardRequested=true;
    const script=document.createElement('script');
    script.src='core/learner-surface-guard.js';
    script.async=false;
    script.dataset.rpsgtLearnerSurfaceGuard='true';
    script.addEventListener('error',function(){window.__RPSGTLearnerSurfaceGuardRequested=false;});
    document.head.appendChild(script);
  }

  function upgradeBranding(){
    const mark=document.querySelector(".brand-mark");
    if(mark){mark.textContent="🧭";mark.setAttribute("aria-hidden","true");}
    const copy=document.querySelector(".brand-copy");
    if(copy){
      const prior=copy.querySelector("strong")?.textContent||"RPSGT Learning Center";
      copy.innerHTML='<strong>Sleep Pathways Guild</strong><span>'+escapeHtml(prior)+' · RPSGT V3</span>';
    }
  }

  function upgradeNavigation(){
    const top=document.querySelector(".top-actions");
    if(top){
      top.innerHTML='<a href="study.html">Study</a><a href="practice.html">Practice</a><a href="reports.html">Progress</a><button type="button" data-open-settings>⚙️ <span class="settings-button-label">Settings</span></button><button type="button" data-toggle-menu>Menu</button>';
    }
    const sidebar=document.querySelector(".sidebar");
    if(sidebar){
      sidebar.innerHTML='\
        <div class="nav-label">Learning Center</div>\
        <a class="nav-link" data-nav="home" href="index.html"><span>🏠</span>Home</a>\
        <a class="nav-link" data-nav="study" href="study.html"><span>🧭</span>Guided Study</a>\
        <a class="nav-link" data-nav="practice" href="practice.html"><span>📝</span>Practice</a>\
        <a class="nav-link" data-nav="labs" href="labs.html"><span>🧪</span>Skills Labs</a>\
        <a class="nav-link" data-nav="reports" href="reports.html"><span>📊</span>Progress</a>';
    }
    document.querySelectorAll("[data-open-settings]").forEach(function(button){button.addEventListener("click",openSettings);});
    document.querySelectorAll("[data-toggle-menu]").forEach(function(button){
      button.addEventListener("click",function(){
        if(window.matchMedia("(max-width:1050px)").matches) document.body.classList.toggle("rpsgt-menu-open");
        else sidebar?.scrollTo({top:0,behavior:"smooth"});
      });
    });
    document.addEventListener("click",function(event){
      if(!document.body.classList.contains("rpsgt-menu-open")) return;
      if(event.target.closest(".sidebar")||event.target.closest("[data-toggle-menu]")) return;
      document.body.classList.remove("rpsgt-menu-open");
    });
  }

  function setActiveNav(){
    const active=currentModule();
    document.querySelectorAll("[data-nav]").forEach(function(link){
      const isActive=link.getAttribute("data-nav")===active;
      link.classList.toggle("active",isActive);
      if(isActive) link.setAttribute("aria-current","page"); else link.removeAttribute("aria-current");
    });
    document.querySelectorAll(".mobile-nav [data-nav=reports] small").forEach(function(node){node.textContent="Progress";});
  }

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
      if(!/^(index|study|practice|review|review-queue|readiness|mock|labs|reports|flashcards|math-coach|lab-[a-z-]+)\.html(?:[?#]|$)/.test(href)) return;
      link.addEventListener("click",function(){window.RPSGTStorage&&window.RPSGTStorage.rememberLocation(href.split("#")[0]);});
    });
  }

  function ensureDisclosureLinks(){
    document.querySelectorAll('.footer').forEach(function(footer){
      if(footer.querySelector('a[href="sources-disclosures.html"]')) return;
      footer.appendChild(document.createTextNode(' · '));
      const link=document.createElement('a');
      link.href='sources-disclosures.html';
      link.textContent='References & disclosures';
      footer.appendChild(link);
    });
  }

  function refreshCoachBobImage(){
    document.querySelectorAll('img[src*="coach-bob"],img[data-coach-bob]').forEach(function(img){
      img.src='assets/coach-bob-rpsgt.webp';
      img.removeAttribute('srcset');
      img.setAttribute('decoding','async');
      img.setAttribute('loading','eager');
      if(!img.alt) img.alt='Coach Bob, Sleep Pathways Guild learning mentor';
    });
  }

  let audioContext=null;
  function playFeedbackSound(kind){
    const bundle=settingsState();
    if(!bundle.settings.soundEffects) return;
    try{
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context) return;
      audioContext=audioContext||new Context();
      const oscillator=audioContext.createOscillator();
      const gain=audioContext.createGain();
      const now=audioContext.currentTime;
      const frequencies={correct:660,incorrect:220,badge:880,click:440};
      oscillator.frequency.setValueAtTime(frequencies[kind]||440,now);
      oscillator.type=kind==="incorrect"?"triangle":"sine";
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.045,now+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.18);
      oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+.2);
    }catch(error){}
  }

  function ensureSettingsOverlay(){
    let overlay=document.querySelector("[data-rpsgt-settings-overlay]");
    if(overlay) return overlay;
    overlay=document.createElement("div");
    overlay.className="rpsgt-settings-overlay";
    overlay.dataset.rpsgtSettingsOverlay="true";
    overlay.hidden=true;
    overlay.innerHTML='<section class="rpsgt-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="rpsgt-settings-title"><div class="rpsgt-settings-head"><h2 id="rpsgt-settings-title">Settings</h2><button class="rpsgt-settings-close" type="button" aria-label="Close settings">×</button></div><div class="rpsgt-settings-body" data-rpsgt-settings-body></div></section>';
    document.body.appendChild(overlay);
    overlay.querySelector(".rpsgt-settings-close").addEventListener("click",closeSettings);
    overlay.addEventListener("click",function(event){if(event.target===overlay) closeSettings();});
    document.addEventListener("keydown",function(event){if(event.key==="Escape"&&!overlay.hidden) closeSettings();});
    return overlay;
  }

  function openSettings(){
    const overlay=ensureSettingsOverlay();
    const bundle=settingsState();
    const body=overlay.querySelector("[data-rpsgt-settings-body]");
    body.innerHTML='\
      <article class="notice"><strong>Sleep Pathways Guild learner controls</strong><br>These preferences are stored only in this browser.</article>\
      <article class="rpsgt-settings-row"><div><h3>Sound effects</h3><p>Optional short tones for answer feedback and Guild achievement moments. Sounds are off by default.</p></div><label class="rpsgt-switch"><input type="checkbox" data-setting-sound '+(bundle.settings.soundEffects?'checked':'')+'><span>'+(bundle.settings.soundEffects?'On':'Off')+'</span></label></article>\
      <article class="notice"><strong>Guild achievements:</strong> task badges, medals, ranks, and ribbons are educational Sleep Pathways Guild milestones. They are not BRPT credentials, official exam results, or passing predictions.</article>';
    body.querySelector("[data-setting-sound]").addEventListener("change",function(event){
      const value=event.target.checked;
      saveLearnerPreferences(function(settings){settings.soundEffects=value;});
      if(value) playFeedbackSound("badge");
      openSettings();
    });
    overlay.hidden=false;
    overlay.querySelector(".rpsgt-settings-close").focus({preventScroll:true});
  }

  function closeSettings(){
    const overlay=document.querySelector("[data-rpsgt-settings-overlay]");
    if(overlay) overlay.hidden=true;
  }

  function init(){
    injectExperienceStyles();
    loadLearnerSurfaceGuard();
    upgradeBranding();
    upgradeNavigation();
    setActiveNav();
    renderSnapshot();
    rememberClicks();
    ensureDisclosureLinks();
    refreshCoachBobImage();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
  window.RPSGTApp={modules:modules,refresh:renderSnapshot,openSettings:openSettings,playFeedbackSound:playFeedbackSound};
})();
