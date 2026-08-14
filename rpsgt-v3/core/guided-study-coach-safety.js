(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTGuidedStudyCoachSafety=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='2.0.0';
  const text=value=>String(value==null?'':value).trim();
  const normalize=value=>text(value).toLowerCase().replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/\s+/g,' ');
  const escapeRx=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  function containsAnswer(message,answer){
    const value=normalize(message);
    const expected=normalize(answer);
    if(!value||!expected) return false;
    if(/^[a-z0-9]+$/i.test(expected)&&expected.length<=4){
      return new RegExp(`(^|[^a-z0-9])${escapeRx(expected)}([^a-z0-9]|$)`,'i').test(value);
    }
    return value.includes(expected);
  }

  function safePreAnswer(message,answer,fallback){
    const value=text(message);
    if(value&&!containsAnswer(value,answer)) return value;
    return text(fallback)||'Identify the task being tested and the evidence you would use to defend a decision before choosing an answer.';
  }

  return {VERSION,containsAnswer,safePreAnswer};
});
