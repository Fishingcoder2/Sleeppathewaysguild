(function(root,factory){
const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.RPSGTScoringEventBoundaryRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='1.0.0',DURATION=90,WIDTH=1580,HEIGHT=510,TAU=Math.PI*2;
const PLOT={left:122,right:1544},ROWS={nasal:104,thermal:184,thorax:264,abdomen:344,spo2:424};
const LABELS={nasal:'Nasal pressure',thermal:'Thermistor',thorax:'Thorax',abdomen:'Abdomen',spo2:'SpO₂'};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function xFor(t){return PLOT.left+(PLOT.right-PLOT.left)*(clamp(t,0,DURATION)/DURATION);}
function breath(t,phase){const warped=t/4.08+.025*Math.sin(t*.31)+.012*Math.sin(t*.67+1.2);const p=TAU*warped+(phase||0);return Math.sin(p)+.10*Math.sin(p*2+.7)+.035*Math.sin(p*3+1.5);}
function activeEvent(events,t){return (Array.isArray(events)?events:[]).find(event=>t>=event.start&&t<=event.end)||null;}
function eventProgress(event,t){return event?clamp((t-event.start)/(event.end-event.start),0,1):0;}
function delayedDrop(event,t){if(!event)return 0;const start=event.end+4,nadir=event.end+15,recovery=event.end+30;if(t<start||t>recovery)return 0;const depth=1.2;if(t<=nadir)return depth*(t-start)/(nadir-start);return depth*(1-(t-nadir)/(recovery-nadir));}
function spo2(events,t){let drop=0;(events||[]).forEach(event=>{drop=Math.max(drop,delayedDrop(event,t));});return 97-drop+.04*Math.sin(t*.17);}
function signal(def,channel,t){
  if(channel==='spo2')return spo2(def.events,t);
  const phase=channel==='abdomen'?.12:channel==='thermal'?.05:0,wave=breath(t,phase),event=activeEvent(def.events,t),progress=eventProgress(event,t);
  if(!event)return wave*(channel==='thermal'?.83:1);
  if(channel==='nasal'){const raw=wave>0?Math.min(wave,.28):wave*.86;return raw*(Number(event.depth)||.46);}
  if(channel==='thermal')return wave*.72;
  if(channel==='thorax')return wave*(1.02+.32*progress);
  if(channel==='abdomen')return wave*(1.00+.29*progress);
  return wave;
}
function path(def,channel){const count=channel==='spo2'?900:1800,row=ROWS[channel],scale={nasal:21,thermal:17,thorax:18,abdomen:18}[channel]||15,parts=[];for(let i=0;i<count;i+=1){const t=DURATION*i/(count-1),x=xFor(t),value=signal(def,channel,t),y=channel==='spo2'?ROWS.spo2+(97-value)*8:row-value*scale;parts.push(`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`);}return parts.join(' ');}
function epochBands(){let out='';for(let i=0;i<3;i+=1){const start=i*30,end=start+30,x=xFor(start),width=xFor(end)-x;out+=`<rect class="scoring-boundary-epoch ${i%2?'alt':''}" x="${x.toFixed(1)}" y="42" width="${width.toFixed(1)}" height="402"></rect><text class="scoring-boundary-epoch-label" x="${(x+width/2).toFixed(1)}" y="27" text-anchor="middle">Epoch ${i+1} · ${start}–${end} s</text>`;}for(const boundary of [30,60]){const x=xFor(boundary);out+=`<line class="scoring-boundary-divider" x1="${x.toFixed(1)}" y1="36" x2="${x.toFixed(1)}" y2="452"></line>`;}return out;}
function ruler(){let out='';for(let t=0;t<=DURATION;t+=10){const x=xFor(t);out+=`<g class="scoring-boundary-tick"><line x1="${x.toFixed(1)}" y1="452" x2="${x.toFixed(1)}" y2="460"></line><text x="${x.toFixed(1)}" y="480" text-anchor="middle">${t}s</text></g>`;}return out;}
function selectionMarkup(selection){if(!selection)return '';let out='';if(Number.isFinite(Number(selection.start))){const x=xFor(Number(selection.start));out+=`<line class="scoring-boundary-marker start" x1="${x.toFixed(1)}" y1="44" x2="${x.toFixed(1)}" y2="444"></line><text class="scoring-boundary-marker-label" x="${(x+5).toFixed(1)}" y="60">Start ${Math.round(selection.start)}s</text>`;}if(Number.isFinite(Number(selection.end))){const x=xFor(Number(selection.end));out+=`<line class="scoring-boundary-marker end" x1="${x.toFixed(1)}" y1="44" x2="${x.toFixed(1)}" y2="444"></line><text class="scoring-boundary-marker-label" x="${(x+5).toFixed(1)}" y="78">End ${Math.round(selection.end)}s</text>`;}return out;}
function targetMarkup(target){if(!target)return '';const x=xFor(target.start),width=xFor(target.end)-x;return `<g class="scoring-boundary-target"><rect x="${x.toFixed(1)}" y="48" width="${width.toFixed(1)}" height="390" rx="10"></rect><text x="${(x+width/2).toFixed(1)}" y="69" text-anchor="middle">intended physiologic event</text></g>`;}
function render(svg,def,options){
  if(!svg||!def)return false;const opts=options||{},guides=Object.entries(ROWS).map(([,y])=>`<line x1="${PLOT.left}" y1="${y}" x2="${PLOT.right}" y2="${y}"></line>`).join(''),labels=Object.entries(ROWS).map(([name,y])=>`<text x="12" y="${y+5}">${LABELS[name]}</text>`).join(''),paths=Object.keys(ROWS).map(name=>`<path class="scoring-boundary-line ${name}" d="${path(def,name)}"></path>`).join('');
  svg.setAttribute('viewBox',`0 0 ${WIDTH} ${HEIGHT}`);svg.setAttribute('width',String(WIDTH));svg.setAttribute('height',String(HEIGHT));svg.setAttribute('role','img');svg.setAttribute('aria-label','Continuous 90-second respiratory teaching schematic divided visually into three 30-second epochs. The physiology continues through the epoch dividers.');
  svg.innerHTML=`${epochBands()}<g class="scoring-boundary-guides">${guides}</g><g class="scoring-boundary-labels">${labels}</g>${paths}${ruler()}${targetMarkup(opts.target||null)}${selectionMarkup(opts.selection||null)}`;return true;
}
function hitTest(svg,clientX){if(!svg)return null;const rect=svg.getBoundingClientRect();if(!rect.width)return null;const x=(clientX-rect.left)/rect.width*WIDTH;if(x<PLOT.left||x>PLOT.right)return null;return clamp((x-PLOT.left)/(PLOT.right-PLOT.left)*DURATION,0,DURATION);}
return {VERSION,DURATION,WIDTH,HEIGHT,PLOT:{...PLOT},ROWS:{...ROWS},render,hitTest,xFor};
});
