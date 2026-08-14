(function(){
  'use strict';

  const state={manifest:null,blueprint:null,taskPlans:{},sources:[],sourceTasks:new Map(),sourceSectionsByTask:new Map(),authorityRulesBySource:new Map()};
  const $=selector=>document.querySelector(selector);
  const text=value=>String(value==null?'':value).trim();
  const normalize=value=>text(value).toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ');
  const unique=values=>[...new Set((Array.isArray(values)?values:[]).filter(Boolean))];
  const escapeHtml=value=>text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function sourceTitle(source){return text(source.fullTitle||source.shortTitle||source.title||source.name||source.label||'Reference');}

  // INTERNAL ONLY: the authority registry remains part of source ordering and routing.
  // Do not expose registry levels, precedence rules, provenance notes, source keys, or audit wording to learners.
  function authorityRank(source){
    const id=normalize(source.id);
    const rule=state.authorityRulesBySource.get(text(source.id));
    const haystack=normalize([source.publisher,source.sourceType,source.shortTitle,source.fullTitle].filter(Boolean).join(' | '));
    if(id==='brpt-blueprint'||id==='brpt-handbook'||id==='brpt-refs') return 0;
    if(rule) return Number(rule.level)||4;
    if(id.startsWith('aasm-')||id.startsWith('icsd-')||haystack.includes('american academy of sleep medicine')) return 3;
    if(id.startsWith('aast-')||haystack.includes('american association of sleep technologists')) return 4;
    if(haystack.includes('textbook')||source.brptReferenceStatus||/fundamentals|polysomnography|pediatric-sleep|principles-practice|clinical-guide|sleep-medicine-pearls|atlas-electroencephalography|sleep-medicine-essentials/.test(id)) return 5;
    return 6;
  }

  function cleanCitation(source){
    if(text(source.apaCitation)) return text(source.apaCitation);
    if(text(source.citation)) return text(source.citation);
    const title=sourceTitle(source);
    const year=text(source.year||source.publicationYear);
    const organization=text(source.publisher||source.organization||source.author);
    const edition=text(source.edition);
    const parts=[];
    if(organization) parts.push(organization.replace(/[.]$/,'')+'.');
    if(year) parts.push('('+year+').');
    let titlePart=title;
    if(edition&&!normalize(title).includes(normalize(edition))) titlePart+=' ('+edition+')';
    if(titlePart) parts.push(titlePart.replace(/[.]$/,'')+'.');
    return parts.join(' ')||title;
  }

  function externalUrl(source){
    const url=text(source.officialUrl||source.officialContextUrl||source.publicUrl||source.publisherUrl);
    if(/^https:\/\//i.test(url)) return url;
    const doi=text(source.doi);
    return doi?'https://doi.org/'+encodeURIComponent(doi).replace(/%2F/gi,'/'):'';
  }

  function registerTaskPlanMappings(){
    state.sourceTasks.clear();
    state.sourceSectionsByTask.clear();
    Object.entries(state.taskPlans||{}).forEach(([taskCode,plan])=>{
      (Array.isArray(plan&&plan.sequence)?plan.sequence:[]).forEach(item=>{
        const sourceId=text(item&&item.sourceId);
        if(!sourceId) return;
        if(!state.sourceTasks.has(sourceId)) state.sourceTasks.set(sourceId,new Set());
        state.sourceTasks.get(sourceId).add(taskCode);
        if(!state.sourceSectionsByTask.has(sourceId)) state.sourceSectionsByTask.set(sourceId,new Map());
        const byTask=state.sourceSectionsByTask.get(sourceId);
        byTask.set(taskCode,new Set((Array.isArray(item.sectionIds)?item.sectionIds:[]).map(text).filter(Boolean)));
      });
    });
  }

  function taskCodesFor(source){
    const direct=[
      ...(Array.isArray(source.mappedTaskCodes)?source.mappedTaskCodes:[]),
      ...(Array.isArray(source.taskCodes)?source.taskCodes:[]),
      ...(Array.isArray(source.sections)?source.sections.flatMap(section=>Array.isArray(section.taskCodes)?section.taskCodes:[]):[]),
      ...(Array.isArray(source.appendices)?source.appendices.flatMap(section=>Array.isArray(section.taskCodes)?section.taskCodes:[]):[]),
      ...(state.sourceTasks.has(text(source.id))?[...state.sourceTasks.get(text(source.id))]:[])
    ];
    return unique(direct.map(text).filter(code=>/^D[1-4][A-C]$/.test(code))).sort();
  }

  function allSections(source){
    return [
      ...(Array.isArray(source.sections)?source.sections:[]),
      ...(Array.isArray(source.appendices)?source.appendices:[])
    ].filter(item=>item&&item.hiddenFromLearner!==true&&text(item.label));
  }

  function searchableText(source){
    const sections=allSections(source).map(item=>item.label).join(' | ');
    return normalize([
      sourceTitle(source),source.shortTitle,source.publisher,source.sourceType,source.bestFor,cleanCitation(source),sections,
      ...taskCodesFor(source)
    ].filter(Boolean).join(' | '));
  }

  function populateDomains(){
    const select=$('[data-reference-domain]');
    select.innerHTML='<option value="all">All domains</option>';
    (state.blueprint&&Array.isArray(state.blueprint.domains)?state.blueprint.domains:[]).forEach(domain=>{
      const option=document.createElement('option');
      option.value=domain.id;
      option.textContent=domain.id+' · '+domain.fullName;
      select.appendChild(option);
    });
  }

  function populateTasks(){
    const domain=$('[data-reference-domain]').value;
    const select=$('[data-reference-task]');
    const previous=select.value;
    select.innerHTML='<option value="all">All tasks</option>';
    (state.blueprint&&Array.isArray(state.blueprint.domains)?state.blueprint.domains:[])
      .filter(item=>domain==='all'||item.id===domain)
      .flatMap(item=>Array.isArray(item.tasks)?item.tasks:[])
      .forEach(task=>{
        const option=document.createElement('option');
        option.value=task.code;
        option.textContent=task.code+' · '+task.title;
        select.appendChild(option);
      });
    if([...select.options].some(option=>option.value===previous)) select.value=previous;
  }

  function currentFilters(){
    return {
      domain:$('[data-reference-domain]').value,
      task:$('[data-reference-task]').value,
      topic:normalize($('[data-reference-topic]').value)
    };
  }

  function matches(source,filters){
    const tasks=taskCodesFor(source);
    if(filters.domain!=='all'&&!tasks.some(code=>code.startsWith(filters.domain))) return false;
    if(filters.task!=='all'&&!tasks.includes(filters.task)) return false;
    if(filters.topic&&!searchableText(source).includes(filters.topic)) return false;
    return true;
  }

  function relevantSections(source,taskCode,topic){
    let sections=allSections(source);
    if(taskCode&&taskCode!=='all'){
      const selected=state.sourceSectionsByTask.get(text(source.id))?.get(taskCode);
      if(selected&&selected.size) sections=sections.filter(section=>selected.has(text(section.id)));
      else sections=sections.filter(section=>!Array.isArray(section.taskCodes)||!section.taskCodes.length||section.taskCodes.includes(taskCode));
    }
    if(topic){
      const matching=sections.filter(section=>normalize(section.label).includes(topic));
      const remaining=sections.filter(section=>!normalize(section.label).includes(topic));
      sections=matching.concat(remaining);
    }
    return sections.slice(0,12);
  }

  function cardHtml(source,filters){
    const title=sourceTitle(source);
    const citation=cleanCitation(source);
    const tasks=taskCodesFor(source);
    const sections=relevantSections(source,filters.task,filters.topic);
    const url=externalUrl(source);
    const bestFor=text(source.bestFor);
    return '<article class="card reference-card">'+
      '<div class="reference-card-head"><div><div class="eyebrow">Study reference</div><h2>'+escapeHtml(title)+'</h2></div></div>'+
      '<div class="reference-citation"><span class="reference-citation-label">APA-style reference</span><em>'+escapeHtml(citation)+'</em></div>'+
      (bestFor?'<p class="reference-best-for"><strong>Helpful for:</strong> '+escapeHtml(bestFor)+'</p>':'')+
      (tasks.length?'<div class="reference-task-list" aria-label="RPSGT tasks"><span class="sr-only">RPSGT tasks: </span>'+tasks.map(code=>'<span class="reference-task-pill">'+escapeHtml(code)+'</span>').join('')+'</div>':'')+
      (sections.length?'<details class="reference-sections"><summary>Relevant sections / chapters</summary><ul class="reference-section-list">'+sections.map(section=>'<li>'+escapeHtml(section.label)+'</li>').join('')+'</ul></details>':'')+
      (url?'<div class="reference-actions"><a class="btn secondary" href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">Open public source ↗</a></div>':'')+
      '</article>';
  }

  function render(){
    const filters=currentFilters();
    const results=state.sources.filter(source=>matches(source,filters)).sort((a,b)=>{
      const rankDiff=authorityRank(a)-authorityRank(b);
      return rankDiff||sourceTitle(a).localeCompare(sourceTitle(b));
    });
    const host=$('[data-reference-results]');
    const count=$('[data-reference-count]');
    count.textContent=results.length.toLocaleString();
    $('[data-reference-status]').textContent=results.length===1?'1 reference shown':results.length.toLocaleString()+' references shown';
    if(!results.length){
      host.innerHTML='<div class="card reference-empty"><h2>No references match those filters.</h2><p>Try a broader domain, task, or subject term.</p></div>';
      return;
    }
    host.innerHTML=results.map(source=>cardHtml(source,filters)).join('');
  }

  function applyQueryParameters(){
    const params=new URLSearchParams(location.search);
    const domain=text(params.get('domain')).toUpperCase();
    const task=text(params.get('task')).toUpperCase();
    const topic=text(params.get('topic'));
    if(/^D[1-4]$/.test(domain)) $('[data-reference-domain]').value=domain;
    populateTasks();
    if(/^D[1-4][A-C]$/.test(task)&&[...$('[data-reference-task]').options].some(option=>option.value===task)) $('[data-reference-task]').value=task;
    if(topic) $('[data-reference-topic]').value=topic;
  }

  function wireControls(){
    $('[data-reference-domain]').addEventListener('change',()=>{populateTasks();render();});
    $('[data-reference-task]').addEventListener('change',render);
    let timer=null;
    $('[data-reference-topic]').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(render,120);});
    $('[data-reference-clear]').addEventListener('click',()=>{
      $('[data-reference-domain]').value='all';
      populateTasks();
      $('[data-reference-task]').value='all';
      $('[data-reference-topic]').value='';
      render();
      $('[data-reference-topic]').focus();
    });
  }

  async function init(){
    const status=$('[data-reference-load]');
    try{
      const manifest=await loadJson('data/study-sources/manifest.json');
      state.manifest=manifest;
      const authorityPath=text(manifest.authorityRegistryFile);
      const [blueprint,plans,authorityRegistry]=await Promise.all([
        loadJson('data/blueprint.json'),
        loadJson('data/study-sources/'+String(manifest.taskPlanFile||'task-plans.json')),
        authorityPath?loadJson('data/study-sources/'+authorityPath):Promise.resolve({rules:[]})
      ]);
      state.blueprint=blueprint;
      state.taskPlans=plans&&plans.taskPlans||{};
      state.authorityRulesBySource.clear();
      (Array.isArray(authorityRegistry&&authorityRegistry.rules)?authorityRegistry.rules:[]).forEach(rule=>{
        const sourceId=text(rule&&rule.sourceId);
        if(sourceId&&!state.authorityRulesBySource.has(sourceId)) state.authorityRulesBySource.set(sourceId,rule);
      });
      registerTaskPlanMappings();
      const files=Array.isArray(manifest.sourceFiles)?manifest.sourceFiles:[];
      const settled=await Promise.allSettled(files.map(file=>loadJson('data/study-sources/'+file)));
      state.sources=settled.filter(item=>item.status==='fulfilled'&&item.value&&item.value.id).map(item=>item.value);
      const failed=settled.filter(item=>item.status==='rejected').length;
      populateDomains();
      populateTasks();
      applyQueryParameters();
      wireControls();
      render();
      status.className='section notice';
      status.innerHTML='<strong>References ready.</strong> '+state.sources.length.toLocaleString()+' study references are available.'+(failed?' '+failed+' reference'+(failed===1?'':'s')+' could not be loaded.':'');
    }catch(error){
      status.className='section notice';
      status.innerHTML='<strong>Reference Center could not load.</strong> '+escapeHtml(error.message||String(error))+' Please return to the dashboard and try again.';
      $('[data-reference-controls]').hidden=true;
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();