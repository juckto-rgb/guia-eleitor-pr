const fs=require('fs');
const BASE="C:/Users/juckt/OneDrive/Área de Trabalho/Guia Eleitor PR/";
const F=BASE+"index.html";
let h=fs.readFileSync(F,'utf8');
function ms(s,st,o,c){let d=0,q=false,e=false;for(let i=st;i<s.length;i++){const ch=s[i];if(q){if(e)e=false;else if(ch=='\\')e=true;else if(ch=='"')q=false;continue;}if(ch=='"'){q=true;continue;}if(ch===o)d++;else if(ch===c){d--;if(d===0)return i+1;}}return -1;}
const votes=JSON.parse(fs.readFileSync("C:/Users/juckt/AppData/Local/Temp/claude/C--Users-juckt-OneDrive--rea-de-Trabalho-Claude-Sorttie/3d9b50f0-cf0a-459e-8e5a-0c718cd4adec/scratchpad/_votos-vigente.json",'utf8'));
const maj=JSON.parse(fs.readFileSync(BASE+"pipeline/_majmap.json",'utf8'));

let dS=h.indexOf("DEP_DETAIL = {")+13, dE=ms(h,dS,"{","}"); let dd=JSON.parse(h.slice(dS,dE));
let pS=h.indexOf("[",h.search(/PROFILES\s*=\s*\[/)), pE=ms(h,pS,"[","]"); let pr=JSON.parse(h.slice(pS,pE));
const keyToIdx={}; for(let i=0;i<21&&i<pr.length;i++){keyToIdx[(pr[i].cargo||'').toLowerCase()+'|'+(pr[i].part||'')]=i;}

let nDep=0,nMaj=0,miss=[];
Object.keys(votes).forEach(sq=>{
  const vv={n:votes[sq].n,a:votes[sq].a};
  if(dd[sq]){ dd[sq].vv=vv; nDep++; return; }
  const m=maj[sq];
  if(m){ const idx=keyToIdx[m.cargo.toLowerCase()+'|'+m.part]; if(idx!=null){ pr[idx].vv=vv; nMaj++; return; } }
  miss.push(sq);
});
h=h.slice(0,dS)+JSON.stringify(dd)+h.slice(dE);
pS=h.indexOf("[",h.search(/PROFILES\s*=\s*\[/)); pE=ms(h,pS,"[","]");
h=h.slice(0,pS)+JSON.stringify(pr)+h.slice(pE);

// rebuild passthrough
const before="sit:x.sit||'', ph:x.ph||null,";
if(h.indexOf(before)<0){console.log("!! rebuild passthrough não achado");process.exit(1);}
h=h.split(before).join("sit:x.sit||'', ph:x.ph||null, vv:x.vv||null,");

// render: linha do histórico do ano em que foi eleito (mandato vigente)
const anchor="+'</div></div><span class=\"result-badge '";
if(h.indexOf(anchor)<0){console.log("!! anchor hist não achado");process.exit(1);}
const repl="+'</div>'+((d.vv&&+h.a===d.vv.a&&/eleito/i.test(h.r)&&!/n[\\u00e3a]o eleito/i.test(h.r))?'<div class=\"hv\" style=\"font-size:12px;color:var(--accent);font-weight:600;margin-top:3px\">'+d.vv.n.toLocaleString('pt-BR')+' votos</div>':'')+'</div><span class=\"result-badge '";
h=h.split(anchor).join(repl);

fs.writeFileSync(F,h);
console.log("vv aplicado -> deputados:",nDep,"| majoritários:",nMaj,"| sem lugar:",miss.length,miss.length?JSON.stringify(miss):"");
