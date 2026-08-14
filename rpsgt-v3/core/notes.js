(function(){
  'use strict';

  const storage=window.RPSGTStorage;
  const title=document.querySelector('[data-notes-title]');
  const body=document.querySelector('[data-notes-body]');
  const saveButton=document.querySelector('[data-notes-save]');
  const clearButton=document.querySelector('[data-notes-clear]');
  const status=document.querySelector('[data-notes-status]');
  const count=document.querySelector('[data-notes-count]');
  const mathHost=document.querySelector('[data-notes-math]');
  if(!storage||!title||!body||!saveButton||!status) return;

  let state=storage.load();
  let saveTimer=null;
  let dirty=false;

  function esc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[char]);
  }

  function ensureNotes(record){
    record.notes=record.notes&&typeof record.notes==='object'?record.notes:{};
    if(typeof record.notes.title!=='string') record.notes.title='';
    if(typeof record.notes.general!=='string') record.notes.general='';
    record.notes.math=record.notes.math&&typeof record.notes.math==='object'?record.notes.math:{};
    return record.notes;
  }

  function wordCount(){
    const text=body.value.trim();
    const words=text?text.split(/\s+/).length:0;
    if(count) count.textContent=`${words} ${words===1?'word':'words'} · ${body.value.length} characters`;
  }

  function setStatus(message){
    status.textContent=message;
  }

  function renderMathNotes(){
    if(!mathHost) return;
    const notes=ensureNotes(state);
    const entries=Object.entries(notes.math).filter(([,value])=>typeof value==='string'&&value.trim());
    if(!entries.length){
      mathHost.innerHTML='<p class="muted">No migrated Math Coach notes are stored in this V3 learner record.</p>';
      return;
    }
    mathHost.innerHTML=entries.map(([key,value])=>`<article class="card notes-tool-card"><span class="status">Math Coach note</span><h3>${esc(key.replace(/[-_]+/g,' '))}</h3><p>${esc(value)}</p></article>`).join('');
  }

  function save(){
    clearTimeout(saveTimer);
    state=storage.load();
    const notes=ensureNotes(state);
    notes.title=title.value.slice(0,120);
    notes.general=body.value;
    state=storage.save(state);
    dirty=false;
    setStatus(`Saved in this browser at ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`);
    wordCount();
  }

  function scheduleSave(){
    dirty=true;
    setStatus('Unsaved changes…');
    wordCount();
    clearTimeout(saveTimer);
    saveTimer=setTimeout(save,700);
  }

  function load(){
    state=storage.load();
    const notes=ensureNotes(state);
    title.value=notes.title;
    body.value=notes.general;
    setStatus(notes.title||notes.general?'Loaded from this browser':'Ready for your first note');
    wordCount();
    renderMathNotes();
  }

  saveButton.addEventListener('click',save);
  title.addEventListener('input',scheduleSave);
  body.addEventListener('input',scheduleSave);

  if(clearButton){
    clearButton.addEventListener('click',()=>{
      if(!window.confirm('Clear the title and general RPSGT study note from this browser?')) return;
      title.value='';
      body.value='';
      save();
      setStatus('General note cleared from this browser');
    });
  }

  window.addEventListener('beforeunload',()=>{if(dirty) save();});
  load();
})();
