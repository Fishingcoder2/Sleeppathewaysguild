(function(){
  'use strict';
  const storage=window.RPSGTStorage;
  const title=document.querySelector('[data-notes-title]');
  const body=document.querySelector('[data-notes-body]');
  const status=document.querySelector('[data-notes-status]');
  const count=document.querySelector('[data-notes-count]');
  if(!storage||!title||!body) return;

  let state=storage.load();
  let dirty=false;

  function notes(){
    state.notes=state.notes&&typeof state.notes==='object'?state.notes:{};
    if(typeof state.notes.title!=='string') state.notes.title='';
    if(typeof state.notes.general!=='string') state.notes.general='';
    return state.notes;
  }

  function words(){
    const value=String(body.value||'').trim();
    return value?value.split(/\s+/).filter(Boolean).length:0;
  }

  function updateMeta(message){
    if(count) count.textContent=words()+' word'+(words()===1?'':'s');
    if(status) status.textContent=message||'Saved locally on this device';
  }

  function save(){
    const target=notes();
    target.title=String(title.value||'').trim()||'My RPSGT Study Notes';
    target.general=String(body.value||'');
    target.updatedAt=new Date().toISOString();
    state=storage.save(state);
    dirty=false;
    let saved='Saved locally';
    try{saved='Saved '+new Date(target.updatedAt).toLocaleString();}catch(error){}
    updateMeta(saved);
  }

  function load(){
    const target=notes();
    title.value=target.title||'My RPSGT Study Notes';
    body.value=target.general||'';
    if(target.updatedAt){
      try{updateMeta('Saved '+new Date(target.updatedAt).toLocaleString());return;}catch(error){}
    }
    updateMeta('Not saved yet');
  }

  function addBobTemplate(){
    const template=[
      'Coach Bob study check',
      '• What I know:',
      '• What keeps tripping me up:',
      '• Rule or source I need to verify:',
      '• My memory clue:',
      '• My next practice target:'
    ].join('\n');
    const current=String(body.value||'');
    body.value=current+(current.trim()?'\n\n':'')+template;
    dirty=true;
    updateMeta('Unsaved changes');
    body.focus();
  }

  document.querySelector('[data-notes-save]')?.addEventListener('click',save);
  document.querySelector('[data-notes-print]')?.addEventListener('click',()=>{save();window.print();});
  document.querySelector('[data-notes-bob]')?.addEventListener('click',addBobTemplate);
  document.querySelector('[data-notes-clear]')?.addEventListener('click',()=>{
    if(!window.confirm('Clear your saved RPSGT study notes on this device?')) return;
    title.value='My RPSGT Study Notes';
    body.value='';
    save();
  });
  [title,body].forEach(node=>node.addEventListener('input',()=>{dirty=true;updateMeta('Unsaved changes');}));
  window.addEventListener('beforeunload',()=>{if(dirty) save();});
  load();
})();
