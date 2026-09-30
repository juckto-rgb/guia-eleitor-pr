const https=require('https'),http=require('http'),fs=require('fs'),zlib=require('zlib');
const texts=JSON.parse(fs.readFileSync('dep-texts.json','utf8'));
const deps=JSON.parse(fs.readFileSync('dep-sites.json','utf8'));
const byPi={};deps.forEach(d=>byPi[d.pi]=d);
const JUNK=/(carrd\.co|canva\.site|webnode|blogspot|pinterest|pin\.it|@|forms\.gle|biolink|bio\.link|lovable\.app|\.mbl|\.pr$|gmail\.com|outlook\.com|cnpq\.br|change\.org|snapchat|instagran|instragram|thraeds|onne\.link|apoiar\.me|tr\.ee|1drv\.ms|drive\.google|twb\.nz|twibbonize|share\.google|soundcloud|m\.me|meca\.bo|\.social\.br|seudominio|adventistascandidatos|vereadorreconhecido|mobilizaai)/i;
function sanit(u){u=(u||'').trim();const i=u.toLowerCase().indexOf('http');if(i<0)return '';u=u.slice(i);u=u.replace(/^https?:\/\/https?:\/\//i,'https://');u=u.split(/\s/)[0];return u;}
function pickUrls(d){const seen={},out=[];for(const raw of (d.sites||[])){const u=sanit(raw);if(!u||JUNK.test(u))continue;const host=u.replace(/^https?:\/\//i,'').split('/')[0].toLowerCase();if(seen[host])continue;seen[host]=1;out.push(u);}return out;}
const guard=p=>Promise.race([p,new Promise(r=>setTimeout(()=>r(null),18000))]);
function fetch(url,depth){return new Promise(res=>{if(depth>4)return res(null);let lib;try{lib=url.startsWith('https')?https:http;}catch(e){return res(null);}let req;try{req=lib.get(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36','Accept':'text/html,application/xhtml+xml','Accept-Encoding':'gzip, deflate, br','Accept-Language':'pt-BR'}},r=>{
  if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){let loc;try{loc=r.headers.location.startsWith('http')?r.headers.location:new URL(r.headers.location,url).href;}catch(e){r.resume();return res({code:r.statusCode,enc:'',ct:'',len:0});}r.resume();return res(fetch(loc,depth+1));}
  const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>{let buf=Buffer.concat(chunks);const enc=(r.headers['content-encoding']||'').toLowerCase();try{if(enc.includes('br'))buf=zlib.brotliDecompressSync(buf);else if(enc.includes('gzip'))buf=zlib.gunzipSync(buf);else if(enc.includes('deflate'))buf=zlib.inflateSync(buf);}catch(e){}res({code:r.statusCode,enc,ct:r.headers['content-type']||'',html:buf.toString('utf8')});});
});}catch(e){return res(null);}req.on('error',e=>res({err:e.code}));req.setTimeout(15000,()=>{req.destroy();res({err:'timeout'})});});}
const clean=h=>(h||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim();
const failed=texts.filter(t=>t.len<=300);
process.on('unhandledRejection',()=>{});process.on('uncaughtException',()=>{});
(async()=>{
 const ka=setInterval(()=>{},1000);
 const cats={dead:0,empty_shell:0,recovered:0,other:0}; const recovered=[];
 let done=0;const CONC=6;
 for(let i=0;i<failed.length;i+=CONC){
  await Promise.all(failed.slice(i,i+CONC).map(async t=>{
   const urls=pickUrls(byPi[t.pi]||{sites:[t.url]}); let best={len:0};
   for(const u of urls){const r=await guard(fetch(u,0));if(!r)continue;const txt=clean(r.html);if(txt.length>(best.len||0))best={len:txt.length,code:r.code,err:r.err,enc:r.enc,url:u,txt};}
   done++;
   if(best.err||best.code>=400||best.len===0){ if(best.err==='ENOTFOUND'||best.err)cats.dead++; else cats.empty_shell++; }
   else if(best.len>300){cats.recovered++;recovered.push({pi:t.pi,nome:t.nome,cargo:t.cargo,url:best.url,len:best.len,text:best.txt.slice(0,3000)});}
   else cats.empty_shell++;
  }));
  process.stderr.write(`\r${done}/${failed.length} recuperados:${cats.recovered}`);
 }
 clearInterval(ka);
 fs.writeFileSync('recovered-texts.json',JSON.stringify(recovered));
 console.log('\n== DIAGNÓSTICO dos '+failed.length+' que falharam ==');
 console.log('recuperados agora (com gzip/br + headers):',cats.recovered);
 console.log('mortos/DNS/erro:',cats.dead);
 console.log('casca vazia (SPA real):',cats.empty_shell+cats.other);
})();
