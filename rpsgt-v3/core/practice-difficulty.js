(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTPracticeDifficulty=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // These are author-supplied descriptive metadata, NOT calibrated BRPT difficulty ratings.
  // Keep the original difficulty string on each question and in all saved attempts.
  const groups=Object.freeze({
    all:[],
    easy:['easy','beginner','foundation','core'],
    intermediate:['intermediate'],
    hard:['hard','advanced','tricky'],
    exam:['exam']
  });
  const norm=value=>String(value==null?'':value).trim().toLowerCase();
  function matches(question,selected){
    const key=norm(selected)||'all';
    if(key==='all') return true;
    return Object.hasOwn(groups,key)&&groups[key].includes(norm(question&&question.difficulty));
  }
  function groupFor(question){
    const value=norm(question&&question.difficulty);
    return Object.keys(groups).find(key=>key!=='all'&&groups[key].includes(value))||null;
  }
  return {groups,normalize:norm,matches,groupFor};
});
