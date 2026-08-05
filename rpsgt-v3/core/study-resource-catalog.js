(function(root){
  'use strict';

  const state={loaded:false,loading:null,taskPlans:{},sourceTitles:new Map(),topicFamilies:[]};
  const text=value=>String(value==null?'':value).trim();
  const normalize=value=>text(value).toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ');
  const unique=values=>[...new Set((Array.isArray(values)?values:[]).filter(Boolean))];

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function titleForSource(source){return text(source&&(source.shortTitle||source.title||source.name||source.label||source.id));}

  async function load(){
    if(state.loaded) return api;
    if(state.loading) return state.loading;
    state.loading=(async()=>{
      const manifest=await loadJson('data/study-sources/manifest.json');
      const sourceFiles=Array.isArray(manifest.sourceFiles)?manifest.sourceFiles:[];
      const topicFiles=Array.isArray(manifest.topicFamilyFiles)?manifest.topicFamilyFiles:[];
      const [plans,...rest]=await Promise.all([
        loadJson('data/study-sources/'+String(manifest.taskPlanFile||'task-plans.json')),
        ...sourceFiles.map(file=>loadJson('data/study-sources/'+file)),
        ...topicFiles.map(file=>loadJson('data/study-sources/'+file))
      ]);
      const sources=rest.slice(0,sourceFiles.length);
      const topicDocuments=rest.slice(sourceFiles.length);
      state.taskPlans=plans&&plans.taskPlans||{};
      state.sourceTitles.clear();
      sources.forEach(source=>{
        const id=text(source&&source.id);
        const title=titleForSource(source);
        if(id&&title) state.sourceTitles.set(id,title);
      });
      state.topicFamilies=topicDocuments.flatMap(document=>Array.isArray(document&&document.topicFamilies)?document.topicFamilies:[]);
      state.loaded=true;
      return api;
    })().catch(error=>{state.loading=null;throw error;});
    return state.loading;
  }

  function titlesForTask(taskCode){
    const plan=state.taskPlans[text(taskCode)];
    if(!plan||!Array.isArray(plan.sequence)) return [];
    return unique(plan.sequence.map(item=>state.sourceTitles.get(text(item&&item.sourceId))||''));
  }

  function familyScore(family,question){
    const metadata=normalize([
      question&&question.topic,
      question&&question.reportCategory,
      question&&question.sourceCredit&&question.sourceCredit.sourceFamily,
      question&&question.sourceCredit&&question.sourceCredit.sectionHint
    ].filter(Boolean).join(' | '));
    if(!metadata) return 0;
    return (Array.isArray(family&&family.keywords)?family.keywords:[]).reduce((score,keyword)=>score+(metadata.includes(normalize(keyword))?1:0),0);
  }

  function titlesForQuestion(question){
    if(!state.loaded||!question) return [];
    const scored=state.topicFamilies.map(family=>({family,score:familyScore(family,question)})).filter(item=>item.score>0);
    if(!scored.length) return [];
    const best=Math.max(...scored.map(item=>item.score));
    const sourceIds=[];
    scored.filter(item=>item.score===best).forEach(item=>{
      (Array.isArray(item.family.recommendations)?item.family.recommendations:[]).forEach(recommendation=>{
        const sourceId=Array.isArray(recommendation)?recommendation[0]:null;
        if(sourceId) sourceIds.push(text(sourceId));
      });
    });
    return unique(sourceIds.map(id=>state.sourceTitles.get(id)||''));
  }

  function isReady(){return state.loaded;}

  const api={load,titlesForTask,titlesForQuestion,isReady};
  root.RPSGTStudyResourceCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
