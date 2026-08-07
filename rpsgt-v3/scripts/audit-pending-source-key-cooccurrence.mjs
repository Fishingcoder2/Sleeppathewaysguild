import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here=dirname(fileURLToPath(import.meta.url));
const appRoot=resolve(here,'..');
const bankRoot=join(appRoot,'data','question-bank');
const sourceRoot=join(appRoot,'data','study-sources');
const bankManifest=JSON.parse(await readFile(join(bankRoot,'manifest.json'),'utf8'));
const sourceManifest=JSON.parse(await readFile(join(sourceRoot,'manifest.json'),'utf8'));
const aliases=JSON.parse(await readFile(join(sourceRoot,sourceManifest.sourceKeyAliasFile),'utf8'));
const pendingKeys=Object.keys(aliases.pendingSourceKeys||{});

const previousFetch=globalThis.fetch;
const previousCatalog=globalThis.RPSGTStudyResourceCatalog;
globalThis.fetch=async input=>{
  const raw=typeof input==='string'?input:String(input&&input.url||'');
  const relative=raw.replace(/^\/+/, '').split('?')[0];
  try{
    const body=await readFile(join(appRoot,relative),'utf8');
    return {ok:true,status:200,json:async()=>JSON.parse(body)};
  }catch(error){
    return {ok:false,status:404,json:async()=>{throw error;}};
  }
};
delete globalThis.RPSGTStudyResourceCatalog;

const inc=(map,key)=>map.set(key,(map.get(key)||0)+1);
const ranked=map=>[...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));

try{
  const catalogCode=await readFile(join(appRoot,'core','study-resource-catalog.js'),'utf8');
  vm.runInThisContext(catalogCode,{filename:'study-resource-catalog.js'});
  const catalog=globalThis.RPSGTStudyResourceCatalog;
  await catalog.load();

  const audit=Object.fromEntries(pendingKeys.map(key=>[key,{
    questions:0,
    inReferenceKeys:0,
    inStudyRecommendationKeys:0,
    tasks:new Map(),
    topics:new Map(),
    coSourceIds:new Map(),
    coMatchedKeys:new Map(),
    coConceptKeys:new Map(),
    sampleIds:[]
  }]));

  for(const module of bankManifest.modules||[]){
    const payload=JSON.parse(await readFile(join(bankRoot,module.path),'utf8'));
    for(const question of payload.questions||[]){
      const refs=(Array.isArray(question.referenceKeys)?question.referenceKeys:[]).map(String);
      const recs=(Array.isArray(question.studyRecommendationKeys)?question.studyRecommendationKeys:[]).map(String);
      const all=new Set([...refs,...recs]);
      const hit=pendingKeys.filter(key=>all.has(key));
      if(!hit.length) continue;
      const resolved=catalog.resolveQuestion(question);
      for(const key of hit){
        const row=audit[key];
        row.questions+=1;
        if(refs.includes(key)) row.inReferenceKeys+=1;
        if(recs.includes(key)) row.inStudyRecommendationKeys+=1;
        inc(row.tasks,String(question.taskCode||'(none)'));
        if(question.topic) inc(row.topics,String(question.topic));
        for(const sourceId of resolved.sourceIds||[]) inc(row.coSourceIds,sourceId);
        for(const matchedKey of resolved.matchedKeys||[]) if(matchedKey!==key) inc(row.coMatchedKeys,matchedKey);
        for(const conceptKey of resolved.conceptKeys||[]) inc(row.coConceptKeys,conceptKey);
        if(row.sampleIds.length<8) row.sampleIds.push(String(question.id||''));
      }
    }
  }

  const output={};
  for(const key of pendingKeys){
    const row=audit[key];
    output[key]={
      questions:row.questions,
      keyPlacement:{referenceKeys:row.inReferenceKeys,studyRecommendationKeys:row.inStudyRecommendationKeys},
      taskDistribution:ranked(row.tasks).map(([taskCode,count])=>({taskCode,count})),
      topTopics:ranked(row.topics).slice(0,8).map(([topic,count])=>({topic,count})),
      topCoResolvedSources:ranked(row.coSourceIds).slice(0,8).map(([sourceId,count])=>({sourceId,count,share:Number((count*100/Math.max(1,row.questions)).toFixed(1))})),
      topCoMatchedKeys:ranked(row.coMatchedKeys).slice(0,10).map(([coKey,count])=>({key:coKey,count,share:Number((count*100/Math.max(1,row.questions)).toFixed(1))})),
      topConceptKeys:ranked(row.coConceptKeys).slice(0,8).map(([conceptKey,count])=>({key:conceptKey,count})),
      sampleIds:row.sampleIds
    };
  }

  console.log(JSON.stringify({
    pendingSourceKeyCount:pendingKeys.length,
    pendingSourceKeys:output
  },null,2));
}finally{
  if(previousFetch===undefined) delete globalThis.fetch; else globalThis.fetch=previousFetch;
  if(previousCatalog===undefined) delete globalThis.RPSGTStudyResourceCatalog; else globalThis.RPSGTStudyResourceCatalog=previousCatalog;
}
