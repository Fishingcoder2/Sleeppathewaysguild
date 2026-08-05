(function(root){
  'use strict';

  const state={loaded:false,loading:null,taskPlans:{},sourceTitles:new Map()};
  const text=value=>String(value==null?'':value).trim();

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
      const [plans,...sources]=await Promise.all([
        loadJson('data/study-sources/'+String(manifest.taskPlanFile||'task-plans.json')),
        ...(manifest.sourceFiles||[]).map(file=>loadJson('data/study-sources/'+file))
      ]);
      state.taskPlans=plans&&plans.taskPlans||{};
      state.sourceTitles.clear();
      sources.forEach(source=>{
        const id=text(source&&source.id);
        const title=titleForSource(source);
        if(id&&title) state.sourceTitles.set(id,title);
      });
      state.loaded=true;
      return api;
    })().catch(error=>{state.loading=null;throw error;});
    return state.loading;
  }

  function titlesForTask(taskCode){
    const plan=state.taskPlans[text(taskCode)];
    if(!plan||!Array.isArray(plan.sequence)) return [];
    return [...new Set(plan.sequence.map(item=>state.sourceTitles.get(text(item&&item.sourceId))||'').filter(Boolean))];
  }

  function isReady(){return state.loaded;}

  const api={load,titlesForTask,isReady};
  root.RPSGTStudyResourceCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
