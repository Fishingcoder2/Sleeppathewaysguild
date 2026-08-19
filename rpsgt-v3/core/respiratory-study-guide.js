(function(){
'use strict';

const engine=window.RPSGTRespiratoryLabEngine;
const stationHost=document.querySelector('[data-respiratory-stations]');
if(!engine||!stationHost)return;

const FUNDAMENTALS='Mattice, C. D., Brooks, R., & Lee-Chiong, T. L. (Eds.). (2020). Fundamentals of sleep technology (3rd ed.). Wolters Kluwer.';
const AASM='American Academy of Sleep Medicine. (2023). The AASM manual for the scoring of sleep and associated events: Rules, terminology and technical specifications (Version 3). American Academy of Sleep Medicine.';
const AAST='American Association of Sleep Technologists. (n.d.). Learning Center.';
const AASM_URL='https://aasm.org/clinical-resources/scoring-manual/';
const AAST_URL='https://aastweb.org/education-events/learning-center/';

const GUIDE={
  'signal-inventory':{
    title:'Respiratory signal inventory and purpose',
    focus:'Know what each channel contributes before you interpret an event.',
    points:[
      'Treat the respiratory montage as a team of signals. Airflow, effort, oxygen, carbon dioxide, snore, position, EEG/arousal context, and signal quality answer different questions.',
      'Separate primary respiratory evidence from supporting context. One channel can suggest a problem, but the full pattern supports the decision.',
      'Before naming physiology, ask whether the channel is technically believable and whether nearby channels agree with the story.'
    ],
    apply:'Nasal pressure suddenly falls while thermal airflow, effort, oxygen, and the surrounding channels remain stable. What should you consider before calling a respiratory event?',
    answer:'First consider signal loss, cannula displacement, or another technical problem. Re-check the airflow pathway and compare the other channels before classifying physiology.',
    recap:[
      'Explain the purpose of the major respiratory channels.',
      'Distinguish primary evidence from supporting context.',
      'Check signal credibility before interpreting an event.'
    ],
    chapters:'Chapters 34, 37, and 39'
  },
  'airflow-pathway':{
    title:'Airflow sensors and signal behavior',
    focus:'Compare thermal airflow and nasal pressure instead of treating them as interchangeable.',
    points:[
      'Thermal airflow and nasal pressure provide different views of breathing. Learn what each sensor is designed to show and how its signal can fail.',
      'Follow the pathway from patient interface to sensor, cable, input, and displayed channel when an airflow signal looks questionable.',
      'Flow shape, amplitude change, and signal loss should be interpreted with respiratory effort and the surrounding physiologic context.'
    ],
    apply:'The nasal-pressure channel shows a flattened inspiratory shape while thermal airflow remains present and effort gradually increases. What relationship deserves your attention?',
    answer:'Focus on the relationship between inspiratory flow limitation and increasing effort, then use EEG/arousal and other required context before assigning an event label.',
    recap:[
      'Describe the different teaching roles of thermal airflow and nasal pressure.',
      'Recognize common airflow-signal failure patterns.',
      'Use airflow shape together with effort and context.'
    ],
    chapters:'Chapters 37 and 39'
  },
  'effort-pathway':{
    title:'Thoracic and abdominal effort',
    focus:'Use the effort belts to decide whether respiratory drive is absent, preserved, increasing, or paradoxical.',
    points:[
      'Compare thoracic and abdominal movement with airflow rather than looking at either belt in isolation.',
      'Preserved or increasing effort during reduced or absent airflow supports a different physiologic story than simultaneous loss of airflow and effort.',
      'Poor belt placement, displacement, looseness, saturation, or artifact can imitate a physiologic change and should be considered before interpretation.'
    ],
    apply:'Airflow becomes nearly absent while thoracic and abdominal effort continue and become more prominent. Which broad physiologic relationship does that suggest?',
    answer:'That pattern supports an obstructive relationship: airflow is lost while respiratory effort persists. The complete tracing and current scoring rules determine the final classification.',
    recap:[
      'Compare effort with airflow across the same time window.',
      'Recognize preserved, absent, increasing, and paradoxical effort patterns.',
      'Separate true effort changes from belt artifact.'
    ],
    chapters:'Chapters 37 and 39'
  },
  'oxygen-carbon-dioxide':{
    title:'Oximetry and carbon-dioxide context',
    focus:'Use gas-exchange trends as timed context, not as a substitute for the respiratory waveform.',
    points:[
      'SpO₂ changes may lag behind the airflow and effort event, so timing matters when linking a desaturation to preceding physiology.',
      'Pulse-oximeter artifact, poor perfusion, motion, and sensor problems can create misleading values or trends.',
      'Carbon-dioxide monitoring adds ventilation context. Interpret the trend, signal quality, patient factors, and study purpose together.'
    ],
    apply:'A respiratory change ends, and the SpO₂ nadir occurs later. Should the delayed oxygen change automatically be treated as unrelated?',
    answer:'No. Oxygen response can be delayed. Compare the timing and shape of the respiratory event, the oxygen trend, and the surrounding study context before deciding whether they are related.',
    recap:[
      'Recognize the delayed timing of oxygen response.',
      'Check oximetry quality before trusting a saturation change.',
      'Use CO₂ as ventilation context when it is part of the study.'
    ],
    chapters:'Chapters 8, 37, and 39'
  },
  'snore-position-context':{
    title:'Snore, position, and event context',
    focus:'Use snore and body position as supporting evidence rather than isolated proof.',
    points:[
      'Snore can strengthen an obstructive interpretation but does not classify an event by itself.',
      'Body position can change the frequency or severity of respiratory events and should be interpreted across a meaningful segment of the study.',
      'Sleep stage, arousal timing, PAP status, oxygen, and neighboring events can change the meaning of the same respiratory-looking pattern.'
    ],
    apply:'Events become more frequent while the patient is supine and snoring increases. What is the best use of that information?',
    answer:'Treat position and snore as supporting context. Confirm the respiratory classification from airflow, effort, oxygen/arousal context, and the current scoring rules.',
    recap:[
      'Use snore as supporting context rather than a stand-alone diagnosis.',
      'Relate respiratory patterns to body position across time.',
      'Consider stage and surrounding study context before final classification.'
    ],
    chapters:'Chapters 37 and 39'
  },
  'event-classification':{
    title:'Respiratory-event recognition and classification',
    focus:'Integrate the full signal pathway before naming the event.',
    points:[
      'Start with airflow, then compare respiratory effort, oxygen, EEG/arousal context, duration, and surrounding sleep physiology.',
      'Use relationships between channels to distinguish obstructive, central, mixed, reduced-flow, and flow-limited patterns.',
      'Rule-sensitive definitions and thresholds belong to the current AASM scoring manual; the teaching tracings in this lab are practice schematics, not replacements for the manual.'
    ],
    apply:'Airflow and effort both fall together during the same interval. Why is that different from absent airflow with continued effort?',
    answer:'The first relationship suggests reduced respiratory drive or central physiology, while the second supports obstruction. Final scoring still depends on the full event and the current applicable rules.',
    recap:[
      'Use channel relationships to organize respiratory-event classification.',
      'Differentiate obstructive, central, mixed, and flow-limited teaching patterns.',
      'Verify current rule thresholds in the current AASM scoring manual.'
    ],
    chapters:'Chapter 39'
  },
  'artifact-correction':{
    title:'Artifact correction and documentation',
    focus:'Trace questionable signals through the pathway, correct what is safely correctable, and document meaningful changes.',
    points:[
      'When a signal looks wrong, work from the patient and sensor through the lead, cable, input, and acquisition pathway instead of immediately changing filters.',
      'Compare neighboring channels and timing to decide whether the disturbance is local, shared, physiologic, or environmental.',
      'After a meaningful correction, preserve the study story with clear documentation according to facility policy and the clinical situation.'
    ],
    apply:'A respiratory channel suddenly becomes noisy while the other respiratory and physiologic channels remain stable. What is the better first approach: hide it with filtering or troubleshoot the pathway?',
    answer:'Troubleshoot the pathway first. Confirm the patient/sensor connection and signal integrity before using display or filter changes that could hide useful information.',
    recap:[
      'Troubleshoot from patient/sensor through the signal pathway.',
      'Use neighboring channels to separate artifact from physiology.',
      'Document meaningful corrections and changes.'
    ],
    chapters:'Chapters 34–37 and Appendix A'
  }
};

const state={stationId:null,step:0,revealed:new Set(),launcher:null,bypass:false,finished:false};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function stations(){return engine.STATIONS||[];}
function stationIndex(id){return stations().findIndex(item=>item.id===String(id));}
function guide(id){return GUIDE[String(id)]||null;}
function stationButton(id){return [...stationHost.querySelectorAll('[data-respiratory-station]')].find(button=>button.dataset.respiratoryStation===String(id))||null;}
function isComplete(id){const button=stationButton(id);return Boolean(button&&(button.classList.contains('complete')||button.getAttribute('aria-pressed')==='true'));}

function ensureCss(){
  if(document.querySelector('link[data-respiratory-study-guide-css]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='assets/respiratory-study-guide.css';
  link.dataset.respiratoryStudyGuideCss='true';
  document.head.appendChild(link);
}

function decorateStations(){
  const section=stationHost.closest('.section');
  const heading=section?.querySelector('.section-head h2');
  const intro=section?.querySelector('.report-intro');
  const status=section?.querySelector('.section-head .status');
  if(heading)heading.textContent='Walk through the respiratory signal pathway';
  if(intro)intro.textContent='Open each guided station. Study the signal relationship, apply it to a short scenario, review what you should now understand, and use the suggested references for deeper self-guided study. Stations are recorded automatically as you complete the walkthrough.';
  if(status)status.textContent='Guided review';
  stationHost.querySelectorAll('[data-respiratory-station]').forEach((button,index)=>{
    button.disabled=false;
    const action=button.querySelector('.respiratory-station-action');
    const complete=button.classList.contains('complete')||button.getAttribute('aria-pressed')==='true';
    if(action)action.textContent=complete?'Review complete · Open again':'Open guided review';
    button.setAttribute('aria-label',`${index+1}. ${stations()[index]?.title||'Respiratory station'}. ${complete?'Review complete. Open again.':'Open guided review.'}`);
  });
}

function ensureRoot(){
  let root=document.querySelector('[data-respiratory-study-guide]');
  if(root)return root;
  root=document.createElement('div');
  root.className='respiratory-study-guide-backdrop';
  root.dataset.respiratoryStudyGuide='true';
  root.hidden=true;
  document.body.appendChild(root);
  return root;
}

function sourceMarkup(item){
  const refs=[
    `<li><span>${esc(FUNDAMENTALS)} <strong>Suggested sections:</strong> ${esc(item.chapters)}.</span></li>`,
    `<li><a href="${AASM_URL}" target="_blank" rel="noopener">${esc(AASM)}</a></li>`,
    `<li><a href="${AAST_URL}" target="_blank" rel="noopener">${esc(AAST)}</a> <span>Search for respiratory, polysomnography, scoring, and troubleshooting education appropriate to your learning needs.</span></li>`
  ];
  return `<div class="respiratory-study-sources"><h3>Further self-guided study</h3><p>Use current editions and official guidance, and compare these teaching schematics with authentic PSG tracings whenever possible.</p><ol>${refs.join('')}</ol></div>`;
}

function tabsMarkup(){
  return stations().map((station,index)=>{
    const current=station.id===state.stationId;
    const complete=isComplete(station.id);
    return `<button class="respiratory-study-tab ${current?'current':''} ${complete?'complete':''}" type="button" data-respiratory-study-station="${esc(station.id)}" aria-current="${current?'true':'false'}"><span>${complete?'✓':index+1}</span>${esc(station.title)}</button>`;
  }).join('');
}

function studyStep(item){
  return `<div class="respiratory-study-step"><div class="eyebrow">Step 1 · Guided review</div><h3>${esc(item.focus)}</h3><div class="respiratory-study-points">${item.points.map((point,index)=>`<article><span>${index+1}</span><p>${esc(point)}</p></article>`).join('')}</div></div>`;
}

function applyStep(item){
  const revealed=state.revealed.has(state.stationId);
  return `<div class="respiratory-study-step"><div class="eyebrow">Step 2 · Apply the relationship</div><h3>Think through this scenario</h3><div class="respiratory-study-scenario"><p>${esc(item.apply)}</p>${revealed?`<div class="respiratory-study-answer"><strong>Teaching answer</strong><p>${esc(item.answer)}</p></div>`:'<button class="btn primary" type="button" data-respiratory-study-reveal>Reveal teaching answer</button>'}</div></div>`;
}

function recapStep(item){
  return `<div class="respiratory-study-step"><div class="eyebrow">Step 3 · What you reviewed</div><h3>You should now be able to:</h3><ul class="respiratory-study-recap">${item.recap.map(point=>`<li>${esc(point)}</li>`).join('')}</ul>${sourceMarkup(item)}</div>`;
}

function finishedMarkup(){
  const completeCount=stations().filter(station=>isComplete(station.id)).length;
  return `<section class="respiratory-study-modal" role="dialog" aria-modal="true" aria-labelledby="respiratory-study-title"><header class="respiratory-study-head"><div><span class="eyebrow">Guided respiratory review</span><h2 id="respiratory-study-title">You completed the seven-station walkthrough</h2></div><button class="visual-modal-close" type="button" data-respiratory-study-close aria-label="Close guided respiratory review">×</button></header><div class="respiratory-study-finish"><span class="status green">${completeCount}/7 stations reviewed</span><h3>What you reviewed</h3><ul>${stations().map(station=>`<li><strong>${esc(station.title)}</strong><span>${esc(guide(station.id)?.focus||station.focus)}</span></li>`).join('')}</ul><div class="respiratory-study-final-note"><strong>Next learning step</strong><p>Use the respiratory pattern walkthrough and visual challenge to apply these relationships, then use authentic PSG examples from current textbooks and official educational resources to strengthen real-world pattern recognition.</p></div><div class="actions"><button class="btn primary" type="button" data-respiratory-study-close>Return to Respiratory Lab</button></div></div></section>`;
}

function render(){
  const root=ensureRoot();
  if(state.finished){root.innerHTML=finishedMarkup();root.hidden=false;document.body.classList.add('respiratory-study-open');return;}
  const item=guide(state.stationId);if(!item)return;
  const index=stationIndex(state.stationId);
  const step=state.step===0?studyStep(item):state.step===1?applyStep(item):recapStep(item);
  const canAdvance=state.step!==1||state.revealed.has(state.stationId);
  const primary=state.step<2
    ?`<button class="btn primary" type="button" data-respiratory-study-next-step ${canAdvance?'':'disabled'}>${state.step===0?'Continue to scenario':'Continue to recap'} →</button>`
    :`<button class="btn primary" type="button" data-respiratory-study-complete>${index===stations().length-1?'Finish guided review':'Continue to next station'} →</button>`;
  root.innerHTML=`<section class="respiratory-study-modal" role="dialog" aria-modal="true" aria-labelledby="respiratory-study-title"><header class="respiratory-study-head"><div><span class="eyebrow">Guided respiratory study · Station ${index+1} of ${stations().length}</span><h2 id="respiratory-study-title">${esc(item.title)}</h2></div><button class="visual-modal-close" type="button" data-respiratory-study-close aria-label="Close guided respiratory review">×</button></header><nav class="respiratory-study-tabs" aria-label="Respiratory study stations">${tabsMarkup()}</nav><div class="respiratory-study-progress" aria-label="Station review steps"><span class="${state.step===0?'current':state.step>0?'complete':''}">1 Study</span><span class="${state.step===1?'current':state.step>1?'complete':''}">2 Apply</span><span class="${state.step===2?'current':''}">3 Recap</span></div><main class="respiratory-study-main">${step}</main><footer class="respiratory-study-footer"><button class="btn secondary" type="button" data-respiratory-study-back ${state.step===0?'disabled':''}>← Previous</button>${primary}</footer></section>`;
  root.hidden=false;
  document.body.classList.add('respiratory-study-open');
  requestAnimationFrame(()=>root.querySelector('.respiratory-study-tab.current')?.scrollIntoView({inline:'center',block:'nearest'}));
}

function openStation(id,launcher){
  if(!guide(id))return;
  state.stationId=id;
  state.step=0;
  state.finished=false;
  state.launcher=launcher||document.activeElement;
  render();
}

function close(){
  const root=ensureRoot();
  root.hidden=true;
  document.body.classList.remove('respiratory-study-open');
  decorateStations();
  if(state.launcher&&typeof state.launcher.focus==='function')requestAnimationFrame(()=>state.launcher.focus());
}

function markComplete(id){
  const button=stationButton(id);
  if(!button||isComplete(id))return;
  state.bypass=true;
  button.click();
  setTimeout(decorateStations,0);
}

function completeAndContinue(){
  const id=state.stationId;
  const index=stationIndex(id);
  markComplete(id);
  if(index>=stations().length-1){
    setTimeout(()=>{state.finished=true;render();},0);
    return;
  }
  state.stationId=stations()[index+1].id;
  state.step=0;
  render();
}

ensureCss();

document.addEventListener('DOMContentLoaded',decorateStations,{once:true});
if(document.readyState!=='loading')decorateStations();

document.addEventListener('click',()=>setTimeout(decorateStations,0));
document.addEventListener('submit',()=>setTimeout(decorateStations,0));

stationHost.addEventListener('click',event=>{
  const button=event.target.closest('[data-respiratory-station]');
  if(!button)return;
  if(state.bypass){state.bypass=false;return;}
  event.preventDefault();
  event.stopImmediatePropagation();
  openStation(button.dataset.respiratoryStation,button);
},true);

document.addEventListener('click',event=>{
  const tab=event.target.closest('[data-respiratory-study-station]');
  if(tab){state.stationId=tab.dataset.respiratoryStudyStation;state.step=0;state.finished=false;render();return;}
  if(event.target.closest('[data-respiratory-study-close]')){close();return;}
  if(event.target.closest('[data-respiratory-study-reveal]')){state.revealed.add(state.stationId);render();return;}
  if(event.target.closest('[data-respiratory-study-next-step]')){if(state.step===1&&!state.revealed.has(state.stationId))return;state.step=Math.min(2,state.step+1);render();return;}
  if(event.target.closest('[data-respiratory-study-back]')){state.step=Math.max(0,state.step-1);render();return;}
  if(event.target.closest('[data-respiratory-study-complete]')){completeAndContinue();}
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!ensureRoot().hidden){event.stopImmediatePropagation();close();}
},true);

})();