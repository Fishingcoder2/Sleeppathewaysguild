#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const main=resolve(root,'..');
const htmls=(await readdir(root)).filter(x=>x.endsWith('.html'));
const missing=[];
let links=0,assets=0,fragments=0;
for(const htmlName of htmls){
 const html=await readFile(join(root,htmlName),'utf8');
 const refs=[...html.matchAll(/\b(href|src)\s*=\s*["']([^"']+)["']/gi)];
 for(const m of refs){
  let value=m[2],type=m[1].toLowerCase();
  if(/^(?:https?:|data:|mailto:|tel:|javascript:|blob:|\/\/)/i.test(value))continue;
  if(value.startsWith('#')){fragments++;continue;}
  if(value.includes('$'+'{')||value.includes('{{'))continue;
  const noQuery=value.split(/[?#]/)[0];
  if(!noQuery)continue;
  const target=resolve(dirname(join(root,htmlName)),noQuery);
  const rel=relative(root,target).replace(/\\/g,'/');
  if(!rel||rel.startsWith('..'))missing.push({page:htmlName,attr:type,href:value,error:'points outside isolated Workers asset directory'});
  else {
   let exists=false;try{exists=(await stat(target)).isFile();}catch{}
   if(!exists)missing.push({page:htmlName,attr:type,href:value,error:'missing static target '+rel});
  }
  if(type==='href')links++;else assets++;
 }
}
const loader=await readFile(join(root,'core/owner-question-release.js'),'utf8');
const m=loader.match(/const RELEASE_PATH='([^']+)'/);
assert.ok(m,'The RPSGT V3 approved-question release has no canonical URL');
const path=m[1],target=resolve(root,path),rel=relative(root,target).replace(/\\/g,'/');
let releaseExists=false;try{releaseExists=(await stat(target)).isFile();}catch{}
if(rel.startsWith('..')||!releaseExists)missing.push({page:'core/owner-question-release.js',attr:'fetch',href:path,error:'approved-question release is outside Worker assets or missing: '+rel});
else{
 const a=JSON.parse(await readFile(join(main,'data/owner-approved-question-release.json'),'utf8'));
 const b=JSON.parse(await readFile(target,'utf8'));
 assert.deepEqual(a,b,'V3 deployable overlay mirror must match the canonical root overlay exactly');
 assert.equal(a.questions.length,320,'Existing approved question release preserved');
}
console.log(JSON.stringify({htmlPages:htmls.length,hrefLinks:links,scriptAndImageAssets:assets,samePageAnchors:fragments,releasePath:path,overlayMirrorMatchesCanonical:releaseExists,errors:missing.length,missing:missing.slice(0,100)},null,2));
if(missing.length)process.exitCode=1;
