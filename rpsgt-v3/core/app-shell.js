(function(){
  "use strict";

  const modules={
    home:{file:"index.html",label:"Dashboard"},
    study:{file:"study.html",label:"Guided Study"},
    practice:{file:"practice.html",label:"Practice"},
    labs:{file:"labs.html",label:"Skills Labs"},
    reports:{file:"reports.html",label:"Reports"}
  };

  const BOOKS=[
    {
      id:"fundamentals-sleep-professionals-4e",
      title:"Fundamentals for Sleep Professionals",
      citation:"Mattice, C. D., Brooks, R. J., & Lee-Chiong, T. L. (Eds.). (2026). Fundamentals for sleep professionals (4th ed.). Wolters Kluwer.",
      url:"https://www.amazon.com/dp/1975260732?tag=spg_rpsgt-20",
      label:"SPG current-edition recommendation",
      icon:"📘",
      note:"Broad contemporary sleep-technology review covering testing, scoring, therapy, patient care, and professional practice.",
      affiliate:true
    },
    {
      id:"pst2014",
      title:"Polysomnography for the Sleep Technologist",
      citation:"Robertson, B., Marshall, B., & Carno, M.-A. (2013). Polysomnography for the sleep technologist: Instrumentation, monitoring, and related procedures. Elsevier.",
      url:"https://www.amazon.com/dp/0323100198?tag=spg_rpsgt-20",
      label:"BRPT RPSGT-listed · SPG technical recommendation",
      icon:"📡",
      note:"Useful for instrumentation, sensors, recording quality, artifact, monitoring, safety, and technical procedures.",
      affiliate:true
    },
    {
      id:"sleep-medicine-pearls",
      title:"Sleep Medicine Pearls",
      citation:"Berry, R. B., & Wagner, M. H. (2014). Sleep medicine pearls (3rd ed.). Elsevier.",
      url:"https://www.amazon.com/dp/1455770515?tag=spg_rpsgt-20",
      label:"BRPT RPSGT-listed · case-based review",
      icon:"💡",
      note:"Case-based review that connects symptoms, study findings, differential thinking, and management.",
      affiliate:true
    },
    {
      id:"pediatric-sleep-pearls",
      title:"Pediatric Sleep Pearls",
      citation:"DelRosso, L. M., Beck, S. E., Berry, R. B., Wagner, M. H., & Marcus, C. L. (2016). Pediatric sleep pearls. Elsevier.",
      url:"https://www.amazon.com/dp/0323392776?tag=spg_rpsgt-20",
      label:"BRPT RPSGT-listed · pediatric enrichment",
      icon:"⭐",
      note:"Pediatric case review for developmental sleep, pediatric disorders, testing, and clinical reasoning.",
      affiliate:true
    }
  ];

  function currentModule(){return document.body.getAttribute("data-module")||"home";}
  function percent(correct,answered){return answered?Math.round((correct/answered)*100):0;}
  function escapeHtml(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char];});}

  function settingsState(){
    if(!window.RPSGTStorage) return {state:null,settings:{soundEffects:false,bookSuggestions:true},bookShelf:{ownedIds:[],hiddenIds:[]}};
    const state=window.RPSGTStorage.load();
    state.learner=state.learner&&typeof state.learner==="object"?state.learner:{};
    state.learner.settings=state.learner.settings&&typeof state.learner.settings==="object"?state.learner.settings:{};
    const settings=state.learner.settings;
    if(typeof settings.soundEffects!=="boolean") settings.soundEffects=false;
    if(typeof settings.bookSuggestions!=="boolean") settings.bookSuggestions=true;
    state.learner.bookShelf=state.learner.bookShelf&&typeof state.learner.bookShelf==="object"?state.learner.bookShelf:{};
    const bookShelf=state.learner.bookShelf;
    bookShelf.ownedIds=Array.isArray(bookShelf.ownedIds)?bookShelf.ownedIds:[];
    bookShelf.hiddenIds=Array.isArray(bookShelf.hiddenIds)?bookShelf.hiddenIds:[];
    return {state,settings,bookShelf};
  }

  function saveLearnerPreferences(mutator){
    if(!window.RPSGTStorage) return;
    const bundle=settingsState();
    mutator(bundle.settings,bundle.bookShelf,bundle.state);
    window.RPSGTStorage.save(bundle.state);
  }

  function injectExperienceStyles(){
    if(document.getElementById("rpsgt-v3-experience-styles")) return;
    const style=document.createElement("style");
    style.id="rpsgt-v3-experience-styles";
    style.textContent=`
      .brand-mark{overflow:hidden;background:linear-gradient(145deg,#0a356a,#0d8298);font-size:1.32rem;text-shadow:0 1px 2px rgba(0,0,0,.25)}
      .brand-copy strong{font-size:.98rem}.brand-copy span{max-width:36ch}
      .sidebar .nav-external-link{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px 12px;margin:2px 0;border-radius:12px;color:var(--ink);text-decoration:none;font-weight:780}
      .sidebar .nav-external-link:hover{background:var(--sky);color:var(--blue)}
      .sidebar-site-link{display:block;padding:14px 11px 4px;color:var(--blue);font-size:.78rem;font-weight:900;text-decoration:none}
      .rpsgt-settings-overlay{position:fixed;inset:0;z-index:2200;display:grid;place-items:center;padding:18px;background:rgba(4,26,53,.72);backdrop-filter:blur(4px)}
      .rpsgt-settings-overlay[hidden]{display:none}.rpsgt-settings-dialog{width:min(720px,100%);max-height:min(88vh,760px);overflow:auto;background:#f8fbfd;border:1px solid #bcd3df;border-radius:22px;box-shadow:0 30px 90px rgba(0,0,0,.35)}
      .rpsgt-settings-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:16px 18px;background:linear-gradient(110deg,#041a35,var(--navy),#08759a);color:#fff}.rpsgt-settings-head h2{margin:0;color:#fff;font-size:1.35rem}
      .rpsgt-settings-close{width:40px;height:40px;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:1.4rem}
      .rpsgt-settings-body{display:grid;gap:12px;padding:18px}.rpsgt-settings-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:15px;background:#fff}
      .rpsgt-settings-row h3{margin:0 0 4px}.rpsgt-settings-row p{margin:0;color:var(--muted);font-size:.86rem}.rpsgt-switch{display:inline-flex;align-items:center;gap:8px;font-weight:900}.rpsgt-switch input{width:22px;height:22px;accent-color:var(--teal)}
      .guild-achievement-section{border-top:6px solid var(--gold)}.guild-achievement-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.guild-achievement-card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:16px;padding:15px;background:linear-gradient(180deg,#fff,#f7fbfd)}
      .guild-achievement-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--teal)}.guild-achievement-card:nth-child(2):before{background:#6750a4}.guild-achievement-card:nth-child(3):before{background:var(--blue)}.guild-achievement-card:nth-child(4):before{background:var(--gold)}
      .guild-achievement-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:var(--sky);font-size:1.35rem;margin-bottom:8px}.guild-achievement-card h3{margin:0 0 4px}.guild-achievement-card p{margin:5px 0;color:var(--muted);font-size:.84rem}.guild-achievement-line{display:flex;justify-content:space-between;gap:8px;margin-top:9px;font-size:.82rem}.guild-achievement-line strong{color:var(--navy)}
      .guild-resource-section{border-top:6px solid var(--teal)}.guild-resource-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.guild-resource-tile{display:flex;flex-direction:column;gap:5px;min-height:128px;padding:14px;border:1px solid var(--line);border-radius:15px;background:#fff;text-decoration:none;color:var(--ink)}.guild-resource-tile:hover{border-color:#8fbccc;box-shadow:0 8px 22px rgba(8,43,87,.09)}.guild-resource-tile b{color:var(--navy)}.guild-resource-tile small{color:var(--muted)}
      .book-shelf-section{border-top:6px solid #a87616}.book-shelf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.book-ad-card{display:flex;flex-direction:column;min-height:250px;border:1px solid #d5dfcf;border-radius:16px;padding:14px;background:linear-gradient(180deg,#fff,#fffbf1)}
      .book-ad-cover{width:72px;height:96px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(145deg,#0b386c,#0e899a);color:#fff;font-size:2rem;box-shadow:0 8px 18px rgba(8,43,87,.18);margin-bottom:10px}.book-ad-card h3{margin:0 0 6px;font-size:1rem}.book-source-label{align-self:flex-start;border-radius:999px;padding:4px 7px;background:#eef7fb;border:1px solid #b9d7e2;color:#17536c;font-size:.68rem;font-weight:900}.book-ad-card p{font-size:.8rem;color:var(--muted);line-height:1.42}.book-apa{font-size:.73rem!important}.book-ad-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto}.book-ad-actions a,.book-ad-actions button{min-height:36px;border-radius:9px;padding:6px 9px;font-size:.76rem;font-weight:850}.book-affiliate-note{margin-top:12px;padding:11px 12px;border-radius:12px;background:#fff7df;border:1px solid #e0c47c;color:#675017;font-size:.76rem}
      .coach-bob-home{grid-template-columns:96px minmax(0,1fr)!important}.coach-bob-home img{width:96px!important;height:118px!important;object-fit:contain!important;object-position:center bottom!important;border-radius:18px!important;background:linear-gradient(180deg,#fff,#fff8e5)!important;image-rendering:auto!important}
      @media(max-width:1200px){.guild-achievement-grid,.book-shelf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:1050px){body.rpsgt-menu-open .sidebar{display:block;position:fixed;z-index:2100;left:0;top:64px;bottom:0;width:min(330px,88vw);height:auto;box-shadow:18px 0 50px rgba(0,0,0,.25)}body.rpsgt-menu-open:after{content:"";position:fixed;z-index:2050;inset:64px 0 0;background:rgba(4,26,53,.55)}.guild-resource-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:760px){.guild-achievement-grid,.guild-resource-grid,.book-shelf-grid{grid-template-columns:1fr}.rpsgt-settings-row{grid-template-columns:1fr}.coach-bob-home{grid-template-columns:82px minmax(0,1fr)!important}.coach-bob-home img{width:82px!important;height:102px!important}.top-actions a:nth-child(3){display:none}}
    `;
    document.head.appendChild(style);
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
      top.innerHTML='<a href="reports.html">Progress</a><a href="practice.html">Practice</a><a href="index.html#guild-resources">Guild Resources</a><button type="button" data-open-settings>⚙️ <span class="settings-button-label">Settings</span></button><button type="button" data-toggle-menu>Menu</button>';
    }
    const sidebar=document.querySelector(".sidebar");
    if(sidebar){
      sidebar.innerHTML='\
        <div class="nav-label">Launchpad</div>\
        <a class="nav-link" data-nav="home" href="index.html"><span>🏠</span>Dashboard</a>\
        <a class="nav-link" data-nav="study" href="study.html"><span>🧭</span>Guided Study</a>\
        <a class="nav-link" data-nav="practice" href="practice.html"><span>📝</span>Practice Modes</a>\
        <a class="nav-link" href="mock.html"><span>🎯</span>Mock-Style Exam</a>\
        <a class="nav-link" href="review.html?list=missed"><span>🔁</span>Missed Questions</a>\
        <a class="nav-link" data-nav="reports" href="reports.html"><span>📊</span>Reports</a>\
        <div class="nav-label">RPSGT Blueprint</div>\
        <a class="nav-link" href="study.html#D1"><span>1️⃣</span>Clinical Overview &amp; Support</a>\
        <a class="nav-link" href="study.html#D2"><span>2️⃣</span>Study Preparation &amp; Performance</a>\
        <a class="nav-link" href="study.html#D3"><span>3️⃣</span>Scoring, Reporting &amp; Verification</a>\
        <a class="nav-link" href="study.html#D4"><span>4️⃣</span>Treatment &amp; Intervention</a>\
        <div class="nav-label">Applied Learning</div>\
        <a class="nav-link" data-nav="labs" href="labs.html"><span>🧪</span>Labs &amp; Coaches</a>\
        <a class="nav-link" href="lab-instrumentation.html"><span>🩺</span>Equipment &amp; Measurements</a>\
        <a class="nav-link" href="math-coach.html"><span>➗</span>Math Coach</a>\
        <a class="nav-link" href="flashcards.html"><span>🗂️</span>RPSGT Flashcards</a>\
        <a class="nav-link" href="lab-scoring.html"><span>🧠</span>Scoring &amp; Recognition</a>\
        <a class="nav-link" href="lab-respiratory.html"><span>🫁</span>Respiratory Lab</a>\
        <div class="nav-label">Candidate Center</div>\
        <a class="nav-link" href="index.html#how-v3-works"><span>❓</span>How to Use This App</a>\
        <a class="nav-link" href="readiness.html"><span>🎯</span>Targeted Review</a>\
        <a class="nav-link" href="sources-disclosures.html"><span>📚</span>References &amp; Scope</a>\
        <div class="nav-label">Guild Resources</div>\
        <a class="nav-external-link" href="https://sleeppathwaysguild.com/ekg.2026.html" target="_blank" rel="noopener"><span>❤️</span><span>EKG Skills Lab</span><b>↗</b></a>\
        <a class="nav-external-link" href="https://sleeppathwaysguild.com/" target="_blank" rel="noopener"><span>⌂</span><span>Guild Home</span><b>↗</b></a>\
        <a class="sidebar-site-link" href="https://sleeppathwaysguild.com/" target="_blank" rel="noopener">sleeppathwaysguild.com ↗</a>';
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
    renderGuildAchievements();
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
      link.textContent='Sources & disclosures';
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
      <article class="rpsgt-settings-row"><div><h3>Sound effects</h3><p>Optional short tones for correct answers, incorrect answers, and Guild achievement moments. Sounds are off by default.</p></div><label class="rpsgt-switch"><input type="checkbox" data-setting-sound '+(bundle.settings.soundEffects?'checked':'')+'><span>'+(bundle.settings.soundEffects?'On':'Off')+'</span></label></article>\
      <article class="rpsgt-settings-row"><div><h3>Optional book suggestions</h3><p>Show the RPSGT optional study shelf. No book is required to use the app.</p></div><label class="rpsgt-switch"><input type="checkbox" data-setting-books '+(bundle.settings.bookSuggestions?'checked':'')+'><span>'+(bundle.settings.bookSuggestions?'On':'Off')+'</span></label></article>\
      <article class="rpsgt-settings-row"><div><h3>Book preferences</h3><p>'+bundle.bookShelf.ownedIds.length+' marked as owned · '+bundle.bookShelf.hiddenIds.length+' hidden from suggestions.</p></div><button class="btn secondary" type="button" data-reset-book-preferences>Reset book preferences</button></article>\
      <article class="notice"><strong>Guild achievements:</strong> task badges and domain medals are educational Sleep Pathways Guild milestones. They are not BRPT credentials, scores, or passing predictions.</article>';
    body.querySelector("[data-setting-sound]").addEventListener("change",function(event){
      const value=event.target.checked;
      saveLearnerPreferences(function(settings){settings.soundEffects=value;});
      if(value) playFeedbackSound("badge");
      openSettings();
    });
    body.querySelector("[data-setting-books]").addEventListener("change",function(event){
      saveLearnerPreferences(function(settings){settings.bookSuggestions=event.target.checked;});
      renderBookShelf();
      openSettings();
    });
    body.querySelector("[data-reset-book-preferences]").addEventListener("click",function(){
      saveLearnerPreferences(function(settings,bookShelf){bookShelf.ownedIds=[];bookShelf.hiddenIds=[];});
      renderBookShelf();
      openSettings();
    });
    overlay.hidden=false;
    overlay.querySelector(".rpsgt-settings-close").focus({preventScroll:true});
  }

  function closeSettings(){
    const overlay=document.querySelector("[data-rpsgt-settings-overlay]");
    if(overlay) overlay.hidden=true;
  }

  function renderGuildAchievements(){
    if(currentModule()!=="home"||!window.RPSGTStorage) return;
    let host=document.getElementById("guild-achievements");
    if(!host){
      const target=document.querySelector(".disclosure-preview")||document.querySelector(".footer");
      host=document.createElement("section");
      host.id="guild-achievements";
      host.className="section card guild-achievement-section";
      target?.insertAdjacentElement("beforebegin",host);
    }
    const state=window.RPSGTStorage.load();
    const tasks=state.guidedStudy?.trailAwards?.tasks||{};
    const domains=state.guidedStudy?.trailAwards?.domains||{};
    const definitions=[
      ["D1","🧭","Clinical Guide"],
      ["D2","🌙","Study Signal Scout"],
      ["D3","📊","Scoring Pathfinder"],
      ["D4","⭐","Therapy Trail Guide"]
    ];
    host.innerHTML='<div class="section-head"><div><div class="eyebrow">Sleep Pathways Guild achievements</div><h2>Merit badges and domain medals</h2><p>Score at least 80% on Guided Study task checkpoints to earn Guild task badges and build toward a domain medal.</p></div><span class="status gold">Guild learning milestones</span></div><div class="guild-achievement-grid">'+definitions.map(function(item){
      const code=item[0];
      const taskCount=Object.keys(tasks).filter(function(key){return key.indexOf(code)===0;}).length;
      const medal=Boolean(domains[code]);
      return '<article class="guild-achievement-card"><div class="guild-achievement-icon">'+item[1]+'</div><span class="status">'+code+'</span><h3>'+item[2]+'</h3><p>Task merit badges earned in this domain.</p><div class="progress"><span style="width:'+Math.min(100,taskCount/3*100)+'%"></span></div><div class="guild-achievement-line"><span>Merit badges</span><strong>'+taskCount+' / 3</strong></div><div class="guild-achievement-line"><span>Domain medal</span><strong>'+(medal?'Earned':'Not yet')+'</strong></div></article>';
    }).join('')+'</div><p class="book-affiliate-note"><strong>Achievement note:</strong> These are Sleep Pathways Guild educational rewards, not BRPT-issued credentials or official exam results.</p>';
  }

  function renderGuildResources(){
    if(currentModule()!=="home") return;
    if(document.getElementById("guild-resources")) return;
    const target=document.getElementById("guild-achievements")||document.querySelector(".disclosure-preview")||document.querySelector(".footer");
    const host=document.createElement("section");
    host.id="guild-resources";
    host.className="section card guild-resource-section";
    host.innerHTML='<div class="section-head"><div><div class="eyebrow">Guild Resources</div><h2>More Sleep Pathways Guild learning tools</h2><p>Use shared Guild tools alongside RPSGT Guided Study and Practice.</p></div></div><div class="guild-resource-grid"><a class="guild-resource-tile" href="https://sleeppathwaysguild.com/ekg.2026.html" target="_blank" rel="noopener"><span>❤️</span><b>EKG Skills Lab</b><small>Rhythm, rate, intervals, artifact, and sleep-lab ECG awareness ↗</small></a><a class="guild-resource-tile" href="math-coach.html"><span>➗</span><b>RPSGT Math Coach</b><small>Sleep timing, indices, calculations, and measurement practice</small></a><a class="guild-resource-tile" href="https://sleeppathwaysguild.com/" target="_blank" rel="noopener"><span>🧭</span><b>Guild Home</b><small>Return to all Sleep Pathways Guild resources ↗</small></a></div>';
    target?.insertAdjacentElement("beforebegin",host);
  }

  function visibleBooks(bundle){
    return BOOKS.filter(function(book){return !bundle.bookShelf.ownedIds.includes(book.id)&&!bundle.bookShelf.hiddenIds.includes(book.id);});
  }

  function renderBookShelf(){
    if(currentModule()!=="home") return;
    const bundle=settingsState();
    let host=document.getElementById("rpsgt-book-shelf");
    if(!bundle.settings.bookSuggestions){if(host) host.remove();return;}
    if(!host){
      const target=document.getElementById("guild-resources")||document.getElementById("guild-achievements")||document.querySelector(".disclosure-preview")||document.querySelector(".footer");
      host=document.createElement("section");
      host.id="rpsgt-book-shelf";
      host.className="section card book-shelf-section";
      target?.insertAdjacentElement("afterend",host);
    }
    const books=visibleBooks(bundle);
    host.innerHTML='<div class="section-head"><div><div class="eyebrow">Optional RPSGT study shelf</div><h2>Books that may support deeper review</h2><p>These are optional resources, separate from the APA reference lookup used to document study sources by domain, task, and subject.</p></div><button class="btn secondary" type="button" data-open-settings>Manage suggestions</button></div>'+(books.length?'<div class="book-shelf-grid">'+books.map(function(book){
      return '<article class="book-ad-card"><div class="book-ad-cover" aria-hidden="true">'+book.icon+'</div><span class="book-source-label">'+escapeHtml(book.label)+'</span><h3>'+escapeHtml(book.title)+'</h3><p>'+escapeHtml(book.note)+'</p><p class="book-apa">'+escapeHtml(book.citation)+'</p><div class="book-ad-actions"><a class="btn primary" href="'+escapeHtml(book.url)+'" target="_blank" rel="sponsored nofollow noopener">View optional resource ↗</a><button class="btn secondary" type="button" data-book-owned="'+book.id+'">I own it</button><button class="btn secondary" type="button" data-book-hide="'+book.id+'">Hide</button></div></article>';
    }).join('')+'</div>':'<div class="empty">All optional book suggestions are currently hidden or marked as owned. Use Settings to reset book preferences.</div>')+'<div class="book-affiliate-note">Optional resources only. No purchase is required to use RPSGT V3. As an Amazon Associate, Sleep Pathways Guild may earn from qualifying purchases at no extra cost to you. Book suggestions do not replace the current BRPT blueprint, current professional standards, formal education, clinical training, or professional judgment.</div>';
    host.querySelector("[data-open-settings]")?.addEventListener("click",openSettings);
    host.querySelectorAll("[data-book-owned]").forEach(function(button){button.addEventListener("click",function(){const id=button.dataset.bookOwned;saveLearnerPreferences(function(settings,bookShelf){if(!bookShelf.ownedIds.includes(id)) bookShelf.ownedIds.push(id);bookShelf.hiddenIds=bookShelf.hiddenIds.filter(function(value){return value!==id;});});renderBookShelf();});});
    host.querySelectorAll("[data-book-hide]").forEach(function(button){button.addEventListener("click",function(){const id=button.dataset.bookHide;saveLearnerPreferences(function(settings,bookShelf){if(!bookShelf.hiddenIds.includes(id)) bookShelf.hiddenIds.push(id);});renderBookShelf();});});
  }

  function renderHomeEnhancements(){
    if(currentModule()!=="home") return;
    renderGuildAchievements();
    renderGuildResources();
    renderBookShelf();
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

  function init(){
    injectExperienceStyles();
    upgradeBranding();
    upgradeNavigation();
    setActiveNav();
    renderSnapshot();
    rememberClicks();
    ensureDisclosureLinks();
    refreshCoachBobImage();
    renderHomeEnhancements();
    renderMigrationPreview();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
  window.RPSGTApp={modules:modules,refresh:renderSnapshot,openSettings:openSettings,playFeedbackSound:playFeedbackSound};
})();
