(function(root){
  'use strict';
  const engine=root.RPSGTRespiratoryLabEngine;
  if(!engine||!Array.isArray(engine.PATTERNS)) return;

  const SIGNAL_CONTEXT={
    normal:{thermal:'normal',eeg:'baseline',spo2Start:97,spo2Nadir:97},
    'obstructive-apnea':{thermal:'absent',eeg:'baseline',spo2Start:97,spo2Nadir:91},
    'central-apnea':{thermal:'absent',eeg:'baseline',spo2Start:97,spo2Nadir:91},
    'mixed-apnea':{thermal:'absent',eeg:'baseline',spo2Start:97,spo2Nadir:91},
    'obstructive-hypopnea':{thermal:'subtle-reduction',eeg:'baseline',spo2Start:97,spo2Nadir:93},
    'central-hypopnea':{thermal:'subtle-reduction',eeg:'baseline',spo2Start:97,spo2Nadir:93},
    'flow-limitation':{thermal:'near-normal',eeg:'terminal-arousal',spo2Start:97,spo2Nadir:97}
  };

  engine.PATTERNS.forEach(pattern=>{
    const context=SIGNAL_CONTEXT[pattern.id]||SIGNAL_CONTEXT.normal;
    pattern.thermal=context.thermal;
    pattern.eeg=context.eeg;
    pattern.spo2Start=context.spo2Start;
    pattern.spo2Nadir=context.spo2Nadir;
    if(pattern.id==='flow-limitation'){
      pattern.title='RERA / flow limitation with arousal';
      pattern.cue='Inspiratory airflow flattens while effort builds, then the sequence terminates in an EEG arousal.';
      pattern.teaching='Flow limitation by itself is not enough to call a RERA. In this teaching case, progressive inspiratory flow limitation and increasing effort terminate with a visible EEG arousal; that arousal is the required context that supports the RERA label.';
    }
  });

  engine.RESPIRATORY_SIGNAL_CONTEXT=Object.freeze(JSON.parse(JSON.stringify(SIGNAL_CONTEXT)));
})(typeof globalThis!=='undefined'?globalThis:this);
