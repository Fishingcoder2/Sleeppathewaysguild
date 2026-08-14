(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  if(!renderer||renderer.__pulsePlethInstalled)return;
  const originalRender=renderer.render;
  const TAU=Math.PI*2;
  const HEIGHT=66;
  const TOP=10;
  const BOTTOM=12;
  const DEFAULT_TRANSIT_DELAY=.18;
  const cycleDistance=(position,center)=>{const d=Math.abs(position-center);return Math.min(d,1-d);};
  const cycleGauss=(position,center,width)=>Math.exp(-Math.pow(cycleDistance(position,center)/Math.max(.001,width),2));

  function pulseTemplate(position){
    return 1.12*cycleGauss(position,.30,.105)+.34*cycleGauss(position,.49,.09)-.16*cycleGauss(position,.445,.028)-.18;
  }

  function pulseValue(time,heartRate,phase,delaySeconds){
    const delay=Number.isFinite(Number(delaySeconds))?Number(delaySeconds):DEFAULT_TRANSIT_DELAY;
    const cycles=renderer.heartCyclesAt(Number(time)-delay,Number(heartRate||66),Number(phase||0));
    const position=((cycles%1)+1)%1;
    return pulseTemplate(position)+.012*Math.sin(TAU*.18*Number(time)+Number(phase||0));
  }

  function pulseCanvasFor(canvas){
    const parent=canvas&&canvas.parentElement;
    if(!parent)return null;
    let pulse=parent.querySelector('canvas[data-pulse-pleth]');
    if(!pulse){
      pulse=document.createElement('canvas');
      pulse.dataset.pulsePleth='true';
      pulse.setAttribute('role','img');
      pulse.setAttribute('aria-label','Pulse plethysmography channel synchronized to the ECG heart rate');
      pulse.style.display='block';
      pulse.style.marginTop='4px';
      parent.appendChild(pulse);
    }
    return pulse;
  }

  function clearPulse(canvas){
    const parent=canvas&&canvas.parentElement;
    const pulse=parent&&parent.querySelector('canvas[data-pulse-pleth]');
    if(pulse)pulse.remove();
  }

  function gridPlan(duration){
    if(duration>180)return {minor:30,major:60,label:60};
    if(duration>45)return {minor:10,major:30,label:30};
    return {minor:1,major:5,label:5};
  }

  function drawPulse(canvas,study,metrics){
    const ecg=(study.channels||[]).find(channel=>channel&&channel.type==='ecg');
    if(!ecg){clearPulse(canvas);return;}
    const pulse=pulseCanvasFor(canvas);
    if(!pulse)return;
    const duration=Number(study.durationSeconds||30),width=metrics.width;
    const ratio=Math.min(duration>=240?1.2:1.5,Math.max(1,window.devicePixelRatio||1));
    pulse.style.width=width+'px';pulse.style.height=HEIGHT+'px';pulse.width=Math.round(width*ratio);pulse.height=Math.round(HEIGHT*ratio);
    const ctx=pulse.getContext('2d');if(!ctx)return;
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,HEIGHT);
    const left=metrics.labelWidth,right=metrics.plotRight,plotWidth=right-left,center=TOP+(HEIGHT-TOP-BOTTOM)/2,plan=gridPlan(duration),heartRate=Number(ecg.heartRate||66),phase=Number(ecg.phase||0),delay=Number(ecg.pulseTransitDelaySeconds||DEFAULT_TRANSIT_DELAY);
    for(let second=0;second<=duration;second+=plan.minor){
      const x=left+(second/duration)*plotWidth,isMinute=second>0&&second%60===0,isMajor=second%plan.major===0;
      ctx.beginPath();ctx.strokeStyle=isMinute?'#9fbac8':isMajor?'#d6e4ea':'#edf3f6';ctx.lineWidth=isMinute?1.4:isMajor?1:.6;ctx.moveTo(x,TOP);ctx.lineTo(x,HEIGHT-BOTTOM);ctx.stroke();
    }
    ctx.beginPath();ctx.strokeStyle='#dbe7ed';ctx.setLineDash([3,5]);ctx.moveTo(left,center);ctx.lineTo(right,center);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#17344a';ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='700 12px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText('Pulse Pleth',10,center-7);
    ctx.fillStyle='#5d707b';ctx.font='10px system-ui,-apple-system,Segoe UI,sans-serif';ctx.fillText(Math.round(heartRate)+' bpm',10,center+9);
    const points=Math.max(160,Math.min(3200,Math.round(duration*(duration>=240?12:40))));
    ctx.beginPath();ctx.strokeStyle='#132f3f';ctx.lineWidth=1.1;
    for(let i=0;i<points;i+=1){
      const time=(i/(points-1))*duration,x=left+(time/duration)*plotWidth,y=center-pulseValue(time,heartRate,phase,delay)*18;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  renderer.render=function(canvas,study,options){
    const metrics=originalRender.call(renderer,canvas,study,options);
    drawPulse(canvas,study,metrics);
    return metrics;
  };
  renderer.pulsePlethValue=pulseValue;
  renderer.PULSE_PLETH={transitDelaySeconds:DEFAULT_TRANSIT_DELAY,source:'ECG heart rate'};
  renderer.__pulsePlethInstalled=true;
})();
