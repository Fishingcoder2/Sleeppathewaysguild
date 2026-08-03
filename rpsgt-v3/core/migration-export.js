(function(){
  "use strict";
  const SCHEMA="spg-rpsgt-legacy-storage-export/v1";
  const summaryHost=document.querySelector("[data-export-summary]");
  const sourceHost=document.querySelector("[data-export-sources]");
  const errorHost=document.querySelector("[data-export-errors]");
  const consent=document.querySelector("[data-export-consent]");
  const downloadButton=document.querySelector("[data-export-download]");
  const refreshButton=document.querySelector("[data-export-refresh]");
  let snapshot=null;

  function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char];});}
  function formatBytes(value){
    const bytes=Number(value)||0;
    if(bytes<1024) return bytes.toLocaleString()+" bytes";
    return (bytes/1024).toFixed(bytes<10240?1:0)+" KB";
  }
  function safeOrigin(){
    try{return location.origin&&location.origin!=="null"?location.origin:"local-file";}catch(error){return "unknown";}
  }
  function buildExport(sourceSnapshot,capturedAt){
    const current=sourceSnapshot||{sources:[],parseErrors:[],summary:{sourceCount:0,totalBytes:0}};
    return {
      $schema:SCHEMA,
      $capture:{
        realBrowserExport:true,
        capturedAt:capturedAt||new Date().toISOString(),
        readOnly:true,
        origin:safeOrigin(),
        recognizedSourceCount:current.sources.length,
        totalBytes:current.sources.reduce(function(sum,item){return sum+(Number(item.bytes)||0);},0)
      },
      sources:current.sources.map(function(item){return {key:item.key,raw:item.raw,bytes:item.bytes};}),
      parseErrors:(current.parseErrors||[]).map(function(item){return {key:item.key,message:item.message};})
    };
  }
  function filename(capturedAt){return "spg-rpsgt-legacy-export-"+capturedAt.replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z").replace("T","-")+".json";}
  function setDownloadState(){if(downloadButton) downloadButton.disabled=!snapshot||!snapshot.sources.length||!consent||!consent.checked;}
  function render(){
    if(!window.RPSGTStorage||typeof window.RPSGTStorage.getLegacySnapshot!=="function"){
      if(summaryHost) summaryHost.innerHTML='<div class="notice error"><strong>Capture unavailable.</strong> The read-only storage module did not load.</div>';
      if(downloadButton) downloadButton.disabled=true;
      return;
    }
    snapshot=window.RPSGTStorage.getLegacySnapshot();
    const summary=snapshot.summary||{};
    if(summaryHost) summaryHost.innerHTML='<div class="export-stat"><span>Recognized records</span><strong>'+Number(summary.sourceCount||0).toLocaleString()+'</strong></div><div class="export-stat"><span>Total private data</span><strong>'+formatBytes(summary.totalBytes||0)+'</strong></div><div class="export-stat"><span>JSON parse errors</span><strong>'+Number(summary.parseErrorCount||0).toLocaleString()+'</strong></div><div class="export-stat"><span>Capture mode</span><strong>Read only</strong></div>';
    if(sourceHost){
      if(!snapshot.sources.length) sourceHost.innerHTML='<div class="empty">No recognized legacy RPSGT records were found on this browser origin. Open this utility from the same site, browser profile, and device used for the current RPSGT app.</div>';
      else sourceHost.innerHTML=snapshot.sources.map(function(item){const valid=!snapshot.parseErrors.some(function(error){return error.key===item.key;});return '<div class="migration-row"><div><strong>'+esc(item.key)+'</strong><small>'+formatBytes(item.bytes)+' · Stored value is not displayed</small></div><span class="status '+(valid?'green':'gold')+'">'+(valid?'Readable':'Parse issue')+'</span></div>';}).join("");
    }
    if(errorHost){
      errorHost.hidden=!snapshot.parseErrors.length;
      errorHost.innerHTML=snapshot.parseErrors.length?'<strong>Parse issues detected</strong><ul>'+snapshot.parseErrors.map(function(item){return '<li><code>'+esc(item.key)+'</code>: '+esc(item.message)+'</li>';}).join("")+'</ul>':"";
    }
    setDownloadState();
  }
  function download(){
    if(!snapshot||!snapshot.sources.length||!consent||!consent.checked) return;
    const capturedAt=new Date().toISOString();
    const payload=JSON.stringify(buildExport(snapshot,capturedAt),null,2);
    const blob=new Blob([payload],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;
    anchor.download=filename(capturedAt);
    anchor.hidden=true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},0);
  }
  if(consent) consent.addEventListener("change",setDownloadState);
  if(downloadButton) downloadButton.addEventListener("click",download);
  if(refreshButton) refreshButton.addEventListener("click",render);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",render); else render();
  window.RPSGTMigrationExport={SCHEMA:SCHEMA,buildExport:buildExport};
})();
