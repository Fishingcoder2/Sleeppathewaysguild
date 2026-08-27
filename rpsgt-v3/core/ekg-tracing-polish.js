(function(){
'use strict';

const KIND_BY_INDEX=['artifact-burst','regular-60','p-before-qrs','slow-48','isolated-ectopy','concerning-run','event-marker'];
const BASELINE=118;

function beatsForKind(kind){
  if(kind==='regular-60'||kind==='artifact-burst')return [65,150,235,320,405,490,575,660,745,830];
  if(kind==='slow-48')return [80,185,290,395,500,605,710,815];
  if(kind==='p-before-qrs')return [90,205,320,435,550,665,780];
  if(kind==='isolated-ectopy')return [90,210,330,430,585,705,825];
  if(kind==='concerning-run')return [90,210,350,390,430,470,510,550,590,735,845];
  if(kind==='event-marker')return [90,210,330,450,555,670,790];
  return [90,190,290,390,490,590,690,790];
}

function normalBeatPath(x){
  return [
    `L ${x-40} ${BASELINE}`,
    `C ${x-37} ${BASELINE} ${x-35} 108 ${x-30} 108`,
    `C ${x-25} 108 ${x-23} ${BASELINE} ${x-19} ${BASELINE}`,
    `L ${x-9} ${BASELINE}`,
    `L ${x-6} 121`,
    `L ${x} 76`,
    `L ${x+4} 134`,
    `L ${x+8} ${BASELINE}`,
    `L ${x+18} ${BASELINE}`,
    `C ${x+22} ${BASELINE} ${x+25} 106 ${x+30} 102`,
    `C ${x+35} 98 ${x+40} 105 ${x+44} ${BASELINE}`
  ].join(' ');
}

function pvcBeatPath(x){
  return [
    `L ${x-46} ${BASELINE}`,
    `C ${x-36} ${BASELINE} ${x-29} 124 ${x-21} 135`,
    `C ${x-12} 148 ${x-6} 84 ${x+1} 73`,
    `C ${x+9} 61 ${x+18} 151 ${x+30} 150`,
    `C ${x+42} 149 ${x+48} 122 ${x+57} ${BASELINE}`,
    `L ${x+64} ${BASELINE}`,
    `C ${x+70} ${BASELINE} ${x+76} 135 ${x+87} 136`,
    `C ${x+98} 137 ${x+104} 123 ${x+112} ${BASELINE}`
  ].join(' ');
}

function ventricularRunBeatPath(x){
  return [
    `L ${x-10} ${BASELINE}`,
    `L ${x-6} 125`,
    `L ${x-2} 95`,
    `L ${x+2} 70`,
    `L ${x+7} 73`,
    `L ${x+12} 100`,
    `L ${x+17} 148`,
    `L ${x+23} ${BASELINE}`,
    `L ${x+29} ${BASELINE}`
  ].join(' ');
}

function stripPath(kind){
  const beats=beatsForKind(kind);
  let wideAt=-1;
  let path=`M 20 ${BASELINE}`;
  if(kind==='isolated-ectopy')wideAt=3;

  beats.forEach((x,index)=>{
    if(kind==='concerning-run'&&index>=2&&index<=8){
      path+=ventricularRunBeatPath(x);
    }else if(index===wideAt){
      path+=pvcBeatPath(x);
    }else{
      path+=normalBeatPath(x);
    }
  });
  return `${path} L 880 ${BASELINE}`;
}

function artifactSignalPath(){
  const left=[65,150,235];
  const right=[575,660,745,830];
  let path=`M 20 ${BASELINE}`;
  left.forEach(x=>{path+=normalBeatPath(x);});
  path+=` L 340 ${BASELINE} M 515 ${BASELINE}`;
  right.forEach(x=>{path+=normalBeatPath(x);});
  return `${path} L 880 ${BASELINE}`;
}

function artifactPath(){
  return [
    `M 340 ${BASELINE}`,
    'C 346 116 350 123 354 120',
    'L 359 105',
    'L 364 132',
    'L 370 91',
    'L 375 145',
    'L 382 113',
    'C 388 104 393 130 398 119',
    'L 403 76',
    'L 409 150',
    'L 415 96',
    'L 421 137',
    'L 427 109',
    'C 433 129 439 106 445 121',
    'L 451 86',
    'L 456 140',
    'L 463 101',
    'L 469 129',
    'C 476 134 482 108 489 119',
    'L 495 98',
    'L 500 127',
    'C 505 123 510 116 515 118'
  ].join(' ');
}

function pLabelMarkup(kind){
  return beatsForKind(kind).slice(0,3).map(x=>`<text x="${x-30}" y="96">P</text>`).join('');
}

function syncPulseRow(svg,kind){
  const row=svg.querySelector('.ekg-pulse-row');
  if(!row||kind!=='artifact-burst')return;
  const beats=beatsForKind('artifact-burst');
  row.innerHTML=`<text x="24" y="205">Pulse trend</text><line x1="45" y1="200" x2="865" y2="200"/>${beats.map(x=>`<circle cx="${x}" cy="200" r="5"/>`).join('')}`;
}

function polishGrid(svg){
  const small=svg.querySelector('#ekg-grid-small');
  const large=svg.querySelector('#ekg-grid-large');
  if(small){
    small.setAttribute('width','10');
    small.setAttribute('height','10');
    small.classList.add('spg-grid-minor');
    const path=small.querySelector('path');
    if(path)path.setAttribute('d','M 10 0 L 0 0 0 10');
  }
  if(large){
    large.setAttribute('width','50');
    large.setAttribute('height','50');
    large.classList.add('spg-grid-major');
    const rect=large.querySelector('rect');
    if(rect){rect.setAttribute('width','50');rect.setAttribute('height','50');}
    const path=large.querySelector('path');
    if(path)path.setAttribute('d','M 50 0 L 0 0 0 50');
  }
}

function activeKind(workspace){
  const current=workspace.querySelector('[data-ekg-station-nav][aria-current="step"]');
  if(!current)return null;
  const index=Number(current.dataset.ekgStationNav);
  return Number.isInteger(index)?KIND_BY_INDEX[index]||null:null;
}

function polishSvg(svg,kind){
  if(!svg||!kind||svg.dataset.spgTracingPolish===kind)return;
  polishGrid(svg);

  const signal=svg.querySelector('.ekg-signal-line');
  if(signal)signal.setAttribute('d',kind==='artifact-burst'?artifactSignalPath():stripPath(kind));

  const artifact=svg.querySelector('.ekg-artifact-line');
  if(artifact)artifact.setAttribute('d',artifactPath());

  const labels=svg.querySelector('.ekg-p-labels');
  if(labels&&kind==='p-before-qrs')labels.innerHTML=pLabelMarkup(kind);

  syncPulseRow(svg,kind);
  svg.dataset.spgTracingPolish=kind;
}

function polishWorkspace(workspace){
  const kind=activeKind(workspace);
  const svg=workspace.querySelector('.ekg-schematic svg');
  if(svg&&kind)polishSvg(svg,kind);
}

function init(){
  const workspace=document.querySelector('[data-ekg-workspace]');
  if(!workspace)return;
  const observer=new MutationObserver(()=>polishWorkspace(workspace));
  observer.observe(workspace,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-current']});
  polishWorkspace(workspace);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
