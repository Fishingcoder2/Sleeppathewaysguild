import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import router from '../../workers/router.js';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const port=Number(process.env.PORT||4178);
const mime={
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.webp':'image/webp',
  '.woff2':'font/woff2',
  '.pdf':'application/pdf',
};
const env={
  ASSETS:{
    async fetch(req){
      const url=new URL(req.url);
      const pathName=url.pathname==='/case-review/'?'/case-review/index.html':url.pathname;
      let decoded;
      try { decoded=decodeURIComponent(pathName); }catch{ return new Response('Bad URL',{status:400}); }
      const target=resolve(root,'.'+decoded);
      if(target!==root&&!target.startsWith(root+sep))return new Response('Forbidden',{status:403});
      const rel=relative(root,target);
      if(rel.startsWith('..'))return new Response('Forbidden',{status:403});
      try {
        const stats=await stat(target);
        if(!stats.isFile())return new Response('Not found',{status:404});
        const content=req.method==='HEAD'?null:await readFile(target);
        return new Response(content,{status:200,headers:{'Content-Type':mime[extname(target).toLowerCase()]||'application/octet-stream'}});
      }catch{ return new Response('Not found',{status:404}); }
    },
  },
};
const server=createServer(async(req,res)=>{
  const url='http://127.0.0.1:'+port+(req.url||'/');
  try{
    const request=new Request(url,{method:req.method,headers:req.headers});
    const response=await router.fetch(request,env);
    res.writeHead(response.status,Object.fromEntries(response.headers.entries()));
    if(req.method==='HEAD'||!response.body){res.end();return;}
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500,{'Content-Type':'text/plain'});res.end('Preview server error: '+String(error));}
});
server.listen(port,'127.0.0.1',()=>console.log('RPSGT V3 Case Review preview: http://127.0.0.1:'+port+'/case-review/'));
