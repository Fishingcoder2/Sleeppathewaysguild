(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTVisualPSGRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='0.4.0';
  const LABEL_WIDTH=112;
  const TOP_PAD=34;
  const BOTTOM_PAD=26;
  const ROW_HEIGHT=58;
  const N3_ROW_SCALE=10;
  const TAU=Math.PI*2;
  const FREQUENCY_BANDS=Object.freeze({
    slowWave:[0.5,2],
    thetaLamf:[4,7],
    alpha:[8,13],
    spindle:[11,16],
    spindleCommon:[12,14],
    sawtooth:[2,6],
    betaMin:14
  });
  const TEACHING_FREQUENCIES=Object.freeze({
    alpha:10,
    beta:18,
    thetaLow:4.8,
    thetaMid:5.5,
    thetaHigh:6.5,
    slowLow:0.9,
    slowHigh:1.4,
    spindle:13,
    sawtooth:3.2
  });
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const gauss=(x,center,width)=>Math.exp(-Math.pow((x-center)/Math.max(.001,width),2));
  const deterministicNoise=(t,phase)=>Math.sin(TAU*17.3*t+phase)*.35+Math.sin(TAU*23.7*t+phase*1.7)*.22+Math.sin(TAU*31.1*t+.4+phase)*.12;
  const polarity=channel=>Number(channel.polarity||1)>=0?1:-1;
  const waxWane=(t,rate=.18,phase=0)=>.72+.28*(.5+.5*Math.sin(TAU*rate*t+phase));
  function envelope(t,start,end,edge){
    if(t<start||t>end)return 0;
    const width=Math.max(.05,Number(edge||.35));
    return Math.min(1,(t-start)/width,(end-t)/width);
  }
  function modulatedOscillation(t,frequency,phase,modRate=.09,phaseDepth=.12,amplitudeDepth=.18){
    const phaseJitter=phaseDepth*Math.sin(TAU*modRate*t+phase*.71)+phaseDepth*.45*Math.sin(TAU*(modRate*.47)*t+phase*1.31+.3);
    const amplitude=1+amplitudeDepth*Math.sin(TAU*(modRate*.63)*t+phase*.53+.2)+amplitudeDepth*.36*Math.sin(TAU*(modRate*.29)*t+phase*1.17);
    return amplitude*Math.sin(TAU*frequency*t+phase+phaseJitter);
  }
  function lamfTexture(t,phase,profile){
    const noise=deterministicNoise(t,phase);
    if(profile==='n1-lamf'){
      return .25*modulatedOscillation(t,4.42+.055*Math.sin(phase+.2),phase+.12,.083,.18,.22)
        +.21*modulatedOscillation(t,5.32+.070*Math.cos(phase*.9+.3),phase*.83+.62,.071,.16,.20)
        +.16*modulatedOscillation(t,6.31+.060*Math.sin(phase*1.2+.7),phase*1.11+1.08,.097,.14,.18)
        +.07*modulatedOscillation(t,9.1,phase*.57+.35,.113,.10,.12)
        +.045*modulatedOscillation(t,15.7,phase*.41+.81,.139,.08,.10)
        +.085*noise;
    }
    if(profile==='rem-lamf'){
      return .19*modulatedOscillation(t,4.68+.045*Math.sin(phase+.1),phase+.08,.091,.16,.18)
        +.18*modulatedOscillation(t,5.77+.060*Math.cos(phase*.8+.4),phase*.79+.48,.077,.15,.17)
        +.14*modulatedOscillation(t,6.66+.055*Math.sin(phase*1.1+.8),phase*1.13+.92,.101,.13,.16)
        +.085*modulatedOscillation(t,9.4,phase*.51+.23,.119,.10,.12)
        +.065*modulatedOscillation(t,16.4,phase*.43+.76,.151,.08,.10)
        +.09*noise;
    }
    return .23*modulatedOscillation(t,4.87+.050*Math.sin(phase+.15),phase+.10,.086,.16,.19)
      +.19*modulatedOscillation(t,5.72+.065*Math.cos(phase*.85+.35),phase*.85+.51,.074,.15,.18)
      +.145*modulatedOscillation(t,6.51+.055*Math.sin(phase*1.15+.75),phase*1.07+.96,.104,.13,.16)
      +.07*modulatedOscillation(t,9.6,phase*.49+.28,.121,.09,.11)
      +.05*modulatedOscillation(t,15.2,phase*.39+.72,.147,.08,.10)
      +.085*noise;
  }
  function eogCerebralTexture(t,phase){
    return .085*modulatedOscillation(t,4.7,phase+.34,.079,.13,.17)
      +.065*modulatedOscillation(t,6.2,phase*.79+.91,.103,.11,.15)
      +.035*modulatedOscillation(t,9.7,phase*.53+.28,.137,.08,.12)
      +.026*modulatedOscillation(t,16.1,phase*.41+.74,.163,.06,.10)
      +.055*deterministicNoise(t,phase+.29);
  }
  function slowEyeMovement(t,phase){
    const phaseDrift=.48*Math.sin(TAU*.037*t+phase*.47)+.17*Math.sin(TAU*.061*t+phase*1.13);
    const amplitude=.78+.17*Math.sin(TAU*.053*t+phase*.61)+.07*Math.sin(TAU*.029*t+phase*1.29);
    return amplitude*(.72*Math.sin(TAU*.18*t+phase+phaseDrift)+.17*Math.sin(TAU*.29*t+phase*.73+.54));
  }
  function featureValue(channel,t){
    let value=0;
    (Array.isArray(channel.features)?channel.features:[]).forEach(feature=>{
      const strength=Number(feature.strength||1);
      if(feature.type==='spindle'){
        const start=Number(feature.start||0),end=Number(feature.end||start),mid=(start+end)/2,width=Math.max(.2,(end-start)/2.35),frequency=Number(feature.frequency||TEACHING_FREQUENCIES.spindle);
        const spindleEnvelope=gauss(t,mid,width)*waxWane(t,.42,Number(channel.phase||0));
        value+=spindleEnvelope*Math.sin(TAU*frequency*t)*1.28*strength;
      }else if(feature.type==='k-complex'){
        const center=Number(feature.center||0);
        value+=(-1.45*gauss(t,center-.18,.14)+2.05*gauss(t,center+.16,.24)-.70*gauss(t,center+.62,.31))*strength;
      }else if(feature.type==='vertex'){
        const center=Number(feature.center||0);
        value+=(-1.72*gauss(t,center,.075)+.50*gauss(t,center+.14,.11))*strength;
      }else if(feature.type==='slow-wave'){
        const start=Number(feature.start||0),end=Number(feature.end||start),frequency=Number(feature.frequency||1.1),gate=envelope(t,start,end,.7);
        value+=gate*Math.sin(TAU*frequency*t+Number(channel.phase||0))*1.22*strength;
      }else if(feature.type==='sawtooth'){
        const start=Number(feature.start||0),end=Number(feature.end||start),frequency=Number(feature.frequency||TEACHING_FREQUENCIES.sawtooth),gate=envelope(t,start,end,.25),cycle=((t*frequency)%1+1)%1;
        value+=gate*(2*cycle-1)*.72*strength;
      }else if(feature.type==='eye-blink'){
        const center=Number(feature.center||0),sign=polarity(channel);
        value+=sign*(1.75*gauss(t,center,.17)-.52*gauss(t,center+.35,.24))*strength;
      }else if(feature.type==='rapid-eye'){
        const start=Number(feature.start||0),end=Number(feature.end||start),sign=polarity(channel),times=[start+.25,start+.85,start+1.55,start+2.25].filter(point=>point<=end);
        times.forEach((center,index)=>{value+=sign*(index%2===0?1:-1)*1.45*gauss(t,center,.10)*strength;});
      }
    });
    return value;
  }
  function eegBackground(channel,t){
    const profile=channel.profile||'n2-lamf',phase=Number(channel.phase||0),noise=.07*deterministicNoise(t,phase);
    const f=TEACHING_FREQUENCIES;
    if(profile==='wake-alpha'){
      const alphaEnvelope=waxWane(t,.12,phase);
      return alphaEnvelope*(.72*modulatedOscillation(t,f.alpha,phase,.061,.05,.10)+.12*modulatedOscillation(t,11.2,phase*.7+.2,.087,.05,.08))
        +.08*modulatedOscillation(t,f.beta,phase*.4+.5,.129,.04,.07)+noise*.45;
    }
    if(profile==='wake-mixed'){
      return .18*modulatedOscillation(t,f.alpha,phase,.073,.08,.12)
        +.15*modulatedOscillation(t,f.beta,phase*.6+.4,.131,.06,.10)
        +.17*modulatedOscillation(t,f.thetaHigh,phase*.8+.7,.089,.11,.14)
        +noise;
    }
    if(profile==='n1-lamf'||profile==='rem-lamf'||profile==='n2-lamf')return lamfTexture(t,phase,profile);
    if(profile==='n3-delta'){
      return .50*modulatedOscillation(t,f.slowLow,phase,.043,.10,.12)
        +.27*modulatedOscillation(t,f.slowHigh,phase*.7+.4,.057,.09,.11)
        +.07*modulatedOscillation(t,f.thetaMid,phase*.5+.6,.093,.08,.10)+noise*.35;
    }
    return lamfTexture(t,phase,'n2-lamf');
  }
  function sample(channel,t){
    const amp=Number(channel.amplitude||.6),phase=Number(channel.phase||0),features=featureValue(channel,t);
    if(channel.type==='eeg') return amp*(eegBackground(channel,t)+features);
    if(channel.type==='eog'){
      const texturePhase=phase+(polarity(channel)<0?.63:.17);
      let base=eogCerebralTexture(t,texturePhase);
      if(channel.profile==='slow-eye')base+=polarity(channel)*slowEyeMovement(t,phase);
      else if(channel.profile==='wake')base+=polarity(channel)*.17*modulatedOscillation(t,.12,phase,.031,.20,.18);
      else if(channel.profile==='rem')base+=polarity(channel)*.055*modulatedOscillation(t,.16,phase,.037,.18,.16);
      else base+=.045*modulatedOscillation(t,.12,phase,.031,.16,.14);
      return amp*(base+features);
    }
    if(channel.type==='emg'){
      const tone=channel.profile==='high-tone'?1.2:channel.profile==='medium-tone'?.9:channel.profile==='medium-low-tone'?.72:channel.profile==='low-tone'?.56:channel.profile==='rem-tone'?.28:.7;
      return amp*tone*(.48*deterministicNoise(t,phase)+.20*Math.sin(TAU*42*t+phase));
    }
    if(channel.type==='resp') return amp*Math.sin(TAU*Number(channel.frequency||.24)*t+phase);
    if(channel.type==='spo2') return amp*(.16*Math.sin(TAU*.035*t+phase)+.05*Math.sin(TAU*.18*t));
    if(channel.type==='ecg'){
      const period=60/Number(channel.heartRate||66),position=((t+.08)%period+period)%period;
      return amp*(-.22*gauss(position,.06,.018)+1.7*gauss(position,.095,.014)-.45*gauss(position,.135,.02)+.28*gauss(position,.31,.075));
    }
    return amp*(Math.sin(TAU*t+phase)+features);
  }
  function rowScale(channel){
    if(channel.type==='ecg')return 16;
    if(channel.type==='emg')return 22;
    if(channel.type==='spo2')return 28;
    if(channel.type==='resp')return 18;
    if(channel.profile==='n3-delta')return N3_ROW_SCALE;
    return 20;
  }
  function drawGrid(ctx,width,height,duration,channels){
    const plotLeft=LABEL_WIDTH,plotRight=width-12,plotWidth=plotRight-plotLeft;
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,width,height);
    ctx.font='12px system-ui,-apple-system,Segoe UI,sans-serif';
    ctx.textBaseline='middle';
    for(let second=0;second<=duration;second+=1){
      const x=plotLeft+(second/duration)*plotWidth;
      ctx.beginPath();
      ctx.strokeStyle=second%5===0?'#c7d9e3':'#edf3f6';
      ctx.lineWidth=second%5===0?1.1:.7;
      ctx.moveTo(x,TOP_PAD-12);
      ctx.lineTo(x,height-BOTTOM_PAD);
      ctx.stroke();
      if(second%5===0&&second<duration){
        ctx.fillStyle='#5d707b';
        ctx.textAlign='center';
        ctx.fillText(second+' s',x+2,14);
      }
    }
    channels.forEach((channel,index)=>{
      const y=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2;
      ctx.beginPath();
      ctx.strokeStyle='#e3edf2';
      ctx.lineWidth=1;
      ctx.moveTo(0,y+ROW_HEIGHT/2);
      ctx.lineTo(width,y+ROW_HEIGHT/2);
      ctx.stroke();
      ctx.fillStyle='#17344a';
      ctx.textAlign='left';
      ctx.font='700 12px system-ui,-apple-system,Segoe UI,sans-serif';
      ctx.fillText(channel.label,10,y);
      ctx.beginPath();
      ctx.strokeStyle='#dbe7ed';
      ctx.setLineDash([3,5]);
      ctx.moveTo(plotLeft,y);
      ctx.lineTo(plotRight,y);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.fillStyle='#5d707b';
    ctx.textAlign='right';
    ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';
    ctx.fillText(duration+' s',plotRight,height-10);
  }
  function drawSignal(ctx,channel,index,width,duration,sampleRate){
    const plotLeft=LABEL_WIDTH,plotRight=width-12,plotWidth=plotRight-plotLeft,y0=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2,scale=rowScale(channel),points=Math.max(2,Math.round(duration*sampleRate));
    ctx.beginPath();
    ctx.strokeStyle='#132f3f';
    ctx.lineWidth=channel.type==='eeg'||channel.type==='eog'?1.15:1.05;
    for(let i=0;i<points;i+=1){
      const t=(i/(points-1))*duration,x=plotLeft+(t/duration)*plotWidth,y=y0-clamp(sample(channel,t)*scale,-ROW_HEIGHT*.42,ROW_HEIGHT*.42);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  function render(canvas,study,options){
    if(!canvas||!study)return null;
    const channels=Array.isArray(study.channels)?study.channels:[],duration=Number(study.durationSeconds||30),sampleRate=Math.min(250,Math.max(50,Number(study.sampleRate||100))),cssWidth=Math.max(980,Math.floor((options&&options.width)||canvas.parentElement&&canvas.parentElement.clientWidth||1040)),cssHeight=TOP_PAD+BOTTOM_PAD+channels.length*ROW_HEIGHT,ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    canvas.style.width=cssWidth+'px';
    canvas.style.height=cssHeight+'px';
    canvas.width=Math.round(cssWidth*ratio);
    canvas.height=Math.round(cssHeight*ratio);
    const ctx=canvas.getContext('2d');
    ctx.setTransform(ratio,0,0,ratio,0,0);
    drawGrid(ctx,cssWidth,cssHeight,duration,channels);
    channels.forEach((channel,index)=>drawSignal(ctx,channel,index,cssWidth,duration,sampleRate));
    return {width:cssWidth,height:cssHeight,labelWidth:LABEL_WIDTH,plotRight:cssWidth-12,duration,rowHeight:ROW_HEIGHT,topPad:TOP_PAD,bottomPad:BOTTOM_PAD,channels:channels.map(channel=>channel.label)};
  }
  function channelBox(metrics,channelLabel){
    const index=metrics.channels.indexOf(String(channelLabel));
    if(index<0)return null;
    return {index,top:metrics.topPad+index*metrics.rowHeight,height:metrics.rowHeight};
  }
  function regionStyle(metrics,region,channelLabel){
    const plotWidth=metrics.plotRight-metrics.labelWidth,box=channelLabel?channelBox(metrics,channelLabel):null,result={left:metrics.labelWidth+(Number(region.start)/metrics.duration)*plotWidth,width:((Number(region.end)-Number(region.start))/metrics.duration)*plotWidth};
    if(box){result.top=box.top;result.height=box.height;}
    return result;
  }
  function targetStyle(metrics,target){return regionStyle(metrics,{start:target.start,end:target.end},target.channel);}
  function pointPosition(metrics,selection){
    const point=typeof selection==='string'?selection.match(/^(.+)@(-?\d+(?:\.\d+)?)$/):null,channel=point?point[1]:selection&&selection.channel,time=point?Number(point[2]):Number(selection&&selection.time),box=channelBox(metrics,channel);
    if(!box||!Number.isFinite(time))return null;
    const plotWidth=metrics.plotRight-metrics.labelWidth;
    return {left:metrics.labelWidth+(time/metrics.duration)*plotWidth,top:box.top+box.height/2,channel,time};
  }
  function hitTest(metrics,x,y){
    if(!metrics||x<metrics.labelWidth||x>metrics.plotRight||y<metrics.topPad)return null;
    const index=Math.floor((y-metrics.topPad)/metrics.rowHeight);
    if(index<0||index>=metrics.channels.length)return null;
    const plotWidth=metrics.plotRight-metrics.labelWidth,time=((x-metrics.labelWidth)/plotWidth)*metrics.duration;
    return {channel:metrics.channels[index],channelIndex:index,time:clamp(time,0,metrics.duration)};
  }
  return {VERSION,LABEL_WIDTH,TOP_PAD,BOTTOM_PAD,ROW_HEIGHT,N3_ROW_SCALE,FREQUENCY_BANDS,TEACHING_FREQUENCIES,sample,render,channelBox,regionStyle,targetStyle,pointPosition,hitTest};
});