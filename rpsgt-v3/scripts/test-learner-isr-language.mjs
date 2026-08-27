import {readFile,readdir} from 'node:fs/promises';
import {join,relative,extname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const DATA=join(ROOT,'data');
const CORE=join(ROOT,'core');

const visibleKeys=new Set([
  'prompt','question','stem','options','choices','choice','answer','rationale','hint','hints','explanation','feedback',
  'correctFeedback','incorrectFeedback','front','back','memoryClue','title','label','description','message','intro','points',
  'reviewed','canDo','recap','teaching','instruction','instructions','directions','authority','note','notes','summary'
]);

const bannedPatterns=[
  {id:'ISR acronym',re:/\bISR\b/i},
  {id:'AASM Inter-Scorer Reliability product wording',re:/\bAASM\s+Inter[- ]Scorer\s+Reliability\b/i},
  {id:'Inter-Scorer Reliability acronym wording',re:/\bInter[- ]Scorer\s+Reliability\s*\(\s*ISR\s*\)/i},
  {id:'public AASM instructions wording',re:/\bpublic\s+AASM(?:\s+scoring)?\s+instructions?\b/i},
  {id:'AASM instructions wording',re:/\bAASM\s+(?:scoring\s+)?instructions?\b/i}
];

function matchesBanned(value){
  const text=String(value??'');
  return bannedPatterns.filter(rule=>rule.re.test(text)).map(rule=>rule.id);
}

async function walk(dir,predicate=()=>true){
  const out=[];
  let entries=[];
  try{entries=await readdir(dir,{withFileTypes:true});}catch{return out;}
  for(const entry of entries){
    const full=join(dir,entry.name);
    if(entry.isDirectory()) out.push(...await walk(full,predicate));
    else if(predicate(full)) out.push(full);
  }
  return out;
}

function scanVisibleJson(value,filePath,path='$',visible=false,violations=[]){
  if(Array.isArray(value)){
    value.forEach((item,index)=>scanVisibleJson(item,filePath,`${path}[${index}]`,visible,violations));
    return violations;
  }
  if(value&&typeof value==='object'){
    for(const [key,item] of Object.entries(value)){
      const nextVisible=visible||visibleKeys.has(key);
      scanVisibleJson(item,filePath,`${path}.${key}`,nextVisible,violations);
    }
    return violations;
  }
  if(visible&&typeof value==='string'){
    const hits=matchesBanned(value);
    if(hits.length) violations.push({file:filePath,location:path,hits,text:value});
  }
  return violations;
}

function stripHtmlComments(source){return source.replace(/<!--[\s\S]*?-->/g,'');}
function scanRaw(source,filePath){
  const violations=[];
  const lines=source.split(/\r?\n/);
  lines.forEach((line,index)=>{
    const hits=matchesBanned(line);
    if(hits.length) violations.push({file:filePath,location:`line ${index+1}`,hits,text:line.trim()});
  });
  return violations;
}

const violations=[];
const jsonFiles=await walk(DATA,file=>extname(file)==='.json');
for(const file of jsonFiles){
  let parsed;
  try{parsed=JSON.parse(await readFile(file,'utf8'));}catch{continue;}
  violations.push(...scanVisibleJson(parsed,relative(ROOT,file)));
}

const htmlFiles=(await readdir(ROOT,{withFileTypes:true}))
  .filter(entry=>entry.isFile()&&extname(entry.name)==='.html')
  .map(entry=>join(ROOT,entry.name));
for(const file of htmlFiles){
  const source=stripHtmlComments(await readFile(file,'utf8'));
  violations.push(...scanRaw(source,relative(ROOT,file)));
}

const jsFiles=await walk(CORE,file=>extname(file)==='.js');
for(const file of jsFiles){
  const source=await readFile(file,'utf8');
  violations.push(...scanRaw(source,relative(ROOT,file)));
}

if(violations.length){
  console.error(`Learner-facing ISR/AASM-interface language audit found ${violations.length} potential violation(s):`);
  for(const item of violations){
    console.error(`- ${item.file} ${item.location}: ${item.hits.join(', ')} :: ${item.text.slice(0,240)}`);
  }
  process.exit(1);
}

console.log(`Learner-facing ISR/AASM-interface language audit passed across ${jsonFiles.length} data JSON files, ${htmlFiles.length} root learner HTML files, and ${jsFiles.length} core JavaScript files.`);
