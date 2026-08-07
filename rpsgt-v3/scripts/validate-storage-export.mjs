import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');
const engineSource=await readFile(join(root,'core','migration-engine.js'),'utf8');
const questionIndex=JSON.parse(await readFile(join(root,'data','question-bank','feedback-index.json'),'utf8'));
const context={globalThis:{},Date,TextEncoder,JSON,Map,Set,Object,Array,Number,String,Boolean,Math};vm.createContext(context);vm.runInContext(engineSource,context,{filename:'migration-engine.js'});
const engine=context.globalThis.RPSGTMigrationEngine;
export const EXPORT_SCHEMA='spg-rpsgt-legacy-storage-export/v1';
export const RECOGNIZED_KEYS=['spg_rpsgtv2_2026_evolved_v10_5_1','spg_rpsgtv2_flash_flags_v1262a','spg_flash_flags_59b','spg_mathcoach_lesson_59b'];
export const MATH_NOTE_PREFIX='spg_math_notes_59b_';
const recognized=key=>RECOGNIZED_KEYS.includes(key)||key.startsWith(MATH_NOTE_PREFIX);
const clone=value=>JSON.parse(JSON.stringify(value));
export function inspectExportEnvelope(input){
  const value=input&&typeof input==='object'?input:{};
  const capture=value.$capture&&typeof value.$capture==='object'?value.$capture:{};
  const fixture=value.$fixture&&typeof value.$fixture==='object'?value.$fixture:{};
  return {
    schema:typeof value.$schema==='string'?value.$schema:null,
    realBrowserExport:capture.realBrowserExport===true,
    capturedAt:typeof capture.capturedAt==='string'?capture.capturedAt:typeof fixture.capturedAt==='string'?fixture.capturedAt:null,
    readOnly:capture.readOnly===true,
    fixture:Boolean(value.$fixture),
    sourceCount:Number(capture.recognizedSourceCount)||null,
    totalBytes:Number(capture.totalBytes)||null
  };
}
function normalizedSources(items){
  const sources=[];
  for(const item of Array.isArray(items)?items:[]){
    if(!item||typeof item.key!=='string'||!recognized(item.key)) continue;
    const raw=typeof item.raw==='string'?item.raw:item.parsed!==undefined?JSON.stringify(item.parsed):'';
    sources.push({key:item.key,raw,bytes:Number(item.bytes)||Buffer.byteLength(raw,'utf8')});
  }
  sources.sort((a,b)=>a.key.localeCompare(b.key));
  return sources;
}
export function normalizeExport(input){
  const metadata=inspectExportEnvelope(input);
  if(input&&Array.isArray(input.sources)) return {sources:normalizedSources(input.sources),parseErrors:Array.isArray(input.parseErrors)?clone(input.parseErrors):[],metadata};
  const records=input&&typeof input==='object'&&(input.records||input.localStorage)||input||{};
  const sources=[];
  for(const [key,value] of Object.entries(records)){
    if(key.startsWith('$')||!recognized(key)) continue;
    const raw=typeof value==='string'?value:JSON.stringify(value);
    sources.push({key,raw,bytes:Buffer.byteLength(raw,'utf8')});
  }
  sources.sort((a,b)=>a.key.localeCompare(b.key));
  return {sources,parseErrors:[],metadata};
}
export function validateExport(input,options={}){
  const snapshot=normalizeExport(input);
  const generatedAt=options.generatedAt||snapshot.metadata.capturedAt||'2026-08-02T15:00:00.000Z';
  return engine.buildMigrationReport(snapshot,{questionIndex,currentState:options.currentState||{},now:()=>generatedAt});
}
export function summarizeExport(report,file,metadata={}){
  const manifest=report.sourceManifest.map(item=>({key:item.key,present:item.present,bytes:Number(item.bytes)||0,parseStatus:item.parseStatus,recordType:item.recordType,sourcePriority:item.sourcePriority}));
  return {
    file,
    schema:metadata.schema||null,
    realBrowserExport:metadata.realBrowserExport===true,
    capturedAt:metadata.capturedAt||null,
    readOnlyCapture:metadata.readOnly===true,
    fixture:metadata.fixture===true,
    engineVersion:report.engineVersion,
    targetSchemaVersion:report.targetSchemaVersion,
    fingerprint:report.fingerprint,
    sourceCount:report.summary.sourceCount,
    totalBytes:manifest.reduce((sum,item)=>sum+item.bytes,0),
    blocking:report.summary.blockingIssueCount,
    warnings:report.summary.warningIssueCount,
    unresolved:report.summary.unresolvedItemCount,
    passesBlockingValidation:report.validation.passesBlockingValidation,
    canImport:report.canImport,
    importFeatureEnabled:report.validation.importFeatureEnabled,
    rawValuesIncluded:false,
    sourceManifest:manifest
  };
}
function argumentValue(args,name){const index=args.indexOf(name);return index>=0?args[index+1]:null;}
const invoked=process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url;
if(invoked){
  const args=process.argv.slice(2);const file=args.find(arg=>!arg.startsWith('--')&&arg!==argumentValue(args,'--summary-out'));
  const requireReal=args.includes('--require-real');const summaryOut=argumentValue(args,'--summary-out');
  if(!file){console.error('Usage: node rpsgt-v3/scripts/validate-storage-export.mjs <export.json> [--require-real] [--summary-out <summary.json>]');process.exitCode=2;}
  else{
    try{
      const input=JSON.parse(await readFile(file,'utf8'));const metadata=inspectExportEnvelope(input);const report=validateExport(input);const summary=summarizeExport(report,file,metadata);
      if(requireReal&&(!metadata.realBrowserExport||metadata.schema!==EXPORT_SCHEMA||!metadata.readOnly)){summary.envelopeError='The file is not a marked read-only real browser export using the supported schema.';process.exitCode=1;}
      if(report.canImport||report.validation.importFeatureEnabled){summary.safetyError='Import unexpectedly became enabled.';process.exitCode=1;}
      if(!report.validation.passesBlockingValidation) process.exitCode=1;
      if(summaryOut) await writeFile(summaryOut,JSON.stringify(summary,null,2)+'\n','utf8');
      console.log(JSON.stringify(summary,null,2));
    }catch(error){console.error(JSON.stringify({file,error:error.message},null,2));process.exitCode=2;}
  }
}
