(function(){
'use strict';
const map=document.querySelector('[data-blueprint-map]');
if(!map)return;
const taskCodes=['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C'];
const valid=code=>taskCodes.includes(code);
let selected=null;
function render(){
 const domains=[...map.querySelectorAll('.domain-map-card')];
 if(domains.length!==4)return;
 const cards=[...map.querySelectorAll('.task-map-card')];
 if(cards.length!==12)return;
 const remembered=sessionStorage.getItem('rpsgt-v3-trail-task');
 if(!selected&&valid(remembered))selected=remembered;
 const focus=selected&&cards.find(card=>card.id===selected);
 const level=focus?'task':'domains';
 map.classList.add('trail-levels-enabled');
 let nav=map.querySelector('[data-trail-level-nav]');
 if(!nav){
  nav=document.createElement('div');nav.dataset.trailLevelNav='';nav.className='trail-level-nav';
  map.prepend(nav);
 }
 nav.innerHTML=focus?'<button type="button" class="btn secondary" data-trail-back>← All four domains</button><span class="status">Task '+selected+'</span>':'<h2>Choose a domain, then a trail stop</h2><p>Open a learning task without scrolling through the entire map.</p>';
 domains.forEach((domain,index)=>{
  const code='D'+(index+1);
  const active=focus&&selected.startsWith(code);
  domain.hidden=Boolean(focus&&!active);
  let opener=domain.querySelector('[data-trail-domain-open]');
  if(!opener){
   opener=document.createElement('button');opener.type='button';opener.className='btn secondary trail-domain-open';
   opener.dataset.trailDomainOpen=code;
   const head=domain.querySelector('.domain-map-head');
   if(head)head.append(opener);
  }
  opener.textContent=focus?'← Choose another task':'Explore '+code+' →';
  opener.setAttribute('aria-label','Explore domain '+code);
  domain.querySelectorAll('.task-map-card').forEach(card=>{
   card.hidden=Boolean(focus&&card!==focus);
   let button=card.querySelector('[data-trail-task-open]');
   if(!button){
    button=document.createElement('button');button.type='button';button.className='btn primary trail-task-open';
    button.dataset.trailTaskOpen=card.id;
    const head=card.querySelector('.task-map-head');
    if(head)head.append(button);
   }
   button.textContent=focus?'Current trail stop':'Open task →';
   button.hidden=Boolean(focus);
  });
 });
 map.dataset.trailLevel=level;
}
function select(code){
 selected=valid(code)?code:null;
 if(selected)sessionStorage.setItem('rpsgt-v3-trail-task',selected);
 else sessionStorage.removeItem('rpsgt-v3-trail-task');
 render();
 const destination=selected?document.getElementById(selected):map.querySelector('[data-trail-level-nav]');
 if(destination){destination.setAttribute('tabindex','-1');destination.focus({preventScroll:true});destination.scrollIntoView({block:'start',behavior:'instant'});}
}
map.addEventListener('click',event=>{
 const task=event.target.closest('[data-trail-task-open]');
 if(task){select(task.dataset.trailTaskOpen);return;}
 if(event.target.closest('[data-trail-back]')){select(null);return;}
 const domain=event.target.closest('[data-trail-domain-open]');
 if(domain){if(selected)select(null);else{
  const first=map.querySelector('.domain-'+domain.dataset.trailDomainOpen.toLowerCase()+' .task-map-card');
  if(first)select(first.id);
 }}
});
const observer=new MutationObserver(mutations=>{if(mutations.some(m=>Array.from(m.addedNodes).some(n=>n.nodeType===1&&(n.matches?.('.domain-map-card')||n.querySelector?.('.domain-map-card')))))render();});
observer.observe(map,{childList:true,subtree:true});
render();
})();