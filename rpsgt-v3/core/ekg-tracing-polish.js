(function(){
'use strict';

const KIND_BY_INDEX=['artifact-burst','regular-60','p-before-qrs','slow-48','isolated-ectopy','concerning-run','event-marker'];
const BASELINE=118;

function normalBeatPath(x){
  return [
    `L ${x-36} ${BASELINE}`,
    `C ${x-32} ${BASELINE} ${x-30} 110 ${x-25} 110`,
    `C ${x-20} 110 ${x-18} ${BASELINE} ${x-14} ${BASELINE}`,
    `L ${x-7} ${BASELINE}`,
    `L ${x-4} 124`,
    `L ${x} 70`,
    `L ${x+4} 143`,
    `L ${x+8} ${BASELINE}`,
    `L ${x+17} ${BASELINE}`,
    `C ${x+20} ${BASELINE} ${x+23} 101 ${x+30} 101`,
    `C ${x+37} 101 ${x+40} ${BASELINE} ${x+46} ${BASELINE}`
  ].join(' ');
}

function pvcBeatPath(x){
  return [
    `L ${x-45} ${BASELINE}`,
    `C ${x-34} ${BASELINE} ${x-28} 121 ${x-19} 132`,
    `C ${x-10} 144 ${x-5} 81 ${x+2} 74`,
    `C ${x+10} 68 ${x+17} 150 ${x+29} 150`,
    `C ${x+41} 150 ${x+47} 120 ${x+55} ${BASELINE}`,
    `L ${x+61} ${BASELINE}`,
    `C ${x+67} ${BASELINE} ${x+72} 136 ${x+83} 136`,
    `C ${x+94} 136 ${x+99} ${BASELINE} ${x+108} ${BASELINE}`
  ].join(' ');
}

function runBeatPath(x,index){
  const up=index%2===0;
  if(up){
    return [
      `L ${x-19} ${BASELINE}`,
      `C ${x-14} ${BASELINE} ${x-10} 101 ${x-5} 88`,
      `C ${x} 74 ${x+6} 151 ${x+13} 146`,
      `C ${x+19} 141 ${x+21} 123 ${x+25} ${BASELINE}`
    ].join(' ');
  }
  return [
    `L ${x-19} ${BASELINE}`,
    `C ${x-14} ${BASELINE} ${x-10} 134 ${x-4} 147`,
    `C ${x+2} 158 ${x+7} 82 ${x+14} 87`,
    `C ${x+20} 92 ${x+22} 113 ${x+25} ${BASELINE}`
  ].join(' ');
}

function stripPath(kind){
  let beats=[90,190,290,390,490,590,690,790];
  let wideAt=-1;
  let path=`M 20 ${BASELINE}`;

  if(kind==='regular-60')beats=[65,150,235,320,405,490,575,660,745,830];
  if(kind==='slow-48')beats=[80,185,290,395,500,605,710,815];
  if(kind==='p-before-qrs')beats=[90,205,320,435,550,665,780];
  if(kind==='isolated-ectopy'){beats=[90,210,330,430,585,705,825];wideAt=3;}
  if(kind==='concerning-run')beats=[90,210,360,410,460,510,560,720,835];
  if(kind==='event-marker')beats=[90,210,330,450,555,670,790];

  beats.forEach((x,index)=>{
    if(kind==='concerning-run'&&index>=2&&index<=6){
      path+=runBeatPath(x,index-2);
    }else if(index===wideAt){
      path+=pvcBeatPath(x);
    }else{
      path+=normalBeatPath(x);
    }
  });

  return `${path} L 880 ${BASELINE}`;
}

function artifactPath(){
  return `M 350 ${BASELINE} L 360 111 L 368 77 L 377 150 L 386 88 L 395 145 L 405 69 L 416 153 L 427 92 L 438 143 L 450 75 L 461 147 L 472 96 L 482 131 L 492 114 L 504 ${BASELINE}`;
}

function pLabelMarkup(){
  return '<text x="56" y="101">P</text><text x="171" y="101">P</text><text x="286" y="101">P</text>';
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
  if(signal)signal.setAttribute('d',stripPath(kind==='artifact-burst'?'regular-60':kind));

  const artifact=svg.querySelector('.ekg-artifact-line');
  if(artifact)artifact.setAttribute('d',artifactPath());

  const labels=svg.querySelector('.ekg-p-labels');
  if(labels&&kind==='p-before-qrs')labels.innerHTML=pLabelMarkup();

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
