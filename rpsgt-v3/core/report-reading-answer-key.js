(function(){
'use strict';
const host=document.querySelector('[data-report-reading-answer-key]');
if(!host)return;
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const n=(value,digits=1)=>Number(value).toFixed(digits);
async function load(){
 const [dRes,tRes]=await Promise.all([
  fetch('data/visual/sample-psg-report.json',{cache:'no-store'}),
  fetch('data/visual/sample-pap-titration-report.json',{cache:'no-store'})
 ]);
 if(!dRes.ok||!tRes.ok)throw new Error('Fictional report data could not be loaded.');
 const [d,t]=await Promise.all([dRes.json(),tRes.json()]);
 if(!d.meta?.fictional||!t.meta?.fictional)throw new Error('Fictional-report boundary is missing.');
 render(d,t);
}
function evidence(rows){return `<div class="answer-key-evidence">${rows.map(row=>`<div><span>${esc(row[0])}</span><strong>${esc(row[1])}</strong></div>`).join('')}</div>`;}
function card(number,title,report,rows,conclusion,limit){return `<article class="answer-key-card" data-answer-key-item="${number}"><header><div><span>Item ${number}</span><h2>${esc(title)}</h2></div><span>${esc(report)}</span></header><div class="answer-key-body"><h3>Where to look</h3>${evidence(rows)}<div class="answer-key-conclusion"><strong>Supported conclusion:</strong> ${esc(conclusion)}</div><div class="answer-key-limit"><strong>Do not over-interpret:</strong> ${esc(limit)}</div></div></article>`;}
function render(d,t){
 const dr=d.respiratory,ox=d.oxygen,tr=t.therapy;
 const apneaHypopnea=d.respiratory.obstructiveApneas+d.respiratory.centralApneas+d.respiratory.mixedApneas+d.respiratory.hypopneas;
 const tstHours=d.study.totalSleepMinutes/60;
 const calcAhi=apneaHypopnea/tstHours;
 const calcRdi=(apneaHypopnea+d.respiratory.reras)/tstHours;
 host.innerHTML=`<section class="answer-key-hero"><div><div class="eyebrow">Instructor-style answer key · fictional reports</div><h1>Show the evidence before the conclusion</h1><p>Use this key after the Report Reading Practicum. Every answer is tied to an exact synthetic field or statement in the fictional diagnostic PSG or PAP titration example.</p><div class="answer-key-actions"><a class="btn primary" href="report-reading-practicum.html">Return to practicum</a><a class="btn secondary" href="sample-psg-report.html">Diagnostic report</a><a class="btn secondary" href="sample-pap-titration-report.html">PAP titration report</a><a class="btn secondary" href="reports.html">Reports Center</a></div></div><aside class="card"><strong>Source / scope</strong><p>Robertson, B., Marshall, B., & Carno, M. A. (2014). <em>Polysomnography for the sleep technologist</em>. Elsevier.</p><small>Exact current scoring and titration decisions require current official guidance, physician orders, device instructions, and facility protocol.</small></aside></section>
<div class="answer-key-boundary"><strong>Fictional teaching boundary:</strong> All patient identities, values, pressure settings, interpretations, and recommendations used here are synthetic. This key teaches report-reading logic and does not create clinical or learner-progress records.</div>
<div class="answer-key-grid">
${card(1,'Technologist summary vs interpretation','Diagnostic PSG',[
 ['Report section','Oxygenation / Arousals'],['Exact field',`SpO₂ nadir = ${ox.nadirPercent}%`],['Role clue','A directly measured/scored value is being reported.']
],`“The synthetic SpO₂ nadir was ${ox.nadirPercent}%” is a technologist-style measured finding.`,`A measured nadir alone does not authorize the learner or technologist to diagnose a disorder or prescribe treatment.`)}
${card(2,'Read the positional pattern','Diagnostic PSG',[
 ['Report section','Respiratory Summary'],['Supine AHI',`${n(dr.supineAhi)} /h`],['Non-supine AHI',`${n(dr.nonSupineAhi)} /h`]
],`Respiratory disturbance is greater supine (${n(dr.supineAhi)}/h) than non-supine (${n(dr.nonSupineAhi)}/h).`,`Describe the measured positional difference first; do not independently convert that pattern into a treatment recommendation.`)}
${card(3,'Follow therapy response','PAP titration',[
 ['Pressure table',`${tr.pressureSegments[0].pressure} → residual AHI ${n(tr.pressureSegments[0].residualAhi)}/h`],['Pressure table',`${tr.pressureSegments[1].pressure} → residual AHI ${n(tr.pressureSegments[1].residualAhi)}/h`],['Pressure table',`${tr.pressureSegments[2].pressure} → residual AHI ${n(tr.pressureSegments[2].residualAhi)}/h`],['Pressure table',`${tr.pressureSegments[3].pressure} → residual AHI ${n(tr.pressureSegments[3].residualAhi)}/h`]
],`The selected teaching segments show progressively lower residual respiratory-event burden as CPAP increases.`,`Do not infer that the final synthetic pressure is a universal prescription or an appropriate setting for any real patient.`)}
${card(4,'Evaluate final-pressure context','PAP titration',[
 ['Final pressure',tr.finalPressure],['Sleep at final pressure',`${n(tr.finalPressureSleepMinutes)} min`],['Supine REM at final',`${n(tr.finalPressureSupineRemMinutes)} min`],['Residual AHI',`${n(tr.finalPressureResidualAhi)} /h`]
],`${n(tr.finalPressureSupineRemMinutes)} minutes of supine REM were represented at the final teaching pressure, giving the learner meaningful stage/position context for the observed response.`,`The presence of supine REM strengthens the teaching example but does not replace full-study review, current titration guidance, or physician interpretation.`)}
${card(5,'Know the reporting roles','Diagnostic + titration',[
 ['Technologist sections','Measured values, event counts, pressure segments, oxygenation, stage/position context'],['Physician sections','Interpretation, impressions, and sample recommendations'],['Page boundary','Both physician sections are explicitly labeled fictional teaching examples.']
],`The physician section models synthesis of measured findings into impressions and recommendations; the technologist-style section models accurate description and documentation.`,`Do not blur the role boundary by presenting a technical measurement as a physician diagnosis or treatment order.`)}
${card(6,'Keep the current-rule boundary','Both reports',[
 ['Diagnostic metadata','Current official guidance and supervised clinical training remain authoritative.'],['Titration metadata','Current official guidance, physician orders, device instructions, and facility protocol remain authoritative.'],['Reference role','The 2014 text informs report structure and concepts, not the current exact rule set.']
],`For real scoring and PAP-titration decisions, use current authoritative guidance plus the applicable physician order, device instructions, and facility protocol.`,`Do not use the fictional examples or one historical textbook as a substitute for current clinical standards.`)}
</div>
<section class="answer-key-math"><div class="eyebrow">Calculation check · synthetic diagnostic report</div><h2>Reconcile the report math</h2><p>The diagnostic example is internally constructed so learners can verify the indices from the event counts and total sleep time.</p><div class="answer-key-math-grid"><div><h3>AHI check</h3><div class="answer-key-equation">(${d.respiratory.obstructiveApneas} OA + ${d.respiratory.centralApneas} CA + ${d.respiratory.mixedApneas} MA + ${d.respiratory.hypopneas} H) ÷ (${n(d.study.totalSleepMinutes)} min ÷ 60)\n= ${apneaHypopnea} ÷ ${n(tstHours,3)} h\n= ${n(calcAhi)} events/h</div><p>Reported synthetic AHI: <strong>${n(dr.ahi)} /h</strong>.</p></div><div><h3>RDI check</h3><div class="answer-key-equation">(${apneaHypopnea} apneas/hypopneas + ${dr.reras} RERAs) ÷ ${n(tstHours,3)} h\n= ${apneaHypopnea+dr.reras} ÷ ${n(tstHours,3)} h\n= ${n(calcRdi)} events/h</div><p>Reported synthetic RDI: <strong>${n(dr.rdi)} /h</strong>.</p></div></div></section>`;
}
load().catch(error=>{host.innerHTML=`<div class="notice error"><strong>Annotated answer key could not load.</strong> ${esc(error.message)}</div>`;});
})();