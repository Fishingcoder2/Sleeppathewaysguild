(function(){
'use strict';
const host=document.querySelector('[data-scoring-artifact-visual]');
if(!host)return;
const DURATION=30,LABEL_WIDTH=116,TOP_PAD=34,BOTTOM_PAD=24,ROW_HEIGHT=48,TAU=Math.PI*2;
const CHANNELS=['F4-M1','C4-M1','O2-M1','E1-M2','E2-M2','Chin','ECG','Nasal Pressure','Thermistor','Thorax RIP','Abdomen RIP','SpO2'];
const CLASS_OPTIONS=[
 'Artifact — line-frequency / electrical interference',
 'Artifact — ECG contamination',
 'Artifact — slow-frequency / sweat pattern',
 'Artifact — nasal pressure signal dropout',
 'Physiologic event — corroborated obstructive respiratory pattern'
];
const state={pack:null,cases:[],index:0,classification:null,classificationLocked:false,evidence:null,evidenceLocked:false,classCorrect:0,evidenceCorrect:0};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const current=()=>state.cases[state.index]||null;
const gauss=(x,c,w)=>Math.exp(-Math.pow((x-c)/Math.max(.001,w),2));
function feature(item,type){return (item.features||[]).find(entry=>entry.type===type)||null;}
function active(entry,t,channel){return Boolean(entry)&&t>=Number(entry.start)&&t<=Number(entry.end)&&(!Array.isArray(entry.channels)||entry.channels.includes(channel));}
function noise(t,phase){return .48*Math.sin(TAU*17.7*t+phase)+.30*Math.sin(TAU*27.1*t+.5+phase)+.18*Math.sin(TAU*36.9*t+1.1+phase);}
function beatPhase(t){const interval=.86;return t%interval;}
function qrs(t){const p=beatPhase(t);return 1.15*gauss(p,.10,.022)-.30*gauss(p,.135,.016)+.22*gauss(p,.28,.07);}
function eegBase(t,phase){return .22*Math.sin(TAU*6.1*t+phase)+.12*Math.sin(TAU*9.4*t+.4+phase)+.05*noise(t,phase);}
function eogBase(t,phase){return .18*Math.sin(TAU*.32*t+phase)+.08*Math.sin(TAU*1.1*t+.4+phase)+.025*noise(t,phase);}
function emgBase(t){return .08*noise(t,.7);}
function respBase(t,phase){return Math.sin(TAU*.245*t+phase)+.10*Math.sin(TAU*.49*t+.7+phase);}
function signal(item,channel,t){
 let value=0;
 const line=feature(item,'line-noise'),ecgArtifact=feature(item,'ecg-contamination'),drift=feature(item,'slow-drift'),dropout=feature(item,'nasal-dropout'),obstructive=feature(item,'obstructive-pattern');
 if(channel==='F4-M1')value=eegBase(t,.1);
 else if(channel==='C4-M1')value=eegBase(t,.7);
 else if(channel==='O2-M1')value=eegBase(t,1.3);
 else if(channel==='E1-M2')value=eogBase(t,.2);
 else if(channel==='E2-M2')value=-eogBase(t,.65);
 else if(channel==='Chin')value=emgBase(t);
 else if(channel==='ECG')value=qrs(t)+.015*noise(t,.2);
 else if(channel==='Nasal Pressure')value=respBase(t,.12);
 else if(channel==='Thermistor')value=.84*respBase(t,.18);
 else if(channel==='Thorax RIP')value=.92*respBase(t,.24);
 else if(channel==='Abdomen RIP')value=.90*respBase(t,.40);
 else if(channel==='SpO2')value=.02*Math.sin(TAU*.05*t);
 if(active(line,t,channel))value+=.22*Math.sin(TAU*60*t+.3);
 if(active(ecgArtifact,t,channel))value+=.30*qrs(t);
 if(active(drift,t,channel))value+=.85*Math.sin(TAU*.12*t+.45)+.32*Math.sin(TAU*.055*t+1.0);
 if(channel==='Nasal Pressure'&&active(dropout,t,channel))value=.015*noise(t,.9);
 if(obstructive&&t>=Number(obstructive.start)&&t<=Number(obstructive.end)){
   const edge=.55,start=Number(obstructive.start),end=Number(obstructive.end),gate=Math.min(1,(t-start)/edge,(end-t)/edge);
   if(channel==='Nasal Pressure'||channel==='Thermistor')value*=1-.94*Math.max(0,gate);
   if(channel==='Thorax RIP'||channel==='Abdomen RIP'){
     const progress=clamp((t-start)/Math.max(.1,end-start),0,1);
     value*=1+.25*progress;
   }
 }
 if(channel==='SpO2'&&obstructive){const center=Number(obstructive.end)+4;value-=.42*gauss(t,center,2.4);}
 if((channel==='F4-M1'||channel==='C4-M1')&&obstructive&&t>=Number(obstructive.end)&&t<=Number(obstructive.end)+3.2){value+=.16*Math.sin(TAU*15.5*t)+.10*Math.sin(TAU*20.2*t+.7);}
 return value;
}
function scaleFor(channel){
 if(channel==='ECG')return 18;
 if(channel==='Nasal Pressure'||channel==='Thermistor'||channel==='Thorax RIP'||channel==='Abdomen RIP')return 13;
 if(channel==='SpO2')return 32;
 if(channel==='Chin')return 19;
 return 20;
}
function renderCanvas(item){
 const canvas=host.querySelector('[data-artifact-canvas]');if(!canvas)return;
 const parent=canvas.parentElement,cssWidth=Math.max(980,Math.floor(parent&&parent.clientWidth||980)),cssHeight=TOP_PAD+BOTTOM_PAD+CHANNELS.length*ROW_HEIGHT,ratio=Math.min(1.6,Math.max(1,window.devicePixelRatio||1));
 canvas.style.width=cssWidth+'px';canvas.style.height=cssHeight+'px';canvas.width=Math.round(cssWidth*ratio);canvas.height=Math.round(cssHeight*ratio);
 const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);drawGrid(ctx,cssWidth,cssHeight);CHANNELS.forEach((channel,index)=>drawChannel(ctx,cssWidth,item,channel,index));if(state.evidenceLocked)drawTeachingWindow(ctx,cssWidth,item);
}
function drawGrid(ctx,width,height){
 const plotRight=width-12,plotWidth=plotRight-LABEL_WIDTH;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.textBaseline='middle';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';
 for(let second=0;second<=DURATION;second+=1){const x=LABEL_WIDTH+(second/DURATION)*plotWidth,isFive=second%5===0;ctx.beginPath();ctx.strokeStyle=isFive?'#c2d5df':'#edf3f6';ctx.lineWidth=isFive?1.1:.65;ctx.moveTo(x,TOP_PAD-13);ctx.lineTo(x,height-BOTTOM_PAD);ctx.stroke();if(isFive&&second<DURATION){ctx.fillStyle='#5d707b';ctx.textAlign='center';ctx.fillText(second+' s',x+1,14);}}
 CHANNELS.forEach((channel,index)=>{const y=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2;ctx.beginPath();ctx.strokeStyle='#e3edf2';ctx.lineWidth=1;ctx.moveTo(0,y+ROW_HEIGHT/2);ctx.lineTo(width,y+ROW_HEIGHT/2);ctx.stroke();ctx.fillStyle='#17344a';ctx.textAlign='left';ctx.font='700 11px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(channel,10,y);ctx.beginPath();ctx.strokeStyle='#dbe7ed';ctx.setLineDash([3,5]);ctx.moveTo(LABEL_WIDTH,y);ctx.lineTo(plotRight,y);ctx.stroke();ctx.setLineDash([]);});
 ctx.fillStyle='#5d707b';ctx.textAlign='right';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText('30-second schematic PSG',plotRight,height-9);
}
function drawChannel(ctx,width,item,channel,index){
 const plotRight=width-12,plotWidth=plotRight-LABEL_WIDTH,y0=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2,scale=scaleFor(channel),sampleRate=channel==='ECG'||['F4-M1','C4-M1','O2-M1','E1-M2','E2-M2','Chin'].includes(channel)?180:70,points=Math.round(DURATION*sampleRate);
 ctx.beginPath();ctx.strokeStyle='#132f3f';ctx.lineWidth=.9;
 for(let i=0;i<points;i+=1){const t=i/(points-1)*DURATION,x=LABEL_WIDTH+(t/DURATION)*plotWidth,y=y0-clamp(signal(item,channel,t)*scale,-ROW_HEIGHT*.43,ROW_HEIGHT*.43);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
}
function drawTeachingWindow(ctx,width,item){
 const entry=(item.features||[])[0];if(!entry)return;const plotRight=width-12,plotWidth=plotRight-LABEL_WIDTH,x=LABEL_WIDTH+(Number(entry.start)/DURATION)*plotWidth,w=(Number(entry.end)-Number(entry.start))/DURATION*plotWidth;
 ctx.save();ctx.fillStyle='rgba(27,100,137,.045)';ctx.strokeStyle='#1b6489';ctx.lineWidth=1.3;ctx.setLineDash([5,4]);ctx.fillRect(x,TOP_PAD,w,CHANNELS.length*ROW_HEIGHT);ctx.strokeRect(x,TOP_PAD,w,CHANNELS.length*ROW_HEIGHT);ctx.restore();
}
async function load(){
 const response=await fetch('data/visual/prototype-artifact-physiology.json',{cache:'no-store'});if(!response.ok)throw new Error('Artifact visual pack HTTP '+response.status);const pack=await response.json();if(!pack.meta||pack.meta.appAuthored!==true)throw new Error('Artifact pack must be app-authored.');if(!Array.isArray(pack.cases)||pack.cases.length!==5)throw new Error('Artifact teaching cases are incomplete.');state.pack=pack;state.cases=pack.cases;renderIntro();
}
function resetCase(){state.classification=null;state.classificationLocked=false;state.evidence=null;state.evidenceLocked=false;}
function renderIntro(){
 host.hidden=false;host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 6 · Visual practicum</div><h2>Artifact vs Physiology — trace the signal before you score it</h2></div><span class="status">5 app-authored cases</span></div><p class="report-intro">A suspicious waveform is not interpreted in isolation. Compare timing, morphology, affected channels, and independent sensors before deciding whether the signal represents physiology or recording artifact.</p><div class="scoring-artifact-roadmap"><div><strong>1 · Find the suspicious signal</strong><small>Ask whether the pattern is rhythmic, irregular, slow drifting, time-locked to another channel, or suddenly absent.</small></div><div><strong>2 · Trace it across channels</strong><small>Artifact often reveals its source by appearing in the same timing pattern across affected channels or by disagreeing with independent sensors.</small></div><div><strong>3 · Require corroboration</strong><small>A physiologic event should make sense across the relevant signal pathway. Do not let one bad sensor create a diagnosis.</small></div></div><div class="actions"><button class="btn primary" type="button" data-artifact-start>Start artifact review</button></div>`;
}
function classButtons(){return CLASS_OPTIONS.map(value=>`<button class="visual-choice${state.classification===value?' selected':''}" type="button" data-artifact-class="${esc(value)}" ${state.classificationLocked?'disabled':''}>${esc(value)}</button>`).join('');}
function renderCase(){
 const item=current();if(!item)return;const correct=state.classificationLocked&&state.classification===item.answer;host.hidden=false;
 host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 6 · Case ${state.index+1} of ${state.cases.length}</div><h2>${esc(item.title)}</h2></div><span class="status">30-second signal-quality review</span></div><div class="scoring-artifact-meta"><span>Original schematic PSG</span><span>Signal-pathway comparison</span><span>Teaching highlights hidden until evidence check</span><span>No patient data</span></div><div class="visual-viewer-shell"><div class="visual-viewer-head"><div><strong>PSG signal window</strong><small>Inspect the entire montage before choosing artifact or physiology.</small></div><span class="status green">Answer hidden until check</span></div><div class="visual-scroll"><div class="visual-canvas-stage"><canvas data-artifact-canvas aria-label="Schematic PSG for artifact versus physiology review"></canvas></div></div></div><section class="scoring-stage-question"><h3>What best explains the suspicious pattern?</h3><div class="scoring-artifact-options" role="group" aria-label="Artifact or physiology classification">${classButtons()}</div>${!state.classificationLocked?`<div class="visual-question-actions"><button class="btn primary" type="button" data-artifact-check-class ${state.classification?'':'disabled'}>Check interpretation</button></div>`:classificationFeedback(item,correct)}${state.classificationLocked?evidenceBlock(item):''}</section>`;requestAnimationFrame(()=>renderCanvas(item));
}
function classificationFeedback(item,correct){return `<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${correct?'Correct interpretation':'Trace the signal through the montage'} · Teaching answer: ${esc(item.answer)}</strong><span>${esc(item.rationale)}</span></div>`;}
function evidenceBlock(item){
 const ev=item.evidence,correct=state.evidenceLocked&&state.evidence===ev.answer;return `<div class="scoring-artifact-proof"><h4>Prove the decision</h4><p>Which cross-channel finding is the strongest evidence?</p><div class="scoring-artifact-evidence">${ev.options.map(value=>`<button class="visual-choice${state.evidence===value?' selected':''}" type="button" data-artifact-evidence="${esc(value)}" ${state.evidenceLocked?'disabled':''}>${esc(value)}</button>`).join('')}</div>${!state.evidenceLocked?`<div class="visual-question-actions"><button class="btn primary" type="button" data-artifact-check-evidence ${state.evidence?'':'disabled'}>Check evidence</button></div>`:`<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${correct?'Evidence matched':'Review the independent channels'}</strong><span>${esc(ev.answer)}</span></div><div class="scoring-artifact-reference"><strong>Reference:</strong> ${esc(state.pack.meta.apaReference)}</div>${nextControls()}`}</div>`;
}
function nextControls(){return `<div class="visual-question-actions">${state.index<state.cases.length-1?'<button class="btn primary" type="button" data-artifact-next>Next artifact case</button>':'<button class="btn primary" type="button" data-artifact-finish>Finish artifact review</button>'}</div>`;}
function markStation(){const box=document.querySelector('[data-scoring-station="artifact-physiology"]');if(box&&!box.checked){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}}
function finish(){markStation();host.innerHTML=`<div class="scoring-artifact-result"><div class="eyebrow">Station 6 complete</div><h2>${state.classCorrect}/${state.cases.length} interpretations correct · ${state.evidenceCorrect}/${state.cases.length} evidence checks correct</h2><p>You completed the artifact-versus-physiology signal-pathway review. The Scoring Lab station has been marked complete.</p><div class="actions"><button class="btn primary" type="button" data-artifact-restart>Practice artifact cases again</button></div></div>`;}
function start(){state.index=0;state.classCorrect=0;state.evidenceCorrect=0;resetCase();renderCase();}
document.addEventListener('click',event=>{
 if(!host.contains(event.target)&&!event.target.closest('[data-artifact-start]'))return;
 if(event.target.closest('[data-artifact-start]')||event.target.closest('[data-artifact-restart]')){start();return;}
 const classButton=event.target.closest('[data-artifact-class]');if(classButton&&!state.classificationLocked){state.classification=classButton.getAttribute('data-artifact-class');renderCase();return;}
 if(event.target.closest('[data-artifact-check-class]')&&!state.classificationLocked&&state.classification){const item=current();state.classificationLocked=true;if(item&&state.classification===item.answer)state.classCorrect+=1;renderCase();return;}
 const evidenceButton=event.target.closest('[data-artifact-evidence]');if(evidenceButton&&!state.evidenceLocked){state.evidence=evidenceButton.getAttribute('data-artifact-evidence');renderCase();return;}
 if(event.target.closest('[data-artifact-check-evidence]')&&!state.evidenceLocked&&state.evidence){const item=current();state.evidenceLocked=true;if(item&&state.evidence===item.evidence.answer)state.evidenceCorrect+=1;renderCase();return;}
 if(event.target.closest('[data-artifact-next]')&&state.evidenceLocked&&state.index<state.cases.length-1){state.index+=1;resetCase();renderCase();return;}
 if(event.target.closest('[data-artifact-finish]')&&state.evidenceLocked){finish();}
});
let resizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const item=current();if(item&&host.querySelector('[data-artifact-canvas]'))renderCanvas(item);},150);});
load().catch(error=>{host.hidden=false;host.innerHTML=`<div class="notice error"><strong>Artifact scoring practicum could not load.</strong> ${esc(error.message)}</div>`;});
})();
