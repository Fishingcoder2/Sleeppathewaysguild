(function(){
'use strict';
const host=document.querySelector('[data-report-reading-practicum]');
if(!host)return;
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const n=(value,digits=1)=>Number(value).toFixed(digits);
const state={diagnostic:null,titration:null,questions:[],index:0,selected:null,locked:false,correct:0};

async function load(){
 const [dRes,tRes]=await Promise.all([
  fetch('data/visual/sample-psg-report.json',{cache:'no-store'}),
  fetch('data/visual/sample-pap-titration-report.json',{cache:'no-store'})
 ]);
 if(!dRes.ok||!tRes.ok)throw new Error('One or both fictional report data files could not be loaded.');
 const [diagnostic,titration]=await Promise.all([dRes.json(),tRes.json()]);
 if(!diagnostic.meta?.fictional||!titration.meta?.fictional)throw new Error('Fictional-report boundary is missing.');
 state.diagnostic=diagnostic;state.titration=titration;state.questions=buildQuestions(diagnostic,titration);render();
}

function buildQuestions(d,t){
 const dr=d.respiratory,tr=t.therapy,ox=d.oxygen;
 return [
  {
   report:'diagnostic',
   title:'Technologist summary vs interpretation',
   prompt:'Which statement is the best example of a technologist-style measured finding rather than a physician diagnostic impression?',
   options:[
    `The synthetic SpO₂ nadir was ${ox.nadirPercent}%.`,
    'This patient has moderate obstructive sleep apnea.',
    'CPAP should be prescribed at a specific setting.',
    'The patient should undergo a particular treatment plan.'
   ],
   answer:`The synthetic SpO₂ nadir was ${ox.nadirPercent}%.`,
   rationale:'A technologist-style report describes recorded and scored measurements. Diagnostic synthesis and treatment recommendations belong to the interpreting clinician in this teaching example.'
  },
  {
   report:'diagnostic',
   title:'Read the positional pattern',
   prompt:'What does the fictional diagnostic report show when supine and non-supine respiratory indices are compared?',
   options:[
    `Respiratory disturbance is greater supine (${n(dr.supineAhi)}/h) than non-supine (${n(dr.nonSupineAhi)}/h).`,
    `Respiratory disturbance is lower supine (${n(dr.supineAhi)}/h) than non-supine (${n(dr.nonSupineAhi)}/h).`,
    'The report contains no positional comparison.',
    'The two positional indices are identical.'
   ],
   answer:`Respiratory disturbance is greater supine (${n(dr.supineAhi)}/h) than non-supine (${n(dr.nonSupineAhi)}/h).`,
   rationale:'The synthetic report lists a higher supine AHI than non-supine AHI. The task is to describe the measured pattern before moving to clinical interpretation.'
  },
  {
   report:'titration',
   title:'Follow therapy response',
   prompt:'Across the selected fictional CPAP pressure segments, which trend is shown?',
   options:[
    `Residual AHI decreases from ${n(tr.pressureSegments[0].residualAhi)}/h at ${tr.pressureSegments[0].pressure} to ${n(tr.pressureSegments[3].residualAhi)}/h at ${tr.pressureSegments[3].pressure}.`,
    'Residual AHI progressively increases as pressure rises.',
    'Oxygenation worsens at every higher pressure.',
    'No respiratory-response data are shown by pressure.'
   ],
   answer:`Residual AHI decreases from ${n(tr.pressureSegments[0].residualAhi)}/h at ${tr.pressureSegments[0].pressure} to ${n(tr.pressureSegments[3].residualAhi)}/h at ${tr.pressureSegments[3].pressure}.`,
   rationale:'The titration table is designed to teach response tracking: pressure changes are interpreted alongside residual events, oxygenation, sleep stage/position, and interface observations.'
  },
  {
   report:'titration',
   title:'Evaluate final-pressure context',
   prompt:'Which detail strengthens the teaching example that the final CPAP segment sampled an important sleep/position context?',
   options:[
    `${n(tr.finalPressureSupineRemMinutes)} minutes of supine REM were represented at the final teaching pressure.`,
    'Only wake was recorded at the final pressure.',
    'No REM sleep was represented anywhere in the titration.',
    'The report intentionally omits sleep stage and body position.'
   ],
   answer:`${n(tr.finalPressureSupineRemMinutes)} minutes of supine REM were represented at the final teaching pressure.`,
   rationale:'The fictional report explicitly notes supine REM at the final pressure. That context helps a learner understand why a pressure-response segment is more informative than a pressure number alone.'
  },
  {
   report:'comparison',
   title:'Know the reporting roles',
   prompt:'Which task is modeled in the fictional reading-physician section rather than the technologist-style summary?',
   options:[
    'Synthesizing measured findings into impressions and recommendations.',
    'Listing the oxygen nadir exactly as measured.',
    'Recording the pressure used during a titration segment.',
    'Documenting how many minutes of sleep occurred at a setting.'
   ],
   answer:'Synthesizing measured findings into impressions and recommendations.',
   rationale:'The example intentionally separates objective technical reporting from physician synthesis. The physician section converts measurements and context into an impression and example recommendations.'
  },
  {
   report:'comparison',
   title:'Keep the current-rule boundary',
   prompt:'What should a learner use for real scoring and PAP-titration decisions instead of treating these fictional examples or the older textbook as the current rule set?',
   options:[
    'Current official guidance, physician orders, device instructions, and facility protocol.',
    'The fictional report values exactly as written.',
    'A single historical textbook without checking current guidance.',
    'The workstation event palette by itself.'
   ],
   answer:'Current official guidance, physician orders, device instructions, and facility protocol.',
   rationale:'Both teaching reports explicitly preserve this boundary. They demonstrate report-reading structure and reasoning, not a substitute for current clinical standards or local protocol.'
  }
 ];
}

function diagnosticSnapshot(){const d=state.diagnostic,r=d.respiratory,o=d.oxygen;return `<div class="report-practicum-snapshot">${metric('AHI',n(r.ahi)+' /h')}${metric('RDI',n(r.rdi)+' /h')}${metric('Supine AHI',n(r.supineAhi)+' /h')}${metric('Non-supine AHI',n(r.nonSupineAhi)+' /h')}${metric('REM AHI',n(r.remAhi)+' /h')}${metric('SpO₂ nadir',o.nadirPercent+'%')}</div>`;}
function titrationSnapshot(){const t=state.titration.therapy;return `<div class="report-practicum-snapshot">${metric('Mode',t.mode)}${metric('Start',t.startingPressure)}${metric('Final',t.finalPressure)}${metric('Final residual AHI',n(t.finalPressureResidualAhi)+' /h')}${metric('Final SpO₂ nadir',t.finalPressureNadirSpo2+'%')}${metric('Supine REM at final',n(t.finalPressureSupineRemMinutes)+' min')}</div><table class="report-practicum-table"><thead><tr><th>Pressure</th><th>Sleep</th><th>Residual AHI</th><th>SpO₂ nadir</th></tr></thead><tbody>${t.pressureSegments.map(seg=>`<tr><td>${esc(seg.pressure)}</td><td>${n(seg.sleepMinutes)} min</td><td>${n(seg.residualAhi)} /h</td><td>${seg.spo2Nadir}%</td></tr>`).join('')}</tbody></table>`;}
function metric(label,value){return `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;}
function referenceFor(question){if(question.report==='diagnostic')return `<div class="report-practicum-head"><h2>Fictional diagnostic PSG</h2><span>Synthetic report snapshot</span></div><div class="report-practicum-body">${diagnosticSnapshot()}<div class="report-practicum-toolbar"><a class="btn secondary" href="sample-psg-report.html">Open full diagnostic report</a></div></div>`;if(question.report==='titration')return `<div class="report-practicum-head"><h2>Fictional PAP titration</h2><span>Synthetic pressure-response snapshot</span></div><div class="report-practicum-body">${titrationSnapshot()}<div class="report-practicum-toolbar"><a class="btn secondary" href="sample-pap-titration-report.html">Open full titration report</a></div></div>`;return `<div class="report-practicum-head"><h2>Compare report roles</h2><span>Diagnostic + titration</span></div><div class="report-practicum-body"><p>Use both examples together. The technical sections describe measurements and study observations; the fictional physician sections model synthesis into impressions and recommendations.</p><div class="report-practicum-toolbar"><a class="btn secondary" href="sample-psg-report.html">Diagnostic example</a><a class="btn secondary" href="sample-pap-titration-report.html">Titration example</a></div></div>`;}

function render(){
 if(state.index>=state.questions.length){renderResult();return;}
 const q=state.questions[state.index];
 host.innerHTML=`<section class="report-practicum-hero"><div><div class="eyebrow">Report Reading Practicum · Fictional examples</div><h1>Read the report before you interpret it</h1><p>Compare the fixed synthetic diagnostic PSG and PAP titration examples. Identify measured findings, follow treatment response, and keep the technologist/physician reporting boundary clear.</p><div class="report-practicum-toolbar"><a class="btn secondary" href="reports.html">Reports Center</a><a class="btn secondary" href="lab-scoring.html">PSG Workstation</a></div></div><aside class="report-practicum-source"><strong>Source / scope</strong><small>Report structure is informed by Robertson, B., Marshall, B., & Carno, M. A. (2014). <em>Polysomnography for the sleep technologist</em>. Elsevier. Exact current scoring/titration decisions require current official guidance, physician orders, device instructions, and facility protocol.</small></aside></section><div class="report-practicum-boundary"><strong>Fictional teaching boundary:</strong> All patients, values, pressure settings, interpretations, and recommendations in this practicum are synthetic. This activity does not create or modify clinical records or learner progress.</div><div class="report-practicum-progress">${metric('Question',`${state.index+1} / ${state.questions.length}`)}${metric('First-pass correct',String(state.correct))}${metric('Activity','Session only')}</div><div class="report-practicum-grid"><section class="report-practicum-reference">${referenceFor(q)}</section><section class="report-practicum-question"><div class="report-practicum-head"><h3>${esc(q.title)}</h3><span>Commit before feedback</span></div><div class="report-practicum-body"><p class="report-practicum-prompt">${esc(q.prompt)}</p><div class="report-practicum-options">${q.options.map(option=>`<button type="button" class="report-practicum-option${state.selected===option?' selected':''}${state.locked&&option===q.answer?' correct':''}${state.locked&&state.selected===option&&option!==q.answer?' incorrect':''}" data-report-practicum-answer="${esc(option)}" ${state.locked?'disabled':''}>${esc(option)}</button>`).join('')}</div>${feedback(q)}<div class="report-practicum-actions">${state.locked?(state.index<state.questions.length-1?'<button class="btn primary" type="button" data-report-practicum-next>Next question</button>':'<button class="btn primary" type="button" data-report-practicum-next>Finish practicum</button>'):'<button class="btn primary" type="button" data-report-practicum-check>Check answer</button>'}<button class="btn secondary" type="button" data-report-practicum-restart>Restart</button></div></div></section></div><div class="report-practicum-footer"><strong>Teaching goal:</strong> report reading is not just locating a number. Read the study type, the denominator/context behind the number, the stage/position or treatment setting in which it occurred, and who is responsible for turning the technical findings into a clinical interpretation.</div>`;
}
function feedback(q){if(!state.locked)return '';const ok=state.selected===q.answer;return `<div class="report-practicum-feedback${ok?'':' retry'}"><strong>${ok?'Correct':'Review the report'}</strong><br>${esc(q.rationale)}</div>`;}
function renderResult(){const pct=Math.round(state.correct/state.questions.length*100);host.innerHTML=`<section class="report-practicum-result"><div class="eyebrow">Report Reading Practicum complete</div><h1>Diagnostic PSG ↔ PAP titration</h1><strong class="score">${state.correct}/${state.questions.length} · ${pct}%</strong><p>You reviewed measured findings, positional pattern, pressure response, final-pressure context, technologist-versus-physician reporting roles, and the current-guidance boundary.</p><div class="report-practicum-toolbar" style="justify-content:center"><button class="btn primary" type="button" data-report-practicum-restart>Practice again</button><a class="btn secondary" href="sample-psg-report.html">Diagnostic report</a><a class="btn secondary" href="sample-pap-titration-report.html">PAP titration report</a><a class="btn secondary" href="reports.html">Reports Center</a></div></section>`;}

host.addEventListener('click',event=>{
 const answer=event.target.closest('[data-report-practicum-answer]');if(answer&&!state.locked){state.selected=answer.dataset.reportPracticumAnswer;render();return;}
 if(event.target.closest('[data-report-practicum-check]')){if(!state.selected)return;state.locked=true;if(state.selected===state.questions[state.index].answer)state.correct+=1;render();return;}
 if(event.target.closest('[data-report-practicum-next]')){state.index+=1;state.selected=null;state.locked=false;render();return;}
 if(event.target.closest('[data-report-practicum-restart]')){state.index=0;state.selected=null;state.locked=false;state.correct=0;render();}
});
load().catch(error=>{host.innerHTML=`<div class="notice error"><strong>Report Reading Practicum could not load.</strong> ${esc(error.message)}</div>`;});
})();