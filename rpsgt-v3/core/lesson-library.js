(function(){
  'use strict';
  const list=document.querySelector('[data-lesson-list]'),reader=document.querySelector('[data-lesson-reader]');
  if(!list||!reader)return;
  const search=document.getElementById('lesson-search'),family=document.getElementById('lesson-family'),count=document.querySelector('[data-lesson-count]');
  const areas=[['hookup','Hookup and electrode placement'],['instrumentation','Instrumentation and signal pathways'],['pap','PAP and titration'],['pediatric','Pediatric and infant sleep'],['daytime-testing','MSLT and MWT'],['ekg','EKG recognition and response'],['troubleshooting','Integrated troubleshooting']];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let lessons=[],active=null,checked=false;
  function hashKey(){try{return decodeURIComponent(location.hash.slice(1));}catch{return '';}}
  const reviews=()=>window.RPSGTStorage.load().guidedStudy.lessonReviews||{};
  function filtered(){const q=search.value.trim().toLowerCase();return lessons.filter(l=>(family.value==='all'||l.area===family.value)&&[l.title,l.areaTitle,l.study.intro,...l.study.points].join(' ').toLowerCase().includes(q));}
  function renderList(){
    const rows=filtered(),saved=reviews();count.textContent=rows.length+' of '+lessons.length+' lessons · '+lessons.filter(l=>saved[l.key]?.reviewedAt).length+' reviewed';
    list.innerHTML=rows.length?rows.map(l=>`<button type="button" class="lesson-link" data-lesson="${esc(l.key)}" aria-current="${active?.key===l.key}">${esc(l.title)}<small>${esc(l.areaTitle)}${saved[l.key]?.reviewedAt?' · Reviewed':''}</small></button>`).join(''):'<p>No lessons match. Try another search or area.</p>';
  }
  function open(key,focus){
    active=lessons.find(l=>l.key===key);if(!active)return;checked=false;
    const l=active;reader.innerHTML=`<div class="eyebrow">${esc(l.areaTitle)}</div><h2>${esc(l.title)}</h2><p>${esc(l.study.intro)}</p><ul class="lesson-points">${l.study.points.map(p=>'<li>'+esc(p)+'</li>').join('')}</ul><fieldset><legend>Apply what you learned</legend><p>${esc(l.apply.prompt)}</p>${l.apply.options.map((p,i)=>`<label class="lesson-option"><input type="radio" name="lesson-answer" value="${i}"><span>${esc(p)}</span></label>`).join('')}<button class="btn primary" type="button" data-lesson-check>Check my decision</button><div data-lesson-feedback role="status" aria-live="polite"></div></fieldset><details><summary>Lesson recap</summary><p>${esc(l.recap?.reviewed||'')}</p><p>${esc(l.recap?.canDo||'')}</p></details><p class="lesson-reference">Reference used by this lesson pack: ${esc(l.reference||'See the linked lab for source details.')}</p><div class="actions"><a class="btn primary" href="lab-${esc(l.area)}.html">Apply in the ${esc(l.areaTitle)} lab</a><button class="btn secondary" type="button" data-lesson-next>Next lesson in this area</button></div>`;
    history.replaceState(null,'','#'+encodeURIComponent(key));renderList();if(focus)reader.focus();
  }
  reader.addEventListener('click',e=>{
    if(e.target.closest('[data-lesson-next]')){const rows=lessons.filter(l=>l.area===active.area),i=rows.indexOf(active);open(rows[(i+1)%rows.length].key,true);return;}
    if(!e.target.closest('[data-lesson-check]')||checked)return;
    const selected=reader.querySelector('input[name="lesson-answer"]:checked'),feedback=reader.querySelector('[data-lesson-feedback]');
    if(!selected){feedback.textContent='Choose a decision before checking.';return;}
    const correct=active.apply.options[Number(selected.value)]===active.apply.answer;
    feedback.className='lesson-feedback';feedback.innerHTML=`<strong>${correct?'Correct decision.':'Review this decision.'}</strong><p>${esc(active.apply.rationale)}</p>${correct?'':'<p>Best decision: '+esc(active.apply.answer)+'</p>'}`;
    checked=true;reader.querySelectorAll('input[name="lesson-answer"]').forEach(input=>input.disabled=true);e.target.closest('[data-lesson-check]').disabled=true;
    try{const saved=window.RPSGTStorage.load();saved.guidedStudy.lessonReviews=saved.guidedStudy.lessonReviews||{};const previous=saved.guidedStudy.lessonReviews[active.key];saved.guidedStudy.lessonReviews[active.key]={reviewedAt:new Date().toISOString(),attempts:(previous?.attempts||0)+1,firstCorrect:previous?previous.firstCorrect:correct,lastCorrect:correct};window.RPSGTStorage.save(saved);renderList();}
    catch(error){feedback.insertAdjacentHTML('beforeend','<p>Your review could not be saved in this browser. You can still continue learning.</p>');}
  });
  list.addEventListener('click',e=>{const button=e.target.closest('[data-lesson]');if(button)open(button.dataset.lesson,true);});
  search.addEventListener('input',renderList);family.addEventListener('change',renderList);
  window.addEventListener('hashchange',()=>open(hashKey(),true));
  async function init(){
    const results=await Promise.allSettled(areas.map(async([area,title])=>{const response=await fetch('data/'+area+'/guided-stations.json');if(!response.ok)throw new Error(area);const pack=await response.json();return pack.stations.map(s=>({...s,area,areaTitle:title,key:area+'/'+s.id,reference:pack.reference}));}));
    lessons=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);areas.filter(([area])=>lessons.some(l=>l.area===area)).forEach(([area,title])=>{const option=document.createElement('option');option.value=area;option.textContent=title;family.appendChild(option);});
    if(!lessons.length){count.textContent='Lessons could not load. Open a skills lab to continue.';return;}
    const params=new URLSearchParams(location.search);if(areas.some(([area])=>area===params.get('area')))family.value=params.get('area');
    const initial=lessons.find(l=>l.key===hashKey());open(initial?.key||filtered()[0]?.key,false);renderList();
    if(results.some(r=>r.status==='rejected'))count.insertAdjacentText('afterend',' Some lesson areas could not load; their skills labs remain available.');
  }
  init().catch(()=>{count.textContent='The lesson library could not load. Please use the Guided Study map or skills labs.';});
})();
