(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTCoachBobEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='1.0.1';
  const text=value=>String(value==null?'':value).replace(/\uFFFD/g,'').trim();
  const normalize=value=>text(value).toLowerCase().replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/\s+/g,' ');
  const unique=values=>[...new Set((Array.isArray(values)?values:[]).map(text).filter(Boolean))];
  const escapeRx=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  const taskPractice={
    D1A:'In the sleep lab, connect the history and clinical clue to the study plan before thinking about a scored event.',
    D1B:'In practice, education has to match the patient or caregiver’s actual need, readiness, and safety concern.',
    D1C:'At the bedside, therapy support means recognizing barriers, reinforcing the plan, and knowing when to escalate.',
    D2A:'During setup, identify the required signal or measurement first, then verify that the technical preparation can support it.',
    D2B:'During a procedure, keep the protocol goal, patient condition, and required documentation aligned.',
    D2C:'When something changes during a study, identify the problem, cross-check related channels, respond within policy, and document what happened.',
    D3A:'While scoring an adult study, name the signal pattern only after the required channels and current rule fit together.',
    D3B:'Pediatric and infant scoring requires age-aware pattern recognition while current AASM pediatric rules remain the scoring authority.',
    D3C:'A report is a verification job: recalculate, reconcile the scored data, and make sure the summary matches what the study actually shows.',
    D4A:'During PAP work, separate patient acclimation, interface problems, pressure response, residual events, and documentation before deciding the next step.',
    D4B:'Alternative therapy questions usually test selection, indication, follow-up, or referral—not whether the technologist independently prescribes treatment.',
    D4C:'With oxygen, stay inside the laboratory’s authorized protocol, monitor the patient and signals, and document the response and any escalation.'
  };

  function compassFor(question){
    const task=text(question&&question.taskCode).toUpperCase();
    const haystack=normalize([
      question&&question.topic,
      question&&question.task,
      question&&question.questionType,
      question&&question.reportCategory,
      question&&question.sourceCredit&&question.sourceCredit.sourceFamily
    ].filter(Boolean).join(' | '));
    if(/^D1/.test(task)||/patient|caregiver|history|symptom|medication|education|safety|clinical/.test(haystack)){
      return {key:'patient-first',label:'PATIENT FIRST',prompt:'What patient, history, safety, or education clue changes what the technologist should recognize or do?'};
    }
    if(/signal|eeg|eog|emg|airflow|effort|respir|oxim|ecg|ekg|artifact|electrode|channel|staging|waveform/.test(haystack)){
      return {key:'signal-family',label:'SIGNAL FAMILY',prompt:'Which signal family carries the finding, and what related channel should confirm or challenge it?'};
    }
    if(/report|index|math|calculation|formula|verify|titration|pap|troubleshoot|quality|documentation/.test(haystack)){
      return {key:'cross-check',label:'CROSS-CHECK',prompt:'What second value, channel, protocol step, or calculation should agree before you commit?'};
    }
    return {key:'proof-clue',label:'PROOF CLUE',prompt:'Which clue in the stem actually proves the best pathway, rather than merely sounding related?'};
  }

  function containsAnswerLeak(candidate,question){
    const value=normalize(candidate);
    const answer=normalize(question&&question.answer);
    if(!value||!answer) return false;
    if(/^[a-z0-9]+$/i.test(answer)&&answer.length<=4){
      return new RegExp(`(^|[^a-z0-9])${escapeRx(answer)}([^a-z0-9]|$)`,'i').test(value);
    }
    return value.includes(answer);
  }

  function safePreMessage(candidate,question,fallback){
    const value=text(candidate);
    return value&&!containsAnswerLeak(value,question)?value:fallback;
  }

  function genericPre(question,compass){
    const type=text(question&&question.questionType).toLowerCase();
    const typeCue=type?`Treat this as a ${type} item. `:'';
    const candidate=`${typeCue}${compass.prompt} Then eliminate choices that answer a nearby question instead of the one the stem actually asks.`;
    return containsAnswerLeak(candidate,question)?'Identify the task being tested, choose the evidence you would use to defend a decision, and eliminate choices that answer a different question.':candidate;
  }

  function examTrap(question){
    if(text(question&&question.examTrap)) return text(question.examTrap);
    const task=text(question&&question.taskCode).toUpperCase();
    const type=normalize(question&&question.questionType);
    const haystack=normalize([question&&question.topic,question&&question.reportCategory,question&&question.sourceCredit&&question.sourceCredit.sourceFamily].filter(Boolean).join(' | '));
    if(question&&question.qa&&question.qa.scoringRuleRelated) return 'Do not let an older habit, textbook phrase, or familiar cutoff outrank the current scoring authority attached to the question.';
    if(/math|calculation|formula|index/.test(type+' '+haystack)) return 'A correct-looking number can still be wrong if the denominator, time base, units, or rounding step is wrong.';
    if(task==='D4A'||/pap|titration/.test(haystack)) return 'Separate therapy setup or titration decisions from scoring, diagnosis, and provider-level treatment decisions.';
    if(/^D3/.test(task)) return 'Do not name the pattern from one attractive clue; confirm the required signal relationships and the exact rule being tested.';
    if(/^D2/.test(task)) return 'Do not jump to the response before you identify the technical or procedural problem the stem is actually describing.';
    return 'The distractor is often a true statement about the wrong task. Answer the exact job in the stem.';
  }

  function headline(phase,compass,priorMisses){
    if(phase==='correct') return 'Good call. Now make the reasoning reusable.';
    if(phase==='incorrect') return priorMisses>0?'This is a repeat pattern—change the reasoning step.':'Use this miss to repair the reasoning path.';
    const map={
      'patient-first':'Start with the patient story, not the answer choices.',
      'signal-family':'Name the signal family before you name the finding.',
      'cross-check':'Cross-check the pieces before you commit.',
      'proof-clue':'Find the clue that proves the pathway.'
    };
    return map[compass.key]||'Slow down and match the task.';
  }

  function mentorMessage(question,phase,compass,priorMisses){
    if(phase==='pre'){
      const fallback=genericPre(question,compass);
      return safePreMessage(question&&question.coachBobPreAnswer,question,fallback);
    }
    if(phase==='correct'){
      const custom=text(question&&question.coachBobCorrect);
      if(custom) return custom;
      return 'You matched the important clue to the task. Before moving on, say the rule or reasoning step in your own words so you can recognize it when the wording changes.';
    }
    const custom=text(question&&question.coachBobIncorrect);
    if(custom) return custom;
    const repeat=priorMisses>0?' You have missed this item before, so do not just memorize the answer—identify which reasoning step keeps breaking.':'';
    return 'Compare your choice with the rationale and identify the first point where your reasoning left the correct pathway.'+repeat;
  }

  function practiceConnection(question){
    const custom=text(question&&question.practiceConnection);
    if(custom) return custom;
    const task=text(question&&question.taskCode).toUpperCase();
    return taskPractice[task]||'In the lab, use the same sequence: identify the task, cross-check the evidence, act within scope, and document the result.';
  }

  function nextAction(question,phase,resources,priorMisses){
    const custom=text(question&&question.nextAction);
    if(custom) return custom;
    const first=unique(resources)[0];
    if(phase==='incorrect'){
      const review=first?`Review ${first} for this concept. `:'';
      const repeat=priorMisses>0?'Then retry a similar question before continuing.':'Then explain why your selected option fails before moving to the next item.';
      return review+repeat;
    }
    if(phase==='correct') return 'State the deciding clue or rule in one sentence. If you hesitated, flag the item or make a flashcard before continuing.';
    return 'Choose only after you can name the task being tested and the clue you would use to defend your choice.';
  }

  function build(input={}){
    const question=input.question||{};
    const requested=text(input.phase).toLowerCase();
    const phase=requested==='correct'||requested==='incorrect'?requested:'pre';
    const priorMisses=Math.max(0,Number(input.priorMisses)||0);
    const resources=unique(input.resources).slice(0,3);
    const compass=compassFor(question);
    const mentor=mentorMessage(question,phase,compass,priorMisses);
    return {
      version:VERSION,
      phase,
      label:phase==='pre'?'Coach Bob hint':'Coach Bob review',
      headline:headline(phase,compass,priorMisses),
      mentorMessage:mentor,
      compass,
      examTrap:examTrap(question),
      practiceConnection:practiceConnection(question),
      nextAction:nextAction(question,phase,resources,priorMisses),
      rationale:phase==='pre'?'':text(question.rationale),
      whyTricky:phase==='pre'?'':text(question.whyTricky),
      resources,
      repeatPattern:phase==='incorrect'&&priorMisses>0,
      answerLeakFree:phase==='pre'&&!containsAnswerLeak(mentor,question)
    };
  }

  return {VERSION,build,compassFor,containsAnswerLeak};
});
