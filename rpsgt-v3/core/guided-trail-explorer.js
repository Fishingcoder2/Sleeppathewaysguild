(function(){
  'use strict';
  const engine=window.RPSGTGuidedTrailEngine;
  const storage=window.RPSGTStorage;
  if(!engine||!storage) return;

  const RECENT_CHECKPOINT_WINDOW=3;
  const XP_REWARDS={taskBadge:100,domainMedal:250};
  const DOMAIN_MEDALS={
    D1:'Clinical Guide',
    D2:'Study Signal Scout',
    D3:'Scoring Pathfinder',
    D4:'Therapy Trail Guide'
  };
  const RANKS=[
    {id:'trail-starter',name:'Trail Starter',minimum:0,icon:'🧭',upgrade:'Sleep Pathways Explorer field patch'},
    {id:'compass-scout',name:'Compass Scout',minimum:1,icon:'🧭',upgrade:'Compass pin'},
    {id:'trail-scout',name:'Trail Scout',minimum:3,icon:'🥉',upgrade:'Bronze shoulder tab'},
    {id:'signal-pathfinder',name:'Signal Pathfinder',minimum:6,icon:'🥈',upgrade:'Silver trail cord'},
    {id:'senior-sleep-explorer',name:'Senior Sleep Explorer',minimum:9,icon:'🥇',upgrade:'Gold shoulder tab'},
    {id:'guild-trail-guide',name:'Guild Trail Guide',minimum:12,domainMinimum:4,icon:'🎖️',upgrade:'Guild expedition sash'}
  ];
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const normalize=value=>String(value==null?'':value).toLowerCase().replace(/[“”‘’]/g,"'").replace(/\s+/g,' ').trim();
  const fingerprint=question=>normalize(question&&question.prompt);
  function hash(text){let value=2166136261;for(let index=0;index<String(text).length;index+=1){value^=String(text).charCodeAt(index);value=Math.imul(value,16777619);}return value>>>0;}
  function seededRandom(seed){let state=hash(seed)||1;return function(){state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};}
  function shuffle(items,seed){const copy=items.slice();const random=seededRandom(seed);for(let index=copy.length-1;index>0;index-=1){const swap=Math.floor(random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}return copy;}

  function uniqueEligible(records,taskCode,filter){
    const seen=new Set();
    const unique=[];
    (records||[]).forEach(question=>{
      if(!engine.eligibleQuestion(question,taskCode,filter)) return;
      const key=fingerprint(question);
      if(!key||seen.has(key)) return;
      seen.add(key);
      unique.push(question);
    });
    return unique;
  }
  function recentQuestionIds(taskCode){
    const saved=storage.load();
    const history=saved&&saved.guidedStudy&&Array.isArray(saved.guidedStudy.checkpointHistory)?saved.guidedStudy.checkpointHistory:[];
    return history.filter(item=>item&&item.task===taskCode).slice(0,RECENT_CHECKPOINT_WINDOW).flatMap(item=>Array.isArray(item.questionIds)?item.questionIds:[]).map(String);
  }
  function selectFreshQuestions(records,taskCode,count,seed,filter){
    const desired=Math.max(0,Number(count)||15);
    const eligible=(records||[]).filter(question=>engine.eligibleQuestion(question,taskCode,filter));
    const unique=uniqueEligible(records,taskCode,filter);
    const recentIds=new Set(recentQuestionIds(taskCode));
    const byId=new Map(eligible.map(question=>[String(question.id),fingerprint(question)]));
    const recentFingerprints=new Set([...recentIds].map(id=>byId.get(id)).filter(Boolean));
    const fresh=unique.filter(question=>!recentIds.has(String(question.id))&&!recentFingerprints.has(fingerprint(question)));
    const older=unique.filter(question=>!fresh.includes(question));
    return shuffle(fresh,String(seed||taskCode)+'|fresh')
      .concat(shuffle(older,String(seed||taskCode)+'|older'))
      .slice(0,desired)
      .map(clone);
  }

  const originalSelect=engine.selectQuestions.bind(engine);
  engine.selectQuestions=function(records,taskCode,count,seed,filter){
    const desired=Math.max(0,Number(count)||15);
    try{
      // Let the canonical selector apply an explicit or queued concept filter first.
      // Fresh-question rotation then works only inside that already-approved pool.
      const filteredPool=originalSelect(records,taskCode,Math.max(desired,(records||[]).length),String(seed||taskCode)+'|concept-pool',filter);
      const selected=selectFreshQuestions(filteredPool,taskCode,desired,seed);
      return selected.length>=Math.min(desired,filteredPool.length)?selected:filteredPool.slice(0,desired).map(clone);
    }catch(error){
      console.warn('Fresh Guided Trail rotation fell back to the standard selector.',error);
      return originalSelect(records,taskCode,count,seed,filter);
    }
  };

  function guidedState(){const saved=storage.load();return saved&&saved.guidedStudy||{};}
  function taskCodes(){return ['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C'];}
  function progress(){
    const guided=guidedState();
    const taskAwards=guided.trailAwards&&guided.trailAwards.tasks||{};
    const domainAwards=guided.trailAwards&&guided.trailAwards.domains||{};
    const marks=guided.trailStudyMarks||{};
    const history=Array.isArray(guided.checkpointHistory)?guided.checkpointHistory:[];
    const taskBadgeCount=taskCodes().filter(code=>taskAwards[code]).length;
    const domainMedalCount=Object.keys(DOMAIN_MEDALS).filter(code=>domainAwards[code]).length;
    const studyMarkCount=taskCodes().filter(code=>marks[code]&&(marks[code]===true||marks[code].completed!==false)).length;
    let rank=RANKS[0];
    RANKS.forEach(candidate=>{if(taskBadgeCount>=candidate.minimum&&domainMedalCount>=Number(candidate.domainMinimum||0)) rank=candidate;});
    const nextRank=RANKS.find(candidate=>candidate.minimum>taskBadgeCount||Number(candidate.domainMinimum||0)>domainMedalCount)||null;
    const chronological=history.slice().reverse();
    const comeback=taskCodes().some(code=>{let failed=false;return chronological.some(item=>{if(!item||item.task!==code)return false;if(item.passed&&failed)return true;if(!item.passed)failed=true;return false;});});
    const ribbons=[
      {id:'trailhead',name:'Trailhead Ribbon',icon:'🎗️',earned:history.some(item=>Number(item&&item.total)>=15),description:'Complete your first 15-question Guided Trail checkpoint.'},
      {id:'night-navigator',name:'Night Navigator Ribbon',icon:'🌙',earned:taskBadgeCount>=1,description:'Earn your first task badge.'},
      {id:'comeback',name:'Comeback Ribbon',icon:'↗️',earned:comeback,description:'Earn a task badge after an earlier unsuccessful checkpoint in that task.'},
      {id:'perfect-signal',name:'Perfect Signal Ribbon',icon:'✨',earned:history.some(item=>Number(item&&item.total)>=15&&Number(item.score)===100),description:'Score 100% on a full badge checkpoint.'},
      {id:'map-reader',name:'Map Reader Ribbon',icon:'🗺️',earned:studyMarkCount===12,description:'Mark all 12 Guided Study tasks complete.'},
      {id:'domain-trek',name:'Domain Trek Ribbon',icon:'⛰️',earned:domainMedalCount>=1,description:'Complete all three task badges in one RPSGT domain.'},
      {id:'four-horizons',name:'Four Horizons Ribbon',icon:'🌄',earned:domainMedalCount===4,description:'Earn all four domain medals.'},
      {id:'full-expedition',name:'Full Expedition Ribbon',icon:'🏕️',earned:taskBadgeCount===12,description:'Earn all 12 Guided Trail task badges.'}
    ];
    const earnedRibbonCount=ribbons.filter(item=>item.earned).length;
    const xp=taskBadgeCount*XP_REWARDS.taskBadge+domainMedalCount*XP_REWARDS.domainMedal;
    const maxXp=taskCodes().length*XP_REWARDS.taskBadge+Object.keys(DOMAIN_MEDALS).length*XP_REWARDS.domainMedal;
    return {taskBadgeCount,domainMedalCount,studyMarkCount,checkpointCount:history.length,taskAwards,domainAwards,history,rank,nextRank,ribbons,earnedRibbonCount,xp,maxXp};
  }

  function currentTaskTitle(code){const card=document.getElementById(code);return String(card&&card.querySelector('h3')&&card.querySelector('h3').textContent||code).trim();}
  function render(){
    const host=document.querySelector('[data-explorer-journey]');
    if(!host) return;
    const p=progress();
    const patches=taskCodes().map(code=>`<span class="explorer-patch ${p.taskAwards[code]?'earned':'locked'}" title="${currentTaskTitle(code)}"><strong>${code}</strong><small>${p.taskAwards[code]?'earned':'open'}</small></span>`).join('');
    const medals=Object.entries(DOMAIN_MEDALS).map(([code,name])=>`<div class="explorer-medal ${p.domainAwards[code]?'earned':'locked'}"><span aria-hidden="true">${p.domainAwards[code]?'🏅':'○'}</span><strong>${name}</strong><small>${code} domain medal</small></div>`).join('');
    const ribbons=p.ribbons.map(item=>`<div class="explorer-ribbon ${item.earned?'earned':'locked'}"><span aria-hidden="true">${item.earned?item.icon:'◇'}</span><div><strong>${item.name}</strong><small>${item.earned?'Earned':item.description}</small></div></div>`).join('');
    const next=p.nextRank?`${p.nextRank.name} at ${p.nextRank.minimum} task badges${p.nextRank.domainMinimum?' and '+p.nextRank.domainMinimum+' domain medals':''}.`:'You have reached the top Explorer rank in this Guided Trail.';
    const xpPercent=p.maxXp?Math.round(p.xp/p.maxXp*100):0;
    host.innerHTML=`<div class="explorer-journey-card">
      <div class="explorer-heading"><div><div class="eyebrow">Sleep Pathways Explorer Journey</div><h2>Build your field kit as you learn</h2><p>Task badges become trail patches. Domain completions earn medals. Special study milestones add ribbons and virtual uniform upgrades.</p></div><div class="explorer-rank"><span class="explorer-rank-icon" aria-hidden="true">${p.rank.icon}</span><small>Current rank</small><strong>${p.rank.name}</strong><span>${p.rank.upgrade}</span></div></div>
      <div class="explorer-stats"><span><strong>${p.xp.toLocaleString()}</strong> Explorer XP</span><span><strong>${p.taskBadgeCount}/12</strong> trail patches</span><span><strong>${p.domainMedalCount}/4</strong> domain medals</span><span><strong>${p.earnedRibbonCount}/${p.ribbons.length}</strong> ribbons</span></div>
      <div class="explorer-xp"><div><strong>Explorer XP</strong><span>${p.xp.toLocaleString()} / ${p.maxXp.toLocaleString()}</span></div><div class="explorer-xp-track" aria-label="${xpPercent}% of Guided Study Explorer XP earned"><span style="width:${xpPercent}%"></span></div><small>First-time task badges earn ${XP_REWARDS.taskBadge} XP and domain medals earn ${XP_REWARDS.domainMedal} XP. Retakes can strengthen mastery without farming XP.</small></div>
      <div class="explorer-uniform"><div class="explorer-uniform-label"><strong>Your virtual Explorer vest</strong><span>Next uniform upgrade: ${next}</span></div><div class="explorer-patch-rack">${patches}</div></div>
      <div class="explorer-award-grid"><section><h3>Domain medals</h3><div class="explorer-medal-grid">${medals}</div></section><section><h3>Trail ribbons</h3><div class="explorer-ribbon-grid">${ribbons}</div></section></div>
      <div class="explorer-rotation-note"><strong>Fresh-question rotation:</strong> Guided Trail holds back recently used questions when enough unseen questions are available, and identical question wording is kept out of the same checkpoint.</div>
      <p class="explorer-boundary">Sleep Pathways Explorer XP, ranks, patches, ribbons, and medals are fun educational achievements from Sleep Pathways Guild. They are not BRPT credentials or exam results.</p>
    </div>`;
  }

  function latestExplorerUnlocks(){
    const p=progress();
    const latest=p.history[0];
    if(!latest||!latest.passed) return [];
    const unlocks=[];
    const taskAward=p.taskAwards[latest.task];
    const newlyEarnedTask=taskAward&&taskAward.checkpointId===latest.id;
    if(newlyEarnedTask&&p.rank.minimum===p.taskBadgeCount&&p.rank.minimum>0) unlocks.push({icon:p.rank.icon,name:p.rank.name,detail:'Uniform upgrade: '+p.rank.upgrade});
    const prior=p.history.slice(1);
    if(p.history.filter(item=>Number(item&&item.total)>=15).length===1) unlocks.push({icon:'🎗️',name:'Trailhead Ribbon',detail:'First full Guided Trail checkpoint completed.'});
    if(newlyEarnedTask&&p.taskBadgeCount===1) unlocks.push({icon:'🌙',name:'Night Navigator Ribbon',detail:'First task badge earned.'});
    if(prior.some(item=>item&&item.task===latest.task&&!item.passed)) unlocks.push({icon:'↗️',name:'Comeback Ribbon',detail:'You returned to this task and earned the badge.'});
    if(Number(latest.score)===100&&!prior.some(item=>Number(item&&item.total)>=15&&Number(item.score)===100)) unlocks.push({icon:'✨',name:'Perfect Signal Ribbon',detail:'First perfect 15-question checkpoint.'});
    const domainAward=p.domainAwards[latest.domain];
    if(domainAward&&domainAward.earnedAt===latest.completedAt&&p.domainMedalCount===1) unlocks.push({icon:'⛰️',name:'Domain Trek Ribbon',detail:'First RPSGT domain expedition completed.'});
    if(domainAward&&domainAward.earnedAt===latest.completedAt&&p.domainMedalCount===4) unlocks.push({icon:'🌄',name:'Four Horizons Ribbon',detail:'All four RPSGT domain medals earned.'});
    if(newlyEarnedTask&&p.taskBadgeCount===12) unlocks.push({icon:'🏕️',name:'Full Expedition Ribbon',detail:'All 12 Guided Trail task badges earned.'});
    return unlocks;
  }
  function enhanceAchievement(){
    const content=document.querySelector('[data-achievement-content]');
    if(!content) return;
    if(!content.children.length){delete content.dataset.explorerEnhanced;return;}
    if(content.dataset.explorerEnhanced==='true') return;
    const unlocks=latestExplorerUnlocks();
    if(!unlocks.length) return;
    const panel=document.createElement('div');
    panel.className='explorer-achievement-upgrades';
    panel.innerHTML='<strong>Explorer kit upgraded!</strong>'+unlocks.map(item=>`<div><span aria-hidden="true">${item.icon}</span><p><b>${item.name}</b><small>${item.detail}</small></p></div>`).join('');
    const actions=content.querySelector('.achievement-actions');
    if(actions) actions.insertAdjacentElement('beforebegin',panel); else content.appendChild(panel);
    content.dataset.explorerEnhanced='true';
  }

  const dashboard=document.querySelector('[data-guided-trail-dashboard]');
  const achievement=document.querySelector('[data-achievement-content]');
  if(dashboard)new MutationObserver(()=>requestAnimationFrame(render)).observe(dashboard,{childList:true,subtree:true});
  if(achievement)new MutationObserver(()=>requestAnimationFrame(()=>{enhanceAchievement();render();})).observe(achievement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();

  window.RPSGTGuidedTrailExplorer={RECENT_CHECKPOINT_WINDOW,XP_REWARDS:clone(XP_REWARDS),RANKS:clone(RANKS),uniqueEligible,selectFreshQuestions,progress,render};
})();