(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.RPSGTLabCatalogEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  function normalizeProgress(value){
    const source=isObject(value)?value:{};const completed=new Set(Array.isArray(source.completed)?source.completed.map(String):[]);const started=isObject(source.started)?clone(source.started):{};
    Object.keys(source).forEach(key=>{if(isObject(source[key])&&source[key].completed===true) completed.add(key);});
    return {completed:[...completed].sort(),started,lastLab:typeof source.lastLab==='string'?source.lastLab:null,catalogIndex:Number.isFinite(Number(source.catalogIndex))?Number(source.catalogIndex):null,raw:clone(source)};
  }
  function validateCatalog(catalog){
    const labs=Array.isArray(catalog&&catalog.labs)?catalog.labs:[];const ids=new Set();const issues=[];
    labs.forEach((lab,index)=>{if(!lab||typeof lab.id!=='string'||!lab.id)issues.push({code:'missing-lab-id',index});else if(ids.has(lab.id))issues.push({code:'duplicate-lab-id',id:lab.id});else ids.add(lab.id);if(!Array.isArray(lab.taskCodes)||!lab.taskCodes.length)issues.push({code:'missing-task-map',id:lab&&lab.id});if(!['catalog-only','legacy-linked','v3-ready'].includes(lab&&lab.status))issues.push({code:'invalid-status',id:lab&&lab.id});if(lab&&lab.status==='legacy-linked'&&!lab.legacyHref)issues.push({code:'missing-legacy-link',id:lab.id});});
    return {valid:issues.length===0,issues,count:labs.length};
  }
  function summarize(catalog,progressValue){
    const labs=Array.isArray(catalog&&catalog.labs)?catalog.labs.map(clone):[];const progress=normalizeProgress(progressValue);const completed=new Set(progress.completed);
    const rows=labs.map((lab,index)=>({...lab,index,completed:completed.has(lab.progressKey||lab.id),started:Boolean(progress.started[lab.progressKey||lab.id]),isLast:progress.lastLab===(lab.progressKey||lab.id)||progress.catalogIndex===index}));
    return {rows,progress,counts:{total:rows.length,completed:rows.filter(row=>row.completed).length,started:rows.filter(row=>row.started&&!row.completed).length,legacyLinked:rows.filter(row=>row.status==='legacy-linked').length,v3Ready:rows.filter(row=>row.status==='v3-ready').length,catalogOnly:rows.filter(row=>row.status==='catalog-only').length},last:rows.find(row=>row.isLast)||null};
  }
  return {VERSION,normalizeProgress,validateCatalog,summarize};
});