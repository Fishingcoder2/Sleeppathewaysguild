import {readFile,readdir,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {EXPORT_SCHEMA,inspectExportEnvelope,summarizeExport,validateExport} from './validate-storage-export.mjs';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');
const args=process.argv.slice(2);const writeSummary=args.includes('--write-summary');
const supplied=args.find(arg=>!arg.startsWith('--'));
const directory=resolve(supplied||join(root,'tests','private-exports'));
let files=[];
try{files=(await readdir(directory,{withFileTypes:true})).filter(entry=>entry.isFile()&&entry.name.endsWith('.json')&&!entry.name.endsWith('.summary.json')&&entry.name!=='migration-validation-summary.json').map(entry=>entry.name).sort();}
catch(error){console.error(JSON.stringify({directory,error:error.message},null,2));process.exit(2);}
if(!files.length){console.error(JSON.stringify({directory,error:'No private browser export JSON files were found. Capture an export from migration-export.html first.'},null,2));process.exit(2);}
const summaries=[];let failed=false;
for(const name of files){
  const file=join(directory,name);
  try{
    const input=JSON.parse(await readFile(file,'utf8'));const metadata=inspectExportEnvelope(input);const report=validateExport(input);const summary=summarizeExport(report,name,metadata);
    if(!metadata.realBrowserExport||metadata.schema!==EXPORT_SCHEMA||!metadata.readOnly){summary.envelopeError='Not a supported read-only real browser export.';failed=true;}
    if(report.canImport||report.validation.importFeatureEnabled){summary.safetyError='Import unexpectedly became enabled.';failed=true;}
    if(!report.validation.passesBlockingValidation) failed=true;
    summaries.push(summary);
  }catch(error){failed=true;summaries.push({file:name,error:error.message,rawValuesIncluded:false});}
}
const output={validatedAt:new Date().toISOString(),directory,rawValuesIncluded:false,sampleCount:summaries.length,passingSamples:summaries.filter(item=>item.passesBlockingValidation&&!item.envelopeError&&!item.safetyError&&!item.error).length,failedSamples:summaries.filter(item=>item.envelopeError||item.safetyError||item.error||item.passesBlockingValidation===false).length,summaries};
if(writeSummary){const target=join(directory,'migration-validation-summary.json');await writeFile(target,JSON.stringify(output,null,2)+'\n','utf8');output.summaryFile=target;}
console.log(JSON.stringify(output,null,2));
if(failed) process.exitCode=1;
