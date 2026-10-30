(function(){
'use strict';
const map=document.querySelector('[data-blueprint-map]');
if(!map)return;
const main=map.closest('main');
const respiratory=document.querySelector('[data-respiratory-study-trail]');
const dashboard=document.querySelector('[data-guided-trail-dashboard]');
const journey=document.querySelector('[data-explorer-journey]');
const chooser=document.getElementById('guided-study-area-chooser');
const intro=main&&main.querySelector('.hero');
const notices=Array.from(main?main.querySelectorAll('.section.notice,.section:has(>.notice)'):[]);
const valid=/^D[1-4][A-C]$/;
const domainValid=/^D[1-4]$/;
let screen='home',domain=null,task=null;
const saved=()=>{try{return JSON.parse(sessionStorage.getItem('rpsgt-v3-study-screen')||'{}')}catch(_){return {}}};
function persist(){try{sessionStorage.setItem('rpsgt-v3-study-screen',JSON.stringify({screen,domain,task}))}catch(_){}}
function focusTop(){
 const target=main.querySelector('[data-study-screen-bar]');
 if(target){target.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function button(label,action,active){return '<button type="button" class="btn '+(active?'primary':'secondary')+'" data-study-go="'+action+'" aria-current="'+(active?'page':'false')+'">'+label+'</button>';}
function ensureBar(){
 let bar=main.querySelector('[data-study-screen-bar]');
 if(!bar){bar=document.createElement('nav');bar.dataset.studyScreenBar='';bar.className='study-screen-bar';bar.setAttribute('aria-label','Guided Study areas');bar.tabIndex=-1;main.insertBefore(bar,main.firstElementChild);}
 return bar;
}
function render(){
 const bar=ensureBar();
 bar.innerHTML='<div class="study-screen-title"><strong>Guided Study</strong><span>'+({home:'Choose your learning area',respiratory:'Respiratory and PAP Trail',progress:'My progress',rewards:'Explorer rewards',domains:'Four-domain task map',domain:'Domain '+domain,task:'Task '+task}[screen]||'Choose your learning area')+'</span></div><div class="study-screen-actions">'+button('Home','home',screen==='home')+button('Respiratory / PAP','respiratory',screen==='respiratory')+button('Progress','progress',screen==='progress')+button('Rewards','rewards',screen==='rewards')+button('D1–D4 Map','domains',screen==='domains'||screen==='domain'||screen==='task')+'</div>';
 const show=(node,on)=>{if(node)node.hidden=!on;};
 show(intro,screen==='home');
 show(chooser,screen==='home');
 notices.forEach(n=>show(n,screen==='home'));
 show(respiratory,screen==='respiratory');
 show(dashboard,screen==='progress');
 show(journey,screen==='rewards');
 show(map,['domains','domain','task'].includes(screen));
 const domains=Array.from(map.querySelectorAll('.domain-map-card'));
 if(domains.length!==4)return;
 let nav=map.querySelector('[data-trail-level-nav]');
 if(!nav){nav=document.createElement('div');nav.dataset.trailLevelNav='';nav.className='trail-level-nav';map.prepend(nav);}
 nav.innerHTML=screen==='domains'?'<h2>Select a domain</h2><p>Choose one domain to see its trail stops.</p>':screen==='domain'?button('← All domains','domains',false)+' <strong>Choose a task in '+domain+'</strong>':screen==='task'?button('← Tasks in '+domain,'domain:'+domain,false)+' '+button('All domains','domains',false):'';
 domains.forEach((node,index)=>{
  const code='D'+(index+1);
  node.hidden=screen==='domains'?false:!((screen==='domain'||screen==='task')&&domain===code);
  let opener=node.querySelector('[data-trail-domain-open]');
  if(!opener){opener=document.createElement('button');opener.type='button';opener.className='btn primary trail-domain-open';opener.dataset.trailDomainOpen=code;node.querySelector('.domain-map-head')?.append(opener);}
  opener.textContent='Enter '+code+' →';opener.hidden=screen!=='domains';
  node.querySelectorAll('.task-map-card').forEach(card=>{
   card.hidden=screen==='domains'||(screen==='task'&&card.id!==task);
   let open=card.querySelector('[data-trail-task-open]');
   if(!open){open=document.createElement('button');open.type='button';open.className='btn primary trail-task-open';open.dataset.trailTaskOpen=card.id;card.querySelector('.task-map-head')?.append(open);}
   open.textContent='Open '+card.id+' →';open.hidden=screen!=='domain';
  });
 });
 map.classList.add('trail-levels-enabled');
 map.dataset.trailLevel=screen;
}
function go(target){
 if(target.startsWith('domain:')&&domainValid.test(target.slice(7))){domain=target.slice(7);task=null;screen='domain';}
 else if(target.startsWith('task:')&&valid.test(target.slice(5))){task=target.slice(5);domain=task.slice(0,2);screen='task';}
 else if(['home','respiratory','progress','rewards','domains'].includes(target)){screen=target;if(target==='domains'||target==='home')domain=task=null;}else return;
 persist();render();focusTop();
}
main.addEventListener('click',event=>{
 const action=event.target.closest('[data-study-go]');
 if(action){event.preventDefault();go(action.dataset.studyGo);return;}
 const d=event.target.closest('[data-trail-domain-open]');
 if(d){go('domain:'+d.dataset.trailDomainOpen);return;}
 const t=event.target.closest('[data-trail-task-open]');
 if(t){go('task:'+t.dataset.trailTaskOpen);return;}

});
const previous=saved();
if(['home','respiratory','progress','rewards','domains','domain','task'].includes(previous.screen)){
 screen=previous.screen;
 if(/^D[1-4]$/.test(previous.domain||''))domain=previous.domain;
 if(valid.test(previous.task||'')){task=previous.task;domain=task.slice(0,2);}
 if(screen==='task'&&!task)screen='domains';
 if(screen==='domain'&&!domain)screen='domains';
}
const observer=new MutationObserver(records=>{
 if(records.some(record=>Array.from(record.addedNodes).some(n=>n.nodeType===1&&(n.matches?.('.domain-map-card')||n.querySelector?.('.domain-map-card')))))render();
});
observer.observe(map,{childList:true,subtree:true});
render();
})();