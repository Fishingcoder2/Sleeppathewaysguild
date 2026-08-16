(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTScoringEventRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const DURATION=150;
  const ROWS={eeg:72,nasal:140,thermal:208,thorax:276,abdomen:344,spo2:416};
  const LABELS={eeg:'EEG',nasal:'Nasal pressure',thermal:'Thermistor',thorax:'Thorax',abdomen:'Abdomen',spo2:'SpO₂'};
  const PLOT={left:142,right:974};
  const TAU=Math.PI*2;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const breath=(t,phase)=>Math.sin(TAU*t/4+(phase||0));
  const inside=(event,t)=>Boolean(event)&&t>=event.start&&t<=event.end;
  function delayedDrop(t,event,depth){if(!event)return 0;const start=event.end+6,nadir=event.end+24,recovery=event.end+52;if(t<start||t>recovery)return 0;if(t<=nadir)return depth*(t-start)/(nadir-start);return depth*(1-(t-nadir)/(recovery-nadir));}
  function spo2Percent(def,t){const depth=def.pattern==='rera'?1.1:(def.pattern==='obstructive-hypopnea'?3:4.2);return 97-delayedDrop(t,def.event,depth);}
  function signal(def,channel,t){
    if(channel==='eeg'){
      let value=1.15*Math.sin(t*3.9)+0.82*Math.sin(t*8.7+0.45)+0.5*Math.sin(t*14.8+0.2)+0.28*Math.sin(t*24.2);
      if(def.pattern==='rera'&&def.arousal&&t>=def.arousal.start&&t<=def.arousal.end){const mid=(def.arousal.start+def.arousal.end)/2;const env=1-Math.min(1,Math.abs(t-mid)/((def.arousal.end-def.arousal.start)/2));value+=5.4*env*Math.sin(t*30.5)+2.1*env*Math.sin(t*18.3);}return value;
    }
    if(channel==='spo2') return spo2Percent(def,t);
    const phase=channel==='abdomen'?0.12:(channel==='thermal'?0.06:0);let wave=breath(t,phase);const amplitude=channel==='thermal'?0.8:1;if(!inside(def.event,t))return wave*amplitude;const progress=(t-def.event.start)/(def.event.end-def.event.start);
    if(def.pattern==='obstructive-apnea'){if(channel==='nasal'||channel==='thermal')return wave*0.02;if(channel==='thorax')return wave*(1.2+0.7*progress);if(channel==='abdomen')return breath(t,Math.PI)*(1.2+0.62*progress);}
    if(def.pattern==='central-apnea')return wave*0.02;
    if(def.pattern==='mixed-apnea'){if(channel==='nasal'||channel==='thermal')return wave*0.02;const transition=def.transition||((def.event.start+def.event.end)/2);if(t<transition)return wave*0.02;const resumed=clamp((t-transition)/(def.event.end-transition),0,1);if(channel==='thorax')return wave*(1.15+0.6*resumed);if(channel==='abdomen')return breath(t,Math.PI)*(1.12+0.6*resumed);}
    if(def.pattern==='obstructive-hypopnea'){if(channel==='nasal'){wave=wave>0?Math.min(wave,0.26):wave*0.84;return wave*0.48;}if(channel==='thermal')return wave*0.78;if(channel==='thorax')return wave*(1.15+0.4*progress);if(channel==='abdomen')return breath(t,Math.PI)*(1.13+0.38*progress);}
    if(def.pattern==='rera'){if(channel==='nasal'){wave=wave>0?Math.min(wave,0.28):wave*0.88;return wave*(0.72-0.18*progress);}if(channel==='thermal')return wave*0.9;if(channel==='thorax')return wave*(1.05+0.42*progress);if(channel==='abdomen')return wave*(1.03+0.38*progress);}
    return wave*amplitude;
  }
  function path(def,channel){
    const count=channel==='spo2'?300:620,row=ROWS[channel],scale={eeg:3.8,nasal:19,thermal:16,thorax:17,abdomen:17}[channel]||15,parts=[];
    for(let index=0;index<count;index+=1){const t=DURATION*index/(count-1),x=PLOT.left+(PLOT.right-PLOT.left)*index/(count-1),value=signal(def,channel,t),y=channel==='spo2'?ROWS.spo2+(97-value)*5.2:row-value*scale;parts.push(`${index?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`);}return parts.join(' ');
  }
  function ticks(def){const out=[];for(let seconds=0;seconds<=DURATION;seconds+=30){const x=PLOT.left+(PLOT.right-PLOT.left)*(seconds/DURATION),sat=Math.round(spo2Percent(def,seconds));out.push(`<g class="scoring-event-tick"><line x1="${x.toFixed(1)}" y1="454" x2="${x.toFixed(1)}" y2="462"></line><text x="${x.toFixed(1)}" y="482" text-anchor="middle">${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}</text></g><text class="scoring-event-spo2-number" x="${x.toFixed(1)}" y="401" text-anchor="middle">${sat}</text>`);}return out.join('');}
  function highlight(task){if(!task)return '';const x=PLOT.left+(PLOT.right-PLOT.left)*(task.start/DURATION),width=(PLOT.right-PLOT.left)*((task.end-task.start)/DURATION),y=(ROWS[task.channel]||ROWS.nasal)-27;return `<g class="scoring-event-highlight"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="54" rx="10"></rect><text x="${(x+width/2).toFixed(1)}" y="${(y-7).toFixed(1)}" text-anchor="middle">target evidence</text></g>`;}
  function render(svg,def,options){
    if(!svg||!def) return false;const opts=options||{};const guides=Object.values(ROWS).map(y=>`<line x1="${PLOT.left}" y1="${y}" x2="${PLOT.right}" y2="${y}"></line>`).join('');const labels=Object.entries(ROWS).map(([channel,y])=>`<text x="12" y="${y+5}">${LABELS[channel]}</text>`).join('');const paths=Object.keys(ROWS).map(channel=>`<path class="scoring-event-line ${channel}" d="${path(def,channel)}"></path>`).join('');svg.setAttribute('viewBox','0 0 1000 495');svg.setAttribute('role','img');svg.setAttribute('aria-label','Original 2 minute 30 second PSG respiratory teaching schematic. Classify the event, then click the requested supporting evidence.');svg.innerHTML=`<g class="scoring-event-guides">${guides}</g><g class="scoring-event-labels">${labels}</g>${paths}${ticks(def)}${highlight(opts.highlight||null)}`;return true;
  }
  function hitTest(svg,clientX,clientY){
    if(!svg) return {channel:null,timeSeconds:null};const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return {channel:null,timeSeconds:null};const x=(clientX-rect.left)/rect.width*1000,y=(clientY-rect.top)/rect.height*495;if(x<PLOT.left||x>PLOT.right)return {channel:null,timeSeconds:null};let channel=null,best=Infinity;for(const [name,row] of Object.entries(ROWS)){const distance=Math.abs(y-row);if(distance<best){best=distance;channel=name;}}if(best>32)return {channel:null,timeSeconds:null};return {channel,timeSeconds:clamp((x-PLOT.left)/(PLOT.right-PLOT.left)*DURATION,0,DURATION)};
  }
  return {VERSION,DURATION,ROWS:{...ROWS},PLOT:{...PLOT},render,hitTest,spo2Percent};
});