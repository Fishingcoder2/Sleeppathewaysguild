(function(){
'use strict';
const host=document.querySelector('[data-scoring-limb-visual]');
if(!host)return;
const DURATION=120,LABEL_WIDTH=116,TOP_PAD=34,BOTTOM_PAD=24,ROW_HEIGHT=56,TAU=Math.PI*2;
const CHANNELS=['C3-M2','L LEG','R LEG','Nasal Pressure','Thorax RIP','Abdomen RIP','SpO2'];
const CLASS_OPTIONS=['Qualifying PLM series','Too few movements for a PLM series','Respiratory-associated movements — exclude from PLM scoring','Wake leg movements — do not score as PLMs'];
const state={pack:null,cases:[],index:0,classification:null,classificationLocked:false,evidence:null,evidenceLocked:false,classCorrect:0,evidenceCorrect:0};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const gauss=(x,c,w)=>Math.exp(-Math.pow((x-c)/Math.max(.001,w),2));
const current=()=>state.cases[state.index]||null;
function smoothGate(t,start,end,edge){if(t<start||t>end)return 0;const e=Math.max(.04,edge||.18);return Math.min(1,(t-start)/e,(end-t)/e);}
function noise(t,phase){return Math.sin(TAU*17.3*t+phase)*.30+Math.sin(TAU*28.7*t+.7+phase)*.20+Math.sin(TAU*37.9*t+1.1+phase)*.12;}
function movementSignal(item,leg,t){
 let value=.035*noise(t,leg==='L'?.2:.8);
 (item.movements||[]).forEach((movement,index)=>{
  if(movement.leg!==leg)return;
  const start=Number(movement.start),end=start+Number(movement.duration||1),gate=smoothGate(t,start,end,.12);if(!gate)return;
  const strength=Number(movement.strength||1),phase=index*.73+(leg==='L'?.1:.6);
  value+=gate*strength*(.62*Math.sin(TAU*24.5*t+phase)+.44*Math.sin(TAU*33.8*t+.7+phase)+.26*Math.sin(TAU*41.2*t+1.4));
 });
 return value;
}
function inArousal(item,t){return (item.arousals||[]).some(event=>t>=Number(event.start)&&t<=Number(event.end));}
function eegSignal(item,t){
 const wake=item.stage==='W';let value=wake?.30*Math.sin(TAU*10.1*t)+.12*Math.sin(TAU*18.2*t+.4):.16*Math.sin(TAU*5.4*t)+.14*Math.sin(TAU*7.1*t+.8)+.055*Math.sin(TAU*10.0*t+1.2);
 value+=.025*noise(t,.3);
 if(inArousal(item,t))value+=.13*Math.sin(TAU*15.6*t+.4)+.09*Math.sin(TAU*20.2*t+1.1);
 return value;
}
function respiratoryEvent(item,t){return (item.respiratory||[]).find(event=>t>=Number(event.start)&&t<=Number(event.end))||null;}
function airflowSignal(item,t){
 let value=Math.sin(TAU*.24*t+.12)+.14*Math.sin(TAU*.48*t+1.0),event=respiratoryEvent(item,t);
 if(event){const gate=smoothGate(t,Number(event.start),Number(event.end),.5),depth=clamp(Number(event.depth||.94),0,1);value*=1-gate*depth;}
 return value+.012*noise(t,.5);
}
function effortSignal(item,t,abdomen){
 const phase=abdomen?.25:.12;let value=Math.sin(TAU*.24*t+phase)+.08*Math.sin(TAU*.48*t+.7+phase),event=respiratoryEvent(item,t);
 if(event){const progress=clamp((t-Number(event.start))/Math.max(.1,Number(event.end)-Number(event.start)),0,1);value*=1+.18*progress;}
 return value+.01*noise(t,abdomen?.9:.6);
}
function spo2Signal(item,t){
 let value=.02*Math.sin(TAU*.025*t+.4)+.008*Math.sin(TAU*.10*t);
 (item.respiratory||[]).forEach(event=>{const center=Number(event.end)+5;value-=.34*gauss(t,center,3.2);});
 return value;
}
function sample(item,channel,t){
 if(channel==='C3-M2')return eegSignal(item,t);
 if(channel==='L LEG')return movementSignal(item,'L',t);
 if(channel==='R LEG')return movementSignal(item,'R',t);
 if(channel==='Nasal Pressure')return airflowSignal(item,t);
 if(channel==='Thorax RIP')return effortSignal(item,t,false);
 if(channel==='Abdomen RIP')return effortSignal(item,t,true);
 if(channel==='SpO2')return spo2Signal(item,t);
 return 0;
}
function scaleFor(channel){if(channel==='C3-M2')return 23;if(channel==='L LEG'||channel==='R LEG')return 17;if(channel==='SpO2')return 34;return 16;}
function renderCanvas(item){
 const canvas=host.querySelector('[data-limb-canvas]');if(!canvas)return;
 const parent=canvas.parentElement,cssWidth=Math.max(980,Math.floor(parent&&parent.clientWidth||980)),cssHeight=TOP_PAD+BOTTOM_PAD+CHANNELS.length*ROW_HEIGHT,ratio=Math.min(1.6,Math.max(1,window.devicePixelRatio||1));
 canvas.style.width=cssWidth+'px';canvas.style.height=cssHeight+'px';canvas.width=Math.round(cssWidth*ratio);canvas.height=Math.round(cssHeight*ratio);
 const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);drawGrid(ctx,cssWidth,cssHeight,item);CHANNELS.forEach((channel,index)=>drawChannel(ctx,cssWidth,item,channel,index));if(state.evidenceLocked)drawTeachingOverlays(ctx,cssWidth,item);
}
function drawGrid(ctx,width,height,item){
 const plotRight=width-12,plotWidth=plotRight-LABEL_WIDTH;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.textBaseline='middle';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';
 for(let second=0;second<=DURATION;second+=5){const x=LABEL_WIDTH+(second/DURATION)*plotWidth,isEpoch=second%30===0,isTen=second%10===0;ctx.beginPath();ctx.strokeStyle=isEpoch?'#9fbac8':isTen?'#c7d9e3':'#edf3f6';ctx.lineWidth=isEpoch?1.6:isTen?1.05:.7;ctx.moveTo(x,TOP_PAD-13);ctx.lineTo(x,height-BOTTOM_PAD);ctx.stroke();if(isTen&&second<DURATION){ctx.fillStyle='#5d707b';ctx.textAlign='center';ctx.fillText(second+' s',x+2,14);}}
 CHANNELS.forEach((channel,index)=>{const y=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2;ctx.beginPath();ctx.strokeStyle='#e3edf2';ctx.lineWidth=1;ctx.moveTo(0,y+ROW_HEIGHT/2);ctx.lineTo(width,y+ROW_HEIGHT/2);ctx.stroke();ctx.fillStyle='#17344a';ctx.textAlign='left';ctx.font='700 12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(channel,10,y);ctx.beginPath();ctx.strokeStyle='#dbe7ed';ctx.setLineDash([3,5]);ctx.moveTo(LABEL_WIDTH,y);ctx.lineTo(plotRight,y);ctx.stroke();ctx.setLineDash([]);});
 ctx.fillStyle='#5d707b';ctx.textAlign='right';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText('120 s · 4 epochs · Stage '+item.stage,plotRight,height-9);
}
function drawChannel(ctx,width,item,channel,index){
 const plotRight=width-12,plotWidth=plotRight-LABEL_WIDTH,y0=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2,scale=scaleFor(channel),sampleRate=channel==='L LEG'||channel==='R LEG'?80:45,points=Math.round(DURATION*sampleRate);
 ctx.beginPath();ctx.strokeStyle='#132f3f';ctx.lineWidth=channel==='L LEG'||channel==='R LEG'?1.0:.95;
 for(let i=0;i<points;i++){const t=i/(points-1)*DURATION,x=LABEL_WIDTH+(t/DURATION)*plotWidth,y=y0-clamp(sample(item,channel,t)*scale,-ROW_HEIGHT*.42,ROW_HEIGHT*.42);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
}
function drawTeachingOverlays(ctx,width,item){
 const plotRight=width-12,plotWidth=plotRight-LABEL_WIDTH,timeX=time=>LABEL_WIDTH+(time/DURATION)*plotWidth,legTop=TOP_PAD+ROW_HEIGHT,legHeight=ROW_HEIGHT*2,respTop=TOP_PAD+ROW_HEIGHT*3,respHeight=ROW_HEIGHT*3;
 ctx.save();
 (item.movements||[]).forEach(movement=>{const x=timeX(Number(movement.start)),w=Math.max(5,timeX(Number(movement.start)+Number(movement.duration||1))-x);ctx.fillStyle='rgba(43,122,75,.07)';ctx.strokeStyle='#2b7a4b';ctx.lineWidth=1.3;ctx.setLineDash([]);ctx.fillRect(x,legTop,w,legHeight);ctx.strokeRect(x,legTop,w,legHeight);});
 (item.respiratory||[]).forEach(event=>{const x=timeX(Number(event.start)),w=timeX(Number(event.end))-x;ctx.fillStyle='rgba(181,121,18,.05)';ctx.strokeStyle='#b57912';ctx.lineWidth=1.2;ctx.setLineDash([5,4]);ctx.fillRect(x,respTop,w,respHeight);ctx.strokeRect(x,respTop,w,respHeight);});
 ctx.restore();
}
async function load(){
 const response=await fetch('data/visual/prototype-limb-movement.json',{cache:'no-store'});if(!response.ok)throw new Error('Limb movement visual pack HTTP '+response.status);const pack=await response.json();if(!pack.meta||pack.meta.appAuthored!==true)throw new Error('Limb movement pack must be app-authored.');if(!Array.isArray(pack.cases)||pack.cases.length<4)throw new Error('Limb movement cases are incomplete.');state.pack=pack;state.cases=pack.cases;renderIntro();
}
function resetCase(){state.classification=null;state.classificationLocked=false;state.evidence=null;state.evidenceLocked=false;}
function renderIntro(){
 host.hidden=false;host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 5 · Visual practicum</div><h2>Limb Movement Context — count the series, then check what explains it</h2></div><span class="status">4 app-authored cases</span></div><p class="report-intro">Use a 120-second view so the movement sequence is visible across four epochs. First identify the limb-movement interpretation. Then prove it using bilateral timing, sleep stage, respiratory association, and arousal context.</p><div class="scoring-limb-roadmap"><div><strong>Candidate movement</strong><small>Current public AASM ISR help uses 0.5–10 seconds for a limb movement.</small></div><div><strong>Series timing</strong><small>Look for at least four movements, with 5–90 seconds between movement onsets. Closely paired bilateral bursts may represent one movement.</small></div><div><strong>Context before count</strong><small>Check stage and respiratory timing. Public ISR help excludes movements during wake and during/within 0.5 seconds of respiratory events.</small></div></div><div class="actions"><button class="btn primary" type="button" data-limb-start>Start limb movement review</button></div>`;
}
function classificationButtons(){return CLASS_OPTIONS.map(value=>`<button class="visual-choice${state.classification===value?' selected':''}" type="button" data-limb-class="${esc(value)}" ${state.classificationLocked?'disabled':''}>${esc(value)}</button>`).join('');}
function renderCase(){
 const item=current();if(!item)return;host.hidden=false;const correct=state.classificationLocked&&state.classification===item.answer;
 host.innerHTML=`<div class="section-head"><div><div class="eyebrow">Station 5 · Case ${state.index+1} of ${state.cases.length}</div><h2>${esc(item.title)}</h2></div><span class="status">120-second view · Stage ${esc(item.stage)}</span></div><div class="scoring-limb-meta"><span>Original schematic PSG</span><span>Bilateral anterior-tibialis EMG</span><span>Respiratory + EEG context</span><span>No patient data</span></div><div class="visual-viewer-shell"><div class="visual-viewer-head"><div><strong>Limb-movement context window</strong><small>Read all four epochs before deciding whether the leg activity represents a scoreable periodic series.</small></div><span class="status green">Teaching highlights hidden until evidence check</span></div><div class="visual-scroll"><div class="visual-canvas-stage"><canvas data-limb-canvas aria-label="Schematic 120-second PSG segment for limb movement scoring"></canvas></div></div></div><section class="scoring-stage-question"><h3>Which interpretation best fits this limb-movement pattern?</h3><div class="scoring-limb-options" role="group" aria-label="Limb movement interpretation">${classificationButtons()}</div>${!state.classificationLocked?`<div class="visual-question-actions"><button class="btn primary" type="button" data-limb-check-class ${state.classification?'':'disabled'}>Check interpretation</button></div>`:classificationFeedback(item,correct)}${state.classificationLocked?evidenceBlock(item):''}</section>`;requestAnimationFrame(()=>renderCanvas(item));
}
function classificationFeedback(item,correct){return `<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${correct?'Correct interpretation':'Review the sequence and context'} · Teaching answer: ${esc(item.answer)}</strong><span>${esc(item.rationale)}</span></div>`;}
function evidenceBlock(item){
 const ev=item.evidence,correct=state.evidenceLocked&&state.evidence===ev.answer;return `<div class="scoring-limb-proof"><h4>Prove the interpretation</h4><p>Which finding is the strongest reason for this decision?</p><div class="scoring-limb-evidence">${ev.options.map(value=>`<button class="visual-choice${state.evidence===value?' selected':''}" type="button" data-limb-evidence="${esc(value)}" ${state.evidenceLocked?'disabled':''}>${esc(value)}</button>`).join('')}</div>${!state.evidenceLocked?`<div class="visual-question-actions"><button class="btn primary" type="button" data-limb-check-evidence ${state.evidence?'':'disabled'}>Check evidence</button></div>`:`<div class="visual-feedback ${correct?'correct':'retry'}"><strong>${correct?'Evidence matched':'Review what changes the count'}</strong><span>${esc(ev.rationale)}</span></div><div class="scoring-limb-legend"><span class="scoring-limb-key"><i class="scoring-limb-swatch"></i>Leg-movement teaching windows</span>${(item.respiratory||[]).length?'<span class="scoring-limb-key"><i class="scoring-limb-swatch resp"></i>Respiratory-event windows</span>':''}</div><p class="scoring-source-note"><strong>Source boundary:</strong> This exercise paraphrases current public AASM ISR scoring help and the uploaded Sleep Pathways Guild project reference. The current AASM Scoring Manual remains the definitive clinical reference.</p>${nextControls()}`}</div>`;}
function nextControls(){return `<div class="visual-question-actions">${state.index<state.cases.length-1?'<button class="btn primary" type="button" data-limb-next>Next limb case</button>':'<button class="btn primary" type="button" data-limb-finish>Finish limb movement review</button>'}</div>`;}
function markStation(){const box=document.querySelector('[data-scoring-station="limb-movement-context"]');if(box&&!box.checked){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}}
function finish(){markStation();host.innerHTML=`<div class="scoring-limb-result"><div class="eyebrow">Station 5 complete</div><h2>${state.classCorrect}/${state.cases.length} interpretations correct · ${state.evidenceCorrect}/${state.cases.length} evidence checks correct</h2><p>You completed the bilateral leg-EMG series and context review. The Scoring Lab station has been marked complete.</p><div class="actions"><button class="btn primary" type="button" data-limb-restart>Practice limb cases again</button></div></div>`;}
function start(){state.index=0;state.classCorrect=0;state.evidenceCorrect=0;resetCase();renderCase();}
document.addEventListener('click',event=>{
 if(!host.contains(event.target)&&!event.target.closest('[data-limb-start]'))return;
 if(event.target.closest('[data-limb-start]')||event.target.closest('[data-limb-restart]')){start();return;}
 const classButton=event.target.closest('[data-limb-class]');if(classButton&&!state.classificationLocked){state.classification=classButton.getAttribute('data-limb-class');renderCase();return;}
 if(event.target.closest('[data-limb-check-class]')&&!state.classificationLocked&&state.classification){const item=current();state.classificationLocked=true;if(item&&state.classification===item.answer)state.classCorrect+=1;renderCase();return;}
 const evidenceButton=event.target.closest('[data-limb-evidence]');if(evidenceButton&&!state.evidenceLocked){state.evidence=evidenceButton.getAttribute('data-limb-evidence');renderCase();return;}
 if(event.target.closest('[data-limb-check-evidence]')&&!state.evidenceLocked&&state.evidence){const item=current();state.evidenceLocked=true;if(item&&state.evidence===item.evidence.answer)state.evidenceCorrect+=1;renderCase();return;}
 if(event.target.closest('[data-limb-next]')&&state.evidenceLocked&&state.index<state.cases.length-1){state.index+=1;resetCase();renderCase();return;}
 if(event.target.closest('[data-limb-finish]')&&state.evidenceLocked){finish();}
});
let resizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const item=current();if(item&&host.querySelector('[data-limb-canvas]'))renderCanvas(item);},150);});
load().catch(error=>{host.hidden=false;host.innerHTML=`<div class="notice error"><strong>Limb movement scoring practicum could not load.</strong> ${esc(error.message)}</div>`;});
})();
