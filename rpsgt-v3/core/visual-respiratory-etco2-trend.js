(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  if(!renderer||renderer.__etco2TrendInstalled)return;
  const originalRender=renderer.render;
  const BASELINE_DEFAULT=40;
  const TICKS=[50,40,30];
  const TREND_HEIGHT=92;
  const TOP=14;
  const BOTTOM=18;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const features=channel=>Array.isArray(channel&&channel.features)?channel.features:[];

  function baseline(channel){
    const value=Number(channel&&channel.baselineMmHg);
    return Number.isFinite(value)?value:BASELINE_DEFAULT;
  }

  function featureAt(channel,type,time){
    return features(channel).find(feature=>feature&&feature.type===type&&time>=Number(feature.start||0)&&time<=Number(feature.end||feature.start||0))||null;
  }

  function periodicBurden(feature,time){
    if(!feature)return 0;
    const cycle=Math.max(20,Number(feature.cycleSeconds||60));
    const pause=Math.max(0,Math.min(cycle*.45,Number(feature.pauseSeconds||0)));
    const delay=Number(feature.delaySeconds||0);
    const start=Number(feature.start||0);
    const shifted=time-delay;
    if(shifted<start||shifted>Number(feature.end||Infinity))return 0;
    const position=(((shifted-start)%cycle)+cycle)%cycle;
    if(position<pause)return 1;
    const active=(position-pause)/Math.max(.001,cycle-pause);
    return 1-Math.pow(Math.max(0,Math.sin(Math.PI*active)),1.25);
  }

  function trendValue(channel,time){
    if(!channel||channel.type!=='co2')return null;
    if(featureAt(channel,'co2-loss',time))return null;
    let value=baseline(channel)+.35*Math.sin(Math.PI*2*.018*time+Number(channel.phase||0));
    features(channel).filter(feature=>feature.type==='periodic-co2').forEach(feature=>{
      value+=periodicBurden(feature,time)*Number(feature.strength||.10)*50;
    });
    return clamp(value,20,60);
  }

  function trendCanvasFor(canvas){
    const parent=canvas&&canvas.parentElement;
    if(!parent)return null;
    let trend=parent.querySelector('canvas[data-etco2-trend]');
    if(!trend){
      trend=document.createElement('canvas');
      trend.dataset.etco2Trend='true';
      trend.setAttribute('role','img');
      trend.setAttribute('aria-label','ETCO2 trend with 30, 40, and 50 mmHg reference lines');
      trend.style.display='block';
      trend.style.marginTop='4px';
      parent.appendChild(trend);
    }
    return trend;
  }

  function drawTrend(canvas,study,metrics){
    if(!canvas||!study||!metrics)return;
    const channel=(study.channels||[]).find(item=>item&&item.type==='co2');
    if(!channel)return;
    const trend=trendCanvasFor(canvas);
    if(!trend)return;
    const width=metrics.width;
    const ratio=Math.min(Number(study.durationSeconds)>=240?1.2:1.5,Math.max(1,window.devicePixelRatio||1));
    trend.style.width=width+'px';
    trend.style.height=TREND_HEIGHT+'px';
    trend.width=Math.round(width*ratio);
    trend.height=Math.round(TREND_HEIGHT*ratio);
    const ctx=trend.getContext('2d');
    if(!ctx)return;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,TREND_HEIGHT);
    const left=metrics.labelWidth,right=metrics.plotRight,plotWidth=right-left,plotHeight=TREND_HEIGHT-TOP-BOTTOM;
    const yFor=value=>TOP+((55-value)/30)*plotHeight;
    ctx.fillStyle='#17344a';ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='700 12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText('ETCO2 Trend',10,TREND_HEIGHT/2-7);
    ctx.fillStyle='#5d707b';ctx.font='10px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText('mmHg',10,TREND_HEIGHT/2+9);
    TICKS.forEach(value=>{
      const y=yFor(value);
      ctx.beginPath();ctx.strokeStyle='#e4edf2';ctx.lineWidth=.7;ctx.setLineDash([2,4]);ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#5d707b';ctx.textAlign='right';ctx.font='10px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(value+' mmHg',left-6,y);
    });
    const duration=Number(study.durationSeconds||30);
    const major=duration>180?60:duration>45?30:5;
    for(let second=0;second<=duration;second+=major){
      const x=left+(second/duration)*plotWidth;
      ctx.beginPath();ctx.strokeStyle=duration>180&&second%60===0?'#c7d9e3':'#edf3f6';ctx.lineWidth=1;ctx.moveTo(x,TOP);ctx.lineTo(x,TREND_HEIGHT-BOTTOM);ctx.stroke();
    }
    const points=Math.max(80,Math.min(900,Math.round(plotWidth)));
    ctx.beginPath();ctx.strokeStyle='#132f3f';ctx.lineWidth=1.35;
    let drawing=false;
    for(let i=0;i<points;i+=1){
      const time=(i/(points-1))*duration,value=trendValue(channel,time),x=left+(time/duration)*plotWidth;
      if(value==null){drawing=false;continue;}
      const y=yFor(value);
      if(!drawing){ctx.moveTo(x,y);drawing=true;}else ctx.lineTo(x,y);
    }
    ctx.stroke();
    const endValue=trendValue(channel,duration-.01);
    if(endValue!=null){ctx.fillStyle='#17344a';ctx.textAlign='right';ctx.font='700 10px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(Math.round(endValue)+' mmHg',right,TREND_HEIGHT-7);}
  }

  renderer.render=function(canvas,study,options){
    const metrics=originalRender.call(renderer,canvas,study,options);
    drawTrend(canvas,study,metrics);
    return metrics;
  };
  renderer.etco2TrendValue=trendValue;
  renderer.ETCO2_TREND_SCALE={baselineDefault:BASELINE_DEFAULT,unit:'mmHg',ticks:TICKS.slice()};
  renderer.__etco2TrendInstalled=true;
})();
