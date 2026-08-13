(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTVisualPSGRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='0.2.0';
  const LABEL_WIDTH=118;
  const TOP_PAD=34;
  const BOTTOM_PAD=26;
  const ROW_HEIGHT=58;
  const TAU=Math.PI*2;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const gauss=(x,center,width)=>Math.exp(-Math.pow((x-center)/Math.max(.001,width),2));
  const deterministicNoise=(t,phase)=>Math.sin(TAU*17.1*t+phase)*.34+Math.sin(TAU*23.3*t+phase*1.7)*.21+Math.sin(TAU*31.7*t+.4+phase)*.11;
  const featureList=channel=>Array.isArray(channel&&channel.features)?channel.features:[];
  function smoothGate(t,start,end,edge){
    if(t<start||t>end)return 0;
    const width=Math.max(.05,Number(edge||.4));
    return Math.min(1,(t-start)/width,(end-t)/width);
  }
  function eventAt(channel,type,t){return featureList(channel).find(feature=>feature&&feature.type===type&&t>=Number(feature.start||0)&&t<=Number(feature.end||feature.start||0))||null;}
  function featureOf(channel,type){return featureList(channel).find(feature=>feature&&feature.type===type)||null;}
  function heartCyclesAt(t,heartRate,phase){
    const baseHz=Math.max(.35,Number(heartRate||66)/60),p=Number(phase||0);
    return baseHz*t+.02*Math.sin(TAU*.10*t+p)+.007*Math.sin(TAU*.22*t+.6+p*.7);
  }
  function cycleDistance(position,center){const d=Math.abs(position-center);return Math.min(d,1-d);}
  function cycleGauss(position,center,width){return Math.exp(-Math.pow(cycleDistance(position,center)/Math.max(.001,width),2));}
  function ecgTemplate(cycle){return .14*cycleGauss(cycle,.18,.045)-.18*cycleGauss(cycle,.365,.015)+1.65*cycleGauss(cycle,.40,.011)-.44*cycleGauss(cycle,.438,.019)+.29*cycleGauss(cycle,.69,.072);}
  function eegContext(channel,t){
    const phase=Number(channel.phase||0),base=.18*Math.sin(TAU*5.4*t+phase)+.12*Math.sin(TAU*7.2*t+phase*.7)+.05*Math.sin(TAU*10.2*t+1.1+phase*.4)+.035*deterministicNoise(t,phase);
    const arousal=eventAt(channel,'arousal',t);
    if(!arousal)return base;
    const gate=smoothGate(t,Number(arousal.start),Number(arousal.end),.18);
    return base+gate*(.12*Math.sin(TAU*15.5*t+phase)+.08*Math.sin(TAU*20.4*t+.5));
  }
  function baseBreath(channel,t,phaseOverride){
    const freq=Number(channel.frequency||.24),phase=Number.isFinite(Number(phaseOverride))?Number(phaseOverride):Number(channel.phase||0),p=TAU*freq*t+phase;
    return Math.sin(p)+.08*Math.sin(2*p+.8);
  }
  function periodicEnvelope(channel,t){
    const feature=featureOf(channel,'periodic-breathing');
    if(!feature)return 1;
    const start=Number(feature.start||0),end=Number(feature.end||Infinity);
    if(t<start||t>end)return 1;
    const cycle=Math.max(20,Number(feature.cycleSeconds||60));
    const pause=Math.max(0,Math.min(cycle*.45,Number(feature.pauseSeconds||0)));
    const minFactor=clamp(Number(feature.minFactor==null?.03:feature.minFactor),0,.95);
    const power=Math.max(.5,Number(feature.power||1.35));
    const phaseOffset=Number(feature.phaseOffsetSeconds||0);
    const position=(((t-start+phaseOffset)%cycle)+cycle)%cycle;
    if(position<pause)return minFactor;
    const active=(position-pause)/Math.max(.001,cycle-pause);
    const wax=Math.pow(Math.max(0,Math.sin(Math.PI*active)),power);
    return minFactor+(1-minFactor)*wax;
  }
  function airflowValue(channel,t){
    const phase=Number(channel.phase||0),profile=channel.profile||'nasal',freq=Number(channel.frequency||.24),p=TAU*freq*t+phase;
    let value=profile==='thermal'?Math.sin(p):Math.sin(p)+.22*Math.sin(2*p+1.05)+.06*Math.sin(3*p+.3);
    value*=periodicEnvelope(channel,t);
    const suppress=eventAt(channel,'airflow-suppress',t);
    if(suppress){const gate=smoothGate(t,Number(suppress.start),Number(suppress.end),.45),depth=clamp(Number(suppress.depth||.96),0,1);value*=1-gate*depth;}
    const limitation=eventAt(channel,'flow-limitation',t);
    if(limitation){const gate=smoothGate(t,Number(limitation.start),Number(limitation.end),.5),depth=clamp(Number(limitation.depth||.5),0,1),inspiratory=Math.max(0,value),plateau=Math.tanh(inspiratory*1.8)/1.8;value=(1-gate)*value+gate*((value<0?value*(1-depth*.35):((1-depth)*inspiratory+depth*plateau)));}
    const loss=eventAt(channel,'signal-loss',t);
    if(loss){const gate=smoothGate(t,Number(loss.start),Number(loss.end),.18);value=(1-gate)*value+gate*(.025*deterministicNoise(t,phase));}
    return value+.018*deterministicNoise(t,phase);
  }
  function effortValue(channel,t){
    const phase=Number(channel.phase||0),profile=channel.profile||'thorax';
    let phaseNow=phase;
    const paradox=eventAt(channel,'paradox',t);
    if(paradox&&profile==='abdomen')phaseNow+=Math.PI*smoothGate(t,Number(paradox.start),Number(paradox.end),.35);
    let value=baseBreath(channel,t,phaseNow)*periodicEnvelope(channel,t);
    const suppress=eventAt(channel,'effort-suppress',t);
    if(suppress){const gate=smoothGate(t,Number(suppress.start),Number(suppress.end),.4),depth=clamp(Number(suppress.depth||.98),0,1);value*=1-gate*depth;}
    const returning=eventAt(channel,'effort-return',t);
    if(returning){const start=Number(returning.start),end=Number(returning.end),returnAt=Number(returning.returnAt||((start+end)/2));if(t>=start&&t<returnAt)value*=.025;else if(t>=returnAt&&t<=end){const ramp=clamp((t-returnAt)/Math.max(.5,end-returnAt),0,1);value*=.25+.95*ramp;}}
    const ramp=eventAt(channel,'effort-ramp',t);
    if(ramp){const start=Number(ramp.start),end=Number(ramp.end),progress=clamp((t-start)/Math.max(.001,end-start),0,1),gain=Number(ramp.gain||.6);value*=1+gain*progress;}
    const sumLoss=eventAt(channel,'sum-diminish',t);
    if(sumLoss){const gate=smoothGate(t,Number(sumLoss.start),Number(sumLoss.end),.35),depth=clamp(Number(sumLoss.depth||.8),0,1);value*=1-gate*depth;}
    return value+.015*deterministicNoise(t,phase);
  }
  function snoreValue(channel,t){
    let value=.012*deterministicNoise(t,Number(channel.phase||0));
    featureList(channel).filter(feature=>feature.type==='snore-burst').forEach(feature=>{
      const gate=smoothGate(t,Number(feature.start),Number(feature.end),.18),strength=Number(feature.strength||1),phase=Number(channel.phase||0);
      value+=gate*strength*(.42*Math.sin(TAU*18*t+phase)+.28*Math.sin(TAU*27*t+1.2)+.18*deterministicNoise(t,phase));
    });
    return value;
  }
  function periodicLowVentilation(feature,t){
    const cycle=Math.max(20,Number(feature.cycleSeconds||60)),delay=Number(feature.delaySeconds||0),pause=Math.max(0,Math.min(cycle*.45,Number(feature.pauseSeconds||0))),start=Number(feature.start||0),shifted=t-delay;
    if(shifted<start||shifted>Number(feature.end||Infinity))return 0;
    const pos=(((shifted-start)%cycle)+cycle)%cycle;
    if(pos<pause)return 1;
    const active=(pos-pause)/Math.max(.001,cycle-pause);
    return 1-Math.pow(Math.max(0,Math.sin(Math.PI*active)),1.25);
  }
  function spo2Value(channel,t){
    const phase=Number(channel.phase||0);let value=.018*Math.sin(TAU*.035*t+phase)+.008*Math.sin(TAU*.12*t+.6);
    featureList(channel).filter(feature=>feature.type==='desaturation').forEach(feature=>{
      const start=Number(feature.start),nadir=Number(feature.nadir||((Number(feature.start)+Number(feature.end))/2)),end=Number(feature.end),strength=Number(feature.strength||1);
      if(t>=start&&t<=end){const down=clamp((t-start)/Math.max(.2,nadir-start),0,1),up=clamp((end-t)/Math.max(.2,end-nadir),0,1),shape=Math.min(down,up);value-=shape*.72*strength;}
    });
    featureList(channel).filter(feature=>feature.type==='periodic-desaturation').forEach(feature=>{value-=periodicLowVentilation(feature,t)*Number(feature.strength||.28);});
    return value;
  }
  function capnogramCycle(position){
    if(position<.12)return -.35;
    if(position<.22)return -.35+((position-.12)/.10)*1.05;
    if(position<.62)return .70+.05*Math.sin(((position-.22)/.40)*Math.PI);
    if(position<.70)return .70-((position-.62)/.08)*1.05;
    return -.35;
  }
  function co2Value(channel,t){
    const freq=Number(channel.frequency||.24),phase=Number(channel.phase||0),cycle=((freq*t+phase/TAU)%1+1)%1;let value=capnogramCycle(cycle);
    const loss=eventAt(channel,'co2-loss',t);
    if(loss){const gate=smoothGate(t,Number(loss.start),Number(loss.end),.35);value=(1-gate)*value+gate*(-.34+.01*deterministicNoise(t,phase));}
    featureList(channel).filter(feature=>feature.type==='periodic-co2').forEach(feature=>{value+=periodicLowVentilation(feature,t)*Number(feature.strength||.10);});
    return value;
  }
  function sample(channel,t){
    const amp=Number(channel.amplitude||.6),phase=Number(channel.phase||0);
    if(channel.type==='eeg')return amp*eegContext(channel,t);
    if(channel.type==='airflow')return amp*airflowValue(channel,t);
    if(channel.type==='effort')return amp*effortValue(channel,t);
    if(channel.type==='snore')return amp*snoreValue(channel,t);
    if(channel.type==='spo2')return amp*spo2Value(channel,t);
    if(channel.type==='co2')return amp*co2Value(channel,t);
    if(channel.type==='ecg'){
      const cycles=heartCyclesAt(t,Number(channel.heartRate||66),phase),position=((cycles%1)+1)%1,baseline=.012*Math.sin(TAU*.25*t+phase)+.007*deterministicNoise(t,phase);
      return amp*(ecgTemplate(position)+baseline);
    }
    return amp*baseBreath(channel,t,phase);
  }
  function rowScale(channel){
    if(channel.type==='ecg')return 16;
    if(channel.type==='spo2')return 29;
    if(channel.type==='snore')return 18;
    if(channel.type==='co2')return 18;
    if(channel.type==='airflow')return 17;
    if(channel.type==='effort')return 17;
    if(channel.type==='eeg')return 20;
    return 18;
  }
  function gridPlan(duration){
    if(duration>180)return {minor:30,major:60,label:60};
    if(duration>45)return {minor:10,major:30,label:30};
    return {minor:1,major:5,label:5};
  }
  function drawGrid(ctx,width,height,duration,channels){
    const plotLeft=LABEL_WIDTH,plotRight=width-12,plotWidth=plotRight-plotLeft,plan=gridPlan(duration);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.font='12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.textBaseline='middle';
    for(let second=0;second<=duration;second+=plan.minor){
      const x=plotLeft+(second/duration)*plotWidth,isMinute=second>0&&second%60===0,isMajor=second%plan.major===0;
      ctx.beginPath();ctx.strokeStyle=isMinute?'#9fbac8':isMajor?'#c7d9e3':'#edf3f6';ctx.lineWidth=isMinute?1.6:isMajor?1.15:.7;ctx.moveTo(x,TOP_PAD-12);ctx.lineTo(x,height-BOTTOM_PAD);ctx.stroke();
      if(second%plan.label===0&&second<duration){ctx.fillStyle='#5d707b';ctx.textAlign='center';ctx.fillText(duration>180&&second%60===0?(second/60)+' min':second+' s',x+2,14);}
    }
    channels.forEach((channel,index)=>{
      const y=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2;ctx.beginPath();ctx.strokeStyle='#e3edf2';ctx.lineWidth=1;ctx.moveTo(0,y+ROW_HEIGHT/2);ctx.lineTo(width,y+ROW_HEIGHT/2);ctx.stroke();ctx.fillStyle='#17344a';ctx.textAlign='left';ctx.font='700 12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(channel.label,10,y);ctx.beginPath();ctx.strokeStyle='#dbe7ed';ctx.setLineDash([3,5]);ctx.moveTo(plotLeft,y);ctx.lineTo(plotRight,y);ctx.stroke();ctx.setLineDash([]);
    });
    ctx.fillStyle='#5d707b';ctx.textAlign='right';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(duration>=60?Math.round(duration/60*10)/10+' min':duration+' s',plotRight,height-10);
  }
  function drawSignal(ctx,channel,index,width,duration,sampleRate){
    const plotLeft=LABEL_WIDTH,plotRight=width-12,plotWidth=plotRight-plotLeft,y0=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2,scale=rowScale(channel),points=Math.max(2,Math.round(duration*sampleRate));
    ctx.beginPath();ctx.strokeStyle='#132f3f';ctx.lineWidth=1.0;
    for(let i=0;i<points;i+=1){const t=(i/(points-1))*duration,x=plotLeft+(t/duration)*plotWidth,y=y0-clamp(sample(channel,t)*scale,-ROW_HEIGHT*.42,ROW_HEIGHT*.42);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  }
  function render(canvas,study,options){
    if(!canvas||!study)return null;
    const channels=Array.isArray(study.channels)?study.channels:[],duration=Number(study.durationSeconds||30),requested=Number(study.sampleRate||50),sampleRate=duration>=240?Math.min(8,Math.max(4,requested)):Math.min(120,Math.max(25,requested)),cssWidth=Math.max(860,Math.floor((options&&options.width)||canvas.parentElement&&canvas.parentElement.clientWidth||960)),cssHeight=TOP_PAD+BOTTOM_PAD+channels.length*ROW_HEIGHT,ratio=Math.min(duration>=240?1.2:1.5,Math.max(1,window.devicePixelRatio||1));
    canvas.style.width=cssWidth+'px';canvas.style.height=cssHeight+'px';canvas.width=Math.round(cssWidth*ratio);canvas.height=Math.round(cssHeight*ratio);const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);drawGrid(ctx,cssWidth,cssHeight,duration,channels);channels.forEach((channel,index)=>drawSignal(ctx,channel,index,cssWidth,duration,sampleRate));
    return {width:cssWidth,height:cssHeight,labelWidth:LABEL_WIDTH,plotRight:cssWidth-12,duration,rowHeight:ROW_HEIGHT,topPad:TOP_PAD,bottomPad:BOTTOM_PAD,channels:channels.map(channel=>channel.label),sampleRate};
  }
  function channelBox(metrics,channelLabel){const index=metrics.channels.indexOf(String(channelLabel));if(index<0)return null;return {index,top:metrics.topPad+index*metrics.rowHeight,height:metrics.rowHeight};}
  function regionStyle(metrics,region,channelLabel){const plotWidth=metrics.plotRight-metrics.labelWidth,box=channelLabel?channelBox(metrics,channelLabel):null,result={left:metrics.labelWidth+(Number(region.start)/metrics.duration)*plotWidth,width:((Number(region.end)-Number(region.start))/metrics.duration)*plotWidth};if(box){result.top=box.top;result.height=box.height;}return result;}
  function targetStyle(metrics,target){return regionStyle(metrics,{start:target.start,end:target.end},target.channel);}
  function pointPosition(metrics,selection){const point=typeof selection==='string'?selection.match(/^(.+)@(-?\d+(?:\.\d+)?)$/):null,channel=point?point[1]:selection&&selection.channel,time=point?Number(point[2]):Number(selection&&selection.time),box=channelBox(metrics,channel);if(!box||!Number.isFinite(time))return null;const plotWidth=metrics.plotRight-metrics.labelWidth;return {left:metrics.labelWidth+(time/metrics.duration)*plotWidth,top:box.top+box.height/2,channel,time};}
  function hitTest(metrics,x,y){if(!metrics||x<metrics.labelWidth||x>metrics.plotRight||y<metrics.topPad)return null;const index=Math.floor((y-metrics.topPad)/metrics.rowHeight);if(index<0||index>=metrics.channels.length)return null;const plotWidth=metrics.plotRight-metrics.labelWidth,time=((x-metrics.labelWidth)/plotWidth)*metrics.duration;return {channel:metrics.channels[index],channelIndex:index,time:clamp(time,0,metrics.duration)};}
  return {VERSION,LABEL_WIDTH,TOP_PAD,BOTTOM_PAD,ROW_HEIGHT,heartCyclesAt,sample,render,channelBox,regionStyle,targetStyle,pointPosition,hitTest};
});