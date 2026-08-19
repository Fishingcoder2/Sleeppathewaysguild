(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  if(!renderer||typeof renderer.render!=='function'||typeof renderer.sample!=='function')return;

  const originalRender=renderer.render.bind(renderer);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function traceColor(channel){
    const type=String(channel&&channel.type||'').toLowerCase();
    const label=String(channel&&channel.label||'').toLowerCase();
    if(type==='eeg'||type==='eog')return '#17202a';
    if(type==='ecg')return '#b3261e';
    if(type==='spo2')return '#2e7d4f';
    if(type==='emg')return '#6c4778';
    if(type==='resp'){
      if(/air|flow|nasal|pressure/.test(label))return '#1769aa';
      if(/thor|chest/.test(label))return '#0f7f8d';
      if(/abd|abdom/.test(label))return '#7a5530';
      return '#267887';
    }
    return '#263844';
  }

  function rowScale(channel){
    if(channel.type==='ecg')return 16;
    if(channel.type==='emg')return 22;
    if(channel.type==='spo2')return 28;
    if(channel.type==='resp')return 18;
    if(channel.profile==='n3-delta')return Number(renderer.N3_ROW_SCALE||10);
    return 20;
  }

  function recolor(canvas,study,metrics){
    if(!canvas||!study||!metrics)return;
    const channels=Array.isArray(study.channels)?study.channels:[];
    const duration=Number(study.durationSeconds||30);
    const sampleRate=Math.min(250,Math.max(50,Number(study.sampleRate||100)));
    const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    ctx.save();
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const plotLeft=Number(renderer.LABEL_WIDTH||112),plotRight=metrics.plotRight,plotWidth=plotRight-plotLeft;
    channels.forEach((channel,index)=>{
      const y0=Number(renderer.TOP_PAD||34)+index*Number(renderer.ROW_HEIGHT||58)+Number(renderer.ROW_HEIGHT||58)/2;
      const scale=rowScale(channel),points=Math.max(2,Math.round(duration*sampleRate));
      ctx.beginPath();
      ctx.strokeStyle=traceColor(channel);
      ctx.lineWidth=channel.type==='eeg'||channel.type==='eog'?1.25:1.35;
      for(let i=0;i<points;i+=1){
        const t=(i/(points-1))*duration;
        const x=plotLeft+(t/duration)*plotWidth;
        const y=y0-clamp(renderer.sample(channel,t)*scale,-Number(renderer.ROW_HEIGHT||58)*.42,Number(renderer.ROW_HEIGHT||58)*.42);
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    });
    ctx.restore();
  }

  renderer.render=function(canvas,study,options){
    const metrics=originalRender(canvas,study,options);
    recolor(canvas,study,metrics);
    return metrics;
  };
  renderer.traceColor=traceColor;
})();