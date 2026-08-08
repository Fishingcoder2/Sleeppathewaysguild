import {readFile,readdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const v3Root=resolve(here,'..');
const repoRoot=resolve(v3Root,'..');
const readiness=JSON.parse(await readFile(join(v3Root,'data','release-readiness.json'),'utf8'));
const publicHome=await readFile(join(repoRoot,'index.html'),'utf8');
const wrangler=await readFile(join(v3Root,'wrangler.jsonc'),'utf8');

if(readiness.schemaVersion!==1) throw new Error('Release readiness schemaVersion must remain 1 until deliberately migrated.');
if(readiness.developmentOnly!==true) throw new Error('RPSGT V3 release readiness must remain developmentOnly while manual gates are incomplete.');
if(readiness.publicEntryTarget!=='RPSGTv2.2026.html') throw new Error('Public RPSGT entry target changed before release approval.');
if(readiness.v3EntryTarget!=='rpsgt-v3/index.html') throw new Error('V3 entry target changed unexpectedly.');
if(!/"name"\s*:\s*"rpsgt-v3-learning-center"/.test(wrangler)) throw new Error('Isolated RPSGT V3 Worker identity is missing from wrangler.jsonc.');

const requiredGates=[
  'representativeRealBrowserMigrationExports',
  'interactiveDesktopMobileRegression',
  'isolatedWorkerExactHeadDeployment'
];
for(const gate of requiredGates){
  const item=readiness.manualGates&&readiness.manualGates[gate];
  if(!item||typeof item.complete!=='boolean'||!item.evidenceRequired||!item.currentStatus) throw new Error(`Release readiness gate is incomplete or malformed: ${gate}`);
}

const incomplete=requiredGates.filter(gate=>readiness.manualGates[gate].complete!==true);
if(incomplete.length){
  const htmlFiles=(await readdir(v3Root,{withFileTypes:true}))
    .filter(entry=>entry.isFile()&&entry.name.endsWith('.html'))
    .map(entry=>entry.name)
    .sort();
  if(!htmlFiles.length) throw new Error('No top-level RPSGT V3 HTML pages were found for noindex validation.');
  for(const file of htmlFiles){
    const html=await readFile(join(v3Root,file),'utf8');
    if(!/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex[^"']*nofollow[^"']*["']/i.test(html)){
      throw new Error(`Development-only V3 page is missing noindex,nofollow: ${file}`);
    }
  }

  const legacyStructuredData='"name":"RPSGT Study Webapp","url":"https://sleeppathwaysguild.com/RPSGTv2.2026.html"';
  if(!publicHome.includes(legacyStructuredData)) throw new Error('Public homepage no longer identifies the legacy V2 RPSGT app while V3 release gates are incomplete.');
  if(/"name"\s*:\s*"RPSGT Study Webapp"[\s\S]{0,240}"url"\s*:\s*"https:\/\/sleeppathwaysguild\.com\/rpsgt-v3\/index\.html"/i.test(publicHome)){
    throw new Error('Public homepage switched the RPSGT WebApplication target to V3 before release gates were complete.');
  }
}

console.log(JSON.stringify({
  schemaVersion:readiness.schemaVersion,
  developmentOnly:readiness.developmentOnly,
  manualGates:requiredGates.length,
  incompleteGates:incomplete,
  publicEntryPreserved:incomplete.length?true:'not-enforced-after-approval',
  v3NoindexPreserved:incomplete.length?true:'not-enforced-after-approval',
  isolatedWorkerIdentity:true
},null,2));
