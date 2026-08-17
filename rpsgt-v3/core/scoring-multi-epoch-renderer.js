(function(root,factory){
  const api=factory(root.RPSGTVisualPSGRenderer);
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTScoringMultiEpochRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  const VERSION='1.0.0';
  const TOP_PAD=34;
  const BOTTOM_PAD=24;
  const ROW_HEIGHT=50;
  const WINDOW_SECONDS=10;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function rowScale(channel){
    if(channel.type==='ecg')return 16;
    if(channel.type==='emg')return 22;
    if(channel.type==='spo2')return 28;
    if(channel.type==='resp')return 18;
    if(channel.profile==='n3-delta')return 10;
    return 20;
  }
  function render(canvas,study,options){
    if(!base||typeof base.sample!=='function'||!canvas||!study)return null;
    const channels=Array.isArray(study.channels)?study.channels:[];
    const duration=Math.max(1,Number(study.durationSeconds||30));
    const start=clamp(Number(options&&options.startSeconds||0),0,Math.max(0,duration-1));
    const end=Math.min(duration,start+Number(options&&options.windowSeconds||WINDOW_SECONDS));
    const span=Math.max(1,end-start);
    const parentWidth=canvas.parentElement&&canvas.parentElement.clientWidth||720;
    const cssWidth=Math.max(280,Math.floor(Number(options&&options.width)||parentWidth));
    const labelWidth=cssWidth<480?76:104;
    const plotRight=cssWidth-10;
    const plotWidth=Math.max(80,plotRight-labelWidth);
    const cssHeight=TOP_PAD+BOTTOM_PAD+channels.length*ROW_HEIGHT;
    const ratio=Math.min(2,Math.max(1,root.devicePixelRatio||1));
    canvas.style.width=cssWidth+'px';
    canvas.style.maxWidth='100%';
    canvas.style.height=cssHeight+'px';
    canvas.width=Math.round(cssWidth*ratio);
    canvas.height=Math.round(cssHeight*ratio);
    const ctx=canvas.getContext('2d');
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cssWidth,cssHeight);
    ctx.textBaseline='middle';
    const firstSecond=Math.ceil(start);
    for(let second=firstSecond;second<=end;second+=1){
      const x=labelWidth+((second-start)/span)*plotWidth;
      ctx.beginPath();ctx.strokeStyle=second%5===0?'#c7d9e3':'#edf3f6';ctx.lineWidth=second%5===0?1.1:.7;ctx.moveTo(x,TOP_PAD-12);ctx.lineTo(x,cssHeight-BOTTOM_PAD);ctx.stroke();
      if((second===firstSecond||second%5===0)&&second<end){ctx.fillStyle='#5d707b';ctx.textAlign='center';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(second+' s',x+2,14);}
    }
    channels.forEach((channel,index)=>{
      const y=TOP_PAD+index*ROW_HEIGHT+ROW_HEIGHT/2;
      ctx.beginPath();ctx.strokeStyle='#e3edf2';ctx.lineWidth=1;ctx.moveTo(0,y+ROW_HEIGHT/2);ctx.lineTo(cssWidth,y+ROW_HEIGHT/2);ctx.stroke();
      ctx.fillStyle='#17344a';ctx.textAlign='left';ctx.font=(cssWidth<480?'700 10px':'700 12px')+' system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(channel.label,8,y);
      ctx.beginPath();ctx.strokeStyle='#dbe7ed';ctx.setLineDash([3,5]);ctx.moveTo(labelWidth,y);ctx.lineTo(plotRight,y);ctx.stroke();ctx.setLineDash([]);
      const scale=rowScale(channel),sampleRate=Math.min(250,Math.max(80,Number(study.sampleRate||100))),points=Math.max(2,Math.round(span*sampleRate));
      ctx.beginPath();ctx.strokeStyle='#132f3f';ctx.lineWidth=channel.type==='eeg'||channel.type==='eog'?1.15:1.05;
      for(let point=0;point<points;point+=1){
        const t=start+(point/(points-1))*span,x=labelWidth+((t-start)/span)*plotWidth,ySignal=y-clamp(base.sample(channel,t)*scale,-ROW_HEIGHT*.42,ROW_HEIGHT*.42);
        if(point===0)ctx.moveTo(x,ySignal);else ctx.lineTo(x,ySignal);
      }
      ctx.stroke();
    });
    ctx.fillStyle='#5d707b';ctx.textAlign='right';ctx.font='11px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(end+' s',plotRight,cssHeight-10);
    return {width:cssWidth,height:cssHeight,start,end,span,channels:channels.map(channel=>channel.label)};
  }
  return {VERSION,WINDOW_SECONDS,render};
});
