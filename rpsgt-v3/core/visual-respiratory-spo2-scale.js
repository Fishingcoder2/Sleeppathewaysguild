(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  if(!renderer||renderer.__spo2PercentScaleInstalled)return;
  const originalRender=renderer.render;
  const originalSample=renderer.sample;
  const BASELINE_DEFAULT=97;
  const PERCENT_PER_RENDER_UNIT=10;
  const SPO2_RENDER_SCALE=29;
  const TICKS=[100,95,90];
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function baseline(channel){
    const value=Number(channel&&channel.baselinePercent);
    return Number.isFinite(value)?value:BASELINE_DEFAULT;
  }

  function spo2Percent(channel,time){
    if(!channel||channel.type!=='spo2'||typeof originalSample!=='function')return null;
    return clamp(baseline(channel)+PERCENT_PER_RENDER_UNIT*Number(originalSample(channel,Number(time)||0)||0),70,100);
  }

  function scanNadir(channel,duration){
    const points=Math.max(120,Math.min(720,Math.round(Number(duration||30)*3)));
    let best={value:101,time:0};
    for(let i=0;i<points;i+=1){
      const time=(i/(points-1))*Number(duration||30),value=spo2Percent(channel,time);
      if(value!=null&&value<best.value)best={value,time};
    }
    return best;
  }

  function drawScale(canvas,study,metrics){
    if(!canvas||!study||!metrics)return;
    const channels=Array.isArray(study.channels)?study.channels:[];
    const ratio=metrics.width?canvas.width/metrics.width:1;
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    ctx.save();
    ctx.setTransform(ratio,0,0,ratio,0,0);
    channels.forEach((channel,index)=>{
      if(!channel||channel.type!=='spo2')return;
      const center=metrics.topPad+index*metrics.rowHeight+metrics.rowHeight/2;
      const base=baseline(channel);
      TICKS.forEach(percent=>{
        const renderUnits=(percent-base)/PERCENT_PER_RENDER_UNIT;
        const offset=clamp(renderUnits*SPO2_RENDER_SCALE,-metrics.rowHeight*.42,metrics.rowHeight*.42);
        const y=center-offset;
        ctx.beginPath();
        ctx.strokeStyle='#e4edf2';
        ctx.lineWidth=.7;
        ctx.setLineDash([2,4]);
        ctx.moveTo(metrics.labelWidth,y);
        ctx.lineTo(metrics.plotRight,y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle='#5d707b';
        ctx.textAlign='right';
        ctx.textBaseline='middle';
        ctx.font='700 10px system-ui,-apple-system,Segoe UI,sans-serif';
        ctx.fillText(percent+'%',metrics.labelWidth-6,y);
      });
      ctx.fillStyle='#5d707b';
      ctx.textAlign='left';
      ctx.font='10px system-ui,-apple-system,Segoe UI,sans-serif';
      ctx.fillText('% trend',10,center+13);
      const duration=Number(study.durationSeconds||30),nadir=scanNadir(channel,duration),plotWidth=metrics.plotRight-metrics.labelWidth;
      if(nadir.value<base-.5){
        const x=metrics.labelWidth+(nadir.time/duration)*plotWidth;
        const renderUnits=(nadir.value-base)/PERCENT_PER_RENDER_UNIT;
        const offset=clamp(renderUnits*SPO2_RENDER_SCALE,-metrics.rowHeight*.42,metrics.rowHeight*.42);
        const y=center-offset;
        const label=Math.round(nadir.value)+'%';
        ctx.font='700 10px system-ui,-apple-system,Segoe UI,sans-serif';
        ctx.textAlign=x>metrics.plotRight-50?'right':'left';
        ctx.fillStyle='#17344a';
        ctx.fillText(label,x+(x>metrics.plotRight-50?-4:4),y-9);
        canvas.dataset.spo2Nadir=label;
      }else{
        canvas.dataset.spo2Nadir=Math.round(spo2Percent(channel,duration-.01))+'%';
      }
      canvas.dataset.spo2Scale=TICKS.map(value=>value+'%').join(',');
    });
    ctx.restore();
  }

  renderer.render=function(canvas,study,options){
    const metrics=originalRender.call(renderer,canvas,study,options);
    drawScale(canvas,study,metrics);
    return metrics;
  };
  renderer.spo2Percent=spo2Percent;
  renderer.SPO2_PERCENT_SCALE={baselineDefault:BASELINE_DEFAULT,percentPerRenderUnit:PERCENT_PER_RENDER_UNIT,ticks:TICKS.slice()};
  renderer.__spo2PercentScaleInstalled=true;
})();
