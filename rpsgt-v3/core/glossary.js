(function(){
  'use strict';
  const library=window.RPSGTLearningLibrary;
  const search=document.querySelector('[data-glossary-search]');
  const category=document.querySelector('[data-glossary-category]');
  const host=document.querySelector('[data-glossary-grid]');
  const count=document.querySelector('[data-glossary-count]');
  const empty=document.querySelector('[data-glossary-empty]');
  const recall=document.querySelector('[data-glossary-recall]');
  if(!library||!host) return;
  const state={terms:[],filtered:[],recallIndex:0};
  const clean=value=>String(value==null?'':value).trim();
  const normalized=value=>clean(value).toLowerCase().replace(/\s+/g,' ');

  function option(value,label){const node=document.createElement('option');node.value=value;node.textContent=label;return node;}
  function linkToCard(term){return 'flashcards.html?search='+encodeURIComponent(clean(term));}
  function termCard(item){
    const card=document.createElement('article');card.className='card glossary-entry';
    const head=document.createElement('div');head.className='glossary-head';
    const title=document.createElement('h3');title.textContent=item.term;
    const cat=document.createElement('span');cat.className='glossary-category';cat.textContent=item.category||'RPSGT term';head.append(title,cat);
    const definition=document.createElement('p');definition.textContent=item.plain||'';
    card.append(head,definition);
    if(clean(item.why)){const why=document.createElement('div');why.className='glossary-why';why.innerHTML='<strong>Why it matters</strong><br>';why.append(document.createTextNode(item.why));card.append(why);}
    if(clean(item.confusion)){const confusion=document.createElement('div');confusion.className='glossary-confusion';confusion.innerHTML='<strong>Do not confuse</strong><br>';confusion.append(document.createTextNode(item.confusion));card.append(confusion);}
    const linked=Array.isArray(item.linked)?item.linked.filter(Boolean):[];
    if(linked.length){const links=document.createElement('div');links.className='glossary-links';linked.forEach(value=>{const chip=document.createElement('span');chip.textContent=value;links.append(chip);});card.append(links);}
    const actions=document.createElement('div');actions.className='actions';
    const flash=document.createElement('a');flash.className='btn secondary';flash.href=linkToCard(item.term);flash.textContent='Study in Flashcards';actions.append(flash);card.append(actions);
    return card;
  }

  function apply(){
    const query=normalized(search&&search.value);
    const selected=category&&category.value||'all';
    state.filtered=state.terms.filter(item=>{
      if(selected!=='all'&&item.category!==selected) return false;
      if(!query) return true;
      return normalized([item.term,item.category,item.plain,item.why,item.confusion,(item.linked||[]).join(' ')].join(' ')).includes(query);
    });
    host.replaceChildren(...state.filtered.map(termCard));
    if(count) count.textContent=state.filtered.length+' term'+(state.filtered.length===1?'':'s');
    if(empty) empty.hidden=state.filtered.length>0;
  }

  function categories(){
    if(!category) return;
    const current=category.value||'all';
    const values=[...new Set(state.terms.map(item=>item.category).filter(Boolean))].sort();
    category.replaceChildren(option('all','All categories'),...values.map(value=>option(value,value)));
    category.value=values.includes(current)?current:'all';
  }

  function showRecall(){
    if(!recall||!state.filtered.length) return;
    const item=state.filtered[state.recallIndex%state.filtered.length];
    recall.hidden=false;
    recall.querySelector('[data-recall-term]').textContent=item.term;
    recall.querySelector('[data-recall-category]').textContent=item.category||'RPSGT term';
    recall.querySelector('[data-recall-definition]').textContent=item.plain||'';
    recall.querySelector('[data-recall-why]').textContent=item.why||'';
    const confusion=recall.querySelector('[data-recall-confusion]');
    confusion.textContent=item.confusion||'';confusion.parentElement.hidden=!clean(item.confusion);
    recall.querySelector('[data-recall-answer]').hidden=true;
    recall.querySelector('[data-recall-reveal]').hidden=false;
    recall.querySelector('[data-recall-position]').textContent='Term '+((state.recallIndex%state.filtered.length)+1)+' of '+state.filtered.length;
  }

  async function init(){
    try{
      await library.load();
      state.terms=library.glossaryRecords();categories();apply();
      const total=document.querySelector('[data-glossary-total]');if(total) total.textContent=library.counts.glossary;
    }catch(error){host.replaceChildren();if(empty){empty.hidden=false;empty.querySelector('h2').textContent='Glossary could not load';empty.querySelector('p').textContent=error.message;}}
  }

  search&&search.addEventListener('input',apply);category&&category.addEventListener('change',()=>{state.recallIndex=0;apply();});
  document.querySelector('[data-start-recall]')?.addEventListener('click',()=>{state.recallIndex=0;showRecall();recall?.scrollIntoView({behavior:'smooth',block:'start'});});
  document.querySelector('[data-recall-reveal]')?.addEventListener('click',event=>{event.currentTarget.hidden=true;recall.querySelector('[data-recall-answer]').hidden=false;});
  document.querySelector('[data-recall-next]')?.addEventListener('click',()=>{if(!state.filtered.length)return;state.recallIndex=(state.recallIndex+1)%state.filtered.length;showRecall();});
  document.querySelector('[data-recall-prev]')?.addEventListener('click',()=>{if(!state.filtered.length)return;state.recallIndex=(state.recallIndex-1+state.filtered.length)%state.filtered.length;showRecall();});
  document.querySelector('[data-recall-close]')?.addEventListener('click',()=>{recall.hidden=true;});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
