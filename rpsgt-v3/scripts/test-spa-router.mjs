/**
 * Scoped Cloudflare SPA fallback regression.
 * node rpsgt-v3/scripts/test-spa-router.mjs
 *
 * Uses Node 22 standard web Request/Response and no external services.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routerText=readFileSync(resolve(root,'workers/router.js'),'utf8');
const {default:router}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(routerText));

const HTML='<!doctype html><html><head><title>Case Review Notebook</title></head><body><div id="root"></div></body></html>';
function createEnv({hasShell=true}={}){
  const paths=[];
  return {
    paths,
    env:{ASSETS:{async fetch(request){
      const pathname=new URL(request.url).pathname;
      paths.push(pathname);
      if(pathname==='/case-review/index.html' && hasShell) return new Response(request.method==='HEAD'?null:HTML,{status:200,headers:{'Content-Type':'text/html'}});
      if(pathname==='/practice.html') return new Response('Legacy Practice Center',{status:200,headers:{'Content-Type':'text/html'}});
      if(pathname==='/case-review/assets/main.js') return new Response('console.log("app")',{status:200,headers:{'Content-Type':'application/javascript'}});
      if(pathname==='/case-review/logo.png') return new Response('image',{status:200,headers:{'Content-Type':'image/png'}});
      return new Response('Not found',{status:404});
    }}},
  };
}
function req(path,{method='GET',accept='text/html',mode='navigate'}={}){
  const headers=new Headers();
  if(accept)headers.set('Accept',accept);
  if(mode)headers.set('Sec-Fetch-Mode',mode);
  return new Request('https://webapp.sleeppathwaysguild.com'+path,{method,headers});
}

test('real static assets are served without rewriting',async()=>{
  const {env,paths}=createEnv();
  const response=await router.fetch(req('/case-review/assets/main.js',{accept:'*/*',mode:'no-cors'}),env);
  assert.equal(response.status,200);
  assert.equal(await response.text(),'console.log("app")');
  assert.deepEqual(paths,['/case-review/assets/main.js']);
});

test('missing scoped React navigation gets case-review HTML, not the legacy root dashboard',async()=>{
  const {env,paths}=createEnv();
  const response=await router.fetch(req('/case-review/notebook/case-4?case=psg-report-intro'),env);
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type')||'',/text\/html/);
  assert.equal(response.headers.get('X-SPG-Route'),'case-review-spa');
  assert.equal(response.headers.get('Cache-Control'),'no-cache');
  assert.match(await response.text(),/Case Review Notebook/);
  assert.deepEqual(paths,['/case-review/notebook/case-4','/case-review/index.html']);
});

test('real case-review index keeps its own normal asset response',async()=>{
  const {env,paths}=createEnv();
  const response=await router.fetch(req('/case-review/index.html'),env);
  assert.equal(response.status,200);
  assert.deepEqual(paths,['/case-review/index.html']);
  assert.equal(response.headers.get('X-SPG-Route'),null);
});

test('missing JS, JSON, CSS, image and font requests retain 404',async()=>{
  for(const path of [
    '/case-review/assets/chunk-INVALID.js',
    '/case-review/data/questions.json',
    '/case-review/assets/app.css',
    '/case-review/logo-missing.png',
    '/case-review/assets/font-missing.woff2',
    '/data/question-bank/d3c.json',
  ]){
    const {env,paths}=createEnv();
    const response=await router.fetch(req(path),env);
    assert.equal(response.status,404,path);
    assert.deepEqual(paths,[path],path);
  }
});

test('missing unrelated legacy HTML stays a genuine 404',async()=>{
  for(const path of ['/reports.html','/practice-nonexistent','/unknown/deep-page']){
    const {env}=createEnv();
    const response=await router.fetch(req(path),env);
    assert.equal(response.status,404,path);
  }
});

test('non-navigation and non-GET requests cannot trigger SPA fallback',async()=>{
  for(const options of [
    {method:'POST'},
    {method:'GET',accept:'application/json',mode:'cors'},
  ]){
    const {env}=createEnv();
    const response=await router.fetch(req('/case-review/unknown',options),env);
    assert.equal(response.status,404);
  }
});

test('if SPA index is missing, fail closed instead of returning an empty 200',async()=>{
  const {env}=createEnv({hasShell:false});
  const response=await router.fetch(req('/case-review/case/4'),env);
  assert.equal(response.status,404);
});

test('HEAD fallback has no body',async()=>{
  const {env}=createEnv();
  const response=await router.fetch(req('/case-review/deep/route',{method:'HEAD'}),env);
  assert.equal(response.status,200);
  assert.equal(response.body,null);
});

test('shortcuts preserve query strings and keep Practice in the legacy app',async()=>{
  const {env}=createEnv();
  const a=await router.fetch(req('/notebook?case=psg-report-intro'),env);
  assert.equal(a.status,308);
  assert.equal(a.headers.get('Location'),'https://webapp.sleeppathwaysguild.com/case-review/?case=psg-report-intro');
  const b=await router.fetch(req('/practice?task=D3C&start=1'),env);
  assert.equal(b.status,308);
  assert.equal(b.headers.get('Location'),'https://webapp.sleeppathwaysguild.com/practice.html?task=D3C&start=1');
});

test('deployment file retains existing site and selective routing',()=>{
  const configText=readFileSync(resolve(root,'wrangler.jsonc'),'utf8');
  assert.match(configText,/"directory": "\."/);
  assert.match(configText,/"main": "workers\/router\.js"/);
  assert.match(configText,/"binding": "ASSETS"/);
  assert.match(configText,/"run_worker_first": \[/);
  assert.doesNotMatch(configText,/"not_found_handling": "single-page-application"/);
  // This condition is only required after npm run build in CI; otherwise a
  // developer can run the routing test before building the React project.
  const output=resolve(root,'case-review/index.html');
  if(existsSync(output)){
    const builtHtml=readFileSync(output,'utf8');
    assert.match(builtHtml,/\/case-review\/assets\//);
    assert.doesNotMatch(builtHtml,/\/src\/main\.tsx/);
  }
});
