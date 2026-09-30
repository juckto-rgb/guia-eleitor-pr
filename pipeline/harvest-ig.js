const https=require('https'),fs=require('fs');const {chromium}=require('playwright');
const idE='20322002026';
const h=fs.readFileSync('guia-eleitor-pr.html','utf8');
const DEPS=JSON.parse(h.match(/var DEPS = (\[[\s\S]*?\]);/)[1]);
const cur=eval('('+h.match(/var SITE_CAUSAS = (\{[\s\S]*?\n  \});/)[1]+')');
const OCC2=eval(h.match(/var OCC2CAUSA = (\[[\s\S]*?\]);/)[1]);
const sen=DEPS.filter(d=>d.cargo==='senador'),fed=DEPS.filter(d=>d.cargo==='federal'),est=DEPS.filter(d=>d.cargo==='estadual');
const ord=sen.concat(fed).concat(est).map((d,i)=>Object.assign({pi:20+i},d));
function occCauses(o){o=(o||'').toLowerCase();var s={};OCC2.forEach(m=>{if(o.indexOf(m[0])>-1)s[m[1]]=1;});return Object.keys(s);}
const targets=ord.filter(d=>!cur[d.pi] && !occCauses(d.ocup).length); // os 412 em branco
console.error('alvos em branco:',targets.length);
const RULES=require('./rules.js');const comp={};for(const k in RULES)comp[k]=RULES[k].map(p=>new RegExp(p,'g'));
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
// >=1 sinal (o cliente quer AO MENOS uma bandeira da bio); FPs piores já saíram do rules.js
function classify(text){const t=norm(text);const sc={};for(const k in comp){let sig=0,hh=0;for(const re of comp[k]){const m=t.match(re);if(m){sig++;hh+=m.length;}}if(sig>=1)sc[k]={sig,hh};}return Object.keys(sc).sort((a,b)=>sc[b].sig-sc[a].sig||sc[b].hh-sc[a].hh).slice(0,4);}
function sanit(u){u=(u||'').trim();const i=u.toLowerCase().indexOf('http');if(i<0)return '';u=u.slice(i).split(/\s/)[0];return u.replace(/^https?:\/\/https?:\/\//i,'https://');}
const kind=u=>{u=u.toLowerCase();if(u.includes('instagram'))return'IG';if(u.includes('facebook'))return'FB';if(u.includes('x.com')||u.includes('twitter'))return'X';return null;};
function apiSites(sq){const path=`/divulga/rest/v1/candidatura/buscar/2026/PR/${idE}/candidato/${sq}`;return new Promise(res=>{const rq=https.get({host:'divulgacandcontas.tse.jus.br',path,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d).sites||[])}catch(e){res([])}})});rq.on('error',()=>res([]));rq.setTimeout(12000,()=>{rq.destroy();res([])});});}
const guard=p=>Promise.race([p,new Promise(r=>setTimeout(()=>r(''),16000))]);
const log=m=>fs.appendFileSync('ig.log',m+'\n');
process.on('unhandledRejection',()=>{});process.on('uncaughtException',()=>{});
// extrai a bio: IG do meta description ('...on Instagram: "BIO"'), FB/X do og:description
async function bioFrom(page,url,k){try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:16000});await page.waitForTimeout(k==='IG'?2500:1200);
  return await page.evaluate((kind)=>{const g=n=>{const m=document.querySelector('meta[property=\"'+n+'\"],meta[name=\"'+n+'\"]');return m?m.content:'';};
   if(kind==='IG'){const d=g('description');const m=d.match(/on Instagram:\s*[\"“]([\s\S]*?)[\"”]\s*$/);return m?m[1]:'';}
   return g('og:description')||g('description')||'';},k);
}catch(e){return '';}}
(async()=>{
 fs.writeFileSync('ig.log','start '+targets.length+'\n');
 const ka=setInterval(()=>{},1000);
 const socByPi={};let s1=0;const C1=10;
 for(let i=0;i<targets.length;i+=C1){await Promise.all(targets.slice(i,i+C1).map(async d=>{const sites=(await apiSites(d.sq)).map(sanit).filter(Boolean);const so={};sites.forEach(u=>{const k=kind(u);if(k&&!so[k])so[k]=u;});socByPi[d.pi]=so;s1++;}));if(s1%100<C1)log('api '+s1);}
 log('api done');
 const browser=await chromium.launch();
 const results=[];const bioCache={};let done=0,hit=0;const C2=4;
 const q=targets.filter(d=>{const so=socByPi[d.pi];return so&&(so.IG||so.FB||so.X);});
 log('com rede: '+q.length);const q0=q.length;
 async function runner(){const ctx=await browser.newContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'});const page=await ctx.newPage();
  while(q.length){const d=q.shift();if(!d)break;const so=socByPi[d.pi];let bio='',via=[];
   if(so.IG){const x=await guard(bioFrom(page,so.IG,'IG'));if(x){bio+=' '+x;via.push('Instagram');}}
   if(so.FB){const x=await guard(bioFrom(page,so.FB,'FB'));if(x){bio+=' '+x;via.push('Facebook');}}
   if(so.X){const x=await guard(bioFrom(page,so.X,'X'));if(x){bio+=' '+x;via.push('X');}}
   bio=bio.replace(/\s+/g,' ').trim();const c=classify(bio);done++;
   if(bio)bioCache[d.pi]={nome:d.nome,cargo:d.cargo,via:via.join('/'),bio:bio.slice(0,300)};
   if(c.length){hit++;results.push({pi:d.pi,nome:d.nome,cargo:d.cargo,c,src:'rede social ('+via.join('/')+')',bio:bio.slice(0,240)});}
   if(done%15===0){fs.writeFileSync('ig-classified.json',JSON.stringify(results));fs.writeFileSync('bio-cache.json',JSON.stringify(bioCache));log(done+'/'+q0+' hit:'+hit);}
  }await ctx.close();}
 await Promise.all(Array.from({length:C2},runner));
 results.sort((a,b)=>a.pi-b.pi);fs.writeFileSync('ig-classified.json',JSON.stringify(results));fs.writeFileSync('bio-cache.json',JSON.stringify(bioCache));
 log('DONE hit:'+results.length+' de '+q0+' | bios coletadas:'+Object.keys(bioCache).length);
 await browser.close();clearInterval(ka);
})();
