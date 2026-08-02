import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');
const engineSource=await readFile(join(root,'core','migration-engine.js'),'utf8');
const questionIndex=JSON.parse(await readFile(join(root,'data','question-bank','feedback-index.json'),'utf8'));
const context={globalThis:{},Date,TextEncoder,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};vm.createContext(context);vm.runInContext(engineSource,context,{filename:'migration-engine.js'});
const engine=context.globalThis.RPSGTMigrationEngine;
const recognized=key=>['spg_rpsgtv2_2026_evolved_v10_5_1','spg_rpsgtv2_flash_flags_v1262a','spg_flash_flags_59b','spg_mathcoach_lesson_59b'].includes(key)||key.startsWith('spg_math_notes_59b_');
export function normalizeExport(input){
  if(input&&Array.isArray(input.sources)) return {sources:JSON.parse(JSON.stringify(input.sources)),parseErrors:Array.isArray(input.parseErrors)?JSON.parse(JSON.stringify(input.parseErrors)):[]};
  const records=input&&typeof input==='object'&&(input.records||input.localStorage)||input||{};
  const sources=[];
  for(const [key,value] of Object.entries(records)){
    if(key.startsWith('$')||!recognized(key)) continue;
    const raw=typeof value==='string'?value:JSON.stringify(value);
    sources.push({key,raw,bytes:Buffer.byteLength(raw,'utf8')});
  }
  sources.sort((a,b)=>a.key.localeCompare(b.key));
  return {sources,parseErrors:[]};
}
export function validateExport(input,options={}){
  const snapshot=normalizeExport(input);
  const generatedAt=options.generatedAt||input&&input.$fixture&&input.$fixture.capturedAt||'2026-08-02T15:00:00.000Z';
  return engine.buildMigrationReport(snapshot,{questionIndex,currentState:options.currentState||{},now:()=>generatedAt});
}
function publicSummary(report,file){return {file,engineVersion:report.engineVersion,targetSchemaVersion:report.targetSchemaVersion,fingerprint:report.fingerprint,sourceCount:report.summary.sourceCount,blocking:report.summary.blockingIssueCount,warnings:report.summary.warningIssueCount,unresolved:report.summary.unresolvedItemCount,passesBlockingValidation:report.validation.passesBlockingValidation,canImport:report.canImport,importFeatureEnabled:report.validation.importFeatureEnabled,sourceManifest:report.sourceManifest.map(item=>({key:item.key,present:item.present,parseStatus:item.parseStatus,recordType:item.recordType,sourcePriority:item.sourcePriority}))};}
const invoked=process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url;
if(invoked){
  const file=process.argv[2];
  if(!file){console.error('Usage: node rpsgt-v3/scripts/validate-storage-export.mjs <export.json>');process.exitCode=2;}
  else{
    try{const input=JSON.parse(await readFile(file,'utf8'));const report=validateExport(input);console.log(JSON.stringify(publicSummary(report,file),null,2));if(!report.validation.passesBlockingValidation) process.exitCode=1;}
    catch(error){console.error(JSON.stringify({file,error:error.message},null,2));process.exitCode=2;}
  }
}
