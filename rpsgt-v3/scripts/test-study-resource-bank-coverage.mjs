import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here=dirname(fileURLToPath(import.meta.url));
const appRoot=resolve(here,'..');
const bankRoot=join(appRoot,'data','question-bank');
const bankManifest=JSON.parse(await readFile(join(bankRoot,'manifest.json'),'utf8'));
const officialTasks=new Set(['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C']);

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

try{
  const catalogCode=await readFile(join(appRoot,'core','study-resource-catalog.js'),'utf8');
  vm.runInThisContext(catalogCode,{filename:'study-resource-catalog.js'});
  const catalog=globalThis.RPSGTStudyResourceCatalog;
  if(!catalog||typeof catalog.resolveQuestion!=='function') throw new Error('Study resource catalog exact-resolution API is unavailable.');
  await catalog.load();

  const levels={exact:0,topic:0,task:0,none:0};
  const officialLevels={exact:0,topic:0,task:0,none:0};
  const unresolvedCounts=new Map();
  const conceptCounts=new Map();
  const sourceCounts=new Map();
  const noneIds=[];
  let total=0;
  let officialTotal=0;
  let crossTaskTotal=0;

  for(const module of bankManifest.modules||[]){
    const payload=JSON.parse(await readFile(join(bankRoot,module.path),'utf8'));
    for(const question of payload.questions||[]){
      total+=1;
      const result=catalog.resolveQuestion(question);
      const level=Object.prototype.hasOwnProperty.call(levels,result.level)?result.level:'none';
      levels[level]+=1;
      if(officialTasks.has(String(question.taskCode||''))){
        officialTotal+=1;
        officialLevels[level]+=1;
      }else{
        crossTaskTotal+=1;
      }
      for(const key of result.unresolvedKeys||[]) unresolvedCounts.set(key,(unresolvedCounts.get(key)||0)+1);
      for(const key of result.conceptKeys||[]) conceptCounts.set(key,(conceptCounts.get(key)||0)+1);
      for(const sourceId of result.sourceIds||[]) sourceCounts.set(sourceId,(sourceCounts.get(sourceId)||0)+1);
      if(level==='none') noneIds.push(String(question.id));
    }
  }

  if(total!==bankManifest.meta.questionCount) throw new Error(`Question-bank coverage audit read ${total} questions; manifest reports ${bankManifest.meta.questionCount}.`);
  if(officialLevels.none!==0) throw new Error(`Verified resource resolution failed for ${officialLevels.none} official-task questions.`);
  if(levels.exact===0) throw new Error('No questions resolved through Level 1 exact provenance.');

  const rank=map=>[...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const unresolvedTop=rank(unresolvedCounts).slice(0,20).map(([key,count])=>({key,count}));
  const conceptTop=rank(conceptCounts).slice(0,20).map(([key,count])=>({key,count}));
  const sourceTop=rank(sourceCounts).slice(0,15).map(([sourceId,count])=>({sourceId,count}));
  const pct=value=>Number((value*100/Math.max(1,total)).toFixed(1));

  console.log(JSON.stringify({
    total,
    officialTotal,
    crossTaskTotal,
    levels,
    officialLevels,
    percentages:{exact:pct(levels.exact),topic:pct(levels.topic),task:pct(levels.task),none:pct(levels.none)},
    taskFallbackNeededByCurrentBank:levels.task>0,
    noneIds:noneIds.slice(0,25),
    distinctUnresolvedSourceKeys:unresolvedCounts.size,
    unresolvedSourceTop:unresolvedTop,
    distinctConceptKeys:conceptCounts.size,
    conceptTop,
    sourceTop,
    allOfficialQuestionsHaveVerifiedPath:true
  },null,2));
}finally{
  if(previousFetch===undefined) delete globalThis.fetch; else globalThis.fetch=previousFetch;
  if(previousCatalog===undefined) delete globalThis.RPSGTStudyResourceCatalog; else globalThis.RPSGTStudyResourceCatalog=previousCatalog;
}
