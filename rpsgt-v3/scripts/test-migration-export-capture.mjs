import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
import {EXPORT_SCHEMA,inspectExportEnvelope,normalizeExport,summarizeExport,validateExport} from './validate-storage-export.mjs';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');
const [html,controller,index,ignore,privateReadme,fixtureText]=await Promise.all([
  readFile(join(root,'migration-export.html'),'utf8'),
  readFile(join(root,'core','migration-export.js'),'utf8'),
  readFile(join(root,'index.html'),'utf8'),
  readFile(join(root,'tests','private-exports','.gitignore'),'utf8'),
  readFile(join(root,'tests','private-exports','README.md'),'utf8'),
  readFile(join(root,'tests','fixtures','migration','source-derived-complete.json'),'utf8')
]);
for(const selector of ['data-export-summary','data-export-sources','data-export-errors','data-export-consent','data-export-download','data-export-refresh'])assert.ok(html.includes(selector),`Migration export page is missing ${selector}.`);
for(const script of ['core/storage.js','core/migration-export.js'])assert.ok(html.includes(script),`Migration export page does not load ${script}.`);
assert.equal(html.includes('core/app-shell.js'),false,'The no-write export page must not load the normal shell because navigation memory writes v3 storage.');
for(const boundary of ['Private-data warning','same Sleep Pathways Guild site, browser profile, and device','does not import, alter, delete, or clear browser storage','Raw exports stay private','Import remains disabled'])assert.ok(html.includes(boundary),`Migration export page is missing boundary text: ${boundary}`);
assert.ok(controller.includes('RPSGTStorage.getLegacySnapshot()'));assert.ok(controller.includes('realBrowserExport:true'));assert.ok(controller.includes("$schema:SCHEMA"));assert.ok(controller.includes('new Blob'));assert.ok(controller.includes('URL.createObjectURL'));
assert.equal(/localStorage\.(?:setItem|removeItem|clear)/.test(controller),false,'Capture controller must not write browser storage directly.');assert.equal(controller.includes('RPSGTStorage.save'),false);assert.equal(controller.includes('rememberLocation'),false);
assert.equal(index.includes('migration-export.html'),false,'Private migration capture utility must not be linked from the learner dashboard.');assert.ok(ignore.includes('*')&&ignore.includes('!README.md'));assert.ok(privateReadme.includes('Do not commit'));
const fixture=JSON.parse(fixtureText);const sources=Object.entries(fixture.records).map(([key,value])=>{const raw=typeof value==='string'?value:JSON.stringify(value);return {key,raw,bytes:Buffer.byteLength(raw,'utf8')};});sources.push({key:'unrelated_private_key',raw:'secret',bytes:6});
const capture={$schema:EXPORT_SCHEMA,$capture:{realBrowserExport:true,capturedAt:'2026-08-03T15:00:00.000Z',readOnly:true,origin:'https://example.test',recognizedSourceCount:4,totalBytes:sources.reduce((sum,item)=>sum+item.bytes,0)},sources,parseErrors:[]};
const before=JSON.stringify(capture);const metadata=inspectExportEnvelope(capture);assert.equal(metadata.realBrowserExport,true);assert.equal(metadata.schema,EXPORT_SCHEMA);assert.equal(metadata.readOnly,true);assert.equal(metadata.fixture,false);
const normalized=normalizeExport(capture);assert.equal(normalized.sources.length,4,'Unrecognized browser keys must be excluded from validation.');assert.equal(normalized.sources.some(item=>item.key==='unrelated_private_key'),false);assert.equal(JSON.stringify(capture),before,'Browser export normalization must not mutate the capture.');
const report=validateExport(capture);assert.equal(report.validation.passesBlockingValidation,true);assert.equal(report.canImport,false);assert.equal(report.validation.importFeatureEnabled,false);
const summary=summarizeExport(report,'private-export.json',metadata);assert.equal(summary.realBrowserExport,true);assert.equal(summary.rawValuesIncluded,false);assert.equal(summary.sourceCount,4);const summaryText=JSON.stringify(summary);assert.equal(summaryText.includes('Review staging.'),false);assert.equal(summaryText.includes('Remember the rate formula.'),false);assert.equal(summaryText.includes('secret'),false);
const fixtureMetadata=inspectExportEnvelope(fixture);assert.equal(fixtureMetadata.realBrowserExport,false,'Source-derived fixtures must never be represented as real browser exports.');
console.log('Read-only private browser capture page, learner-dashboard suppression, recognized-key filtering, private-file guard, envelope metadata, and raw-value-free summary contracts passed.');