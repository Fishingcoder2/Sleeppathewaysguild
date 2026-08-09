(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTVisualPSGRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='0.1.0';
  const LABEL_WIDTH=112;
  const TOP_PAD=34;
  const BOTTOM_PAD=26;
  const ROW_HEIGHT=58;
  const TAU=Math.PI*2;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const gauss=(x,center,width)=>Math.exp(-Math.pow((x-center)/width,2));
  function deterministicNoise(t,phase){return Math.sin(TAU*17.3*t+phase)*0.35+Math.sin(TAU*23.7*t+phase*1.7)*0.22+Math.sin(TAU*31.1*t+0.4+phase)*0.12;}
  function featureValue(channel,t){
    let value=0;
    (Array.isArray(channel.features)?channel.features:[]).forEach(feature=>{
      const strength=Number(feature.strength||1);
      if(feature.type==='spindle'){
        const start=Number(feature.start||0),end=Number(feature.end||start),mid=(start+end)/2,width=Math.max(.2,(end-start)/2.25),frequency=Number(feature.frequency||13);
        value+=gauss(t,mid,width)*Math.sin(TAU*frequency*t)*1.25*strength;
      }else if(feature.type==='k-complex'){
        const center=Number(feature.center||0);
        value+=(-1.5*gauss(t,center-.18,.13)+2.15*gauss(t,center+.12,.22)-.75*gauss(t,center+.58,.28))*strength;
      }
    });
    return value;
  }
  function sample(channel,t){
    const amp=Number(channel.amplitude||.6),phase=Number(channel.phase||0);
    if(channel.type==='eeg'){
      const background=.34*Math.sin(TAU*5.4*t+phase)+.22*Math.sin(TAU*7.2*t+phase*.7)+.08*deterministicNoise(t,phase);
      return amp*(background+featureValue(channel,t));
    }
    if(channel.type==='eog') return amp*(.62*Math.sin(TAU*.18*t+phase)+.18*Math.sin(TAU*.55*t+phase*.6));
    if(channel.type==='emg') return amp*(.38*deterministicNoise(t,phase)+.16*Math.sin(TAU*42*t+phase));
    if(channel.type==='resp') return amp*Math.sin(TAU*Number(channel.frequency||.24)*t+phase);
    if(channel.type==='spo2') return amp*(.16*Math.sin(TAU*.035*t+phase)+.05*Math.sin(TAU*.18*t));
    if(channel.type==='ecg'){
      const period=60/Number(channel.heartRate||66),position=((t+.08)%period+period)%period;
      return amp*(-.22*gauss(position,.06,.018)+1.7*gauss(position,.095,.014)-.45*gauss(position,.135,.02)+.28*gauss(position,.31,.075));
    }
    return amp*Math.sin(TAU*t+phase);
  }
  function rowScale(type){return type==='ecg'?16:type==='emg'?22:type==='spo2'?28:type==='resp'?18:20;}
  function drawGrid(ctx,width,height,duration,channels){
    const plotLeft=LABEL_WIDTH,plotRight=width-12,plotWidth=plotRight-plotLeft;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
    ctx.font='12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.textBaseline='middle';
    for(let second=0;second<=duration;second+=1){
      const x=plotLeft+(second/duration)*plotWidth;
      ctx.beginPath();ctx.strokeStyle=second%5===0?'#c7d9e3':'#edf3f6';ctx.lineWidth=second%5===0?1.1:.7;ctx.moveTo(x,TOP_PAD-12);ctx.lineTo(x,height-BOTTOM_PAD);ctx.stroke();
      if(second%5===0&&second<duration){ctx.fillStyle='#5d707b';ctx.textAlign='center';ctx.fillText(second+' s',x+2,14);}
    }
    channels.forEach((channel,index)=>{
      const y=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2;
      ctx.beginPath();ctx.strokeStyle='#e3edf2';ctx.lineWidth=1;ctx.moveTo(0,y+ROW_HEIGHT/2);ctx.lineTo(width,y+ROW_HEIGHT/2);ctx.stroke();
      ctx.fillStyle='#17344a';ctx.textAlign='left';ctx.font='700 12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(channel.label,10,y);
      ctx.beginPath();ctx.strokeStyle='#dbe7ed';ctx.setLineDash([3,5]);ctx.moveTo(plotLeft,y);ctx.lineTo(plotRight,y);ctx.stroke();ctx.setLineDash([]);
    });
    ctx.fillStyle='#5d707b';ctx.textAlign='right';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(duration+' s',plotRight,height-10);
  }
  function drawSignal(ctx,channel,index,width,duration,sampleRate){
    const plotLeft=LABEL_WIDTH,plotRight=width-12,plotWidth=plotRight-plotLeft,y0=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2,scale=rowScale(channel.type);
    const points=Math.max(2,Math.round(duration*sampleRate));
    ctx.beginPath();ctx.strokeStyle=channel.type==='spo2'?'#215c74':'#132f3f';ctx.lineWidth=channel.type==='eeg'||channel.type==='eog'?1.15:1.05;
    for(let i=0;i<points;i+=1){
      const t=(i/(points-1))*duration,x=plotLeft+(t/duration)*plotWidth,y=y0-clamp(sample(channel,t)*scale,-ROW_HEIGHT*.42,ROW_HEIGHT*.42);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  function render(canvas,study,options){
    if(!canvas||!study) return null;
    const channels=Array.isArray(study.channels)?study.channels:[],duration=Number(study.durationSeconds||30),sampleRate=Math.min(250,Math.max(25,Number(study.sampleRate||100)));
    const cssWidth=Math.max(860,Math.floor((options&&options.width)||canvas.parentElement&&canvas.parentElement.clientWidth||960));
    const cssHeight=TOP_PAD+BOTTOM_PAD+channels.length*ROW_HEIGHT;
    const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    canvas.style.width=cssWidth+'px';canvas.style.height=cssHeight+'px';canvas.width=Math.round(cssWidth*ratio);canvas.height=Math.round(cssHeight*ratio);
    const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);drawGrid(ctx,cssWidth,cssHeight,duration,channels);channels.forEach((channel,index)=>drawSignal(ctx,channel,index,cssWidth,duration,sampleRate));
    return {width:cssWidth,height:cssHeight,labelWidth:LABEL_WIDTH,plotRight:cssWidth-12,duration,rowHeight:ROW_HEIGHT,topPad:TOP_PAD,channels:channels.map(channel=>channel.label)};
  }
  function regionStyle(metrics,region){
    const plotWidth=metrics.plotRight-metrics.labelWidth;
    return {left:metrics.labelWidth+(Number(region.start)/metrics.duration)*plotWidth,width:((Number(region.end)-Number(region.start))/metrics.duration)*plotWidth};
  }
  return {VERSION,LABEL_WIDTH,TOP_PAD,BOTTOM_PAD,ROW_HEIGHT,sample,render,regionStyle};
});
