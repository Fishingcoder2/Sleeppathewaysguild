(function(root){
  'use strict';
  const engine=root.RPSGTRespiratoryLabEngine;
  if(!engine||!Array.isArray(engine.PATTERNS)) return;
  const THERMAL_BY_PATTERN={
    normal:'normal',
    'obstructive-apnea':'absent',
    'central-apnea':'absent',
    'mixed-apnea':'absent',
    'obstructive-hypopnea':'subtle-reduction',
    'central-hypopnea':'subtle-reduction',
    'flow-limitation':'near-normal'
  };
  engine.PATTERNS.forEach(pattern=>{
    pattern.thermal=THERMAL_BY_PATTERN[pattern.id]||'normal';
  });
  engine.THERMAL_BY_PATTERN=Object.freeze({...THERMAL_BY_PATTERN});
})(typeof globalThis!=='undefined'?globalThis:this);
