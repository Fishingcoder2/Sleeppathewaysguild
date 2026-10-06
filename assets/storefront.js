/* Filter the existing catalog so editorial details and affiliate URLs have one source. */
(()=>{
  const catalog=document.getElementById('catalog');
  if(!catalog)return;
  const search=document.getElementById('catalog-search');
  const pathway=document.getElementById('catalog-pathway');
  const categories=[...catalog.querySelectorAll('[data-category]')];
  const sectionCategories={start:'books',technical:'books',pediatric:'books',ccsh:'books','advanced-titration':'books',specialty:'books',official:'books','maria-sosa':'books','guild-picks':'gear','work-gear':'gear','night-shift':'night',gifts:'gifts','spanish-resources':'spanish'};
  const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const shelves=[...document.querySelectorAll('.shelf')].filter(s=>sectionCategories[s.id]);
  const items=shelves.flatMap(s=>[...s.querySelectorAll('.bookCard,.pickCard,.curatedProduct')].map(card=>{
    const badges=normalize(card.querySelector('.badges')?.textContent||'');
    const paths=[];
    for(const key of ['rpsgt','cpsgt','ccsh'])if(badges.includes(key))paths.push(key);
    if(s.id==='pediatric')paths.push('pediatric');
    if(s.id==='advanced-titration'||badges.includes('atc'))paths.push('atc');
    if(s.id==='official')paths.push('official');
    return {card,section:s,category:sectionCategories[s.id],text:normalize(card.textContent),paths};
  }));
  const params=new URLSearchParams(location.search);
  const affiliateNote=document.createElement('p');
  affiliateNote.className='catalog-affiliate';
  affiliateNote.textContent='As an Amazon Associate I earn from qualifying purchases, at no additional cost to you. Books and gear are optional.';
  catalog.querySelector('.catalog-summary').before(affiliateNote);
  document.querySelector('#start .shelfHead h2').textContent='Sleep technology foundations';
  let category=categories.some(b=>b.dataset.category===params.get('category'))?params.get('category'):'books';
  pathway.value=[...pathway.options].some(o=>o.value===params.get('pathway'))?params.get('pathway'):'all';
  const embedded=params.get('embed')==='1';
  document.body.classList.add('catalog-ready');
  if(embedded)document.body.classList.add('store-embedded');
  catalog.hidden=false;
  // Keep existing deep links useful, including when entering from the main site.
  const anchorCategories={'#storefront':'all','#start':'books','#credentials':'books','#guild-picks':'gear','#work-gear':'gear','#shop-gear':'gear','#night-shift':'night','#gifts':'gifts','#spanish-resources':'spanish','#maria-sosa':'books','#official':'books','#technical':'books','#pediatric':'books','#ccsh':'books','#advanced-titration':'books','#specialty':'books'};
  const anchorPathways={'#official':'official','#pediatric':'pediatric','#ccsh':'ccsh','#advanced-titration':'atc'};
  if(anchorCategories[location.hash]){category=anchorCategories[location.hash];pathway.value=anchorPathways[location.hash]||'all';}
  function filter(updateUrl=true){
    const words=normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let count=0;
    items.forEach(item=>{
      const show=(category==='all'||item.category===category)&&(pathway.value==='all'||item.paths.includes(pathway.value))&&words.every(word=>item.text.includes(word));
      item.card.hidden=!show;if(show)count++;
    });
    shelves.forEach(section=>{section.hidden=!items.some(item=>item.section===section&&!item.card.hidden);});
    categories.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===category)));
    pathway.disabled=category!=='books'&&category!=='all';
    document.getElementById('catalog-count').textContent=`${count} ${count===1?'item':'items'}${pathway.value!=='all'?` · ${pathway.options[pathway.selectedIndex].text}`:''}${search.value.trim()?' matching your search':''}`;
    document.getElementById('catalog-empty').hidden=count!==0;
    if(updateUrl){const url=new URL(location.href);url.searchParams.set('category',category);if(pathway.value!=='all')url.searchParams.set('pathway',pathway.value);else url.searchParams.delete('pathway');history.replaceState(null,'',url);}
  }
  function track(){if(typeof window.gtag==='function')window.gtag('event','store_catalog_filter',{store_category:category,study_pathway:pathway.value,query_length:Math.min(search.value.trim().length,100),result_count:items.filter(i=>!i.card.hidden).length});}
  function chooseCategory(value){category=value;pathway.value='all';filter();track();}
  function reset(){category='all';pathway.value='all';search.value='';filter();search.focus();}
  categories.forEach(button=>button.addEventListener('click',()=>chooseCategory(button.dataset.category)));
  search.addEventListener('input',()=>filter(false));
  search.addEventListener('change',track);
  pathway.addEventListener('change',()=>{category='books';filter();track();});
  document.getElementById('catalog-reset').addEventListener('click',reset);
  catalog.querySelector('[data-reset-catalog]').addEventListener('click',reset);
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    const hash=link?.getAttribute('href');
    if(!anchorCategories[hash])return;
    event.preventDefault();category=anchorCategories[hash];pathway.value=anchorPathways[hash]||'all';search.value='';filter();catalog.scrollIntoView({behavior:'auto'});search.focus({preventScroll:true});
  });
  filter(false);
  // Existing click tracking continues to observe the original purchase buttons.
  document.addEventListener('keydown',event=>{if(embedded&&event.key==='Escape')parent.postMessage('spg-close-store',location.origin);});
})();
