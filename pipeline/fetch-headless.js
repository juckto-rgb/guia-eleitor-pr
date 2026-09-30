const {chromium}=require('playwright'), fs=require('fs');
const deps=JSON.parse(fs.readFileSync('dep-sites.json','utf8'));
const texts=JSON.parse(fs.readFileSync('dep-texts.json','utf8'));
const html=fs.readFileSync('guia-eleitor-pr.html','utf8');
const already=eval('('+html.match(/var SITE_CAUSAS = (\{[\s\S]*?\n  \});/)[1]+')');
const byPi={};deps.forEach(d=>byPi[d.pi]=d);
const JUNK=/(carrd\.co|canva\.site|webnode|blogspot|pinterest|pin\.it|@|forms\.gle|biolink|bio\.link|lovable\.app|\.mbl|\.pr$|gmail\.com|outlook\.com|cnpq\.br|change\.org|snapchat|instagran|instragram|thraeds|onne\.link|apoiar\.me|tr\.ee|1drv\.ms|drive\.google|twb\.nz|twibbonize|share\.google|soundcloud|m\.me|meca\.bo|\.social\.br|seudominio|adventistascandidatos|vereadorreconhecido|mobilizaai)/i;
function sanit(u){u=(u||'').trim();const i=u.toLowerCase().indexOf('http');if(i<0)return '';u=u.slice(i);u=u.replace(/^https?:\/\/https?:\/\//i,'https://');u=u.split(/\s/)[0];return u;}
function pickUrls(d){const seen={},out=[];for(const raw of (d.sites||[])){const u=sanit(raw);if(!u||JUNK.test(u))continue;const host=u.replace(/^https?:\/\//i,'').split('/')[0].toLowerCase();if(seen[host])continue;seen[host]=1;out.push(u);}return out;}
// alvos: quem tem texto <=300 E ainda não está classificado
const targets=texts.filter(t=>t.len<=300 && !(t.pi in already));
console.error('alvos headless:',targets.length);
const log=m=>fs.appendFileSync('headless.log',m+'\n');
process.on('unhandledRejection',()=>{});process.on('uncaughtException',()=>{});
(async()=>{
 fs.writeFileSync('headless.log','start '+targets.length+'\n');
 const ka=setInterval(()=>{},1000);
 const browser=await chromium.launch();
 const out=[]; let done=0, ok=0; const CONC=4;
 async function work(t){
  const ctx=await browser.newContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',viewport:{width:1280,height:900}});
  await ctx.route('**/*',r=>{const ty=r.request().resourceType();(ty==='image'||ty==='media'||ty==='font')?r.abort():r.continue();});
  const page=await ctx.newPage(); let txt='',used='';
  for(const u of pickUrls(byPi[t.pi]||{sites:[t.url]})){
   try{ await page.goto(u,{waitUntil:'domcontentloaded',timeout:20000}); try{await page.waitForLoadState('networkidle',{timeout:6000});}catch(e){} await page.waitForTimeout(1500);
    const s=await page.evaluate(()=>document.body?document.body.innerText:'').catch(()=>'');
    const c=(s||'').replace(/\s+/g,' ').trim();
    if(c.length>txt.length){txt=c;used=u;} if(c.length>400)break;
   }catch(e){}
  }
  await ctx.close();
  done++; if(txt.length>300)ok++;
  out.push({pi:t.pi,nome:t.nome,cargo:t.cargo,url:used,len:txt.length,text:txt.slice(0,3000)});
  if(done%8===0){fs.writeFileSync('headless-texts.json',JSON.stringify(out));log(done+'/'+targets.length+' util:'+ok);}
 }
 const q=targets.slice();
 async function runner(){ while(q.length){ const t=q.shift(); try{await work(t);}catch(e){done++;} } }
 await Promise.all(Array.from({length:CONC},runner));
 fs.writeFileSync('headless-texts.json',JSON.stringify(out));
 log('DONE '+done+'/'+targets.length+' util:'+ok);
 await browser.close(); clearInterval(ka);
})();
