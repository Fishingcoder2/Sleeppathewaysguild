import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const areas=['hookup','instrumentation','pap','pediatric','daytime-testing','ekg','troubleshooting'];
const keys=new Set();
for(const area of areas){
  const pack=JSON.parse(await readFile(join(root,'data',area,'guided-stations.json'),'utf8'));
  if(!pack.reference||!pack.stations?.length)throw new Error(area+' has no source or lessons');
  await access(join(root,'lab-'+area+'.html'));
  for(const s of pack.stations){
    const key=area+'/'+s.id;if(keys.has(key))throw new Error('Duplicate lesson '+key);keys.add(key);
    if(!s.title||!s.study?.intro||!s.study.points?.length||!s.apply?.rationale||!s.recap)throw new Error('Incomplete lesson '+key);
    if(s.apply.options.filter(o=>o===s.apply.answer).length!==1)throw new Error('Ambiguous decision '+key);
  }
}
console.log('PASS: '+keys.size+' complete source-backed lessons, unique keys, unambiguous decisions, and valid lab destinations.');
