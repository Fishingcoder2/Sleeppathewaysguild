(function(){
'use strict';
const host=document.querySelector('[data-live-psg]');
if(!host)return;
const canvas=host.querySelector('[data-live-psg-canvas]');
if(!canvas)return;
const ctx=canvas.getContext('2d');
const WINDOW_SECONDS=30;
const TAU=Math.PI*2;
const channels=[
 {id:'c3',label:'C3-M2',kind:'eeg',phase:.2},
 {id:'c4',label:'C4-M1',kind:'eeg',phase:1.1},
 {id:'e1',label:'E1-M2',kind:'eog',phase:.5},
 {id:'e2',label:'E2-M2',kind:'eog',phase:2.2},
 {id:'chin',label:'Chin EMG',kind:'emg',phase:.4},
 {id:'ecg',label:'ECG',kind:'ecg',phase:.1},
 {id:'airflow',label:'Airflow',kind:'airflow',phase:0},
 {id:'thorax',label:'Thorax',kind:'thorax',phase:.1},
 {id:'abdomen',label:'Abdomen',kind:'abdomen',phase:.18},
 {id:'spo2',label:'SpO₂',kind:'spo2',phase:0},
 {id:'lleg',label:'L Leg',kind:'leg',phase:.3},
 {id:'rleg',label:'R Leg',kind:'leg',phase:1.6}
];
const state={running:false,elapsedBase:0,runStartedAt:0,raf:0,width:0,height:0,labelWidth:104,rowHeight:39,top:32,bottom:22,lastPaint:0};
const status={mode:host.querySelector('[data-live-psg-mode]'),elapsed:host.querySelector('[data-live-psg-elapsed]'),epoch:host.querySelector('[data-live-psg-epoch]'),window:host.querySelector('[data-live-psg-window-readout]'),event:host.querySelector('[data-live-psg-event]')};
const startButton=host.querySelector('[data-live-psg-start]');
const pauseButton=host.querySelector('[data-live-psg-pause]');
const restartButton=host.querySelector('[data-live-psg-restart]');
const key=host.querySelector('[data-live-psg-channel-key]');
const mod=(value,size)=>((value%size)+size)%size;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const gauss=(x,c,w)=>Math.exp(-Math.pow((x-c)/Math.max(.001,w),2));
const smoothStep=x=>{const y=clamp(x,0,1);return y*y*(3-2*y);};
const envelope=(x,start,end,edge)=>{if(x<start||x>end)return 0;const e=Math.max(.05,edge||.6);return Math.min(1,smoothStep((x-start)/e),smoothStep((end-x)/e));};
function noise(t,phase){return .48*Math.sin(TAU*17.3*t+phase)+.28*Math.sin(TAU*23.7*t+phase*1.7)+.16*Math.sin(TAU*31.1*t+.7+phase*.4);}
function cyclePhase(t,hz){return mod(t*hz,1);}
function ecgTemplate(p){const d=(a,b)=>Math.min(Math.abs(a-b),1-Math.abs(a-b));const g=(c,w)=>Math.exp(-Math.pow(d(p,c)/w,2));return .11*g(.17,.045)-.18*g(.37,.014)+1.65*g(.405,.011)-.42*g(.445,.019)+.29*g(.69,.075);}
function teachingPhase(t){return mod(t,120);}
function respiratoryState(t){
 const p=teachingPhase(t);
 const obstructive=p>=25&&p<=37;
 const hypopnea=p>=65&&p<=77;
 const plm=p>=92&&p<=96;
 const arousal=(p>=37&&p<=40)||(p>=77&&p<=80);
 return {p,obstructive,hypopnea,plm,arousal};
}
function eegValue(t,phase){
 const r=respiratoryState(t),p=r.p;
 let v=.13*Math.sin(TAU*4.8*t+phase)+.16*Math.sin(TAU*6.2*t+phase*.7)+.07*Math.sin(TAU*9.5*t+.8+phase)+.045*noise(t,phase);
 const spindle=envelope(p,10.5,12.3,.25)+envelope(p,51.5,53.1,.25)+envelope(p,101.0,102.7,.25);
 v+=spindle*.48*Math.sin(TAU*13.2*t+phase);
 v+=-1.05*gauss(p,19.9,.12)+1.5*gauss(p,20.18,.20)-.48*gauss(p,20.62,.26);
 v+=-1.0*gauss(p,56.0,.13)+1.42*gauss(p,56.28,.21)-.44*gauss(p,56.73,.27);
 if(r.arousal)v+=.25*Math.sin(TAU*16.5*t+phase)+.17*Math.sin(TAU*20.5*t+.4+phase);
 return v;
}
function eogValue(t,phase,sign){const r=respiratoryState(t);let v=.045*Math.sin(TAU*4.2*t+phase)+.035*noise(t,phase);if(r.arousal)v+=sign*(.36*Math.sin(TAU*1.1*t+phase)+.18*Math.sin(TAU*2.3*t));return v;}
function emgValue(t,phase){const r=respiratoryState(t);const tone=r.arousal?1.9:1;return tone*(.13*Math.sin(TAU*29*t+phase)+.11*Math.sin(TAU*37*t+.7+phase)+.07*noise(t,phase));}
function breath(t,phase){return Math.sin(TAU*.255*t+phase)+.06*Math.sin(TAU*.51*t+.4+phase);}
function airflowValue(t){const r=respiratoryState(t);let amp=1;if(r.obstructive)amp=.055;if(r.hypopnea)amp=.44;return amp*breath(t,0);}
function thoraxValue(t){const r=respiratoryState(t);const amp=r.hypopnea?.72:1;return amp*breath(t,.08);}
function abdomenValue(t){const r=respiratoryState(t);const amp=r.hypopnea?.70:1;return amp*breath(t,r.obstructive?Math.PI+.08:.17);}
function spo2Percent(t){const p=teachingPhase(t);let value=96+.18*Math.sin(TAU*.028*t);if(p>=31&&p<=54){const down=smoothStep((p-31)/8),up=smoothStep((54-p)/10);value-=10*Math.min(down,up);}if(p>=73&&p<=91){const down=smoothStep((p-73)/7),up=smoothStep((91-p)/8);value-=5*Math.min(down,up);}return value;}
function legValue(t,phase,right){const r=respiratoryState(t);let v=.06*noise(t,phase);if(r.plm){const center=right?94.2:93.3;v+=1.1*gauss(r.p,center,.16)*Math.sin(TAU*8.5*t+phase)+.72*gauss(r.p,center+.25,.22);}return v;}
function sample(channel,t){
 if(channel.kind==='eeg')return eegValue(t,channel.phase);
 if(channel.kind==='eog')return eogValue(t,channel.phase,channel.id==='e1'?1:-1);
 if(channel.kind==='emg')return emgValue(t,channel.phase);
 if(channel.kind==='ecg')return ecgTemplate(cyclePhase(t,1.08))+.018*Math.sin(TAU*.22*t);
 if(channel.kind==='airflow')return airflowValue(t);
 if(channel.kind==='thorax')return thoraxValue(t);
 if(channel.kind==='abdomen')return abdomenValue(t);
 if(channel.kind==='spo2')return (spo2Percent(t)-93)/6;
 if(channel.kind==='leg')return legValue(t,channel.phase,channel.id==='rleg');
 return 0;
}
function amplitudeScale(channel){if(channel.kind==='ecg')return 15;if(channel.kind==='eeg')return 14;if(channel.kind==='eog')return 15;if(channel.kind==='emg')return 17;if(channel.kind==='spo2')return 13;if(channel.kind==='leg')return 15;return 10;}
function elapsedNow(){return state.running?state.elapsedBase+(performance.now()-state.runStartedAt)/1000:state.elapsedBase;}
function eventLabel(t){const r=respiratoryState(t);if(r.obstructive)return 'Synthetic obstructive event';if(r.hypopnea)return 'Synthetic hypopnea';if(r.plm)return 'Synthetic leg burst';if(r.arousal)return 'Synthetic arousal';return 'N2 teaching background';}
function sizeCanvas(){
 const screen=host.querySelector('.live-psg-screen');const width=Math.max(340,Math.floor(screen.clientWidth||host.clientWidth||900));state.labelWidth=width<520?74:104;state.rowHeight=width<520?36:39;state.width=width;state.height=state.top+state.bottom+channels.length*state.rowHeight;
 const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));canvas.style.width=width+'px';canvas.style.height=state.height+'px';canvas.width=Math.round(width*ratio);canvas.height=Math.round(state.height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
}
function xForTime(t,windowStart,plotLeft,plotWidth){return plotLeft+((t-windowStart)/WINDOW_SECONDS)*plotWidth;}
function drawEventBands(windowStart,windowEnd,plotLeft,plotWidth){
 const cycles=[];const first=Math.floor(windowStart/120)-1;const last=Math.ceil(windowEnd/120)+1;for(let cycle=first;cycle<=last;cycle+=1){const base=cycle*120;cycles.push({start:base+25,end:base+37,label:'OA',fill:'rgba(199,153,63,.13)'},{start:base+65,end:base+77,label:'H',fill:'rgba(120,142,154,.11)'},{start:base+92,end:base+96,label:'LM',fill:'rgba(109,142,86,.12)'});}
 cycles.forEach(item=>{const start=Math.max(windowStart,item.start),end=Math.min(windowEnd,item.end);if(end<=start)return;const x=xForTime(start,windowStart,plotLeft,plotWidth),x2=xForTime(end,windowStart,plotLeft,plotWidth);ctx.fillStyle=item.fill;ctx.fillRect(x,state.top-15,Math.max(1,x2-x),state.height-state.top-state.bottom+15);ctx.fillStyle='#52636d';ctx.font='700 9px system-ui,-apple-system,Segoe UI,sans-serif';ctx.textAlign='left';ctx.fillText(item.label,x+3,state.top-7);});
}
function drawGrid(elapsed){
 const width=state.width,height=state.height,plotLeft=state.labelWidth,plotRight=width-10,plotWidth=plotRight-plotLeft,windowStart=elapsed-WINDOW_SECONDS,windowEnd=elapsed;
 ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 drawEventBands(windowStart,windowEnd,plotLeft,plotWidth);
 for(let second=0;second<=WINDOW_SECONDS;second+=1){const x=plotLeft+(second/WINDOW_SECONDS)*plotWidth;ctx.beginPath();ctx.strokeStyle=second%5===0?'#bdccd4':'#edf2f4';ctx.lineWidth=second%5===0?1:.65;ctx.moveTo(x,state.top-16);ctx.lineTo(x,height-state.bottom);ctx.stroke();if(second%5===0&&second<WINDOW_SECONDS){ctx.fillStyle='#60727d';ctx.font='10px system-ui,-apple-system,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText(second+' s',x+2,11);}}
 const firstBoundary=Math.ceil(windowStart/WINDOW_SECONDS)*WINDOW_SECONDS;for(let boundary=firstBoundary;boundary<=windowEnd;boundary+=WINDOW_SECONDS){const x=xForTime(boundary,windowStart,plotLeft,plotWidth);if(x<plotLeft-1||x>plotRight+1)continue;ctx.beginPath();ctx.strokeStyle='#b27718';ctx.lineWidth=2;ctx.moveTo(x,state.top-16);ctx.lineTo(x,height-state.bottom);ctx.stroke();ctx.fillStyle='#8a5a10';ctx.font='800 9px system-ui,-apple-system,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('30 s epoch',x,state.top-20);}
 channels.forEach((channel,index)=>{const y=state.top+index*state.rowHeight+state.rowHeight/2;ctx.beginPath();ctx.strokeStyle='#e3eaee';ctx.lineWidth=1;ctx.moveTo(0,y+state.rowHeight/2);ctx.lineTo(width,y+state.rowHeight/2);ctx.stroke();ctx.beginPath();ctx.strokeStyle='#d8e2e7';ctx.setLineDash([3,4]);ctx.moveTo(plotLeft,y);ctx.lineTo(plotRight,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#17344a';ctx.font=(width<520?'700 9px':'700 11px')+' system-ui,-apple-system,Segoe UI,sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(channel.label,width<520?5:8,y);});
 ctx.beginPath();ctx.strokeStyle='#1d7396';ctx.lineWidth=1.5;ctx.moveTo(plotRight,state.top-16);ctx.lineTo(plotRight,height-state.bottom);ctx.stroke();ctx.fillStyle='#1d7396';ctx.textAlign='right';ctx.font='800 9px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText('NOW',plotRight-2,height-7);
 return {plotLeft,plotRight,plotWidth,windowStart};
}
function drawSignals(elapsed,grid){
 const step=state.width<520?2.4:1.8;const points=Math.max(120,Math.ceil(grid.plotWidth/step));
 channels.forEach((channel,index)=>{const y0=state.top+index*state.rowHeight+state.rowHeight/2,scale=amplitudeScale(channel);ctx.beginPath();ctx.strokeStyle=channel.kind==='spo2'?'#274f65':'#112f40';ctx.lineWidth=channel.kind==='eeg'||channel.kind==='eog'?1.05:1;for(let i=0;i<=points;i+=1){const ratio=i/points,t=grid.windowStart+ratio*WINDOW_SECONDS,x=grid.plotLeft+ratio*grid.plotWidth,y=y0-clamp(sample(channel,t)*scale,-state.rowHeight*.42,state.rowHeight*.42);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();});
}
function updateStatus(elapsed){const epoch=Math.floor(elapsed/WINDOW_SECONDS)+1;if(status.mode)status.mode.textContent=state.running?'Running':'Paused';if(status.elapsed)status.elapsed.textContent=elapsed.toFixed(1)+' s';if(status.epoch)status.epoch.textContent='Epoch '+epoch;if(status.window)status.window.textContent=WINDOW_SECONDS.toFixed(1)+' s / screen';if(status.event)status.event.textContent=eventLabel(elapsed);host.dataset.livePsgState=state.running?'running':'paused';canvas.dataset.windowStart=(elapsed-WINDOW_SECONDS).toFixed(3);canvas.dataset.windowEnd=elapsed.toFixed(3);}
function paint(){const elapsed=elapsedNow();const grid=drawGrid(elapsed);drawSignals(elapsed,grid);updateStatus(elapsed);}
function frame(now){if(!state.running)return;if(!state.lastPaint||now-state.lastPaint>=15){paint();state.lastPaint=now;}state.raf=requestAnimationFrame(frame);}
function start(){if(state.running)return;state.running=true;state.runStartedAt=performance.now();state.lastPaint=0;startButton.disabled=true;pauseButton.disabled=false;paint();state.raf=requestAnimationFrame(frame);}
function pause(){if(!state.running)return;state.elapsedBase=elapsedNow();state.running=false;cancelAnimationFrame(state.raf);state.raf=0;startButton.disabled=false;pauseButton.disabled=true;paint();}
function restart(){state.elapsedBase=0;state.runStartedAt=performance.now();if(!state.running){startButton.disabled=false;pauseButton.disabled=true;}paint();}
startButton.addEventListener('click',start);pauseButton.addEventListener('click',pause);restartButton.addEventListener('click',restart);
if(key)key.innerHTML=channels.map(channel=>'<span>'+channel.label+'</span>').join('');
host.dataset.secondsPerScreen=String(WINDOW_SECONDS);canvas.dataset.secondsPerScreen=String(WINDOW_SECONDS);canvas.dataset.scrollDirection='right-to-left';canvas.setAttribute('aria-label','Synthetic live polysomnogram with 12 synchronized channels. One full signal window equals 30 seconds of real time.');
sizeCanvas();paint();
if(window.ResizeObserver){new ResizeObserver(()=>{sizeCanvas();paint();}).observe(host.querySelector('.live-psg-screen'));}else window.addEventListener('resize',()=>{sizeCanvas();paint();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running)pause();});
})();