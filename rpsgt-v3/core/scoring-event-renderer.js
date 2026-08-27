(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTScoringEventRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.2.0';
  const DURATION=150;
  const ROWS={eeg:72,nasal:140,thermal:208,thorax:276,abdomen:344,spo2:416};
  const LABELS={eeg:'EEG',nasal:'Nasal pressure',thermal:'Thermistor',thorax:'Thorax',abdomen:'Abdomen',spo2:'SpO₂'};
  const PLOT={left:142,right:974};
  const TAU=Math.PI*2;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const inside=(event,t)=>Boolean(event)&&t>=event.start&&t<=event.end;
  const CHANNEL_SEED={nasal:0.2,thermal:0.75,thorax:1.3,abdomen:1.9};
  function respiratoryWave(t,channel,extraPhase){
    const seed=CHANNEL_SEED[channel]||0;
    const warped=t/4.05+0.030*Math.sin(t*0.39+seed)+0.014*Math.sin(t*0.17+1.2+seed);
    const phase=TAU*warped+(extraPhase||0)+0.035*Math.sin(t*0.73+seed);
    const shape=Math.sin(phase)+0.11*Math.sin(phase*2+0.8+seed)+0.045*Math.sin(phase*3+1.7-seed);
    const amplitude=0.94+0.10*Math.sin(t*0.21+seed)+0.055*Math.sin(t*0.51+1.4*seed);
    const baseline=0.025*Math.sin(t*1.17+seed)+0.016*Math.sin(t*2.09+0.4+seed);
    return shape*amplitude+baseline;
  }
  function absentSignal(t,channel){const seed=CHANNEL_SEED[channel]||0;return 0.022*Math.sin(t*2.7+seed)+0.013*Math.sin(t*5.3+1.1+seed);}
  function delayedDrop(t,event,depth){if(!event)return 0;const start=event.end+6,nadir=event.end+24,recovery=event.end+52;if(t<start||t>recovery)return 0;if(t<=nadir)return depth*(t-start)/(nadir-start);return depth*(1-(t-nadir)/(recovery-nadir));}
  function spo2Percent(def,t){const depth=def.pattern==='rera'?1.1:(def.pattern==='obstructive-hypopnea'?3.4:4.2);return 97-delayedDrop(t,def.event,depth)+0.06*Math.sin(t*0.09);}
  function signal(def,channel,t){
    if(channel==='eeg'){
      const slowMod=0.92+0.08*Math.sin(t*0.31)+0.04*Math.sin(t*0.13+0.8);
      let value=slowMod*(1.05*Math.sin(t*3.9)+0.78*Math.sin(t*8.7+0.45)+0.46*Math.sin(t*14.8+0.2)+0.25*Math.sin(t*24.2)+0.18*Math.sin(t*31.7+1.1));
      if(def.pattern==='rera'&&def.arousal&&t>=def.arousal.start&&t<=def.arousal.end){const mid=(def.arousal.start+def.arousal.end)/2;const env=1-Math.min(1,Math.abs(t-mid)/((def.arousal.end-def.arousal.start)/2));value+=5.4*env*Math.sin(t*30.5)+2.1*env*Math.sin(t*18.3);}return value;
    }
    if(channel==='spo2') return spo2Percent(def,t);
    const phase=channel==='abdomen'?0.10:(channel==='thermal'?0.045:0);let wave=respiratoryWave(t,channel,phase);const amplitude=channel==='thermal'?0.82:1;if(!inside(def.event,t))return wave*amplitude;
    const progress=(t-def.event.start)/(def.event.end-def.event.start);
    if(def.pattern==='obstructive-apnea'){
      if(channel==='nasal'||channel==='thermal')return absentSignal(t,channel);
      if(channel==='thorax')return respiratoryWave(t,channel,0.04)*(1.15+0.62*progress);
      if(channel==='abdomen')return -respiratoryWave(t,channel,0.20)*(1.12+0.56*progress);
    }
    if(def.pattern==='central-apnea')return absentSignal(t,channel);
    if(def.pattern==='mixed-apnea'){
      if(channel==='nasal'||channel==='thermal')return absentSignal(t,channel);
      const transition=def.transition||((def.event.start+def.event.end)/2);if(t<transition)return absentSignal(t,channel);
      const resumed=clamp((t-transition)/(def.event.end-transition),0,1);
      if(channel==='thorax')return respiratoryWave(t,channel,0.05)*(0.65+0.85*resumed);
      if(channel==='abdomen')return -respiratoryWave(t,channel,0.18)*(0.62+0.82*resumed);
    }
    if(def.pattern==='obstructive-hypopnea'){
      if(channel==='nasal'){
        const flattened=wave>0?Math.min(wave,0.28+0.03*Math.sin(t*0.3)):wave*0.84;return flattened*(0.48+0.03*Math.sin(t*0.19));
      }
      if(channel==='thermal')return wave*0.76;
      if(channel==='thorax')return respiratoryWave(t,channel,0.04)*(1.08+0.34*progress);
      if(channel==='abdomen')return -respiratoryWave(t,channel,0.17)*(1.06+0.31*progress);
    }
    if(def.pattern==='rera'){
      if(channel==='nasal'){
        const ceiling=0.62+0.025*Math.sin(t*0.37);
        const flattened=wave>0?Math.min(wave,ceiling):wave*0.98;
        return flattened*(0.96-0.03*progress);
      }
      if(channel==='thermal')return wave*0.96;
      if(channel==='thorax')return respiratoryWave(t,channel,0.03)*(1.02+0.34*progress);
      if(channel==='abdomen')return respiratoryWave(t,channel,0.13)*(1.00+0.31*progress);
    }
    return wave*amplitude;
  }
  function path(def,channel){
    const count=channel==='spo2'?300:700,row=ROWS[channel],scale={eeg:3.8,nasal:19,thermal:16,thorax:17,abdomen:17}[channel]||15,parts=[];
    for(let index=0;index<count;index+=1){const t=DURATION*index/(count-1),x=PLOT.left+(PLOT.right-PLOT.left)*index/(count-1),value=signal(def,channel,t),y=channel==='spo2'?ROWS.spo2+(97-value)*5.2:row-value*scale;parts.push(`${index?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`);}return parts.join(' ');
  }
  function ticks(def){const out=[];for(let seconds=0;seconds<=DURATION;seconds+=30){const x=PLOT.left+(PLOT.right-PLOT.left)*(seconds/DURATION),sat=Math.round(spo2Percent(def,seconds));out.push(`<g class="scoring-event-tick"><line x1="${x.toFixed(1)}" y1="454" x2="${x.toFixed(1)}" y2="462"></line><text x="${x.toFixed(1)}" y="482" text-anchor="middle">${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}</text></g><text class="scoring-event-spo2-number" x="${x.toFixed(1)}" y="401" text-anchor="middle">${sat}</text>`);}return out.join('');}
  function targetCenterX(task){if(!task)return null;return PLOT.left+(PLOT.right-PLOT.left)*(((task.start+task.end)/2)/DURATION);}
  function highlight(task){if(!task)return '';const x=PLOT.left+(PLOT.right-PLOT.left)*(task.start/DURATION),width=(PLOT.right-PLOT.left)*((task.end-task.start)/DURATION),y=(ROWS[task.channel]||ROWS.nasal)-27;return `<g class="scoring-event-highlight"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="54" rx="10"></rect><text x="${(x+width/2).toFixed(1)}" y="${(y-7).toFixed(1)}" text-anchor="middle">target evidence</text></g>`;}
  function centerHighlight(svg,task){
    const scroller=svg&&svg.parentElement;if(!scroller||!task)return;const center=targetCenterX(task);const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);scroller.scrollLeft=clamp(center-scroller.clientWidth/2,0,max);
  }
  function render(svg,def,options){
    if(!svg||!def) return false;const opts=options||{};const guides=Object.values(ROWS).map(y=>`<line x1="${PLOT.left}" y1="${y}" x2="${PLOT.right}" y2="${y}"></line>`).join('');const labels=Object.entries(ROWS).map(([channel,y])=>`<text x="12" y="${y+5}">${LABELS[channel]}</text>`).join('');const paths=Object.keys(ROWS).map(channel=>`<path class="scoring-event-line ${channel}" d="${path(def,channel)}"></path>`).join('');svg.setAttribute('viewBox','0 0 1000 495');svg.setAttribute('role','img');svg.setAttribute('aria-label','Original 2 minute 30 second PSG respiratory teaching schematic. Classify the event, then click the requested supporting evidence.');svg.innerHTML=`<g class="scoring-event-guides">${guides}</g><g class="scoring-event-labels">${labels}</g>${paths}${ticks(def)}${highlight(opts.highlight||null)}`;if(opts.highlight)centerHighlight(svg,opts.highlight);return true;
  }
  function hitTest(svg,clientX,clientY){
    if(!svg) return {channel:null,timeSeconds:null};const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return {channel:null,timeSeconds:null};const x=(clientX-rect.left)/rect.width*1000,y=(clientY-rect.top)/rect.height*495;if(x<PLOT.left||x>PLOT.right)return {channel:null,timeSeconds:null};let channel=null,best=Infinity;for(const [name,row] of Object.entries(ROWS)){const distance=Math.abs(y-row);if(distance<best){best=distance;channel=name;}}if(best>32)return {channel:null,timeSeconds:null};return {channel,timeSeconds:clamp((x-PLOT.left)/(PLOT.right-PLOT.left)*DURATION,0,DURATION)};
  }
  return {VERSION,DURATION,ROWS:{...ROWS},PLOT:{...PLOT},render,hitTest,spo2Percent,targetCenterX,signal};
});
