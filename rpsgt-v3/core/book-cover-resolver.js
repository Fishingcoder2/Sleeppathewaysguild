(function(){
  'use strict';

  const covers={
    'fundamentals of sleep technology':'https://covers.openlibrary.org/b/isbn/9781975111625-L.jpg?default=false',
    'pediatric sleep pearls':'https://covers.openlibrary.org/b/isbn/9780323392778-L.jpg?default=false'
  };
  const sleepMedicinePearls3e='https://covers.openlibrary.org/b/isbn/9781455770519-L.jpg?default=false';

  function normalize(value){
    return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function editionText(card){
    const rows=[...card.querySelectorAll('.reference-meta > div')];
    const row=rows.find(item=>normalize(item.querySelector('span')&&item.querySelector('span').textContent).includes('edition'));
    return normalize(row&&row.querySelector('strong')&&row.querySelector('strong').textContent);
  }

  function coverFor(title,card){
    const key=normalize(title);
    if(key.includes('sleep medicine pearls')){
      const edition=editionText(card);
      return /(^| )3rd( |$)|third edition/.test(edition)?sleepMedicinePearls3e:'';
    }
    if(covers[key]) return covers[key];
    for(const name of Object.keys(covers)){
      if(key.includes(name)) return covers[name];
    }
    return '';
  }

  function enhance(){
    const host=document.querySelector('[data-reference-results]');
    if(!host) return;
    host.querySelectorAll('.reference-card').forEach(card=>{
      if(card.dataset.coverResolved==='1') return;
      const titleNode=card.querySelector('h2');
      const title=titleNode?titleNode.textContent.trim():'';
      const src=coverFor(title,card);
      if(!src){card.dataset.coverResolved='1';return;}
      const head=card.querySelector('.reference-card-head');
      if(!head){card.dataset.coverResolved='1';return;}

      const figure=document.createElement('figure');
      figure.className='reference-cover';
      const img=document.createElement('img');
      img.src=src;
      img.alt=title+' book cover';
      img.loading='lazy';
      img.decoding='async';
      img.referrerPolicy='no-referrer';
      img.addEventListener('error',()=>figure.remove(),{once:true});
      figure.appendChild(img);
      head.parentNode.insertBefore(figure,head);
      card.classList.add('has-reference-cover');
      card.dataset.coverResolved='1';
    });
  }

  function init(){
    const host=document.querySelector('[data-reference-results]');
    if(!host){setTimeout(init,150);return;}
    enhance();
    const observer=new MutationObserver(enhance);
    observer.observe(host,{childList:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
