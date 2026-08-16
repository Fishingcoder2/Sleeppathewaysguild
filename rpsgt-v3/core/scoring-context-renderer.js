(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.RPSGTScoringContextRenderer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='1.1.0',TAU=Math.PI*2,LABEL_WIDTH=118,TOP=36,BOTTOM=28,ROW=62;
const FREQUENCY_BANDS=Object.freeze({slowWave:[0.5,2],thetaLamf:[4,7],alpha:[8,13],spindle:[11,16],spindleCommon:[12,14],sawtooth:[2,6],betaMin:14,arousalFast:[16,30]});
const TEACHING_FREQUENCIES=Object.freeze({slowLow:.9,slowHigh:1.4,sawtooth:3.2,thetaLow:4.7,thetaMid:5.6,thetaHigh:6.6,alpha:10,beta:18,spindle:13.2,arousalLow:16.8,arousalMid:21.6,arousalHigh:27.4});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const gauss=(x,c,w)=>Math.exp(-Math.pow((x-c)/Math.max(.001,w),2));
const jitter=(t,p)=>.055*Math.sin(TAU*17.3*t+p)+.035*Math.sin(TAU*23.7*t+p*.7)+.022*Math.sin(TAU*31.1*t+.3+p);
const mod=(t,f,p,rate=.08,depth=.08)=>Math.sin(TAU*f*t+p+depth*Math.sin(TAU*rate*t+p*.6));
function thetaLamf(t,p,profile){
  if(profile==='N1')return .34*mod(t,4.45,p,.071,.13)+.29*mod(t,5.45,p*.83+.55,.083,.12)+.21*mod(t,6.45,p*1.13+.95,.097,.11)+.075*mod(t,9.4,p*.57+.3,.111,.06)+.045*mod(t,15.4,p*.41+.8,.137,.05)+jitter(t,p);
  if(profile==='R')return .29*mod(t,4.55,p+.15,.079,.12)+.25*mod(t,5.55,p*.81+.52,.087,.11)+.19*mod(t,6.55,p*1.09+.91,.101,.10)+.09*mod(t,9.3,p*.53+.28,.119,.06)+.06*mod(t,16.2,p*.43+.76,.149,.05)+jitter(t,p+.3);
  return .32*mod(t,4.75,p,.075,.12)+.27*mod(t,5.65,p*.85+.51,.085,.11)+.20*mod(t,6.55,p*1.07+.96,.099,.10)+.08*mod(t,9.6,p*.49+.28,.117,.06)+.05*mod(t,15.2,p*.39+.72,.145,.05)+jitter(t,p+.15);
}
function wakeEEG(t,p){return .68*mod(t,TEACHING_FREQUENCIES.alpha,p,.055,.05)+.14*mod(t,11.2,p*.7+.2,.071,.04)+.12*mod(t,TEACHING_FREQUENCIES.beta,p*.45+.6,.109,.04)+.08*mod(t,TEACHING_FREQUENCIES.thetaHigh,p*.83+.4,.083,.07)+.35*jitter(t,p);}
function n3EEG(t,p){return .62*mod(t,TEACHING_FREQUENCIES.slowLow,p,.041,.09)+.34*mod(t,TEACHING_FREQUENCIES.slowHigh,p*.73+.45,.053,.08)+.07*mod(t,TEACHING_FREQUENCIES.thetaMid,p*.51+.61,.091,.06)+.22*jitter(t,p);}
const fast=(t,p)=>.32*Math.sin(TAU*14.5*t+p)+.22*Math.sin(TAU*19.2*t+.4+p)+.12*Math.sin(TAU*25.7*t+p*.8);
const arousalFast=(t,p)=>.46*Math.sin(TAU*TEACHING_FREQUENCIES.arousalLow*t+p)+.28*Math.sin(TAU*TEACHING_FREQUENCIES.arousalMid*t+.4+p)+.14*Math.sin(TAU*TEACHING_FREQUENCIES.arousalHigh*t+p*.8);
const breath=(t,p)=>Math.sin(TAU*(.235+.012*Math.sin(TAU*.018*t+p))*t+p)*(.92+.09*Math.sin(TAU*.031*t+p*.4));
const inWindow=(t,start,end)=>t>=Number(start)&&t<=Number(end);
function rowsFor(study){if(study.kind==='limb')return [{label:'C3-M2',type:'eeg'},{label:'Chin EMG',type:'chin'},{label:'L Leg',type:'leg-left'},{label:'R Leg',type:'leg-right'},{label:'Nasal pressure',type:'airflow'}];if(study.kind==='boundary')return [{label:'C3-M2',type:'eeg'},{label:'Nasal pressure',type:'airflow'},{label:'Thermistor',type:'thermal'},{label:'Thorax',type:'thorax'},{label:'Abdomen',type:'abdomen'}];return [{label:'F3-M2',type:'eeg'},{label:'C3-M2',type:'eeg'},{label:'E1-M2',type:'eog-left'},{label:'E2-M2',type:'eog-right'},{label:'Chin EMG',type:'chin'}];}
function stageEEG(study,t,phase){
  const stage=String(study.stage||'N2').toUpperCase();
  let value=stage==='W'?wakeEEG(t,phase):stage==='N1'?thetaLamf(t,phase,'N1'):stage==='N3'?n3EEG(t,phase):stage==='R'?thetaLamf(t,phase,'R'):thetaLamf(t,phase,'N2');
  if(stage==='N2'){
    const spindleWindow=(t>7&&t<8.2)||(t>13.2&&t<14.2),spindle=spindleWindow?.38*Math.sin(TAU*TEACHING_FREQUENCIES.spindle*t):0;
    value+=.055*mod(t,TEACHING_FREQUENCIES.slowHigh,phase+.3,.049,.05)+spindle;
  }
  if(stage==='R'&&study.sawtooth===true)value+=.12*mod(t,TEACHING_FREQUENCIES.sawtooth,phase+.4,.067,.06);
  if(study.kind==='transition'&&Number.isFinite(Number(study.wakeStart))&&t>=Number(study.wakeStart))value=wakeEEG(t,phase);
  const aStart=Number(study.arousalStart),aEnd=aStart+Number(study.arousalDuration||0);
  if(Number.isFinite(aStart)&&inWindow(t,aStart,aEnd)){
    const edge=Math.min(1,(t-aStart)/.08,(aEnd-t)/.08),mix=Math.max(0,edge);
    value=(1-.72*mix)*value+mix*(1.32*arousalFast(t,phase+.2));
  }
  return value;
}
function eye(study,t,polarity,phase){const stage=String(study.stage||'N2').toUpperCase(),cerebral=.45*stageEEG(study,t,phase);if(stage==='R')return cerebral+polarity*(.54*Math.sin(TAU*.42*t+phase)+.72*(gauss(t,8.4,.09)-gauss(t,8.7,.12))-.62*(gauss(t,21.2,.08)-gauss(t,21.5,.12)));return cerebral+polarity*.18*Math.sin(TAU*.12*t+phase);}
function chin(study,t,phase){const stage=String(study.stage||'N2').toUpperCase();let value=(stage==='R'?.08:.2)*fast(t,phase);const aStart=Number(study.arousalStart),aEnd=aStart+Number(study.arousalDuration||0);if(study.chinRise===true&&Number.isFinite(aStart)&&inWindow(t,aStart,aEnd))value+=.9*fast(t,phase+.4);if(study.kind==='transition'&&Number.isFinite(Number(study.wakeStart))&&t>=Number(study.wakeStart))value+=.65*fast(t,phase+.7);return value;}
function leg(study,t,side){let value=.05*fast(t,side==='left'?.4:1.1);for(const center of Array.isArray(study.legBursts)?study.legBursts:[]){const offset=side==='right'?.12:0,env=gauss(t,Number(center)+offset,.42);value+=env*(1.35*fast(t,side==='left'?.2:.9)+.58*Math.sin(TAU*7*t));}return value;}
function respiratoryAmplitude(study,t){for(const event of Array.isArray(study.respEvents)?study.respEvents:[]){if(inWindow(t,event.start,event.end))return .16;}if(study.respEvent&&inWindow(t,study.respEvent.start,study.respEvent.end))return .08;return 1;}
function sample(study,row,t,index){const p=.31+index*.83;if(row.type==='eeg')return stageEEG(study,t,p);if(row.type==='eog-left')return eye(study,t,1,p);if(row.type==='eog-right')return eye(study,t,-1,p);if(row.type==='chin')return chin(study,t,p);if(row.type==='leg-left')return leg(study,t,'left');if(row.type==='leg-right')return leg(study,t,'right');if(row.type==='airflow')return breath(t,p)*respiratoryAmplitude(study,t);if(row.type==='thermal')return .82*breath(t,p+.06)*respiratoryAmplitude(study,t);if(row.type==='thorax')return breath(t,p+.12)*(study.respEvent&&inWindow(t,study.respEvent.start,study.respEvent.end)?1.22:1);if(row.type==='abdomen')return breath(t,p+.22)*(study.respEvent&&inWindow(t,study.respEvent.start,study.respEvent.end)?1.18:1);return 0;}
function scale(row){if(row.type==='eeg')return 19;if(row.type.startsWith('eog'))return 20;if(row.type==='chin')return 20;if(row.type.startsWith('leg'))return 18;return 18;}
function render(canvas,study,options){if(!canvas||!study)return null;const duration=Math.max(30,Number(study.durationSeconds||30)),rows=rowsFor(study),width=Math.max(duration>30?1120:900,Math.floor(options&&options.width||canvas.parentElement&&canvas.parentElement.clientWidth||960)),height=TOP+BOTTOM+rows.length*ROW,ratio=Math.min(2,Math.max(1,typeof window!=='undefined'&&window.devicePixelRatio||1));canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);const left=LABEL_WIDTH,right=width-14,plot=right-left,tick=duration>=90?15:5;for(let seconds=0;seconds<=duration;seconds+=tick){const x=left+seconds/duration*plot;ctx.beginPath();ctx.strokeStyle=seconds%(tick*2)===0?'#cad9e2':'#ebf1f4';ctx.lineWidth=seconds%(tick*2)===0?1.05:.7;ctx.moveTo(x,TOP-14);ctx.lineTo(x,height-BOTTOM);ctx.stroke();ctx.fillStyle='#5d707b';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText(seconds+' s',x,15);}rows.forEach((row,index)=>{const y0=TOP+index*ROW+ROW/2;ctx.fillStyle='#17344a';ctx.font='700 12px system-ui';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(row.label,10,y0);ctx.beginPath();ctx.strokeStyle='#dfe9ee';ctx.setLineDash([3,5]);ctx.moveTo(left,y0);ctx.lineTo(right,y0);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.strokeStyle='#183746';ctx.lineWidth=row.type==='eeg'?1.15:1.25;const points=Math.max(1800,Math.round(duration*120));for(let i=0;i<points;i++){const t=duration*i/(points-1),x=left+t/duration*plot,y=y0-clamp(sample(study,row,t,index)*scale(row),-ROW*.4,ROW*.4);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();});const boundary=Number(study.epochBoundary);if(Number.isFinite(boundary)&&boundary>0&&boundary<duration){const x=left+boundary/duration*plot;ctx.beginPath();ctx.strokeStyle='#9a6612';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.moveTo(x,TOP-12);ctx.lineTo(x,height-BOTTOM);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#80530d';ctx.font='800 12px system-ui';ctx.textAlign='center';ctx.fillText('epoch boundary',x,TOP-20);}canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Original Sleep Pathways Guild ${duration}-second scoring-context teaching schematic.`);return {width,height,duration,rows:rows.map(row=>row.label)};}
return {VERSION,FREQUENCY_BANDS,TEACHING_FREQUENCIES,render,sample,rowsFor};
});
