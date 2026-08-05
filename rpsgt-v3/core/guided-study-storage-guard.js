(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTGuidedStudyStorageGuard=api;
  if(root.document) api.mount(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='1.0.0';
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));

  function reconcile(before,after){
    const next=clone(before||{});
    next.guidedStudy=clone(after&&after.guidedStudy||{});
    return next;
  }

  function mount(win){
    const storage=win.RPSGTStorage;
    const doc=win.document;
    if(!storage||!doc) return null;
    let scheduled=false;
    let before=null;
    const defer=typeof win.queueMicrotask==='function'?win.queueMicrotask.bind(win):callback=>Promise.resolve().then(callback);

    doc.addEventListener('click',event=>{
      if(!event.target.closest('[data-trail-mark],[data-checkpoint-score]')) return;
      before=storage.load();
      if(scheduled) return;
      scheduled=true;
      defer(()=>{
        scheduled=false;
        const preserved=before;
        before=null;
        const after=storage.load();
        storage.save(reconcile(preserved,after));
      });
    },true);

    return {reconcile};
  }

  return {VERSION,reconcile,mount};
});
