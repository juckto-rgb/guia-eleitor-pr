const https=require('https'), http=require('http'), fs=require('fs');
const deps=JSON.parse(fs.readFileSync('dep-sites.json','utf8'));
// junk hosts that never carry a real platform
const JUNK=/(carrd\.co|canva\.site|webnode|blogspot|pinterest|pin\.it|@|forms\.gle|biolink|bio\.link|lovable\.app|\.mbl|\.pr$|gmail\.com|outlook\.com|cnpq\.br|change\.org|snapchat|instagran|instragram|thraeds|onne\.link|apoiar\.me|tr\.ee|1drv\.ms|drive\.google|twb\.nz|twibbonize|share\.google|soundcloud|m\.me|meca\.bo|\.social\.br|seudominio|adventistascandidatos|vereadorreconhecido|mobilizaai)/i;
function sanit(u){u=(u||'').trim();const i=u.toLowerCase().indexOf('http');if(i<0)return '';u=u.slice(i);u=u.replace(/^https?:\/\/https?:\/\//i,'https://');u=u.split(/\s/)[0];return u;}
function pickUrls(d){const seen={};const out=[];for(const raw of d.sites){const u=sanit(raw);if(!u||JUNK.test(u))continue;const host=u.replace(/^https?:\/\//i,'').split('/')[0].toLowerCase();if(seen[host])continue;seen[host]=1;out.push(u);}return out;}
function fetch(url,depth){return new Promise(res=>{if(depth>4)return res('');let lib;try{lib=url.startsWith('https')?https:http;}catch(e){return res('');}let req;try{req=lib.get(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36','Accept':'text/html'}},r=>{if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){let loc;try{loc=r.headers.location.startsWith('http')?r.headers.location:new URL(r.headers.location,url).href;}catch(e){r.resume();return res('');}r.resume();return res(fetch(loc,depth+1));}let d='';r.on('data',c=>{d+=c;if(d.length>400000)req.destroy();});r.on('end',()=>res(d));});}catch(e){return res('');}req.on('error',()=>res(''));req.setTimeout(15000,()=>{req.destroy();res('')});});}
const clean=h=>h.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim();
process.on('unhandledRejection',()=>{});
process.on('uncaughtException',()=>{});
const log=m=>fs.appendFileSync('fetch-all.log',m+'\n');
const guard=p=>Promise.race([p,new Promise(r=>setTimeout(()=>r(''),18000))]);
async function one(d){
  try{
    const urls=pickUrls(d); let txt='', used='';
    for(const u of urls){ let h=''; try{h=await guard(fetch(u,0));}catch(e){h='';} const t=clean(h); if(t.length>300){txt=t;used=u;break;} if(t.length>txt.length){txt=t;used=u;} }
    return {pi:d.pi,nome:d.nome,cargo:d.cargo,part:d.part,num:d.num,url:used,len:txt.length,text:txt.slice(0,3000)};
  }catch(e){ return {pi:d.pi,nome:d.nome,cargo:d.cargo,part:d.part,num:d.num,url:'',len:0,text:''}; }
}
(async()=>{
  const keepalive=setInterval(()=>{},1000);
  fs.writeFileSync('fetch-all.log','start\n');
  const out=[]; let ok=0; const CONC=6;
  for(let i=0;i<deps.length;i+=CONC){
    const batch=deps.slice(i,i+CONC);
    const res=await Promise.all(batch.map(one));
    for(const r of res){ out.push(r); if(r.len>300)ok++; }
    fs.writeFileSync('dep-texts.json',JSON.stringify(out));
    log(`${out.length}/${deps.length} (texto util: ${ok})`);
  }
  out.sort((a,b)=>a.pi-b.pi);
  fs.writeFileSync('dep-texts.json',JSON.stringify(out));
  log(`DONE ${out.length}/${deps.length} | texto util: ${ok}`);
  clearInterval(keepalive);
})();
