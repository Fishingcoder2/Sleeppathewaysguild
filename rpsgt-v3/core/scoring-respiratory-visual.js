(function(){
'use strict';
const host=document.querySelector('[data-scoring-respiratory-visual]');
if(!host)return;
const stageRenderer=window.RPSGTVisualPSGRenderer||null;
const state={renderer:null,pack:null,cases:[],index:0,classification:null,classificationLocked:false,evidence:null,evidenceLocked:false,classCorrect:0,evidenceCorrect:0};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current=()=>state.cases[state.index]||null;
const CASE_IDS=['resp-obstructive-001','resp-central-001','resp-mixed-001','resp-flow-limited-001'];
const EVIDENCE={
 'resp-obstructive-001':{
  answer:'Airflow nearly disappears while respiratory effort persists or increases.',
  options:[
   'Airflow nearly disappears while respiratory effort persists or increases.',
   'Airflow and thoracoabdominal effort disappear together.',
   'Effort is absent first, then returns while airflow remains suppressed.',
   'Only nasal pressure is lost while thermal airflow and effort stay normal.'
  ],
  rationale:'The app-authored obstructive pattern shows marked airflow loss while thoracic and abdominal effort continue and increase. Thoracoabdominal desynchrony is supporting obstructive context.'
 },
 'resp-central-001':{
  answer:'Airflow and thoracoabdominal effort disappear together.',
  options:[
   'Airflow nearly disappears while respiratory effort persists or increases.',
   'Airflow and thoracoabdominal effort disappear together.',
   'Effort is absent first, then returns while airflow remains suppressed.',
   'Nasal pressure becomes flattened while effort continues.'
  ],
  rationale:'The app-authored central pattern suppresses airflow and both thoracic and abdominal effort during the same interval.'
 },
 'resp-mixed-001':{
  answer:'Effort is absent first, then returns while airflow remains suppressed.',
  options:[
   'Airflow nearly disappears while respiratory effort persists from the start.',
   'Airflow and effort remain absent for the entire event.',
   'Effort is absent first, then returns while airflow remains suppressed.',
   'Nasal pressure is reduced but never markedly suppressed.'
  ],
  rationale:'The mixed-pattern teaching case begins with absent airflow and absent effort; effort resumes later while airflow remains markedly suppressed before recovery.'
 },
 'resp-flow-limited-001':{
  answer:'Nasal pressure is reduced and flattened while effort continues, with supporting snore and oxygen/arousal context.',
  options:[
   'Nasal pressure is reduced and flattened while effort continues, with supporting snore and oxygen/arousal context.',
   'Airflow and effort both disappear abruptly for the same interval.',
   'Effort begins absent and returns before airflow recovers.',
   'Only one airflow sensor is lost while all corroborating channels remain normal.'
  ],
  rationale:'The teaching morphology emphasizes reduced and flattened nasal-pressure excursions with continuing effort plus supporting snore, oxygen, and arousal context. It is pattern-recognition practice, not a claim that current scoring thresholds are met.'
 }
};
function rendererReady(){
 if(window.RPSGTVisualRespiratoryRenderer){state.renderer=window.RPSGTVisualRespiratoryRenderer;return Promise.resolve();}
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='core/visual-respiratory-renderer.js';
  script.onload=()=>{
   const respiratory=window.RPSGTVisualPSGRenderer;
   if(!respiratory){reject(new Error('Respiratory renderer did not initialize.'));return;}
   window.RPSGTVisualRespiratoryRenderer=respiratory;
   state.renderer=respiratory;
   if(stageRenderer)window.RPSGTVisualPSGRenderer=stageRenderer;
   resolve();
  };
  script.onerror=()=>reject(new Error('Respiratory renderer could not load.'));
  document.head.appendChild(script);
 });
}
async function load(){
 await rendererReady();
 const response=await fetch('data/visual/prototype-respiratory.json',{cache:'no-store'});
 if(!response.ok)throw new Error('Respiratory visual pack HTTP '+response.status);
 const pack=await response.json();
 if(!pack.meta||pack.meta.appAuthored!==true)throw new Error('Respiratory pack must be app-authored.');
 state.pack=pack;
 state.cases=CASE_IDS.map(id=>buildCase(id)).filter(Boolean);
 if(state.cases.length!==CASE_IDS.length)throw new Error('One or more respiratory teaching cases were unavailable.');
 renderIntro();
}
function buildCase(id){
 const study=(state.pack.studies||[]).find(item=>item.id===id);
 const question=(state.pack.questions||[]).find(item=>item.studyId===id&&item.type==='choice');
 const evidence=EVIDENCE[id];
 if(!study||!question||!evidence)return null;
 return {id,study,question,evidence};
}
function resetCase(){state.classification=null;state.classificationLocked=false;state.evidence=null;state.evidenceLocked=false;}
function renderIntro(){
 host.hidden=false;
 host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 4 · Visual practicum</div><h2>Respiratory Event Classification — compare airflow with effort</h2></div><span class="status">4 app-authored cases</span></div><p class="report-intro">Classify the respiratory pattern from the tracing first. Then identify the cross-channel relationship that supports the decision. Exact rule thresholds are intentionally not the learning target here; current official AASM guidance remains authoritative for clinical scoring.</p><div class="scoring-respiratory-roadmap"><div><strong>1 · Airflow</strong><small>Start with nasal pressure and thermal airflow. Decide whether flow is preserved, reduced, flattened, or markedly suppressed.</small></div><div><strong>2 · Effort</strong><small>Compare thoracic and abdominal RIP with airflow. Persistent, absent, returning, or paradoxical effort changes the classification.</small></div><div><strong>3 · Context</strong><small>Use snore, delayed SpO₂ change, EEG arousal, and neighboring channels as corroborating evidence rather than isolated proof.</small></div></div><div class="actions"><button class="btn primary" type="button" data-respiratory-start>Start respiratory classification</button></div>`;
}
function renderCase(){
 const item=current();if(!item)return;
 host.hidden=false;
 const classCorrect=state.classificationLocked&&state.classification===item.question.answer;
 host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 4 · Case ${state.index+1} of ${state.cases.length}</div><h2>${esc(item.study.title)}</h2></div><span class="status">30-second respiratory PSG</span></div><div class="scoring-respiratory-meta"><span>Original schematic PSG</span><span>Airflow + thoracic/abdominal effort</span><span>SpO₂ + snore + EEG context</span><span>No patient data</span></div><div class="visual-viewer-shell"><div class="visual-viewer-head"><div><strong>Respiratory signal window</strong><small>Read the entire relationship before choosing a label.</small></div><span class="status green">Teaching label hidden until check</span></div><div class="visual-scroll"><div class="visual-canvas-stage"><canvas data-respiratory-canvas aria-label="Schematic respiratory PSG for event classification"></canvas></div></div></div><section class="scoring-stage-question"><h3>Which respiratory pattern does this tracing best represent?</h3><div class="scoring-respiratory-options" role="group" aria-label="Respiratory classification">${classificationButtons(item)}</div>${!state.classificationLocked?`<div class="visual-question-actions"><button class="btn primary" type="button" data-respiratory-check-class ${state.classification?'':'disabled'}>Check classification</button></div>`:classificationFeedback(item,classCorrect)}${state.classificationLocked?evidenceBlock(item):''}</section>`;
 requestAnimationFrame(()=>renderCanvas(item.study));
}
function classificationButtons(item){
 const options=['Obstructive apnea pattern','Central apnea pattern','Mixed apnea pattern','Hypopnea / flow-limited pattern'];
 return options.map(value=>`<button class="visual-choice${state.classification===value?' selected':''}" type="button" data-respiratory-class="${esc(value)}" ${state.classificationLocked?'disabled':''}>${esc(value)}</button>`).join('');
}
function classificationFeedback(item,correct){
 return `<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${correct?'Correct classification':'Review the airflow-effort relationship'} · Teaching pattern: ${esc(item.question.answer)}</strong><span>${esc(item.question.rationale||'Use airflow and effort together before assigning the pattern.')}</span></div>`;
}
function evidenceBlock(item){
 const ev=item.evidence,correct=state.evidenceLocked&&state.evidence===ev.answer;
 return `<div class="scoring-respiratory-proof"><h4>Prove the classification</h4><p>Which cross-channel relationship is the strongest reason for this teaching label?</p><div class="scoring-respiratory-evidence">${ev.options.map(value=>`<button class="visual-choice${state.evidence===value?' selected':''}" type="button" data-respiratory-evidence="${esc(value)}" ${state.evidenceLocked?'disabled':''}>${esc(value)}</button>`).join('')}</div>${!state.evidenceLocked?`<div class="visual-question-actions"><button class="btn primary" type="button" data-respiratory-check-evidence ${state.evidence?'':'disabled'}>Check evidence</button></div>`:`<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${correct?'Evidence matched':'Review the corroborating channels'}</strong><span>${esc(ev.rationale)}</span></div><p class="scoring-source-note"><strong>Source boundary:</strong> This practicum uses app-authored respiratory morphology supported by the project references. Current official scoring criteria and facility policy remain authoritative.</p>${nextControls()}`}</div>`;
}
function nextControls(){return `<div class="visual-question-actions">${state.index<state.cases.length-1?'<button class="btn primary" type="button" data-respiratory-next>Next respiratory case</button>':'<button class="btn primary" type="button" data-respiratory-finish>Finish respiratory review</button>'}</div>`;}
function renderCanvas(study){
 const canvas=host.querySelector('[data-respiratory-canvas]');if(canvas&&state.renderer)state.renderer.render(canvas,study);
}
function markStation(){
 const box=document.querySelector('[data-scoring-station="respiratory-classification"]');
 if(box&&!box.checked){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}
}
function finish(){
 markStation();
 host.innerHTML=`<div class="scoring-respiratory-result"><div class="eyebrow">Station 4 complete</div><h2>${state.classCorrect}/${state.cases.length} classifications correct · ${state.evidenceCorrect}/${state.cases.length} evidence checks correct</h2><p>You completed all four respiratory pattern cases. The Scoring Lab station has been marked complete; use the current AASM scoring manual and facility policy for rule-sensitive clinical thresholds.</p><div class="actions"><button class="btn primary" type="button" data-respiratory-restart>Practice respiratory cases again</button></div></div>`;
}
function start(){state.index=0;state.classCorrect=0;state.evidenceCorrect=0;resetCase();renderCase();}
document.addEventListener('click',event=>{
 if(!host.contains(event.target)&&!event.target.closest('[data-respiratory-start]'))return;
 if(event.target.closest('[data-respiratory-start]')||event.target.closest('[data-respiratory-restart]')){start();return;}
 const classButton=event.target.closest('[data-respiratory-class]');if(classButton&&!state.classificationLocked){state.classification=classButton.getAttribute('data-respiratory-class');renderCase();return;}
 if(event.target.closest('[data-respiratory-check-class]')&&!state.classificationLocked&&state.classification){const item=current();state.classificationLocked=true;if(item&&state.classification===item.question.answer)state.classCorrect+=1;renderCase();return;}
 const evidenceButton=event.target.closest('[data-respiratory-evidence]');if(evidenceButton&&!state.evidenceLocked){state.evidence=evidenceButton.getAttribute('data-respiratory-evidence');renderCase();return;}
 if(event.target.closest('[data-respiratory-check-evidence]')&&!state.evidenceLocked&&state.evidence){const item=current();state.evidenceLocked=true;if(item&&state.evidence===item.evidence.answer)state.evidenceCorrect+=1;renderCase();return;}
 if(event.target.closest('[data-respiratory-next]')&&state.evidenceLocked&&state.index<state.cases.length-1){state.index+=1;resetCase();renderCase();return;}
 if(event.target.closest('[data-respiratory-finish]')&&state.evidenceLocked){finish();}
});
let resizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const item=current();if(item&&host.querySelector('[data-respiratory-canvas]'))renderCanvas(item.study);},150);});
load().catch(error=>{host.hidden=false;host.innerHTML=`<div class="notice error"><strong>Respiratory scoring practicum could not load.</strong> ${esc(error.message)}</div>`;if(stageRenderer)window.RPSGTVisualPSGRenderer=stageRenderer;});
})();
