(function(root){
  'use strict';

  const state={
    loaded:false,
    loading:null,
    taskPlans:{},
    sources:new Map(),
    sourceTitles:new Map(),
    topicFamilies:[],
    sourceKeyMap:new Map(),
    ambiguousKeys:new Set(),
    contextOnlyKeys:new Set(),
    conceptKeys:new Set(),
    legacyUmbrellaKeys:new Set(),
    pendingSourceKeys:new Set()
  };
  const text=value=>String(value==null?'':value).trim();
  const normalize=value=>text(value).toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ');
  const normalizeKey=value=>normalize(value);
  const unique=values=>[...new Set((Array.isArray(values)?values:[]).filter(Boolean))];

  async function loadJson(path){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }

  function titleForSource(source){return text(source&&(source.shortTitle||source.title||source.name||source.label||source.id));}

  function registerKey(key,sourceId,{verifiedAlias=false}={}){
    const normalized=normalizeKey(key);
    const id=text(sourceId);
    if(!normalized||!id) return;
    const existing=state.sourceKeyMap.get(normalized);
    if(existing&&existing!==id){
      if(verifiedAlias) throw new Error(`Verified source-key alias conflicts with an existing source mapping: ${normalized}`);
      state.sourceKeyMap.delete(normalized);
      state.ambiguousKeys.add(normalized);
      return;
    }
    if(state.ambiguousKeys.has(normalized)){
      if(verifiedAlias) throw new Error(`Verified source-key alias is ambiguous in source records: ${normalized}`);
      return;
    }
    state.sourceKeyMap.set(normalized,id);
  }

  async function load(){
    if(state.loaded) return api;
    if(state.loading) return state.loading;
    state.loading=(async()=>{
      const manifest=await loadJson('data/study-sources/manifest.json');
      const sourceFiles=Array.isArray(manifest.sourceFiles)?manifest.sourceFiles:[];
      const topicFiles=Array.isArray(manifest.topicFamilyFiles)?manifest.topicFamilyFiles:[];
      const aliasFile=text(manifest.sourceKeyAliasFile);
      const [plans,aliases,...rest]=await Promise.all([
        loadJson('data/study-sources/'+String(manifest.taskPlanFile||'task-plans.json')),
        aliasFile?loadJson('data/study-sources/'+aliasFile):Promise.resolve({}),
        ...sourceFiles.map(file=>loadJson('data/study-sources/'+file)),
        ...topicFiles.map(file=>loadJson('data/study-sources/'+file))
      ]);
      const sources=rest.slice(0,sourceFiles.length);
      const topicDocuments=rest.slice(sourceFiles.length);
      state.taskPlans=plans&&plans.taskPlans||{};
      state.sources.clear();
      state.sourceTitles.clear();
      state.sourceKeyMap.clear();
      state.ambiguousKeys.clear();
      state.contextOnlyKeys=new Set((Array.isArray(aliases&&aliases.contextOnlyKeys)?aliases.contextOnlyKeys:[]).map(normalizeKey).filter(Boolean));
      state.conceptKeys=new Set(Object.keys(aliases&&aliases.conceptKeys||{}).map(normalizeKey).filter(Boolean));
      state.legacyUmbrellaKeys=new Set(Object.keys(aliases&&aliases.legacyUmbrellaKeys||{}).map(normalizeKey).filter(Boolean));
      state.pendingSourceKeys=new Set(Object.keys(aliases&&aliases.pendingSourceKeys||{}).map(normalizeKey).filter(Boolean));

      sources.forEach(source=>{
        const id=text(source&&source.id);
        const title=titleForSource(source);
        if(!id) return;
        state.sources.set(id,source);
        if(title) state.sourceTitles.set(id,title);
      });

      sources.forEach(source=>{
        const id=text(source&&source.id);
        (Array.isArray(source&&source.referenceKeys)?source.referenceKeys:[]).forEach(key=>registerKey(key,id));
      });

      Object.entries(aliases&&aliases.verifiedAliases||{}).forEach(([key,sourceId])=>{
        const id=text(sourceId);
        if(!state.sources.has(id)) throw new Error(`Verified source-key alias points to an unknown source: ${key} -> ${id}`);
        registerKey(key,id,{verifiedAlias:true});
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

  function sourceRank(sourceId){
    const source=state.sources.get(text(sourceId))||{};
    if(source.currentAuthority===true||source.sourceRole==='currentAuthority') return 0;
    if(source.sourceRole==='legacyGuidance') return 1;
    if(source.sourceRole==='studySupport') return 2;
    return 3;
  }

  function exactResolution(question){
    const keys=unique([
      ...(Array.isArray(question&&question.studyRecommendationKeys)?question.studyRecommendationKeys:[]),
      ...(Array.isArray(question&&question.referenceKeys)?question.referenceKeys:[])
    ].map(normalizeKey).filter(Boolean));
    const ids=[];
    const matchedKeys=[];
    const conceptKeys=[];
    const legacyKeys=[];
    const unresolvedKeys=[];
    keys.forEach(key=>{
      if(state.contextOnlyKeys.has(key)) return;
      const sourceId=state.sourceKeyMap.get(key);
      if(sourceId&&state.sources.has(sourceId)){
        ids.push(sourceId);
        matchedKeys.push(key);
      }else if(state.conceptKeys.has(key)){
        conceptKeys.push(key);
      }else if(state.legacyUmbrellaKeys.has(key)){
        legacyKeys.push(key);
      }else{
        unresolvedKeys.push(key);
      }
    });
    const firstSeen=new Map();
    ids.forEach((id,index)=>{if(!firstSeen.has(id)) firstSeen.set(id,index);});
    const sourceIds=unique(ids).sort((a,b)=>sourceRank(a)-sourceRank(b)||(firstSeen.get(a)||0)-(firstSeen.get(b)||0));
    return {sourceIds,matchedKeys:unique(matchedKeys),conceptKeys:unique(conceptKeys),legacyKeys:unique(legacyKeys),unresolvedKeys:unique(unresolvedKeys)};
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

  function topicSourceIds(question){
    const scored=state.topicFamilies.map(family=>({family,score:familyScore(family,question)})).filter(item=>item.score>0);
    if(!scored.length) return [];
    const best=Math.max(...scored.map(item=>item.score));
    const sourceIds=[];
    scored.filter(item=>item.score===best).forEach(item=>{
      (Array.isArray(item.family.recommendations)?item.family.recommendations:[]).forEach(recommendation=>{
        const sourceId=Array.isArray(recommendation)?text(recommendation[0]):'';
        if(sourceId&&state.sources.has(sourceId)) sourceIds.push(sourceId);
      });
    });
    return unique(sourceIds).sort((a,b)=>sourceRank(a)-sourceRank(b));
  }

  function taskFallbackSourceIds(taskCode){
    const plan=state.taskPlans[text(taskCode)];
    if(!plan||!Array.isArray(plan.sequence)) return [];
    const excluded=new Set(['brpt-blueprint','brpt-handbook','brpt-refs']);
    return unique(plan.sequence.map(item=>text(item&&item.sourceId)).filter(id=>id&&state.sources.has(id)&&!excluded.has(id))).slice(0,3);
  }

  function resolutionPayload(level,sourceIds,extra={}){
    const ids=unique(sourceIds).filter(id=>state.sources.has(id)).slice(0,3);
    return Object.assign({level,sourceIds:ids,titles:ids.map(id=>state.sourceTitles.get(id)||id)},extra);
  }

  function resolveQuestion(question){
    if(!state.loaded||!question) return resolutionPayload('none',[]);
    const exact=exactResolution(question);
    const evidence={matchedKeys:exact.matchedKeys,conceptKeys:exact.conceptKeys,legacyKeys:exact.legacyKeys,unresolvedKeys:exact.unresolvedKeys};
    if(exact.sourceIds.length) return resolutionPayload('exact',exact.sourceIds,evidence);
    const topicIds=topicSourceIds(question);
    if(topicIds.length) return resolutionPayload('topic',topicIds,evidence);
    const taskIds=taskFallbackSourceIds(question&&question.taskCode);
    if(taskIds.length) return resolutionPayload('task',taskIds,evidence);
    return resolutionPayload('none',[],evidence);
  }

  function titlesForQuestion(question){return resolveQuestion(question).titles;}
  function sourceIdsForQuestion(question){return resolveQuestion(question).sourceIds;}
  function isReady(){return state.loaded;}

  const api={load,titlesForTask,titlesForQuestion,sourceIdsForQuestion,resolveQuestion,isReady};
  root.RPSGTStudyResourceCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
