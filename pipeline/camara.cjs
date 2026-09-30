/* camara.cjs — RECONSTRÓI o bloco "Atuação no mandato atual" (var CAMARA) do guia.
 *
 * Fonte: API aberta dadosabertos.camara.leg.br (sem WAF; Node alcança direto).
 * Metodologia (legislatura atual 57 = 2023-2026, autoria pelo idDeputadoAutor):
 *   total = proposições apresentadas 2023-2026 (TODOS os tipos)
 *   pl    = proposições do tipo PL 2023-2026
 * Contagem barata: itens=1 e ler o número de página do link rel="last".
 * (Verificado 20/09: pl por esse método bate 100% com o que o guia já mostrava —
 *  então o total passa a ficar na MESMA base do pl, corrigindo a inconsistência
 *  antiga em que o total vinha de outra janela de anos.)
 *
 * Uso:
 *   node pipeline/camara.cjs         # DRY-RUN: mostra diff e grava _camara-<data>.json
 *   node pipeline/camara.cjs write   # aplica em ../index.html (var CAMARA)
 *
 * Preserva camaraId/nomeParlamentar/cargoAtual; só recomputa total e pl.
 */
const fs=require('fs'), path=require('path');
const WRITE=process.argv[2]==='write';
const HTML=path.join(__dirname,'..','index.html');
let h=fs.readFileSync(HTML,'utf8');
function ms(s,st,o,c){let d=0,q=false,e=false;for(let i=st;i<s.length;i++){const ch=s[i];if(q){if(e)e=false;else if(ch=='\\')e=true;else if(ch=='"')q=false;continue;}if(ch=='"'){q=true;continue;}if(ch===o)d++;else if(ch===c){d--;if(d===0)return i+1;}}return -1;}
const i0=h.indexOf('var CAMARA = '), s0=h.indexOf('{',i0), e0=ms(h,s0,'{','}');
const CAMold=JSON.parse(h.slice(s0,e0));

const YEARS='&ano=2023&ano=2024&ano=2025&ano=2026';
async function count(url){
  for(let tries=0;tries<3;tries++){
    try{
      const r=await fetch(url,{headers:{accept:'application/json'}});
      const j=await r.json();
      const L=(j.links||[]).find(x=>x.rel==='last');
      if(L){const m=L.href.match(/pagina=(\d+)/);if(m)return +m[1];}
      return (j.dados||[]).length;
    }catch(e){ await new Promise(r=>setTimeout(r,800)); }
  }
  throw new Error('falha em '+url);
}
async function forDep(id){
  const base='https://dadosabertos.camara.leg.br/api/v2/proposicoes?idDeputadoAutor='+id+'&itens=1&ordenarPor=id&ordem=DESC';
  const total=await count(base+YEARS);
  const pl=await count(base+'&siglaTipo=PL'+YEARS);
  return {total,pl};
}

(async()=>{
  const CAMnew={}; const diffs=[];
  const pis=Object.keys(CAMold);
  for(const pi of pis){
    const o=CAMold[pi];
    const n=await forDep(o.camaraId);
    CAMnew[pi]=Object.assign({},o,{total:n.total,pl:n.pl});
    if(n.total!==o.total||n.pl!==o.pl) diffs.push({nome:o.nomeParlamentar,total:o.total+'->'+n.total,pl:o.pl+'->'+n.pl,dT:n.total-o.total,dP:n.pl-o.pl});
    process.stdout.write('.');
  }
  console.log('\n\n=== CAMARA (mandato atual 2023-2026) — '+pis.length+' deputados ===');
  console.log('mudaram:',diffs.length);
  diffs.forEach(d=>console.log('  '+d.nome+': proposições '+d.total+' | PL '+d.pl));
  const stamp=new Date(Date.now()-3*3600e3).toISOString().slice(0,10);
  const out=path.join(__dirname,'_camara-'+stamp+'.json');
  fs.writeFileSync(out,JSON.stringify(CAMnew,null,0));
  console.log('\nsalvo:',path.basename(out));
  if(!WRITE){console.log('[DRY-RUN] rode com "write" para gravar em ../index.html.');return;}
  const bak=HTML.replace('index.html','index.backup-'+stamp+'-pre-camara.html');
  if(!fs.existsSync(bak))fs.writeFileSync(bak,h);
  h=h.slice(0,s0)+JSON.stringify(CAMnew)+h.slice(e0);
  fs.writeFileSync(HTML,h);
  console.log('GRAVADO em ../index.html. LEMBRE: sincronizar as 4 cópias + carimbo.');
})();
