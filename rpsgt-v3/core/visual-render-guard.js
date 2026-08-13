(function(){
  'use strict';
  const renderer=window.RPSGTVisualPSGRenderer;
  if(!renderer||renderer.__renderGuard)return;
  const original=renderer.render.bind(renderer);
  const states=new WeakMap();
  renderer.render=function(canvas,study,options){
    if(!canvas||!study)return original(canvas,study,options);
    const width=Math.max(860,Math.floor((options&&options.width)||(canvas.parentElement&&canvas.parentElement.clientWidth)||960));
    const previous=states.get(canvas);
    if(previous&&previous.study===study&&previous.width===width)return previous.metrics;
    const metrics=original(canvas,study,options);
    if(metrics)states.set(canvas,{study,width:metrics.width,metrics});
    return metrics;
  };
  renderer.__renderGuard={version:'0.1.0'};
})();