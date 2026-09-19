(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTPracticeSubjects=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const ekgTopicPattern=/\b(?:ecg|ekg|electrocardi|cardiac|sinus rhythms?|atrial rhythms?|ventricular rhythms?|ventricular ectopy|av blocks?|atrioventricular blocks?|heart rhythms?)\b/i;
  const ekgPromptPattern=/\b(?:ecg|ekg|electrocardiogram|electrocardiographic|rhythm strip|cardiac rhythm|arrhythm|dysrhythm|r[\s-]*r interval|p wave|qrs|pr interval|qt interval|atrial fibrillation|atrial flutter|premature atrial|pac\b|premature ventricular|pvc\b|ventricular tachycardia|ventricular fibrillation|asystole|heart block|atrioventricular block|junctional rhythm|bigeminy|trigeminy|ectopy|sinus bradycardia|sinus tachycardia|cardiac pause|compensatory pause|wide-complex rhythm|irregularly irregular|near-flatline)\b/i;
  const ekgTextPattern=/\b(?:ecg|ekg|electrocardi|cardiac|sinus rhythms?|atrial rhythms?|ventricular rhythms?|ventricular ectopy|av blocks?|atrioventricular blocks?|heart rhythms?|rhythm strip|arrhythm|dysrhythm|qrs|p wave|pr interval|qt interval)\b/i;

  const definitions=[
    {id:'ekg',label:'ECG / cardiac rhythm',pattern:ekgTextPattern,questionMatch(question){
      const id=String(question&&question.id||'');
      const topic=String(question&&question.topic||'');
      const prompt=String(question&&question.prompt||'');
      return /^ekg(?:-|$)/i.test(id)||ekgTopicPattern.test(topic)||ekgPromptPattern.test(prompt);
    }},
    {id:'respiratory',label:'Respiratory events & oxygenation',pattern:/apnea|hypopnea|\brera\b|respirat|airflow|oxygen saturation|\bspo2\b|desaturation|hypoventilat|capnograph|etco2|end[\s-]*tidal|transcutaneous co2|tc[\s-]*co2|respiratory effort|snor/i},
    {id:'staging',label:'Sleep staging & arousals',pattern:/sleep stag|stage n1|stage n2|stage n3|stage r|rem sleep|\barousal\b|k[\s-]*complex|sleep spindle|slow wave|epoch scor|eeg sleep|wake after sleep onset/i},
    {id:'pap',label:'PAP & titration',pattern:/\bpap\b|\bcpap\b|\bbpap\b|bilevel|positive airway pressure|titration|pressure support|mask leak|expiratory pressure|inspiratory pressure/i},
    {id:'instrumentation',label:'Instrumentation & signal quality',pattern:/electrode|impedance|montage|calibration|sampling rate|filter setting|amplifier|polarity|signal quality|artifact|sensor|transducer|10[\s-]*20|channel derivation/i},
    {id:'daytime-testing',label:'MSLT / MWT & daytime testing',pattern:/\bmslt\b|\bmwt\b|multiple sleep latency|maintenance of wakefulness|\bsoremp\b|daytime testing|mean sleep latency/i},
    {id:'pediatric',label:'Pediatric / infant sleep',pattern:/pediatric|paediatric|infant|neonat|newborn|\bchild\b|children|apnea of prematurity/i},
    {id:'reporting-math',label:'Reporting, indices & calculations',pattern:/generate and verify report|report calculation|sleep efficiency|total sleep time|wake after sleep onset|\bwaso\b|\bahi\b|\brdi\b|\brei\b|\bplmi\b|arousal index|calculation|formula|unit conversion|index wording/i},
    {id:'safety',label:'Patient care & safety',pattern:/infection control|emergency response|patient safety|race protocol|fire safety|\bhipaa\b|fall risk|seizure|oxygen safety|scope of practice|standard precautions/i}
  ];
  const byId=new Map(definitions.map(item=>[item.id,item]));

  function list(value){return Array.isArray(value)?value:[];}
  function text(value){return String(value==null?'':value);}
  function primaryQuestionText(question){
    return [
      question&&question.id,
      question&&question.topic,
      question&&question.prompt,
      question&&question.questionType,
      question&&question.reportCategory
    ].map(text).join(' ');
  }
  function questionText(question){return primaryQuestionText(question);}
  function itemText(item){
    const topics=list(item&&item.topics).map(topic=>topic&&topic.label||topic);
    const resources=list(item&&item.resources).flatMap(group=>[
      group&&group.sourceTitle,
      group&&group.bestFor,
      ...list(group&&group.sections).map(section=>section&&section.label||section)
    ]);
    return [item&&item.title,item&&item.taskCode,...topics,...resources].map(text).join(' ');
  }
  function matchesText(value,subjectId){
    if(!subjectId||subjectId==='all') return true;
    const subject=byId.get(String(subjectId));
    return Boolean(subject&&subject.pattern.test(text(value)));
  }
  function matchesQuestion(question,subjectId){
    if(!subjectId||subjectId==='all') return true;
    const subject=byId.get(String(subjectId));
    if(!subject) return false;
    if(typeof subject.questionMatch==='function') return Boolean(subject.questionMatch(question));
    return subject.pattern.test(primaryQuestionText(question));
  }
  function inferText(value){return definitions.find(subject=>subject.pattern.test(text(value)))||null;}
  function inferQuestion(question){return definitions.find(subject=>matchesQuestion(question,subject.id))||null;}
  function inferItem(item){return inferText(itemText(item));}
  function label(subjectId){return byId.get(String(subjectId))?.label||String(subjectId||'');}

  return {definitions,matchesText,matchesQuestion,inferText,inferQuestion,inferItem,label,questionText,primaryQuestionText,itemText};
});