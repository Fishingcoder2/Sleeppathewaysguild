(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTVisualPSGRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='0.3.0';
  const LABEL_WIDTH=112;
  const TOP_PAD=34;
  const BOTTOM_PAD=26;
  const ROW_HEIGHT=58;
  const TAU=Math.PI*2;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const gauss=(x,center,width)=>Math.exp(-Math.pow((x-center)/Math.max(.001,width),2));
  const polarity=channel=>Number(channel.polarity||1)>=0?1:-1;
  const PROFILE_COMPONENTS=Object.freeze({
    'wake-alpha':Object.freeze([
      Object.freeze({frequency:9.4,amplitude:.30,role:'alpha'}),
      Object.freeze({frequency:10.2,amplitude:.27,role:'alpha'}),
      Object.freeze({frequency:11.1,amplitude:.18,role:'alpha'}),
      Object.freeze({frequency:18.2,amplitude:.055,role:'fast'})
    ]),
    'wake-mixed':Object.freeze([
      Object.freeze({frequency:6.2,amplitude:.075,role:'mixed'}),
      Object.freeze({frequency:10.0,amplitude:.16,role:'alpha'}),
      Object.freeze({frequency:15.4,amplitude:.18,role:'fast'}),
      Object.freeze({frequency:18.6,amplitude:.12,role:'fast'})
    ]),
    'n1-lamf':Object.freeze([
      Object.freeze({frequency:4.4,amplitude:.18,role:'theta'}),
      Object.freeze({frequency:5.3,amplitude:.22,role:'theta'}),
      Object.freeze({frequency:6.4,amplitude:.17,role:'theta'}),
      Object.freeze({frequency:9.0,amplitude:.05,role:'mixed'})
    ]),
    'n2-lamf':Object.freeze([
      Object.freeze({frequency:4.6,amplitude:.15,role:'mixed'}),
      Object.freeze({frequency:5.8,amplitude:.18,role:'mixed'}),
      Object.freeze({frequency:7.1,amplitude:.13,role:'mixed'}),
      Object.freeze({frequency:9.8,amplitude:.055,role:'mixed'})
    ]),
    'n3-delta':Object.freeze([
      Object.freeze({frequency:.72,amplitude:.30,role:'slow'}),
      Object.freeze({frequency:1.03,amplitude:.25,role:'slow'}),
      Object.freeze({frequency:1.48,amplitude:.16,role:'slow'}),
      Object.freeze({frequency:5.2,amplitude:.025,role:'background'})
    ]),
    'rem-lamf':Object.freeze([
      Object.freeze({frequency:4.7,amplitude:.14,role:'mixed'}),
      Object.freeze({frequency:5.9,amplitude:.16,role:'mixed'}),
      Object.freeze({frequency:7.3,amplitude:.11,role:'mixed'}),
      Object.freeze({frequency:9.6,amplitude:.075,role:'mixed'}),
      Object.freeze({frequency:12.4,amplitude:.035,role:'fast'})
    ])
  });
  const deterministicNoise=(t,phase)=>Math.sin(TAU*17.3*t+phase)*.35+Math.sin(TAU*23.7*t+phase*1.7)*.22+Math.sin(TAU*31.1*t+.4+phase)*.12;
  function biologicEnvelope(t,phase,depth){
    const d=Number.isFinite(Number(depth))?Number(depth):.12;
    return Math.max(.62,1+d*Math.sin(TAU*.073*t+phase*.8)+d*.46*Math.sin(TAU*.137*t+1.1+phase*.35));
  }
  function mixedComponents(profile,t,phase){
    const components=PROFILE_COMPONENTS[profile]||PROFILE_COMPONENTS['n2-lamf'];
    return components.reduce((sum,component,index)=>{
      const phaseDrift=.09*Math.sin(TAU*(.031+index*.009)*t+phase*(index+1));
      return sum+component.amplitude*Math.sin(TAU*component.frequency*t+phase*(.75+index*.31)+phaseDrift);
    },0);
  }
  function eogTexture(t,phase){
    return .11*Math.sin(TAU*4.3*t+phase*.7)+.085*Math.sin(TAU*6.9*t+1.2+phase)+.055*Math.sin(TAU*10.4*t+.4+phase*.5)+.065*deterministicNoise(t,phase);
  }
  function slowEyeRoll(t,phase,sign){
    const centers=[4.8,10.9,17.5,24.6];
    let value=0;
    centers.forEach((center,index)=>{
      const direction=index%2===0?1:-1;
      value+=sign*direction*(.78*gauss(t,center,.63)-.34*gauss(t,center+.58,.82));
    });
    return value*biologicEnvelope(t,phase,.08);
  }
  function muscleTexture(t,phase){
    const modulation=.84+.10*Math.sin(TAU*.31*t+phase)+.06*Math.sin(TAU*.71*t+1.3+phase*.4);
    return modulation*(.30*Math.sin(TAU*26.8*t+phase)+.25*Math.sin(TAU*34.7*t+phase*1.2)+.18*Math.sin(TAU*43.2*t+.8+phase*.5)+.18*deterministicNoise(t,phase));
  }
  function cycleDistance(position,center){
    const d=Math.abs(position-center);
    return Math.min(d,1-d);
  }
  function cycleGauss(position,center,width){return Math.exp(-Math.pow(cycleDistance(position,center)/Math.max(.001,width),2));}
  function heartCyclesAt(t,heartRate,phase){
    const baseHz=Math.max(.35,Number(heartRate||66)/60),p=Number(phase||0);
    return baseHz*t+.025*Math.sin(TAU*.10*t+p)+.008*Math.sin(TAU*.23*t+.6+p*.7);
  }
  function ecgTemplate(cycle){
    return .15*cycleGauss(cycle,.18,.045)-.20*cycleGauss(cycle,.365,.014)+1.72*cycleGauss(cycle,.40,.010)-.47*cycleGauss(cycle,.438,.018)+.31*cycleGauss(cycle,.69,.072);
  }
  function envelope(t,start,end,edge){
    if(t<start||t>end)return 0;
    const width=Math.max(.05,Number(edge||.35));
    return Math.min(1,(t-start)/width,(end-t)/width);
  }
  function featureValue(channel,t){
    let value=0;
    (Array.isArray(channel.features)?channel.features:[]).forEach(feature=>{
      const strength=Number(feature.strength||1);
      if(feature.type==='spindle'){
        const start=Number(feature.start||0),end=Number(feature.end||start),frequency=Number(feature.frequency||13);
        if(t>=start&&t<=end){
          const progress=(t-start)/Math.max(.001,end-start),wax=Math.pow(Math.sin(Math.PI*progress),1.45);
          value+=wax*Math.sin(TAU*frequency*t+Number(channel.phase||0)*.25)*1.28*strength;
        }
      }else if(feature.type==='k-complex'){
        const center=Number(feature.center||0);
        value+=(-1.48*gauss(t,center-.18,.13)+2.12*gauss(t,center+.12,.22)-.72*gauss(t,center+.58,.29))*strength;
      }else if(feature.type==='vertex'){
        const center=Number(feature.center||0);
        value+=(-1.8*gauss(t,center,.075)+.55*gauss(t,center+.14,.11))*strength;
      }else if(feature.type==='slow-wave'){
        const start=Number(feature.start||0),end=Number(feature.end||start),frequency=Number(feature.frequency||1.15),gate=envelope(t,start,end,.6),phase=TAU*frequency*t+Number(channel.phase||0);
        value+=gate*(Math.sin(phase)+.20*Math.sin(2*phase+.8)+.07*Math.sin(3*phase+1.4))*1.08*strength;
      }else if(feature.type==='sawtooth'){
        const start=Number(feature.start||0),end=Number(feature.end||start),frequency=Number(feature.frequency||3),gate=envelope(t,start,end,.25),phase=TAU*frequency*t+Number(channel.phase||0);
        value+=gate*(Math.sin(phase)+.34*Math.sin(2*phase+1.05)+.14*Math.sin(3*phase+1.7))*.58*strength;
      }else if(feature.type==='eye-blink'){
        const center=Number(feature.center||0),sign=polarity(channel);
        value+=sign*(1.68*gauss(t,center,.17)-.50*gauss(t,center+.35,.25))*strength;
      }else if(feature.type==='rapid-eye'){
        const start=Number(feature.start||0),end=Number(feature.end||start),sign=polarity(channel),times=[start+.25,start+.85,start+1.55,start+2.25].filter(point=>point<=end);
        times.forEach((center,index)=>{
          const direction=index%2===0?1:-1;
          value+=sign*direction*(1.48*gauss(t,center,.085)-.44*gauss(t,center+.17,.13))*strength;
        });
      }
    });
    return value;
  }
  function eegBackground(channel,t){
    const profile=channel.profile||'n2-lamf',phase=Number(channel.phase||0),depth=profile==='n3-delta'?.18:profile==='wake-alpha'?.15:.12;
    const texture=profile==='n3-delta'?.025*deterministicNoise(t,phase):.055*deterministicNoise(t,phase);
    return biologicEnvelope(t,phase,depth)*mixedComponents(profile,t,phase)+texture;
  }
  function sample(channel,t){
    const amp=Number(channel.amplitude||.6),phase=Number(channel.phase||0),features=featureValue(channel,t);
    if(channel.type==='eeg') return amp*(eegBackground(channel,t)+features);
    if(channel.type==='eog'){
      const sign=polarity(channel),profile=channel.profile||'quiet';
      let base=eogTexture(t,phase);
      if(profile==='slow-eye')base+=slowEyeRoll(t,phase,sign);
      else if(profile==='wake')base+=sign*(.09*Math.sin(TAU*.18*t+phase)+.05*Math.sin(TAU*.31*t+1.2+phase*.5));
      else if(profile==='rem')base+=sign*(.035*Math.sin(TAU*.22*t+phase)+.025*Math.sin(TAU*.41*t+.8));
      else if(profile==='n3-quiet')base+=.12*Math.sin(TAU*.82*t+phase*.4)+.07*Math.sin(TAU*1.35*t+1.1+phase*.6);
      else base*=.72;
      return amp*(base+features);
    }
    if(channel.type==='emg'){
      const tone=channel.profile==='high-tone'?1.2:channel.profile==='medium-tone'?.9:channel.profile==='medium-low-tone'?.72:channel.profile==='low-tone'?.56:channel.profile==='rem-tone'?.28:.7;
      return amp*tone*muscleTexture(t,phase);
    }
    if(channel.type==='resp') return amp*Math.sin(TAU*Number(channel.frequency||.24)*t+phase);
    if(channel.type==='spo2') return amp*(.16*Math.sin(TAU*.035*t+phase)+.05*Math.sin(TAU*.18*t));
    if(channel.type==='ecg'){
      const cycles=heartCyclesAt(t,Number(channel.heartRate||66),phase),position=((cycles%1)+1)%1,baseline=.016*Math.sin(TAU*.28*t+phase)+.010*deterministicNoise(t,phase);
      return amp*(ecgTemplate(position)+baseline);
    }
    return amp*(Math.sin(TAU*t+phase)+features);
  }
  function rowScale(channel){
    if(channel.type==='ecg')return 16;if(channel.type==='emg')return 22;if(channel.type==='spo2')return 28;if(channel.type==='resp')return 18;if(channel.profile==='n3-delta')return 17;return 20;
  }
  function drawGrid(ctx,width,height,duration,channels){
    const plotLeft=LABEL_WIDTH,plotRight=width-12,plotWidth=plotRight-plotLeft;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.font='12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.textBaseline='middle';
    for(let second=0;second<=duration;second+=1){
      const x=plotLeft+(second/duration)*plotWidth;ctx.beginPath();ctx.strokeStyle=second%5===0?'#c7d9e3':'#edf3f6';ctx.lineWidth=second%5===0?1.1:.7;ctx.moveTo(x,TOP_PAD-12);ctx.lineTo(x,height-BOTTOM_PAD);ctx.stroke();
      if(second%5===0&&second<duration){ctx.fillStyle='#5d707b';ctx.textAlign='center';ctx.fillText(second+' s',x+2,14);}
    }
    channels.forEach((channel,index)=>{
      const y=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2;ctx.beginPath();ctx.strokeStyle='#e3edf2';ctx.lineWidth=1;ctx.moveTo(0,y+ROW_HEIGHT/2);ctx.lineTo(width,y+ROW_HEIGHT/2);ctx.stroke();ctx.fillStyle='#17344a';ctx.textAlign='left';ctx.font='700 12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(channel.label,10,y);ctx.beginPath();ctx.strokeStyle='#dbe7ed';ctx.setLineDash([3,5]);ctx.moveTo(plotLeft,y);ctx.lineTo(plotRight,y);ctx.stroke();ctx.setLineDash([]);
    });
    ctx.fillStyle='#5d707b';ctx.textAlign='right';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(duration+' s',plotRight,height-10);
  }
  function drawSignal(ctx,channel,index,width,duration,sampleRate){
    const plotLeft=LABEL_WIDTH,plotRight=width-12,plotWidth=plotRight-plotLeft,y0=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2,scale=rowScale(channel),points=Math.max(2,Math.round(duration*sampleRate));
    ctx.beginPath();ctx.strokeStyle='#132f3f';ctx.lineWidth=channel.type==='eeg'||channel.type==='eog'?1.05:1.0;
    for(let i=0;i<points;i+=1){const t=(i/(points-1))*duration,x=plotLeft+(t/duration)*plotWidth,y=y0-clamp(sample(channel,t)*scale,-ROW_HEIGHT*.42,ROW_HEIGHT*.42);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  }
  function render(canvas,study,options){
    if(!canvas||!study)return null;
    const channels=Array.isArray(study.channels)?study.channels:[],duration=Number(study.durationSeconds||30),sampleRate=Math.min(250,Math.max(25,Number(study.sampleRate||100))),cssWidth=Math.max(860,Math.floor((options&&options.width)||canvas.parentElement&&canvas.parentElement.clientWidth||960)),cssHeight=TOP_PAD+BOTTOM_PAD+channels.length*ROW_HEIGHT,ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    canvas.style.width=cssWidth+'px';canvas.style.height=cssHeight+'px';canvas.width=Math.round(cssWidth*ratio);canvas.height=Math.round(cssHeight*ratio);const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);drawGrid(ctx,cssWidth,cssHeight,duration,channels);channels.forEach((channel,index)=>drawSignal(ctx,channel,index,cssWidth,duration,sampleRate));
    return {width:cssWidth,height:cssHeight,labelWidth:LABEL_WIDTH,plotRight:cssWidth-12,duration,rowHeight:ROW_HEIGHT,topPad:TOP_PAD,bottomPad:BOTTOM_PAD,channels:channels.map(channel=>channel.label)};
  }
  function channelBox(metrics,channelLabel){
    const index=metrics.channels.indexOf(String(channelLabel));if(index<0)return null;return {index,top:metrics.topPad+index*metrics.rowHeight,height:metrics.rowHeight};
  }
  function regionStyle(metrics,region,channelLabel){
    const plotWidth=metrics.plotRight-metrics.labelWidth,box=channelLabel?channelBox(metrics,channelLabel):null,result={left:metrics.labelWidth+(Number(region.start)/metrics.duration)*plotWidth,width:((Number(region.end)-Number(region.start))/metrics.duration)*plotWidth};
    if(box){result.top=box.top;result.height=box.height;}return result;
  }
  function targetStyle(metrics,target){return regionStyle(metrics,{start:target.start,end:target.end},target.channel);}
  function pointPosition(metrics,selection){
    const point=typeof selection==='string'?selection.match(/^(.+)@(-?\d+(?:\.\d+)?)$/):null,channel=point?point[1]:selection&&selection.channel,time=point?Number(point[2]):Number(selection&&selection.time),box=channelBox(metrics,channel);if(!box||!Number.isFinite(time))return null;const plotWidth=metrics.plotRight-metrics.labelWidth;return {left:metrics.labelWidth+(time/metrics.duration)*plotWidth,top:box.top+box.height/2,channel,time};
  }
  function hitTest(metrics,x,y){
    if(!metrics||x<metrics.labelWidth||x>metrics.plotRight||y<metrics.topPad)return null;const index=Math.floor((y-metrics.topPad)/metrics.rowHeight);if(index<0||index>=metrics.channels.length)return null;const plotWidth=metrics.plotRight-metrics.labelWidth,time=((x-metrics.labelWidth)/plotWidth)*metrics.duration;return {channel:metrics.channels[index],channelIndex:index,time:clamp(time,0,metrics.duration)};
  }
  return {VERSION,LABEL_WIDTH,TOP_PAD,BOTTOM_PAD,ROW_HEIGHT,PROFILE_COMPONENTS,heartCyclesAt,sample,render,channelBox,regionStyle,targetStyle,pointPosition,hitTest};
});
