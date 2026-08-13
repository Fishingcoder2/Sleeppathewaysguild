(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  const host=document.querySelector('[data-respiratory-visual-host]');
  if(!renderer||!host)return;
  let pack=null,index=0,displayStudy=null,viewSeconds=120;
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  function shiftFeature(feature,offset){const copy=clone(feature);['start','end','nadir','returnAt','center'].forEach(key=>{if(Number.isFinite(Number(copy[key])))copy[key]=Number(copy[key])+offset;});return copy;}
  function routineView(study,seconds){if(seconds<=30)return clone(study);const copy=clone(study);copy.durationSeconds=120;copy.channels=(study.channels||[]).map(channel=>{const next=clone(channel);if(Array.isArray(next.features))next.features=next.features.map(feature=>shiftFeature(feature,30));return next;});return copy;}
  function activeStudy(){const source=pack&&pack.studies[index];if(!source)return null;return Number(source.durationSeconds)>=240?clone(source):routineView(source,viewSeconds);}
  function viewLabel(study){const duration=Number(study&&study.durationSeconds||30);if(duration>=300)return '5-minute overview · 10 × 30-second epochs';if(duration>=120)return '120-second view · 4 × 30-second epochs';return '30-second close-up';}
  function renderCanvas(){const canvas=host.querySelector('canvas');if(canvas&&displayStudy)renderer.render(canvas,displayStudy);}
  function timeControls(source){if(Number(source.durationSeconds)>=240)return '<span class="status green">5-minute overview</span>';return `<button class="btn ${viewSeconds===30?'primary':'secondary'}" type="button" data-resp-view="30">30 s close-up</button><button class="btn ${viewSeconds===120?'primary':'secondary'}" type="button" data-resp-view="120">120 s · 4 epochs</button>`;}
  function render(){
    if(!pack)return;
    const source=pack.studies[index];
    if(Number(source.durationSeconds)>=240)viewSeconds=300;else if(viewSeconds!==30&&viewSeconds!==120)viewSeconds=120;
    displayStudy=activeStudy();
    const duration=Number(displayStudy.durationSeconds||30);
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Respiratory Visual Pack 1</div><h2>Case ${index+1} of ${pack.studies.length}</h2></div><span class="status">Original schematic signal</span></div><div class="visual-study-meta"><span class="status">${viewLabel(displayStudy)}</span><span class="status">${displayStudy.channels.length} channels</span><span class="status">Pattern hidden</span></div><div class="visual-question-actions" style="margin-bottom:.75rem">${timeControls(source)}</div><div class="visual-viewer-shell"><div class="visual-viewer-head"><div><strong>Respiratory PSG signal window</strong><small>${duration>=240?'Read the repeated pattern across minutes before zooming into any single breath.':'Compare baseline, event morphology, recovery, and delayed gas-exchange response across four epochs.'}</small></div><span class="status green">No patient data</span></div><div class="visual-scroll"><div class="visual-canvas-stage"><canvas aria-label="Schematic respiratory polysomnography tracing"></canvas></div></div></div><div class="visual-question-card"><div class="visual-question-top"><div><h2>What respiratory pattern does this multi-channel segment suggest?</h2><p>${duration>=240?'Look for repetition, waxing and waning ventilation, and the relationship between airflow and effort over the full five minutes.':'Read across the signals and through the surrounding epochs before revealing the teaching label.'}</p></div></div><div class="visual-question-actions"><button class="btn secondary" data-resp-prev ${index===0?'disabled':''}>Previous case</button><button class="btn primary" data-resp-reveal>Reveal teaching pattern</button><button class="btn secondary" data-resp-next ${index===pack.studies.length-1?'disabled':''}>Next case</button></div><div data-resp-reveal-host></div></div>`;
    requestAnimationFrame(renderCanvas);
  }
  document.addEventListener('click',event=>{
    const viewButton=event.target.closest('[data-resp-view]');
    if(viewButton&&pack){viewSeconds=Number(viewButton.getAttribute('data-resp-view'))||120;render();return;}
    if(event.target.closest('[data-resp-prev]')&&index>0){index-=1;viewSeconds=Number(pack.studies[index].durationSeconds)>=240?300:120;render();return;}
    if(event.target.closest('[data-resp-next]')&&pack&&index<pack.studies.length-1){index+=1;viewSeconds=Number(pack.studies[index].durationSeconds)>=240?300:120;render();return;}
    if(event.target.closest('[data-resp-reveal]')){const study=pack.studies[index],out=host.querySelector('[data-resp-reveal-host]');if(out)out.innerHTML=`<div class="visual-feedback correct"><strong>${esc(study.pattern)}</strong><span>Use the complete signal relationship as the teaching cue. This schematic does not assert that current clinical scoring thresholds are met.</span></div>`;}
  });
  let resizeTimer=null;window.addEventListener('resize',()=>{if(!pack)return;clearTimeout(resizeTimer);resizeTimer=setTimeout(renderCanvas,140);});
  Promise.all([
    fetch('data/visual/prototype-respiratory.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('HTTP '+response.status+' respiratory pack');return response.json();}),
    fetch('data/visual/prototype-respiratory-long.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('HTTP '+response.status+' long-window pack');return response.json();})
  ]).then(([routine,longWindow])=>{pack={meta:routine.meta,studies:[...(routine.studies||[]),...(longWindow.studies||[])]};render();}).catch(error=>{host.innerHTML=`<div class="notice error"><strong>Respiratory Visual Pack could not load.</strong> ${esc(error.message)}</div>`;});
})();