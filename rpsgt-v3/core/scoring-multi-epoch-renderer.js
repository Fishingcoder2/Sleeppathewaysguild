(function(root,factory){
  const api=factory(root.RPSGTVisualPSGRenderer);
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTScoringMultiEpochRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  const VERSION='1.1.0';
  const MIN_TRACE_WIDTH=1180;
  function render(canvas,study,options){
    if(!base||typeof base.render!=='function'||!canvas||!study)return null;
    const requested=Number(options&&options.width);
    const width=Math.max(MIN_TRACE_WIDTH,Number.isFinite(requested)?requested:MIN_TRACE_WIDTH);
    const metrics=base.render(canvas,study,{width});
    if(canvas){canvas.style.maxWidth='none';canvas.style.pointerEvents='none';}
    return metrics;
  }
  return {VERSION,MIN_TRACE_WIDTH,render};
});
